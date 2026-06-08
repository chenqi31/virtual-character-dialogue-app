import {
  Character,
  CharacterTarget,
  Message,
  MessageRole,
  Session,
  SessionMode,
  SessionState,
  Story,
} from '../database/entities';

/**
 * 业务层与具体数据库驱动解耦的统一存储接口。
 * 由 Nest 根据 DB_TYPE 注入 TypeOrmStorageService（mysql | sqlite）。
 */
export interface CreateStoryInput {
  title: string;
  background: string;
}

export interface UpdateStoryInput {
  title?: string;
  background?: string;
}

export interface CreateCharacterInput {
  storyId: number;
  name: string;
  persona: string;
  traits?: string[];
  initialRelation?: string;
  avatar?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  persona?: string;
  traits?: string[];
  initialRelation?: string;
  avatar?: string;
}

export interface CreateSessionInput {
  storyId: number;
  charAId: number;
  charBId: number;
  mode?: SessionMode;
  maxRounds?: number;
}

export interface AppendMessageInput {
  sessionId: number;
  role: MessageRole;
  target?: CharacterTarget;
  content: string;
}

export interface ListMessagesQuery {
  sessionId: number;
  limit?: number;
  beforeId?: number;
}

export interface Storage {
  // stories
  createStory(input: CreateStoryInput): Promise<Story>;
  updateStory(id: number, input: UpdateStoryInput): Promise<Story | null>;
  deleteStory(id: number): Promise<boolean>;
  listStories(): Promise<Story[]>;
  getStory(id: number): Promise<Story | null>;

  // characters
  createCharacter(input: CreateCharacterInput): Promise<Character>;
  updateCharacter(id: number, input: UpdateCharacterInput): Promise<Character | null>;
  deleteCharacter(id: number, opts?: { allowIfReferenced?: boolean }): Promise<boolean>;
  listCharacters(storyId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | null>;
  isCharacterReferenced(id: number): Promise<boolean>;

  // sessions
  createSession(input: CreateSessionInput): Promise<Session>;
  getSession(id: number): Promise<Session | null>;
  resetSession(id: number): Promise<Session | null>;
  clearMessages(sessionId: number): Promise<void>;
  updateSessionState(id: number, state: SessionState): Promise<Session | null>;
  incrementRound(id: number): Promise<Session | null>;
  listSessionsByStory(storyId: number): Promise<Session[]>;

  // messages
  appendMessage(input: AppendMessageInput): Promise<Message>;
  listMessages(query: ListMessagesQuery): Promise<Message[]>;
}
