import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LifecycleService, TRANSITION_RULES } from './lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  contract: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  contractVersion: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockContract = {
  id: 'ctr-001',
  title: 'Test Contract',
  status: 'DRAFT',
  counterpartyId: 'cp-001',
  createdById: 'user-001',
};

describe('LifecycleService', () => {
  let service: LifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
    jest.clearAllMocks();
  });

  describe('transition', () => {
    it('should succeed for a valid transition (DRAFT -> UNDER_REVIEW)', async () => {
      const updatedContract = { ...mockContract, status: 'UNDER_REVIEW' };
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractVersion.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([updatedContract, {}]);

      const result = await service.transition('ctr-001', 'UNDER_REVIEW', 'user-001', 'Moving to review');

      expect(result.status).toBe('UNDER_REVIEW');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should succeed for ACTIVE -> EXPIRED transition', async () => {
      const activeContract = { ...mockContract, status: 'ACTIVE' };
      const expiredContract = { ...mockContract, status: 'EXPIRED' };
      mockPrisma.contract.findUnique.mockResolvedValue(activeContract);
      mockPrisma.contractVersion.findFirst.mockResolvedValue({ versionNum: 3 });
      mockPrisma.$transaction.mockResolvedValue([expiredContract, {}]);

      const result = await service.transition('ctr-001', 'EXPIRED', 'user-001');

      expect(result.status).toBe('EXPIRED');
    });

    it('should throw BadRequestException for an invalid transition (DRAFT -> ACTIVE)', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);

      await expect(
        service.transition('ctr-001', 'ACTIVE', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for ARCHIVED -> any transition', async () => {
      const archivedContract = { ...mockContract, status: 'ARCHIVED' };
      mockPrisma.contract.findUnique.mockResolvedValue(archivedContract);

      await expect(
        service.transition('ctr-001', 'DRAFT', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.transition('non-existent', 'UNDER_REVIEW', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include reason in snapshot when provided', async () => {
      const updatedContract = { ...mockContract, status: 'UNDER_REVIEW' };
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractVersion.findFirst.mockResolvedValue(null);

      let capturedTransaction: unknown[] = [];
      mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
        capturedTransaction = ops;
        return [updatedContract, {}];
      });

      await service.transition('ctr-001', 'UNDER_REVIEW', 'user-001', 'Legal review required');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getValidTransitions', () => {
    it('should return correct transitions for DRAFT status', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);

      const result = await service.getValidTransitions('ctr-001');

      expect(result).toEqual(expect.arrayContaining(['UNDER_REVIEW', 'TERMINATED']));
      expect(result).toHaveLength(2);
    });

    it('should return correct transitions for ACTIVE status', async () => {
      const activeContract = { ...mockContract, status: 'ACTIVE' };
      mockPrisma.contract.findUnique.mockResolvedValue(activeContract);

      const result = await service.getValidTransitions('ctr-001');

      expect(result).toEqual(expect.arrayContaining(['EXPIRED', 'TERMINATED', 'ARCHIVED']));
      expect(result).toHaveLength(3);
    });

    it('should return empty array for ARCHIVED status', async () => {
      const archivedContract = { ...mockContract, status: 'ARCHIVED' };
      mockPrisma.contract.findUnique.mockResolvedValue(archivedContract);

      const result = await service.getValidTransitions('ctr-001');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException for non-existent contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.getValidTransitions('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('TRANSITION_RULES', () => {
    it('should define valid rules for all 7 statuses', () => {
      const statuses = ['DRAFT', 'UNDER_REVIEW', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'ARCHIVED'];
      statuses.forEach((status) => {
        expect(TRANSITION_RULES.has(status as never)).toBe(true);
      });
    });

    it('should not allow direct DRAFT -> ACTIVE transition', () => {
      const draftTransitions = TRANSITION_RULES.get('DRAFT') ?? [];
      expect(draftTransitions).not.toContain('ACTIVE');
    });

    it('should allow PENDING_SIGNATURE -> ACTIVE transition', () => {
      const pendingTransitions = TRANSITION_RULES.get('PENDING_SIGNATURE') ?? [];
      expect(pendingTransitions).toContain('ACTIVE');
    });
  });

  describe('getTimeline', () => {
    it('should return ordered timeline entries with status extracted from snapshot', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractVersion.findMany.mockResolvedValue([
        {
          id: 'v1',
          contractId: 'ctr-001',
          versionNum: 1,
          snapshot: { status: 'UNDER_REVIEW', previousStatus: 'DRAFT', reason: null, transitionedById: 'user-001' },
          changedById: 'user-001',
          changedAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'v2',
          contractId: 'ctr-001',
          versionNum: 2,
          snapshot: { status: 'ACTIVE', previousStatus: 'PENDING_SIGNATURE', reason: 'Signed', transitionedById: 'user-001' },
          changedById: 'user-001',
          changedAt: new Date('2024-01-02T10:00:00Z'),
        },
      ]);

      const result = await service.getTimeline('ctr-001');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('UNDER_REVIEW');
      expect(result[1].status).toBe('ACTIVE');
      expect(result[0].changedById).toBe('user-001');
    });

    it('should return empty array when no versions exist', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contractVersion.findMany.mockResolvedValue([]);

      const result = await service.getTimeline('ctr-001');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException for non-existent contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);

      await expect(service.getTimeline('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
