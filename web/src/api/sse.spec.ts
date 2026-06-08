import { describe, it, expect, vi } from 'vitest';
import { streamChat } from './sse';

function makeSseResponse(events: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      for (const e of events) {
        controller.enqueue(enc.encode(`data: ${e}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('streamChat（SSE 解析）', () => {
  it('解析 delta/done 事件并按顺序调用回调', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([
        JSON.stringify({ type: 'delta', delta: '你好' }),
        JSON.stringify({ type: 'delta', delta: '，世界' }),
        JSON.stringify({ type: 'done', messageId: 42 }),
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const deltas: string[] = [];
    const done = vi.fn();
    const error = vi.fn();
    await new Promise<void>((resolve) => {
      streamChat(
        '/api/llm/chat',
        { sessionId: 1, target: 'a' },
        {
          onDelta: (d) => deltas.push(d),
          onDone: (id) => { done(id); resolve(); },
          onError: (e) => { error(e); resolve(); },
        },
      );
    });

    expect(deltas.join('')).toBe('你好，世界');
    expect(done).toHaveBeenCalledWith(42);
    expect(error).not.toHaveBeenCalled();
  });

  it('error 事件触发 onError 回调', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      makeSseResponse([JSON.stringify({ type: 'error', error: 'boom' })]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const error = vi.fn();
    await new Promise<void>((resolve) => {
      streamChat('/api/llm/chat', { sessionId: 1, target: 'a' }, {
        onDelta: () => undefined,
        onError: (e) => { error(e); resolve(); },
      });
    });
    expect(error).toHaveBeenCalled();
    expect(error.mock.calls[0][0].message).toContain('boom');
  });

  it('abort() 中止 fetch', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    vi.stubGlobal('fetch', fetchMock);

    const handle = streamChat('/api/llm/chat', { sessionId: 1, target: 'a' }, {
      onDelta: () => undefined,
      onError: () => undefined,
    });
    // 验证可被调用而不抛错
    expect(() => handle.abort()).not.toThrow();
  });
});
