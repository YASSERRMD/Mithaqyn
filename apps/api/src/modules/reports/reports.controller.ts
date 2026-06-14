import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── Summary ──────────────────────────────────────────────────────────────

  @Get('summary')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Generate summary KPI report' })
  async getSummary(
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.generateSummaryReport();
    if (format === 'csv' && res) {
      const rows = [
        {
          metric: 'Total Contracts', value: data.totalContracts,
        },
        ...Object.entries(data.byStatus).map(([status, count]) => ({
          metric: `Status: ${status}`, value: count,
        })),
        { metric: 'Total Obligations', value: data.totalObligations },
        { metric: 'Overdue Obligations', value: data.overdueObligations },
        { metric: 'Open Risks', value: data.openRisks },
        { metric: 'Critical Risks', value: data.criticalRisks },
        { metric: 'Upcoming Renewals (30d)', value: data.upcomingRenewals30Days },
        { metric: 'Avg Contract Value', value: data.avgContractValue },
      ];
      const csv = this.reportsService.exportToCsv(rows as never, 'summary-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="summary-report.csv"');
      res.send(csv);
      return;
    }
    return data;
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  @Get('contracts')
  @Roles('AUDITOR')
  @ApiOperation({ summary: 'Export contract report' })
  async getContractReport(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('counterpartyId') counterpartyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.getContractReport({
      status, startDate, endDate, counterpartyId,
    });

    if (format === 'csv' && res) {
      const csv = this.reportsService.exportToCsv(data as never, 'contracts-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contracts-report.csv"');
      res.send(csv);
      return;
    }
    return res ? res.json(data) : data;
  }

  // ─── Obligations ──────────────────────────────────────────────────────────

  @Get('obligations')
  @Roles('AUDITOR')
  @ApiOperation({ summary: 'Export obligation report' })
  async getObligationReport(
    @Query('status') status?: string,
    @Query('contractId') contractId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.getObligationReport({ status, contractId });

    if (format === 'csv' && res) {
      const csv = this.reportsService.exportToCsv(data as never, 'obligations-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="obligations-report.csv"');
      res.send(csv);
      return;
    }
    return res ? res.json(data) : data;
  }

  // ─── Risks ────────────────────────────────────────────────────────────────

  @Get('risks')
  @Roles('AUDITOR')
  @ApiOperation({ summary: 'Export risk report' })
  async getRiskReport(
    @Query('severity') severity?: string,
    @Query('contractId') contractId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.getRiskReport({ severity, contractId });

    if (format === 'csv' && res) {
      const csv = this.reportsService.exportToCsv(data as never, 'risks-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="risks-report.csv"');
      res.send(csv);
      return;
    }
    return res ? res.json(data) : data;
  }

  // ─── Financial ────────────────────────────────────────────────────────────

  @Get('financial')
  @Roles('LEGAL_ADMIN')
  @ApiOperation({ summary: 'Export financial analysis report' })
  async getFinancialReport(
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.getFinancialReport();

    if (format === 'csv' && res) {
      const csv = this.reportsService.exportToCsv(data as never, 'financial-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
      res.send(csv);
      return;
    }
    return res ? res.json(data) : data;
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  @Get('audit')
  @Roles('LEGAL_ADMIN')
  @ApiOperation({ summary: 'Export audit trail report' })
  async getAuditReport(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
    @Res({ passthrough: false }) res?: Response,
  ) {
    const data = await this.reportsService.getAuditReport({
      action, userId, startDate, endDate,
    });

    if (format === 'csv' && res) {
      const csv = this.reportsService.exportToCsv(data as never, 'audit-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-report.csv"');
      res.send(csv);
      return;
    }
    return res ? res.json(data) : data;
  }
}
