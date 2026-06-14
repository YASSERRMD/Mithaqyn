import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('ocr')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('documents/:documentId/extract')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Trigger OCR/text extraction for a document' })
  extract(@Param('documentId') documentId: string) {
    return this.ocrService.extractDocument(documentId);
  }

  @Get('documents/:documentId/ocr-jobs')
  @ApiOperation({ summary: 'List OCR jobs for a document' })
  getJobs(@Param('documentId') documentId: string) {
    return this.ocrService.getJobsForDocument(documentId);
  }

  @Get('ocr-jobs/:jobId')
  @ApiOperation({ summary: 'Get OCR job status and pages' })
  getJob(@Param('jobId') jobId: string) {
    return this.ocrService.getJob(jobId);
  }

  @Get('documents/:documentId/pages')
  @ApiOperation({ summary: 'Get extracted pages for a document' })
  getPages(
    @Param('documentId') documentId: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.ocrService.getPages(documentId, jobId);
  }
}
