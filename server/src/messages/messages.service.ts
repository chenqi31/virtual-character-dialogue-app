import { Inject, Injectable } from '@nestjs/common';
import { STORAGE, Storage } from '../storage/storage.interface';
import { AppendMessageDto } from './messages.dto';
import { Message } from '../database/entities';

@Injectable()
export class MessagesService {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  append(dto: AppendMessageDto): Promise<Message> {
    return this.storage.appendMessage({
      sessionId: dto.sessionId,
      role: dto.role,
      target: dto.target,
      content: dto.content,
    });
  }

  list(sessionId: number, limit?: number, beforeId?: number) {
    return this.storage.listMessages({ sessionId, limit, beforeId });
  }
}
