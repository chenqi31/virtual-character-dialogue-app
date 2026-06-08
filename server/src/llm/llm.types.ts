import { CharacterTarget } from '../database/entities';

export interface LlmMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface LlmChatParams {
  system: string;
  history: LlmMessageInput[];
  userInput?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface LlmChatChunk {
  delta: string;
  done: boolean;
}

/**
 * 抽象 LLM 客户端接口。minimax 走 OpenAI 兼容 chat completions。
 * 通过 LlmClient 暴露 stream() 返回 AsyncIterable；上层包成 Observable。
 */
export interface LlmStream {
  [Symbol.asyncIterator](): AsyncIterator<LlmChatChunk>;
  abort(): void;
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');

export interface LlmClient {
  stream(params: LlmChatParams): LlmStream;
}

export type LlmTarget = CharacterTarget;
