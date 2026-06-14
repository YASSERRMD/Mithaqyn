import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditService, AuditLogFilter } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('audit')
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('AUDITOR', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List audit log entries' })
  findAll(
    @Query('userId') userId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filter: AuditLogFilter = {
      userId, entityType, entityId, action, from, to,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    };
    return this.auditService.findAll(filter);
  }

  @Get('summary')
  @Roles('AUDITOR', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get audit action frequency summary' })
  getSummary() {
    return this.auditService.getActionSummary();
  }

  @Get('export')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCsv(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.auditService.exportCsv({ from, to, userId });
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
      res.send(csv);
    }
    return csv;
  }
}
