import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { AIModule } from '../ai/ai.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [AIModule, EmbeddingsModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
