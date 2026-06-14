import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RenewalsService } from './renewals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('renewals')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RenewalsController {
  constructor(private readonly renewalsService: RenewalsService) {}

  @Post('contracts/:contractId/predict-renewal')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Predict renewal details using AI' })
  predictRenewal(@Param('contractId') contractId: string) {
    return this.renewalsService.predictRenewal(contractId);
  }

  @Get('renewals')
  @ApiOperation({ summary: 'List upcoming renewals' })
  getUpcoming(@Query('windowDays') windowDays?: string) {
    return this.renewalsService.getUpcomingRenewals(windowDays ? parseInt(windowDays) : 90);
  }

  @Get('renewals/stats')
  @ApiOperation({ summary: 'Get renewal dashboard stats' })
  getStats() {
    return this.renewalsService.getDashboardStats();
  }

  @Get('contracts/:contractId/renewals')
  @ApiOperation({ summary: 'Get renewal events for a contract' })
  findByContract(@Param('contractId') contractId: string) {
    return this.renewalsService.findByContract(contractId);
  }
}
