/**
 * 跨端共享类型。前端 web 与后端 server 均引用。
 * 仅类型与枚举，不放实现，避免引入运行时副作用。
 */

export type SessionMode = 'sandbox' | 'interactive';
export type SessionState = 'idle' | 'running' | 'paused' | 'ended';
export type MessageRole = 'system' | 'char_a' | 'char_b' | 'user';
export type CharacterTarget = 'a' | 'b';

export interface Story {
  id: number;
  title: string;
  background: string;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: number;
  storyId: number;
  name: string;
  persona: string;
  traits: string[];
  initialRelation: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: number;
  storyId: number;
  charAId: number;
  charBId: number;
  mode: SessionMode;
  state: SessionState;
  maxRounds: number;
  currentRound: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  sessionId: number;
  role: MessageRole;
  target: CharacterTarget | null;
  content: string;
  createdAt: string;
}

export interface LlmChatRequest {
  sessionId: number;
  target: CharacterTarget;
  userInput?: string;
  injectEvent?: string;
}

export interface LlmChatChunk {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  messageId?: number;
  error?: string;
}

export interface SandboxCommand {
  action: 'start' | 'pause' | 'resume' | 'reset' | 'inject';
  sessionId: number;
  event?: string;
}

export interface HealthInfo {
  status: 'ok' | 'degraded';
  dbType: 'mysql' | 'sqlite';
  uptime: number;
  timestamp: string;
}
