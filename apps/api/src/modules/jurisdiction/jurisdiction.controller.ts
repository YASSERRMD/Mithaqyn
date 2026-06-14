import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JurisdictionService } from './jurisdiction.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('jurisdiction')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class JurisdictionController {
  constructor(private readonly jurisdictionService: JurisdictionService) {}

  @Post('contracts/:id/jurisdiction-analysis')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Run AI jurisdiction and governing law analysis for a contract' })
  analyzeJurisdiction(@Param('id') contractId: string) {
    return this.jurisdictionService.analyzeJurisdiction(contractId);
  }

  @Get('contracts/:id/jurisdiction-summary')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get the latest jurisdiction analysis summary for a contract' })
  getJurisdictionSummary(@Param('id') contractId: string) {
    return this.jurisdictionService.getJurisdictionSummary(contractId);
  }

  @Get('jurisdiction/dashboard')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get jurisdiction intelligence dashboard metrics across all analyzed contracts' })
  getJurisdictionDashboard() {
    return this.jurisdictionService.getJurisdictionDashboard();
  }
}
