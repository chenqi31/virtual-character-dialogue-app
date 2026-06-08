import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/http';
import type { Message, Session, SessionState } from '@/types';
import type { StreamHandle } from '@/api/sse';

export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null);
  const messages = ref<Message[]>([]);
  const state = ref<SessionState>('idle');
  const streamingFromChar = ref<'a' | 'b' | null>(null);
  let streamHandle: StreamHandle | null = null;
  const streamingBuffer = ref<Record<number, string>>({}); // 临时流式缓冲

  async function load(id: number) {
    session.value = await api.getSession(id);
    state.value = session.value.state;
    messages.value = await api.listMessages(id);
  }

  async function refreshMessages() {
    if (!session.value) return;
    messages.value = await api.listMessages(session.value.id);
  }

  async function command(action: 'start' | 'pause' | 'resume' | 'reset' | 'inject', event?: string) {
    if (!session.value) return;
    const res = await api.sandboxCommand({ action, sessionId: session.value.id, event });
    state.value = res.state as SessionState;
  }

  function sendUserInput(target: 'a' | 'b', text: string) {
    if (!session.value || !text.trim()) return;
    if (streamHandle) streamHandle.abort();
    streamingFromChar.value = target;
    streamHandle = api.streamChat(
      { sessionId: session.value.id, target, userInput: text },
      {
        onDelta: (d) => {
          // 临时缓冲：等到 done 再 commit 一条 message
          // 简化处理：维护一个 lastTempId
        },
        onDone: async () => {
          streamingFromChar.value = null;
          streamHandle = null;
          await refreshMessages();
        },
        onError: () => {
          streamingFromChar.value = null;
          streamHandle = null;
        },
      },
    );
  }

  function stop() {
    streamHandle?.abort();
    streamHandle = null;
    streamingFromChar.value = null;
  }

  async function reset() {
    if (!session.value) return;
    stop();
    session.value = await api.resetSession(session.value.id);
    messages.value = [];
    state.value = 'idle';
  }

  async function clearContext() {
    if (!session.value) return;
    await api.clearMessages(session.value.id);
    messages.value = [];
  }

  return {
    session,
    messages,
    state,
    streamingFromChar,
    streamingBuffer,
    load,
    refreshMessages,
    command,
    sendUserInput,
    stop,
    reset,
    clearContext,
  };
});
