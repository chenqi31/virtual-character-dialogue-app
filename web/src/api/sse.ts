/**
 * 基于 fetch + ReadableStream 手动解析 SSE。
 * 支持 POST、自定义 Header、可通过 AbortController 中断。
 */
export interface StreamHandlers {
  onDelta: (text: string) => void;
  onDone?: (messageId?: number) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

export interface StreamHandle {
  abort: () => void;
}

export function streamChat(
  url: string,
  body: unknown,
  handlers: StreamHandlers,
): StreamHandle {
  const controller = new AbortController();
  if (handlers.signal) {
    if (handlers.signal.aborted) controller.abort();
    else handlers.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      handlers.onError?.(err as Error);
      return;
    }
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      handlers.onError?.(new Error(`HTTP ${res.status}: ${text}`));
      return;
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
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw) continue;
          // Nest 风格 SseMessageEvent：data 是 JSON 字符串
          for (const line of raw.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.type === 'delta' && typeof obj.delta === 'string') {
                handlers.onDelta(obj.delta);
              } else if (obj.type === 'done') {
                handlers.onDone?.(obj.messageId);
                return;
              } else if (obj.type === 'error') {
                handlers.onError?.(new Error(obj.error || 'stream error'));
                return;
              }
            } catch {
              // 容错：忽略无法解析的片段
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        handlers.onError?.(err as Error);
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
    }
  })();

  return {
    abort: () => controller.abort(),
  };
}
