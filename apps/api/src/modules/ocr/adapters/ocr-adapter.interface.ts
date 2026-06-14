export interface OcrPage {
  pageNumber: number;
  text: string;
  confidence: number;
  wordCount: number;
}

export interface OcrResult {
  pages: OcrPage[];
  fullText: string;
  averageConfidence: number;
  pageCount: number;
  engine: string;
}

export interface IOcrAdapter {
  canHandle(mimeType: string): boolean;
  extract(filePath: string, mimeType: string): Promise<OcrResult>;
  getEngineName(): string;
}
