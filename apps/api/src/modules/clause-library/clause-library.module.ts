import { Module } from '@nestjs/common';
import { ClauseLibraryController } from './clause-library.controller';
import { ClauseLibraryService } from './clause-library.service';

@Module({
  controllers: [ClauseLibraryController],
  providers: [ClauseLibraryService],
  exports: [ClauseLibraryService],
})
export class ClauseLibraryModule {}
