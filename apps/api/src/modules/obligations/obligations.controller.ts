import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ObligationsService } from './obligations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('obligations')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Post('contracts/:contractId/extract-obligations')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Extract obligations from contract using AI' })
  extractObligations(@Param('contractId') contractId: string) {
    return this.obligationsService.extractObligations(contractId);
  }

  @Get('obligations')
  @ApiOperation({ summary: 'List all obligations with optional filters' })
  findAll(@Query('status') status?: string, @Query('contractId') contractId?: string) {
    return this.obligationsService.findAll({ status, contractId });
  }

  @Get('obligations/overdue')
  @ApiOperation({ summary: 'Get all overdue obligations' })
  getOverdue() {
    return this.obligationsService.getOverdue();
  }

  @Get('contracts/:contractId/obligations')
  @ApiOperation({ summary: 'Get obligations for a specific contract' })
  findByContract(@Param('contractId') contractId: string) {
    return this.obligationsService.findByContract(contractId);
  }

  @Patch('obligations/:id')
  @Roles('CONTRACT_MANAGER', 'REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update obligation status, owner, or due date' })
  update(
    @Param('id') id: string,
    @Body() body: { status?: string; owner?: string; dueDate?: string; isEscalated?: boolean; priority?: string },
  ) {
    return this.obligationsService.update(id, body);
  }
}
