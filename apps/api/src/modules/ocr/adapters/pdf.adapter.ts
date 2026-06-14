import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { IOcrAdapter, OcrResult } from './ocr-adapter.interface';

@Injectable()
export class PdfAdapter implements IOcrAdapter {
  private readonly logger = new Logger(PdfAdapter.name);

  canHandle(mimeType: string): boolean {
    return mimeType === 'application/pdf' || mimeType.includes('pdf');
  }

  async extract(filePath: string, _mimeType: string): Promise<OcrResult> {
    const buffer = fs.readFileSync(filePath);

    let pages: { pageNumber: number; text: string; confidence: number; wordCount: number }[] = [];
    let fullText = '';

    try {
      // Dynamic require to avoid hard dep at module load time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
      const data = await pdfParse(buffer);
      fullText = data.text || '';

      // Split into rough per-page chunks by page-break markers or even distribution
      const rawPages = fullText.split(/\f|\[PAGE\s*\d+\]/);
      const nonEmpty = rawPages.filter((p) => p.trim().length > 0);

      pages = (nonEmpty.length > 0 ? nonEmpty : [fullText]).map((text, i) => ({
        pageNumber: i + 1,
        text: text.trim(),
        confidence: 0.95,
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
      }));
    } catch (err) {
      this.logger.warn(`pdf-parse unavailable, falling back to raw buffer read: ${(err as Error).message}`);
      // Fallback: read printable ASCII from the PDF buffer
      fullText = buffer.toString('latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
      pages = [{ pageNumber: 1, text: fullText, confidence: 0.5, wordCount: fullText.split(/\s+/).filter(Boolean).length }];
    }

    const averageConfidence = pages.reduce((s, p) => s + p.confidence, 0) / (pages.length || 1);

    return {
      pages,
      fullText,
      averageConfidence,
      pageCount: pages.length,
      engine: 'pdf-parse',
    };
  }

  getEngineName(): string {
    return 'pdf-parse';
  }
}
