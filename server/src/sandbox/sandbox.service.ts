import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Storage } from '../storage/storage.interface';
import { LLM_CLIENT, LlmClient } from '../llm/llm.types';
import { PromptBuilder } from '../llm/prompt.builder';
import { CharacterTarget, SessionState } from '../database/entities';

interface SpeakerEvent {
  sessionId: number;
  target: CharacterTarget;
}

/**
 * 沙盒状态机 + 事件驱动调度。
 * - start  → 触发 A.start（nextSpeaker 决定先后；为空时取 A）
 * - A.replied  → 触发 B.start
 * - B.replied  → 触发 A.start
 * - 达到 maxRounds  → state = ended
 * - 任何 LLM 错误 → 回到 paused，留给用户恢复
 */
@Injectable()
export class SandboxService {
  private readonly logger = new Logger('SandboxService');
  private readonly inFlight = new Map<number, boolean>();
  private static readonly INTERVAL_MS = 400; // 防止刷屏

  constructor(
    @Inject(Storage) private readonly storage: Storage,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly promptBuilder: PromptBuilder,
    private readonly events: EventEmitter2,
  ) {
    this.bindEvents();
  }

  private bindEvents() {
    this.events.on('sandbox.A.replied', (e: SpeakerEvent) => this.scheduleNext(e.sessionId, 'b'));
    this.events.on('sandbox.B.replied', (e: SpeakerEvent) => this.scheduleNext(e.sessionId, 'a'));
  }

  async handle(cmd: {
    action: 'start' | 'pause' | 'resume' | 'reset' | 'inject';
    sessionId: number;
    event?: string;
  }): Promise<{ state: SessionState }> {
    const session = await this.storage.getSession(cmd.sessionId);
    if (!session) throw new NotFoundException('会话不存在');

    switch (cmd.action) {
      case 'start': {
        await this.storage.updateSessionState(session.id, 'running');
        this.events.emit('sandbox.A.replied', { sessionId: session.id, target: 'a' });
        return { state: 'running' };
      }
      case 'pause': {
        await this.storage.updateSessionState(session.id, 'paused');
        return { state: 'paused' };
      }
      case 'resume': {
        await this.storage.updateSessionState(session.id, 'running');
        // 从 nextSpeaker 恢复；若空则默认 A
        const target: CharacterTarget = (session.nextSpeaker as CharacterTarget) ?? 'a';
        this.events.emit(`sandbox.${target.toUpperCase()}.replied`, {
          sessionId: session.id,
          target,
        });
        return { state: 'running' };
      }
      case 'reset': {
        await this.storage.resetSession(session.id);
        return { state: 'idle' };
      }
      case 'inject': {
        if (!cmd.event?.trim()) {
          throw new NotFoundException('事件内容不能为空');
        }
        await this.storage.appendMessage({
          sessionId: session.id,
          role: 'system',
          content: `【事件注入】${cmd.event}`,
        });
        return { state: session.state };
      }
    }
  }

  private scheduleNext(sessionId: number, nextTarget: CharacterTarget) {
    if (this.inFlight.get(sessionId)) {
      // 同会话已有 LLM 调用在进行：排队（这里简单丢弃，由事件循环下一轮重发）
      return;
    }
    this.inFlight.set(sessionId, true);
    setTimeout(() => {
      void this.runOneTurn(sessionId, nextTarget).finally(() => {
        this.inFlight.set(sessionId, false);
      });
    }, SandboxService.INTERVAL_MS);
  }

  private async runOneTurn(sessionId: number, target: CharacterTarget) {
    const session = await this.storage.getSession(sessionId);
    if (!session) return;
    if (session.state !== 'running') return;
    if (session.currentRound >= session.maxRounds) {
      await this.storage.updateSessionState(session.id, 'ended');
      return;
    }

    const story = await this.storage.getStory(session.storyId);
    if (!story) return;
    const selfId = target === 'a' ? session.charAId : session.charBId;
    const peerId = target === 'a' ? session.charBId : session.charAId;
    const [self, peer] = await Promise.all([
      this.storage.getCharacter(selfId),
      this.storage.getCharacter(peerId),
    ]);
    if (!self || !peer) return;

    const history = await this.storage.listMessages({ sessionId, limit: 200 });
    const params = this.promptBuilder.build({ story, self, peer, history });

    let buffer = '';
    try {
      const stream = this.llm.stream({ system: params.system, history: params.history });
      for await (const chunk of stream) {
        if (chunk.delta) buffer += chunk.delta;
        if (chunk.done) break;
      }
    } catch (err) {
      this.logger.error(`沙盒 LLM 调用失败：${(err as Error).message}`);
      await this.storage.updateSessionState(sessionId, 'paused');
      return;
    }

    if (!buffer.trim()) {
      await this.storage.updateSessionState(sessionId, 'paused');
      return;
    }

    await this.storage.appendMessage({
      sessionId,
      role: target === 'a' ? 'char_a' : 'char_b',
      target,
      content: buffer,
    });
    await this.storage.incrementRound(sessionId);
    this.events.emit(`sandbox.${target.toUpperCase()}.replied`, { sessionId, target });
  }
}
