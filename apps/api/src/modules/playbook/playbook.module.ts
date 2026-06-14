import { Module } from '@nestjs/common';
import { PlaybookController } from './playbook.controller';
import { PlaybookService } from './playbook.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [PlaybookController],
  providers: [PlaybookService],
  exports: [PlaybookService],
})
export class PlaybookModule {}
