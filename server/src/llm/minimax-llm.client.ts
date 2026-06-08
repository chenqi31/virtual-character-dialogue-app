import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmChatChunk, LlmChatParams, LlmClient, LlmStream } from './llm.types';

/**
 * minimax 实现：调用 OpenAI 兼容的 /v1/chat/completions，开启 stream=true。
 * 通过 fetch + AbortSignal 支持客户端断开时中止上游。
 */
@Injectable()
export class MinimaxLlmClient implements LlmClient, OnModuleInit {
  private readonly logger = new Logger('MinimaxLlmClient');
  private baseUrl!: string;
  private apiKey!: string;
  private defaultModel!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.baseUrl = (this.config.get<string>('MINIMAX_BASE_URL') || 'https://api.minimax.chat/v1').replace(
      /\/$/,
      '',
    );
    this.apiKey = this.config.get<string>('MINIMAX_API_KEY') || '';
    this.defaultModel = this.config.get<string>('MINIMAX_MODEL') || 'abab6.5s-chat';
    if (!this.apiKey) {
      this.logger.warn('MINIMAX_API_KEY 未配置，LLM 调用将失败；请在 .env 或 <userData>/config.json 中设置');
    }
  }

  stream(params: LlmChatParams): LlmStream {
    const controller = new AbortController();
    if (params.signal) {
      if (params.signal.aborted) controller.abort();
      else params.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const body = {
      model: params.model || this.defaultModel,
      stream: true,
      messages: [{ role: 'system', content: params.system }, ...params.history],
    };
    if (params.userInput) {
      body.messages.push({ role: 'user', content: params.userInput });
    }

    const url = `${this.baseUrl}/chat/completions`;
    const iterator = this.run(url, body, controller.signal);
    return {
      [Symbol.asyncIterator]: () => iterator[Symbol.asyncIterator](),
      abort: () => controller.abort(),
    };
  }

  private async *run(url: string, body: unknown, signal: AbortSignal): AsyncGenerator<LlmChatChunk> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      this.logger.error(`LLM 请求失败: ${(err as Error).message}`);
      throw err;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`LLM 响应非 2xx：${res.status} ${text.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        // SSE 格式：data: {...}\n\n
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith('data:')) continue;
          const payload = raw.slice(5).trim();
          if (payload === '[DONE]') {
            yield { delta: '', done: true };
            return;
          }
          try {
            const obj = JSON.parse(payload);
            const choice = obj?.choices?.[0];
            const delta = choice?.delta?.content ?? '';
            if (delta) yield { delta, done: false };
            if (choice?.finish_reason) {
              yield { delta: '', done: true };
              return;
            }
          } catch {
            // 忽略不完整 JSON，下一轮再解析
          }
        }
      }
      yield { delta: '', done: true };
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }
  }
}
