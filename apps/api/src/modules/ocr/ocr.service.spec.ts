import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockDoc = {
  id: 'doc-1',
  storagePath: '/tmp/test.pdf',
  mimeType: 'application/pdf',
};

const mockJob = {
  id: 'job-1',
  documentId: 'doc-1',
  status: 'PENDING',
  engine: 'auto',
  startedAt: new Date(),
};

const prismaMock = {
  contractDocument: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  ocrJob: {
    create: jest.fn().mockResolvedValue(mockJob),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  documentPage: {
    createMany: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe('OcrService', () => {
  let service: OcrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OcrService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = module.get<OcrService>(OcrService);
  });

  afterEach(() => jest.clearAllMocks());

  it('throws NotFoundException for unknown document', async () => {
    prismaMock.contractDocument.findUnique.mockResolvedValue(null);
    await expect(service.extractDocument('unknown')).rejects.toThrow(NotFoundException);
  });

  it('creates OCR job and returns PROCESSING status', async () => {
    prismaMock.contractDocument.findUnique.mockResolvedValue(mockDoc);
    const result = await service.extractDocument('doc-1');
    expect(result.status).toBe('PROCESSING');
    expect(result.jobId).toBe('job-1');
    expect(prismaMock.ocrJob.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ documentId: 'doc-1', status: 'PROCESSING' }) }),
    );
  });

  it('throws NotFoundException when job not found', async () => {
    prismaMock.ocrJob.findUnique.mockResolvedValue(null);
    await expect(service.getJob('no-job')).rejects.toThrow(NotFoundException);
  });

  it('returns empty pages when no completed job exists', async () => {
    prismaMock.ocrJob.findFirst.mockResolvedValue(null);
    const pages = await service.getPages('doc-1');
    expect(pages).toEqual([]);
  });
});
