import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character, Message, Session, Story } from '../database/entities';
import { Storage } from './storage.interface';
import { TypeOrmStorageService } from './typeorm-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Story, Character, Session, Message])],
  providers: [
    TypeOrmStorageService,
    { provide: Storage, useExisting: TypeOrmStorageService },
  ],
  exports: [Storage],
})
export class StorageModule {}
