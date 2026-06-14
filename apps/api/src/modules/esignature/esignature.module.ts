import { Module } from '@nestjs/common';
import { EsignatureController } from './esignature.controller';
import { EsignatureService } from './esignature.service';

@Module({
  controllers: [EsignatureController],
  providers: [EsignatureService],
  exports: [EsignatureService],
})
export class EsignatureModule {}
