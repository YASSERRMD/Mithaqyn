import { Module } from '@nestjs/common';
import { ClausesController } from './clauses.controller';
import { ClausesService } from './clauses.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [ClausesController],
  providers: [ClausesService],
  exports: [ClausesService],
})
export class ClausesModule {}
