import { Module } from '@nestjs/common';
import { NegotiationController } from './negotiation.controller';
import { NegotiationService } from './negotiation.service';

@Module({
  controllers: [NegotiationController],
  providers: [NegotiationService],
  exports: [NegotiationService],
})
export class NegotiationModule {}
