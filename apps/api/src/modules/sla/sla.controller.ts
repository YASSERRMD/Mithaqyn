import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('sla')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Post('obligations/:id/sla-metrics')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create an SLA metric for an obligation' })
  createMetric(
    @Param('id') obligationId: string,
    @Body()
    body: {
      metricName: string;
      targetValue: number;
      unit: string;
      measurementPeriod: string;
      penaltyPerBreach?: number;
    },
  ) {
    return this.slaService.createMetric(obligationId, body);
  }

  @Post('sla-metrics/:id/records')
  @Roles('CONTRACT_MANAGER', 'REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record an actual performance value for an SLA metric' })
  recordPerformance(
    @Param('id') slaMetricId: string,
    @Body()
    body: {
      actualValue: number;
      recordedAt?: string;
      notes?: string;
    },
  ) {
    return this.slaService.recordPerformance(slaMetricId, body);
  }

  @Get('obligations/:id/sla-metrics')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get all SLA metrics for an obligation' })
  getMetrics(@Param('id') obligationId: string) {
    return this.slaService.getMetrics(obligationId);
  }

  @Get('contracts/:id/sla-report')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get the full SLA report for a contract' })
  getSlaReport(@Param('id') contractId: string) {
    return this.slaService.getSlaReport(contractId);
  }

  @Get('sla/dashboard')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get global SLA dashboard metrics' })
  getDashboard() {
    return this.slaService.getDashboard();
  }
}
