import { Module } from '@nestjs/common';
import { ObligationsController } from './obligations.controller';
import { ObligationsService } from './obligations.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [ObligationsController],
  providers: [ObligationsService],
  exports: [ObligationsService],
})
export class ObligationsModule {}
