import { Inject, Injectable } from '@nestjs/common';
import { encode } from 'gpt-tokenizer';
import { Character, Message, Story } from '../database/entities';
import { STORAGE, Storage } from '../storage/storage.interface';
import { LlmChatParams, LlmMessageInput } from './llm.types';

export interface BuildPromptInput {
  story: Story;
  self: Character;       // 当前要生成回复的角色
  peer: Character;       // 另一角色
  history: Message[];    // 该会话的全部历史
  injectEvent?: string;
  modelContextLimit?: number; // 上下文 token 上限，默认 8000
}

/**
 * PromptBuilder：分层拼装 + 基于 token 预算的动态裁剪。
 * - 系统提示 = 故事背景 + 双方人设 + 输出格式约束
 * - 固定保留：系统提示
 * - 历史优先：最近 3-5 轮 + system 注入事件（视为剧情锚点）
 * - 超出 token 预算时按时间从远到近丢弃更早轮次
 */
@Injectable()
export class PromptBuilder {
  // 经验值：minimax chat completions 上下文通常 8k-32k；按 8k 保守裁剪
  private static readonly DEFAULT_TOKEN_LIMIT = 8000;
  private static readonly SYSTEM_RESERVED = 1500; // 给系统提示词预留
  private static readonly ANCHOR_ROUNDS = 5;

  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  build(input: BuildPromptInput): LlmChatParams {
    const system = this.composeSystem(input);
    const limit = input.modelContextLimit ?? PromptBuilder.DEFAULT_TOKEN_LIMIT;
    const history = this.trimHistory(input.history, limit - PromptBuilder.SYSTEM_RESERVED, input.injectEvent);
    return { system, history };
  }

  /** 仅组装系统提示（便于单测） */
  composeSystem(input: BuildPromptInput): string {
    const { story, self, peer } = input;
    return [
      '【角色扮演】你正在参与一段中文对话。请严格保持角色人设，输出简短口语化（单条不超过 80 字），不要复述对方的话，不要使用旁白。',
      `【故事背景】\n${story.background || '（未提供）'}`,
      `【你正在扮演】${self.name}`,
      `【人设】${self.persona}`,
      self.initialRelation
        ? `【你与 ${peer.name} 的初始关系】${self.initialRelation}`
        : '',
      self.traits?.length ? `【性格标签】${self.traits.join('、')}` : '',
      `【对话对方】${peer.name}：${peer.persona}`,
      '【输出格式】仅输出一行角色台词，不要加引号或角色名前缀。',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /** 按 token 预算裁剪历史；injectEvent 作为 system 角色锚点保留 */
  trimHistory(messages: Message[], budget: number, injectEvent?: string): LlmMessageInput[] {
    const ordered = [...messages].sort((a, b) => a.id - b.id);
    const systemInject: LlmMessageInput[] = injectEvent
      ? [{ role: 'system', content: `【事件注入】${injectEvent}` }]
      : [];

    // 历史为空时，插入一条 user 消息作为对话触发（MiniMax 等部分 API 不接受仅有 system 的请求）
    if (ordered.length === 0 && systemInject.length === 0) {
      return [{ role: 'user', content: '请开始对话。' }];
    }

    // 末段：最近 ANCHOR_ROUNDS 轮（按 char_a/char_b/user 成对划分）恒保留
    const tail = this.takeTailRounds(ordered, PromptBuilder.ANCHOR_ROUNDS);

    // 中段：从远到近累积，遇超预算停止
    let middle: Message[] = [];
    const headOrdered = ordered.slice(0, ordered.length - tail.length);
    for (let i = headOrdered.length - 1; i >= 0; i--) {
      const candidate = [...headOrdered.slice(0, i + 1), ...tail];
      const tokens = this.countTokens([...systemInject, ...this.toLlm(candidate)]);
      if (tokens <= budget) {
        middle = headOrdered.slice(0, i + 1);
        break;
      }
      if (i === 0) middle = [];
    }

    const combined = [...systemInject, ...this.toLlm([...middle, ...tail])];
    // 最终保险：超预算则丢弃最旧 system 之外的消息直到满足
    let final = combined;
    while (this.countTokens(final) > budget && final.length > 1) {
      // 至少保留 1 条 tail
      if (final.length <= PromptBuilder.ANCHOR_ROUNDS * 2) break;
      final = final.slice(1);
    }
    return final;
  }

  private toLlm(messages: Message[]): LlmMessageInput[] {
    return messages.map((m) => {
      if (m.role === 'char_a' || m.role === 'char_b') {
        return { role: 'assistant', content: m.content, name: m.role };
      }
      if (m.role === 'user') {
        return { role: 'user', content: m.content, name: 'user' };
      }
      return { role: 'system', content: m.content };
    });
  }

  private takeTailRounds(messages: Message[], rounds: number): Message[] {
    // 一轮 = 同一回合的一组消息（按相邻关系简单切分：遇到 user 或 char_* 都算新一轮）
    // 简化策略：取最后 N*2 条
    const take = rounds * 2;
    return messages.slice(-take);
  }

  private countTokens(messages: LlmMessageInput[]): number {
    const text = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    try {
      return encode(text).length;
    } catch {
      // 兜底：按字符数估算（中文 1.5 字符/token 粗估）
      return Math.ceil(text.length / 1.5);
    }
  }
}
