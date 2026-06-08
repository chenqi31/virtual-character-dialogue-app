import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Character, Message, Session, Story } from '../database/entities';
import {
  AppendMessageInput,
  CreateCharacterInput,
  CreateSessionInput,
  CreateStoryInput,
  ListMessagesQuery,
  Storage,
  UpdateCharacterInput,
  UpdateStoryInput,
} from './storage.interface';

@Injectable()
export class TypeOrmStorageService implements Storage {
  constructor(
    @InjectRepository(Story) private readonly storyRepo: Repository<Story>,
    @InjectRepository(Character) private readonly characterRepo: Repository<Character>,
    @InjectRepository(Session) private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
  ) {}

  // ---------------- stories ----------------
  async createStory(input: CreateStoryInput): Promise<Story> {
    const story = this.storyRepo.create(input);
    return this.storyRepo.save(story);
  }

  async updateStory(id: number, input: UpdateStoryInput): Promise<Story | null> {
    const found = await this.storyRepo.findOne({ where: { id } });
    if (!found) return null;
    Object.assign(found, input);
    return this.storyRepo.save(found);
  }

  async deleteStory(id: number): Promise<boolean> {
    // 外键 ON DELETE CASCADE 自动级联清理 characters / sessions / messages
    const res = await this.storyRepo.delete({ id });
    return (res.affected ?? 0) > 0;
  }

  async listStories(): Promise<Story[]> {
    return this.storyRepo.find({ order: { updatedAt: 'DESC' } });
  }

  async getStory(id: number): Promise<Story | null> {
    return this.storyRepo.findOne({ where: { id } });
  }

  // ---------------- characters ----------------
  async createCharacter(input: CreateCharacterInput): Promise<Character> {
    const exists = await this.characterRepo.findOne({
      where: { storyId: input.storyId, name: input.name },
    });
    if (exists) {
      throw new ConflictException('同一故事下人物名称已存在');
    }
    const character = this.characterRepo.create({
      ...input,
      traits: input.traits ?? [],
      initialRelation: input.initialRelation ?? '',
    });
    return this.characterRepo.save(character);
  }

  async updateCharacter(id: number, input: UpdateCharacterInput): Promise<Character | null> {
    const found = await this.characterRepo.findOne({ where: { id } });
    if (!found) return null;
    if (input.name && input.name !== found.name) {
      const dup = await this.characterRepo.findOne({
        where: { storyId: found.storyId, name: input.name },
      });
      if (dup) throw new ConflictException('同一故事下人物名称已存在');
    }
    Object.assign(found, input);
    return this.characterRepo.save(found);
  }

  async deleteCharacter(id: number, opts?: { allowIfReferenced?: boolean }): Promise<boolean> {
    if (!opts?.allowIfReferenced) {
      const referenced = await this.isCharacterReferenced(id);
      if (referenced) {
        throw new ConflictException('人物仍被会话引用，无法删除');
      }
    }
    const res = await this.characterRepo.delete({ id });
    return (res.affected ?? 0) > 0;
  }

  async listCharacters(storyId: number): Promise<Character[]> {
    return this.characterRepo.find({
      where: { storyId },
      order: { createdAt: 'ASC' },
    });
  }

  async getCharacter(id: number): Promise<Character | null> {
    return this.characterRepo.findOne({ where: { id } });
  }

  async isCharacterReferenced(id: number): Promise<boolean> {
    const count = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.charAId = :id OR s.charBId = :id', { id })
      .getCount();
    return count > 0;
  }

  // ---------------- sessions ----------------
  async createSession(input: CreateSessionInput): Promise<Session> {
    if (input.charAId === input.charBId) {
      throw new ConflictException('沙盒会话的两个人物不能相同');
    }
    const a = await this.characterRepo.findOne({ where: { id: input.charAId } });
    const b = await this.characterRepo.findOne({ where: { id: input.charBId } });
    if (!a || !b) throw new NotFoundException('指定人物不存在');
    if (a.storyId !== input.storyId || b.storyId !== input.storyId) {
      throw new ConflictException('人物与故事不匹配');
    }
    const session = this.sessionRepo.create({
      storyId: input.storyId,
      charAId: input.charAId,
      charBId: input.charBId,
      mode: input.mode ?? 'sandbox',
      maxRounds: input.maxRounds ?? 20,
    });
    return this.sessionRepo.save(session);
  }

  async getSession(id: number): Promise<Session | null> {
    return this.sessionRepo.findOne({ where: { id } });
  }

  async resetSession(id: number): Promise<Session | null> {
    const found = await this.sessionRepo.findOne({ where: { id } });
    if (!found) return null;
    await this.messageRepo.delete({ sessionId: id });
    found.state = 'idle';
    found.currentRound = 0;
    found.nextSpeaker = undefined;
    return this.sessionRepo.save(found);
  }

  async clearMessages(sessionId: number): Promise<void> {
    await this.messageRepo.delete({ sessionId });
  }

  async updateSessionState(id: number, state: Session['state']): Promise<Session | null> {
    const found = await this.sessionRepo.findOne({ where: { id } });
    if (!found) return null;
    found.state = state;
    return this.sessionRepo.save(found);
  }

  async incrementRound(id: number): Promise<Session | null> {
    const found = await this.sessionRepo.findOne({ where: { id } });
    if (!found) return null;
    found.currentRound += 1;
    if (found.currentRound >= found.maxRounds) {
      found.state = 'ended';
    }
    return this.sessionRepo.save(found);
  }

  async listSessionsByStory(storyId: number): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { storyId },
      order: { updatedAt: 'DESC' },
    });
  }

  // ---------------- messages ----------------
  async appendMessage(input: AppendMessageInput): Promise<Message> {
    const msg = this.messageRepo.create(input);
    return this.messageRepo.save(msg);
  }

  async listMessages(query: ListMessagesQuery): Promise<Message[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.sessionId = :sid', { sid: query.sessionId });
    if (query.beforeId !== undefined) {
      qb.andWhere('m.id < :beforeId', { beforeId: query.beforeId });
    }
    return qb.orderBy('m.id', 'ASC').take(limit).getMany();
  }
}
