import { Module, Provider } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { MinimaxLlmClient } from './minimax-llm.client';
import { PromptBuilder } from './prompt.builder';
import { StorageModule } from '../storage/storage.module';
import { LLM_CLIENT } from './llm.types';

const llmProvider: Provider = {
  provide: LLM_CLIENT,
  useClass: MinimaxLlmClient,
};

@Module({
  imports: [StorageModule],
  controllers: [LlmController],
  providers: [llmProvider, MinimaxLlmClient, PromptBuilder],
  exports: [PromptBuilder, LLM_CLIENT],
})
export class LlmModule {}
