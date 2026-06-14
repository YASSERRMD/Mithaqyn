import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type SnapshotObject = Record<string, unknown>;

interface DiffResult {
  added: string[];
  removed: string[];
  modified: string[];
}

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  private diffSnapshots(snap1: SnapshotObject, snap2: SnapshotObject): DiffResult {
    const keys1 = new Set(Object.keys(snap1));
    const keys2 = new Set(Object.keys(snap2));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const key of keys2) {
      if (!keys1.has(key)) {
        added.push(key);
      } else if (JSON.stringify(snap1[key]) !== JSON.stringify(snap2[key])) {
        modified.push(key);
      }
    }

    for (const key of keys1) {
      if (!keys2.has(key)) {
        removed.push(key);
      }
    }

    return { added, removed, modified };
  }

  async listVersions(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return this.prisma.contractVersion.findMany({
      where: { contractId },
      orderBy: { versionNum: 'desc' },
    });
  }

  async getVersion(versionId: string) {
    const version = await this.prisma.contractVersion.findUnique({
      where: { id: versionId },
      include: {
        contract: { select: { id: true, title: true } },
      },
    });
    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }
    return version;
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<DiffResult & { v1: unknown; v2: unknown }> {
    const [v1, v2] = await Promise.all([
      this.prisma.contractVersion.findUnique({ where: { id: versionId1 } }),
      this.prisma.contractVersion.findUnique({ where: { id: versionId2 } }),
    ]);

    if (!v1) throw new NotFoundException(`Version ${versionId1} not found`);
    if (!v2) throw new NotFoundException(`Version ${versionId2} not found`);

    const snap1 = (v1.snapshot ?? {}) as SnapshotObject;
    const snap2 = (v2.snapshot ?? {}) as SnapshotObject;

    const diff = this.diffSnapshots(snap1, snap2);

    return {
      ...diff,
      v1: { id: v1.id, versionNum: v1.versionNum, changedAt: v1.changedAt, action: v1.action },
      v2: { id: v2.id, versionNum: v2.versionNum, changedAt: v2.changedAt, action: v2.action },
    };
  }

  async restoreVersion(contractId: string, versionId: string, userId: string) {
    const version = await this.prisma.contractVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    if (version.contractId !== contractId) {
      throw new BadRequestException('Version does not belong to this contract');
    }

    const snapshot = (version.snapshot ?? {}) as SnapshotObject;

    // Extract updatable fields from snapshot (excluding system fields)
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      createdById: _createdById,
      counterpartyId: _counterpartyId,
      ...updatableFields
    } = snapshot as Record<string, unknown>;

    // Build safe update data — only known Contract scalar fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'title', 'contractNumber', 'type', 'status', 'description',
      'effectiveDate', 'expiryDate', 'renewalDate', 'autoRenewal',
      'noticePeriodDays', 'value', 'currency', 'tags', 'riskScore',
      'riskLevel',
    ];

    for (const field of allowedFields) {
      if (field in updatableFields) {
        const val = updatableFields[field];
        if (field === 'effectiveDate' || field === 'expiryDate' || field === 'renewalDate') {
          updateData[field] = val ? new Date(val as string) : null;
        } else {
          updateData[field] = val;
        }
      }
    }

    // Get current max version number
    const latest = await this.prisma.contractVersion.findFirst({
      where: { contractId },
      orderBy: { versionNum: 'desc' },
    });
    const nextVersionNum = (latest?.versionNum ?? 0) + 1;

    // Perform restore in transaction
    const [updatedContract, newVersion] = await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { id: contractId },
        data: updateData as Parameters<typeof this.prisma.contract.update>[0]['data'],
      }),
      this.prisma.contractVersion.create({
        data: {
          contractId,
          versionNum: nextVersionNum,
          snapshot: snapshot as Parameters<typeof this.prisma.contractVersion.create>[0]['data']['snapshot'],
          changedById: userId,
          action: `RESTORED_TO_v${version.versionNum}`,
        },
      }),
    ]);

    return { contract: updatedContract, newVersion };
  }

  async tagVersion(versionId: string, tag: string) {
    const version = await this.prisma.contractVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);

    const existingNotes = version.notes ?? '';
    // Remove any existing [TAG: ...] prefix before prepending the new one
    const strippedNotes = existingNotes.replace(/^\[TAG:[^\]]*\]\s*/g, '').trim();
    const newNotes = `[TAG: ${tag}]${strippedNotes ? ' ' + strippedNotes : ''}`;

    return this.prisma.contractVersion.update({
      where: { id: versionId },
      data: { notes: newNotes },
    });
  }
}
