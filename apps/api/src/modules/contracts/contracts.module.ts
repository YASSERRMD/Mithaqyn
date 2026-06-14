import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [MulterModule.register({})],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
