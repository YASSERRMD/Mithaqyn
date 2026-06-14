import { Module } from '@nestjs/common';
import { EmbeddingsController } from './embeddings.controller';
import { EmbeddingsService } from './embeddings.service';
import { ChunkingService } from './chunking.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [EmbeddingsController],
  providers: [EmbeddingsService, ChunkingService],
  exports: [EmbeddingsService, ChunkingService],
})
export class EmbeddingsModule {}
