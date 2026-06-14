import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        changes: dto.changes as never,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  async findAll(filter: AuditLogFilter = {}) {
    const { userId, entityType, entityId, action, from, to, page = 1, limit = 50 } = filter;
    const skip = (page - 1) * limit;

    const where = {
      ...(userId && { userId }),
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getActionSummary() {
    const result = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });
    return result.map((r) => ({ action: r.action, count: r._count._all }));
  }

  async exportCsv(filter: AuditLogFilter = {}): Promise<string> {
    const { data } = await this.findAll({ ...filter, limit: 10000 });
    const header = 'timestamp,user,email,role,action,entityType,entityId,ipAddress\n';
    const rows = data.map((log) => {
      const user = (log as typeof log & { user?: { firstName: string; lastName: string; email: string; role: string } }).user;
      return [
        log.createdAt.toISOString(),
        user ? `${user.firstName} ${user.lastName}` : log.userId,
        user?.email ?? '',
        user?.role ?? '',
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.ipAddress ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    return header + rows.join('\n');
  }
}
