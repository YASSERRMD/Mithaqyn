import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfAdapter } from './adapters/pdf.adapter';
import { TextAdapter } from './adapters/text.adapter';
import { IOcrAdapter } from './adapters/ocr-adapter.interface';
import * as path from 'path';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly adapters: IOcrAdapter[];

  constructor(private readonly prisma: PrismaService) {
    this.adapters = [new PdfAdapter(), new TextAdapter()];
  }

  async extractDocument(documentId: string): Promise<{ jobId: string; status: string }> {
    const doc = await this.prisma.contractDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    // Create job record
    const job = await this.prisma.ocrJob.create({
      data: { documentId, status: 'PROCESSING', engine: 'auto', startedAt: new Date() },
    });

    // Run extraction asynchronously, don't block response
    this.runExtraction(job.id, doc.id, doc.storagePath, doc.mimeType).catch((err) =>
      this.logger.error(`OCR job ${job.id} failed: ${(err as Error).message}`),
    );

    return { jobId: job.id, status: 'PROCESSING' };
  }

  private async runExtraction(jobId: string, documentId: string, storagePath: string, mimeType: string) {
    const adapter = this.adapters.find((a) => a.canHandle(mimeType));

    if (!adapter) {
      await this.prisma.ocrJob.update({
        where: { id: jobId },
        data: { status: 'SKIPPED', error: `No adapter for MIME type: ${mimeType}`, completedAt: new Date() },
      });
      return;
    }

    try {
      const absPath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), storagePath);
      const result = await adapter.extract(absPath, mimeType);

      // Store pages
      await this.prisma.documentPage.createMany({
        data: result.pages.map((p) => ({
          jobId,
          documentId,
          pageNumber: p.pageNumber,
          text: p.text,
          confidence: p.confidence,
          wordCount: p.wordCount,
        })),
        skipDuplicates: true,
      });

      // Update job and document
      await Promise.all([
        this.prisma.ocrJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            engine: result.engine,
            confidence: result.averageConfidence,
            pageCount: result.pageCount,
            completedAt: new Date(),
          },
        }),
        this.prisma.contractDocument.update({
          where: { id: documentId },
          data: {
            extractedText: result.fullText,
            pageCount: result.pageCount,
            ocrEngine: result.engine,
            ocrConfidence: result.averageConfidence,
          },
        }),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.ocrJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: msg, completedAt: new Date() },
      });
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.ocrJob.findUnique({
      where: { id: jobId },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });
    if (!job) throw new NotFoundException(`OCR job ${jobId} not found`);
    return job;
  }

  async getJobsForDocument(documentId: string) {
    return this.prisma.ocrJob.findMany({
      where: { documentId },
      include: { _count: { select: { pages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPages(documentId: string, jobId?: string) {
    if (jobId) {
      return this.prisma.documentPage.findMany({
        where: { jobId },
        orderBy: { pageNumber: 'asc' },
      });
    }
    // Return pages from the most recent completed job
    const latestJob = await this.prisma.ocrJob.findFirst({
      where: { documentId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });
    if (!latestJob) return [];
    return this.prisma.documentPage.findMany({
      where: { jobId: latestJob.id },
      orderBy: { pageNumber: 'asc' },
    });
  }
}
