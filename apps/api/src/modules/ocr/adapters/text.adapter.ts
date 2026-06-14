import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { IOcrAdapter, OcrResult } from './ocr-adapter.interface';

@Injectable()
export class TextAdapter implements IOcrAdapter {
  canHandle(mimeType: string): boolean {
    return mimeType === 'text/plain' || mimeType === 'text/rtf' || mimeType.startsWith('text/');
  }

  async extract(filePath: string, _mimeType: string): Promise<OcrResult> {
    const fullText = fs.readFileSync(filePath, 'utf8');
    const lines = fullText.split('\n');

    // Chunk by approximate page size (~50 lines per page)
    const PAGE_LINES = 50;
    const pages: { pageNumber: number; text: string; confidence: number; wordCount: number }[] = [];
    for (let i = 0; i < lines.length; i += PAGE_LINES) {
      const chunk = lines.slice(i, i + PAGE_LINES).join('\n').trim();
      if (chunk) {
        pages.push({
          pageNumber: pages.length + 1,
          text: chunk,
          confidence: 1.0,
          wordCount: chunk.split(/\s+/).filter(Boolean).length,
        });
      }
    }

    if (pages.length === 0) {
      pages.push({ pageNumber: 1, text: fullText, confidence: 1.0, wordCount: fullText.split(/\s+/).filter(Boolean).length });
    }

    return {
      pages,
      fullText,
      averageConfidence: 1.0,
      pageCount: pages.length,
      engine: 'text-reader',
    };
  }

  getEngineName(): string {
    return 'text-reader';
  }
}
