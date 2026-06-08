import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Storage } from '../storage/storage.interface';
import { CreateSessionDto } from './sessions.dto';
import { Session, SessionState } from '../database/entities';

@Injectable()
export class SessionsService {
  constructor(@Inject(Storage) private readonly storage: Storage) {}

  create(input: CreateSessionDto): Promise<Session> {
    return this.storage.createSession(input);
  }

  async get(id: number): Promise<Session> {
    const s = await this.storage.getSession(id);
    if (!s) throw new NotFoundException('会话不存在');
    return s;
  }

  async reset(id: number): Promise<Session> {
    const s = await this.storage.resetSession(id);
    if (!s) throw new NotFoundException('会话不存在');
    return s;
  }

  async clearMessages(id: number): Promise<{ ok: true }> {
    await this.get(id);
    await this.storage.clearMessages(id);
    return { ok: true };
  }

  async updateState(id: number, state: SessionState): Promise<Session> {
    const s = await this.storage.updateSessionState(id, state);
    if (!s) throw new NotFoundException('会话不存在');
    return s;
  }

  listByStory(storyId: number): Promise<Session[]> {
    return this.storage.listSessionsByStory(storyId);
  }
}
