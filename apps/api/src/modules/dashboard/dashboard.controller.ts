import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard KPIs and summary data' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get contract creation trend by month' })
  getTrend(@Query('months') months?: string) {
    return this.dashboardService.getContractTrend(months ? parseInt(months) : 6);
  }
}
