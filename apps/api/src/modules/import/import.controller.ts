import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { Express } from 'express';
import { ImportService, UploadedFile as ImportFile } from './import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class ImportUrlDto {
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  counterpartyName?: string;
}

class ImportUploadDto {
  @IsOptional()
  @IsString()
  counterpartyName?: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('import')
@Controller('import')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('url')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Import a contract from a URL' })
  async importFromUrl(
    @Body() dto: ImportUrlDto,
    @CurrentUser() user: { id: string },
  ) {
    const job = await this.importService.createImportJob(
      {
        source: 'URL',
        sourceRef: dto.url,
        metadata: { url: dto.url, counterpartyName: dto.counterpartyName },
      },
      user.id,
    );

    // Process asynchronously — don't await to keep the response fast
    this.importService
      .processUrlImport(job.id, dto.url, dto.counterpartyName)
      .catch((err: Error) => {
        // Already handled inside service (status set to FAILED)
        void err;
      });

    return { jobId: job.id, status: 'PENDING', message: 'Import job queued' };
  }

  @Post('upload')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import a contract from a local file upload' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        counterpartyName: { type: 'string' },
      },
      required: ['file'],
    },
  })
  async importFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportUploadDto,
    @CurrentUser() user: { id: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadedFile: ImportFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      path: file.path,
      size: file.size,
    };

    const job = await this.importService.createImportJob(
      {
        source: 'LOCAL_UPLOAD',
        fileName: file.originalname,
        mimeType: file.mimetype,
        metadata: { originalName: file.originalname, size: file.size, counterpartyName: dto.counterpartyName },
      },
      user.id,
    );

    // Process asynchronously
    this.importService
      .processLocalImport(job.id, uploadedFile, dto.counterpartyName)
      .catch((err: Error) => {
        void err;
      });

    return { jobId: job.id, status: 'PENDING', message: 'File upload queued for processing' };
  }

  @Get('jobs')
  @Roles('VIEWER', 'AUDITOR', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all import jobs for the current user' })
  getJobs(@CurrentUser() user: { id: string }) {
    return this.importService.getJobs(user.id);
  }

  @Get('jobs/:id')
  @Roles('VIEWER', 'AUDITOR', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get a single import job by ID' })
  getJob(@Param('id') id: string) {
    return this.importService.getJob(id);
  }

  @Post('jobs/:id/retry')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Retry a failed import job' })
  retryJob(@Param('id') id: string) {
    return this.importService.retryJob(id);
  }
}
