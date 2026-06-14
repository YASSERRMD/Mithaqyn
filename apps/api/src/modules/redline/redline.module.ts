import { Module } from '@nestjs/common';
import { RedlineController } from './redline.controller';
import { RedlineService } from './redline.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [RedlineController],
  providers: [RedlineService],
  exports: [RedlineService],
})
export class RedlineModule {}
