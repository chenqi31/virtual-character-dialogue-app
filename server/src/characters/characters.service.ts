import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Storage } from '../storage/storage.interface';
import { CreateCharacterDto, UpdateCharacterDto } from './characters.dto';
import { Character } from '../database/entities';

@Injectable()
export class CharactersService {
  constructor(@Inject(Storage) private readonly storage: Storage) {}

  async create(input: CreateCharacterDto): Promise<Character> {
    return this.storage.createCharacter(input);
  }

  async update(id: number, input: UpdateCharacterDto): Promise<Character> {
    const updated = await this.storage.updateCharacter(id, input);
    if (!updated) throw new NotFoundException('人物不存在');
    return updated;
  }

  async remove(id: number): Promise<{ ok: true }> {
    const ok = await this.storage.deleteCharacter(id, { allowIfReferenced: false });
    if (!ok) throw new NotFoundException('人物不存在');
    return { ok: true };
  }

  listByStory(storyId: number): Promise<Character[]> {
    return this.storage.listCharacters(storyId);
  }

  async get(id: number): Promise<Character> {
    const c = await this.storage.getCharacter(id);
    if (!c) throw new NotFoundException('人物不存在');
    return c;
  }
}
