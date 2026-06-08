import type {
  Character,
  HealthInfo,
  Message,
  Session,
  Story,
} from '@shared/index';
import { streamChat, type StreamHandlers } from './sse';

const baseUrl = ''; // 通过 vite 代理转发到 127.0.0.1:7001

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(baseUrl + input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  // stories
  listStories: () => jsonFetch<Story[]>('/api/stories'),
  getStory: (id: number) => jsonFetch<Story>(`/api/stories/${id}`),
  createStory: (data: { title: string; background: string }) =>
    jsonFetch<Story>('/api/stories', { method: 'POST', body: JSON.stringify(data) }),
  updateStory: (id: number, data: Partial<Story>) =>
    jsonFetch<Story>(`/api/stories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStory: (id: number) => jsonFetch<{ ok: true }>(`/api/stories/${id}`, { method: 'DELETE' }),

  // characters
  listCharacters: (storyId: number) =>
    jsonFetch<Character[]>(`/api/characters?storyId=${storyId}`),
  getCharacter: (id: number) => jsonFetch<Character>(`/api/characters/${id}`),
  createCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) =>
    jsonFetch<Character>('/api/characters', { method: 'POST', body: JSON.stringify(data) }),
  updateCharacter: (id: number, data: Partial<Character>) =>
    jsonFetch<Character>(`/api/characters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCharacter: (id: number) =>
    jsonFetch<{ ok: true }>(`/api/characters/${id}`, { method: 'DELETE' }),

  // sessions
  listSessions: (storyId: number) =>
    jsonFetch<Session[]>(`/api/sessions?storyId=${storyId}`),
  createSession: (data: { storyId: number; charAId: number; charBId: number; maxRounds?: number }) =>
    jsonFetch<Session>('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getSession: (id: number) => jsonFetch<Session>(`/api/sessions/${id}`),
  resetSession: (id: number) =>
    jsonFetch<Session>(`/api/sessions/${id}/reset`, { method: 'POST' }),
  clearMessages: (id: number) =>
    jsonFetch<{ ok: true }>(`/api/sessions/${id}/clear`, { method: 'POST' }),

  // messages
  listMessages: (sessionId: number, limit = 100, beforeId?: number) =>
    jsonFetch<Message[]>(
      `/api/messages?sessionId=${sessionId}&limit=${limit}${beforeId ? `&beforeId=${beforeId}` : ''}`,
    ),
  appendMessage: (data: { sessionId: number; role: 'user' | 'system'; content: string }) =>
    jsonFetch<Message>('/api/messages', { method: 'POST', body: JSON.stringify(data) }),

  // sandbox
  sandboxCommand: (cmd: {
    action: 'start' | 'pause' | 'resume' | 'reset' | 'inject';
    sessionId: number;
    event?: string;
  }) => jsonFetch<{ state: string }>('/api/sandbox', { method: 'POST', body: JSON.stringify(cmd) }),

  // llm stream
  streamChat: (
    data: { sessionId: number; target: 'a' | 'b'; userInput?: string; injectEvent?: string },
    handlers: StreamHandlers,
  ) => streamChat('/api/llm/chat', data, handlers),

  // health
  getHealth: () => jsonFetch<HealthInfo & { info: Record<string, unknown> }>('/health'),
};
