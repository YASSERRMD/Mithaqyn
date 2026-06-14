import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Post('contracts/:id/financial-analysis')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Run AI financial terms analysis for a contract' })
  analyzeFinancialTerms(@Param('id') contractId: string) {
    return this.financialService.analyzeFinancialTerms(contractId);
  }

  @Get('contracts/:id/financial-summary')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get the latest financial analysis summary for a contract' })
  getFinancialSummary(@Param('id') contractId: string) {
    return this.financialService.getFinancialSummary(contractId);
  }

  @Get('financial/dashboard')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get financial portfolio dashboard metrics' })
  getFinancialDashboard() {
    return this.financialService.getFinancialDashboard();
  }
}
