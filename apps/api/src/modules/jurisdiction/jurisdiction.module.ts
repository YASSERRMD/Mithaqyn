import { Module } from '@nestjs/common';
import { JurisdictionController } from './jurisdiction.controller';
import { JurisdictionService } from './jurisdiction.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [JurisdictionController],
  providers: [JurisdictionService],
  exports: [JurisdictionService],
})
export class JurisdictionModule {}
