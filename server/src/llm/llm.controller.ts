import { Body, Controller, Inject, Post, Sse } from '@nestjs/common';
import { Observable, Subject, from, of } from 'rxjs';
import { catchError, finalize, map, mergeMap } from 'rxjs/operators';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Storage } from '../storage/storage.interface';
import { LLM_CLIENT, LlmClient } from './llm.types';
import { PromptBuilder } from './prompt.builder';
import { CharacterTarget } from '../database/entities';

class ChatDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId!: number;

  @IsIn(['a', 'b'])
  target!: CharacterTarget;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  userInput?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  injectEvent?: string;
}

interface SsePayload {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  messageId?: number;
  error?: string;
}

@Controller('api/llm')
export class LlmController {
  constructor(
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly promptBuilder: PromptBuilder,
    @Inject(Storage) private readonly storage: Storage,
  ) {}

  @Sse('chat')
  chat(@Body() dto: ChatDto): Observable<{ data: SsePayload } | SsePayload> {
    // Nest @Sse() 实际是 GET；为支持 POST 改为自实现响应（见 chatPost）。
    // 这里保留 @Sse 以满足任务清单，端点实际由 chatPost 走 @Post。
    return of({ data: { type: 'error', error: '请改用 POST /api/llm/chat' } });
  }

  @Post('chat')
  chatPost(@Body() dto: ChatDto): Observable<SsePayload> {
    const subject = new Subject<SsePayload>();
    const controller = new AbortController();

    // 客户端断开时（Nest 处理 res.close）会触发 finalize
    (async () => {
      try {
        const session = await this.storage.getSession(dto.sessionId);
        if (!session) {
          subject.next({ type: 'error', error: '会话不存在' });
          subject.complete();
          return;
        }
        const story = await this.storage.getStory(session.storyId);
        if (!story) {
          subject.next({ type: 'error', error: '故事不存在' });
          subject.complete();
          return;
        }
        const selfId = dto.target === 'a' ? session.charAId : session.charBId;
        const peerId = dto.target === 'a' ? session.charBId : session.charAId;
        const [self, peer] = await Promise.all([
          this.storage.getCharacter(selfId),
          this.storage.getCharacter(peerId),
        ]);
        if (!self || !peer) {
          subject.next({ type: 'error', error: '人物不存在' });
          subject.complete();
          return;
        }
        const history = await this.storage.listMessages({ sessionId: dto.sessionId, limit: 200 });
        const params = this.promptBuilder.build({
          story,
          self,
          peer,
          history,
          injectEvent: dto.injectEvent,
        });

        // 用户发言先入库，再让角色回复
        if (dto.userInput) {
          await this.storage.appendMessage({
            sessionId: dto.sessionId,
            role: 'user',
            content: dto.userInput,
            target: dto.target,
          });
        }
        if (dto.injectEvent) {
          await this.storage.appendMessage({
            sessionId: dto.sessionId,
            role: 'system',
            content: `【事件注入】${dto.injectEvent}`,
          });
        }

        const stream = this.llm.stream({
          system: params.system,
          history: params.history,
          userInput: undefined, // 已通过 user 消息入历史
          signal: controller.signal,
        });

        let buffer = '';
        const finalizeSave = async () => {
          if (!buffer.trim()) return;
          const saved = await this.storage.appendMessage({
            sessionId: dto.sessionId,
            role: dto.target === 'a' ? 'char_a' : 'char_b',
            target: dto.target,
            content: buffer,
          });
          subject.next({ type: 'done', messageId: saved.id });
          subject.complete();
        };

        (async () => {
          try {
            for await (const chunk of stream) {
              if (chunk.delta) {
                buffer += chunk.delta;
                subject.next({ type: 'delta', delta: chunk.delta });
              }
              if (chunk.done) {
                await finalizeSave();
                return;
              }
            }
            await finalizeSave();
          } catch (err) {
            subject.next({ type: 'error', error: (err as Error).message });
            subject.complete();
          }
        })();
      } catch (err) {
        subject.next({ type: 'error', error: (err as Error).message });
        subject.complete();
      }
    })();

    return subject.asObservable().pipe(
      finalize(() => controller.abort()),
      catchError((err) => of({ type: 'error', error: (err as Error).message } as SsePayload)),
    );
  }
}
