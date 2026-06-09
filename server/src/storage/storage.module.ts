import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character, Message, Session, Story } from '../database/entities';
import { STORAGE } from './storage.interface';
import { TypeOrmStorageService } from './typeorm-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Story, Character, Session, Message])],
  providers: [
    TypeOrmStorageService,
    { provide: STORAGE, useExisting: TypeOrmStorageService },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
