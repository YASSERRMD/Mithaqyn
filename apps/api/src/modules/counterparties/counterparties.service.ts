import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCounterpartyDto {
  name: string;
  type?: string;
  registrationNumber?: string;
  email?: string;
  country?: string;
}

@Injectable()
export class CounterpartiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCounterpartyDto) {
    return this.prisma.counterparty.create({ data: { ...dto } });
  }

  findAll(search?: string) {
    return this.prisma.counterparty.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!cp) throw new NotFoundException(`Counterparty ${id} not found`);
    return cp;
  }
}
