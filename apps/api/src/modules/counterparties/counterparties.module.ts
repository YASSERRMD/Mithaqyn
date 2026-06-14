import { Module } from '@nestjs/common';
import { CounterpartiesController } from './counterparties.controller';
import { CounterpartiesService } from './counterparties.service';
import { VendorIntelligenceService } from './vendor-intelligence.service';

@Module({
  controllers: [CounterpartiesController],
  providers: [CounterpartiesService, VendorIntelligenceService],
  exports: [CounterpartiesService, VendorIntelligenceService],
})
export class CounterpartiesModule {}
