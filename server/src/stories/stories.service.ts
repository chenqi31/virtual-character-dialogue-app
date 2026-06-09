import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STORAGE, Storage } from '../storage/storage.interface';
import { CreateStoryDto, UpdateStoryDto } from './stories.dto';
import { Story } from '../database/entities';

@Injectable()
export class StoriesService {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  async create(input: CreateStoryDto): Promise<Story> {
    if (!input.title?.trim()) {
      throw new NotFoundException('标题不能为空');
    }
    return this.storage.createStory(input);
  }

  async update(id: number, input: UpdateStoryDto): Promise<Story> {
    const updated = await this.storage.updateStory(id, input);
    if (!updated) throw new NotFoundException('故事不存在');
    return updated;
  }

  async remove(id: number): Promise<{ ok: true }> {
    const ok = await this.storage.deleteStory(id);
    if (!ok) throw new NotFoundException('故事不存在');
    return { ok: true };
  }

  list(): Promise<Story[]> {
    return this.storage.listStories();
  }

  async get(id: number): Promise<Story> {
    const story = await this.storage.getStory(id);
    if (!story) throw new NotFoundException('故事不存在');
    return story;
  }
}
