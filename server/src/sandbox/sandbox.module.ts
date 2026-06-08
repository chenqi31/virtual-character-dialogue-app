import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { StorageModule } from '../storage/storage.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [StorageModule, LlmModule],
  controllers: [SandboxController],
  providers: [SandboxService],
})
export class SandboxModule {}
