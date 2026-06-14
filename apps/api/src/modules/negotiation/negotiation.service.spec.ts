import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NegotiationService } from './negotiation.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  contract: {
    findUnique: jest.fn(),
  },
  negotiationRound: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  clauseComment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockContract = {
  id: 'contract-001',
  title: 'Test NDA',
  type: 'NDA',
  status: 'DRAFT',
};

const mockRound = {
  id: 'round-001',
  contractId: 'contract-001',
  roundNumber: 1,
  status: 'OPEN',
  summary: 'Initial round',
  startedAt: new Date(),
  closedAt: null,
  createdAt: new Date(),
  comments: [],
};

const mockComment = {
  id: 'comment-001',
  roundId: 'round-001',
  clauseId: null,
  author: 'INTERNAL',
  authorName: 'Alice Smith',
  content: 'Please revise the liability clause.',
  isResolved: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('NegotiationService', () => {
  let service: NegotiationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NegotiationService>(NegotiationService);
    jest.clearAllMocks();
  });

  // ─── createRound ─────────────────────────────────────────────────────────────

  describe('createRound', () => {
    it('should create the first round with roundNumber 1 when no prior rounds exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.negotiationRound.findFirst.mockResolvedValue(null);
      mockPrisma.negotiationRound.create.mockResolvedValue(mockRound);

      const result = await service.createRound('contract-001', 'Initial round');

      expect(result.roundNumber).toBe(1);
      expect(mockPrisma.negotiationRound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-001',
            roundNumber: 1,
            status: 'OPEN',
          }),
        }),
      );
    });

    it('should increment roundNumber when prior rounds exist', async () => {
      const existingRound = { ...mockRound, roundNumber: 3 };
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.negotiationRound.findFirst.mockResolvedValue(existingRound);
      mockPrisma.negotiationRound.create.mockResolvedValue({
        ...mockRound,
        roundNumber: 4,
      });

      const result = await service.createRound('contract-001');

      expect(mockPrisma.negotiationRound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roundNumber: 4 }),
        }),
      );
      expect(result.roundNumber).toBe(4);
    });

    it('should throw NotFoundException if contract does not exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.createRound('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should create round with optional summary', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.negotiationRound.findFirst.mockResolvedValue(null);
      mockPrisma.negotiationRound.create.mockResolvedValue({
        ...mockRound,
        summary: 'Counter-proposal review',
      });

      const result = await service.createRound('contract-001', 'Counter-proposal review');

      expect(mockPrisma.negotiationRound.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ summary: 'Counter-proposal review' }),
        }),
      );
      expect(result.summary).toBe('Counter-proposal review');
    });
  });

  // ─── addComment ──────────────────────────────────────────────────────────────

  describe('addComment', () => {
    it('should add a comment to an existing round', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(mockRound);
      mockPrisma.clauseComment.create.mockResolvedValue(mockComment);

      const result = await service.addComment('round-001', {
        author: 'INTERNAL',
        authorName: 'Alice Smith',
        content: 'Please revise the liability clause.',
      });

      expect(result.author).toBe('INTERNAL');
      expect(result.authorName).toBe('Alice Smith');
      expect(result.content).toBe('Please revise the liability clause.');
      expect(mockPrisma.clauseComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roundId: 'round-001',
            author: 'INTERNAL',
            authorName: 'Alice Smith',
            content: 'Please revise the liability clause.',
          }),
        }),
      );
    });

    it('should add a comment with optional clauseId', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(mockRound);
      mockPrisma.clauseComment.create.mockResolvedValue({
        ...mockComment,
        clauseId: 'clause-abc',
      });

      const result = await service.addComment('round-001', {
        clauseId: 'clause-abc',
        author: 'COUNTERPARTY',
        authorName: 'Bob Jones',
        content: 'We disagree with clause 4.2.',
      });

      expect(result.clauseId).toBe('clause-abc');
    });

    it('should throw NotFoundException if round does not exist', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment('non-existent-round', {
          author: 'INTERNAL',
          authorName: 'Alice',
          content: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── closeRound ──────────────────────────────────────────────────────────────

  describe('closeRound', () => {
    it('should close a round with CLOSED status', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(mockRound);
      mockPrisma.negotiationRound.update.mockResolvedValue({
        ...mockRound,
        status: 'CLOSED',
        closedAt: new Date(),
      });

      const result = await service.closeRound('round-001', 'CLOSED');

      expect(result.status).toBe('CLOSED');
      expect(mockPrisma.negotiationRound.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'round-001' },
          data: expect.objectContaining({ status: 'CLOSED' }),
        }),
      );
    });

    it('should close a round with AGREED status', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(mockRound);
      mockPrisma.negotiationRound.update.mockResolvedValue({
        ...mockRound,
        status: 'AGREED',
        closedAt: new Date(),
      });

      const result = await service.closeRound('round-001', 'AGREED');

      expect(result.status).toBe('AGREED');
    });

    it('should throw NotFoundException if round does not exist', async () => {
      mockPrisma.negotiationRound.findUnique.mockResolvedValue(null);

      await expect(service.closeRound('non-existent', 'CLOSED')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getRedlineSummary ───────────────────────────────────────────────────────

  describe('getRedlineSummary', () => {
    it('should return correct summary counts', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.negotiationRound.findMany.mockResolvedValue([
        {
          ...mockRound,
          status: 'OPEN',
          comments: [
            { isResolved: false },
            { isResolved: true },
          ],
        },
        {
          ...mockRound,
          id: 'round-002',
          roundNumber: 2,
          status: 'AGREED',
          comments: [
            { isResolved: true },
          ],
        },
        {
          ...mockRound,
          id: 'round-003',
          roundNumber: 3,
          status: 'OPEN',
          comments: [
            { isResolved: false },
            { isResolved: false },
          ],
        },
      ]);

      const result = await service.getRedlineSummary('contract-001');

      expect(result.totalRounds).toBe(3);
      expect(result.openRounds).toBe(2);
      expect(result.agreedRounds).toBe(1);
      expect(result.totalComments).toBe(5);
      expect(result.unresolvedComments).toBe(3);
    });

    it('should return zero counts when no rounds exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.negotiationRound.findMany.mockResolvedValue([]);

      const result = await service.getRedlineSummary('contract-001');

      expect(result.totalRounds).toBe(0);
      expect(result.openRounds).toBe(0);
      expect(result.agreedRounds).toBe(0);
      expect(result.totalComments).toBe(0);
      expect(result.unresolvedComments).toBe(0);
    });

    it('should throw NotFoundException if contract does not exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.getRedlineSummary('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── resolveComment ──────────────────────────────────────────────────────────

  describe('resolveComment', () => {
    it('should set isResolved to true', async () => {
      mockPrisma.clauseComment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.clauseComment.update.mockResolvedValue({
        ...mockComment,
        isResolved: true,
      });

      const result = await service.resolveComment('comment-001');

      expect(result.isResolved).toBe(true);
      expect(mockPrisma.clauseComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-001' },
          data: { isResolved: true },
        }),
      );
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      mockPrisma.clauseComment.findUnique.mockResolvedValue(null);

      await expect(service.resolveComment('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
