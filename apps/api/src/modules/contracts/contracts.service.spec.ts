import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  contract: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contractDocument: {
    findMany: jest.fn(),
  },
};

const mockContract = {
  id: 'ctr-001',
  title: 'Test Contract',
  type: 'NDA',
  status: 'ACTIVE',
  counterpartyId: 'cp-001',
  createdById: 'user-001',
  tags: [],
  autoRenewal: false,
};

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a contract', async () => {
      mockPrisma.contract.create.mockResolvedValue(mockContract);

      const result = await service.create(
        {
          title: 'Test Contract',
          type: 'NDA',
          counterpartyId: 'cp-001',
        },
        'user-001',
      );

      expect(result.title).toBe('Test Contract');
      expect(mockPrisma.contract.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      mockPrisma.contract.count.mockResolvedValue(1);
      mockPrisma.contract.findMany.mockResolvedValue([mockContract]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.contract.count.mockResolvedValue(1);
      mockPrisma.contract.findMany.mockResolvedValue([mockContract]);

      await service.findAll({ status: 'ACTIVE', page: 1, limit: 20 });

      const whereArg = mockPrisma.contract.findMany.mock.calls[0][0].where;
      expect(whereArg).toMatchObject({ status: 'ACTIVE' });
    });
  });

  describe('findById', () => {
    it('should return a contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      const result = await service.findById('ctr-001');
      expect(result.id).toBe('ctr-001');
    });

    it('should throw NotFoundException for missing contract', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for non-admin users', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      await expect(service.remove('ctr-001', 'CONTRACT_MANAGER')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete contract for SUPER_ADMIN', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(mockContract);
      mockPrisma.contract.delete.mockResolvedValue(mockContract);
      const result = await service.remove('ctr-001', 'SUPER_ADMIN');
      expect(result.message).toContain('deleted');
    });
  });
});
