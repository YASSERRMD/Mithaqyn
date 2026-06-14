import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { QueryContractsDto } from './dto/query-contracts.dto';
import { UserRole } from '@prisma/client';

const ALLOWED_SORT_FIELDS = ['title', 'createdAt', 'expiryDate', 'value', 'riskScore'];

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContractDto, userId: string) {
    return this.prisma.contract.create({
      data: {
        title: dto.title,
        contractNumber: dto.contractNumber,
        type: dto.type,
        status: dto.status ?? 'DRAFT',
        description: dto.description,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        autoRenewal: dto.autoRenewal ?? false,
        noticePeriodDays: dto.noticePeriodDays,
        value: dto.value,
        currency: dto.currency ?? 'USD',
        counterpartyId: dto.counterpartyId,
        createdById: userId,
        tags: dto.tags ?? [],
      },
      include: { counterparty: true },
    });
  }

  async findAll(query: QueryContractsDto) {
    const { search, type, status, riskLevel, counterpartyId, page = 1, limit = 20 } = query;

    const sortBy = ALLOWED_SORT_FIELDS.includes(query.sortBy ?? '') ? query.sortBy! : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { contractNumber: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(type && { type }),
      ...(status && { status }),
      ...(riskLevel && { riskLevel }),
      ...(counterpartyId && { counterpartyId }),
    };

    const [total, data] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        include: { counterparty: { select: { id: true, name: true, type: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        counterparty: true,
        documents: { orderBy: { uploadedAt: 'desc' } },
        _count: { select: { clauses: true, riskFindings: true, obligations: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto, userId: string, userRole: UserRole) {
    await this.findById(id);

    const readOnlyRoles: UserRole[] = ['AUDITOR', 'VIEWER'];
    if (readOnlyRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient permissions to update contracts');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.effectiveDate && { effectiveDate: new Date(dto.effectiveDate) }),
        ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.renewalDate && { renewalDate: new Date(dto.renewalDate) }),
        ...(dto.autoRenewal !== undefined && { autoRenewal: dto.autoRenewal }),
        ...(dto.noticePeriodDays !== undefined && { noticePeriodDays: dto.noticePeriodDays }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.contractNumber !== undefined && { contractNumber: dto.contractNumber }),
      },
      include: { counterparty: true },
    });
  }

  async remove(id: string, userRole: UserRole) {
    await this.findById(id);

    const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'LEGAL_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException('Only Super Admin or Legal Admin can delete contracts');
    }

    await this.prisma.contract.delete({ where: { id } });
    return { message: `Contract ${id} deleted` };
  }

  async getDocuments(contractId: string) {
    await this.findById(contractId);

    return this.prisma.contractDocument.findMany({
      where: { contractId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
