import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('privacy')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('contracts/:id/privacy-analysis')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Run AI data privacy and compliance analysis for a contract' })
  analyzePrivacy(@Param('id') contractId: string) {
    return this.privacyService.analyzePrivacy(contractId);
  }

  @Get('contracts/:id/privacy-summary')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get the latest privacy analysis summary for a contract' })
  getPrivacySummary(@Param('id') contractId: string) {
    return this.privacyService.getPrivacySummary(contractId);
  }

  @Get('privacy/dashboard')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get compliance dashboard metrics across all analyzed contracts' })
  getComplianceDashboard() {
    return this.privacyService.getComplianceDashboard();
  }
}
