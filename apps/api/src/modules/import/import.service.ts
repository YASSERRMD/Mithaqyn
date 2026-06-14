import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateImportJobDto {
  source: 'EMAIL_ATTACHMENT' | 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'URL' | 'LOCAL_UPLOAD';
  sourceRef?: string;
  fileName?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  path: string;
  size?: number;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new import job record.
   */
  async createImportJob(dto: CreateImportJobDto, userId: string) {
    return this.prisma.importJob.create({
      data: {
        source: dto.source,
        sourceRef: dto.sourceRef,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        metadata: dto.metadata ?? {},
        createdById: userId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Process a URL-based import: download (simulated), create a Contract stub, complete job.
   */
  async processUrlImport(jobId: string, url: string, counterpartyName?: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Import job ${jobId} not found`);

    try {
      // Step 1: Mark as DOWNLOADING
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'DOWNLOADING', sourceRef: url },
      });

      // Derive filename from URL
      const parsedUrl = new URL(url);
      const urlFileName = path.basename(parsedUrl.pathname) || 'imported-contract.pdf';
      const mimeType = this._guessMimeType(urlFileName);

      // Step 2: Mark as PROCESSING (in production: axios.get(url, {responseType:'stream'}))
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          fileName: urlFileName,
          mimeType,
          filePath: `/tmp/${urlFileName}`,
        },
      });

      // Step 3: Create a Contract stub — find or use a placeholder counterparty
      const contract = await this._createContractStub(
        urlFileName,
        counterpartyName,
        job.createdById,
      );

      // Step 4: Complete
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          contractId: contract.id,
        },
      });

      this.logger.log(`Import job ${jobId} completed — contract ${contract.id} created`);

      return { jobId, contractId: contract.id, fileName: urlFileName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import job ${jobId} failed: ${message}`);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw error;
    }
  }

  /**
   * Process a local file upload: create Contract + link document, complete job.
   */
  async processLocalImport(
    jobId: string,
    file: UploadedFile,
    counterpartyName?: string,
  ) {
    const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Import job ${jobId} not found`);

    try {
      // Step 1: Mark as PROCESSING immediately (file already on disk)
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          fileName: file.originalname,
          mimeType: file.mimetype,
          filePath: file.path,
        },
      });

      // Step 2: Create Contract stub
      const contract = await this._createContractStub(
        file.originalname,
        counterpartyName,
        job.createdById,
      );

      // Step 3: Create ContractDocument record
      const stats = fs.existsSync(file.path) ? fs.statSync(file.path) : null;
      await this.prisma.contractDocument.create({
        data: {
          contractId: contract.id,
          filename: path.basename(file.path),
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: stats?.size ?? file.size ?? 0,
          storagePath: file.path,
        },
      });

      // Step 4: Complete
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', contractId: contract.id },
      });

      this.logger.log(`Local import job ${jobId} completed — contract ${contract.id} created`);

      return { jobId, contractId: contract.id, fileName: file.originalname };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import job ${jobId} failed: ${message}`);
      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: message },
      });
      throw error;
    }
  }

  /**
   * Get all import jobs for a user, newest first.
   */
  async getJobs(userId: string) {
    return this.prisma.importJob.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single import job by ID.
   */
  async getJob(id: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);
    return job;
  }

  /**
   * Reset a failed job back to PENDING so it can be retried.
   */
  async retryJob(id: string) {
    const job = await this.prisma.importJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Import job ${id} not found`);

    return this.prisma.importJob.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null,
        contractId: null,
        filePath: null,
      },
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async _createContractStub(
    fileName: string,
    counterpartyName: string | undefined,
    createdById: string,
  ) {
    // Find or create a counterparty placeholder
    const cpName = counterpartyName?.trim() || 'Imported Counterparty';
    let counterparty = await this.prisma.counterparty.findFirst({
      where: { name: cpName },
    });

    if (!counterparty) {
      counterparty = await this.prisma.counterparty.create({
        data: {
          name: cpName,
          type: 'VENDOR',
        },
      });
    }

    const title = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

    return this.prisma.contract.create({
      data: {
        title,
        type: 'CUSTOM',
        status: 'DRAFT',
        description: `Imported from ${fileName}`,
        counterpartyId: counterparty.id,
        createdById,
      },
    });
  }

  private _guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }
}
