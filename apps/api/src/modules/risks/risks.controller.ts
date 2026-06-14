import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RisksService } from './risks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('risks')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post('contracts/:contractId/score-risk')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Analyze contract risks using AI' })
  analyzeRisks(@Param('contractId') contractId: string) {
    return this.risksService.analyzeRisks(contractId);
  }

  @Get('contracts/:contractId/risks')
  @ApiOperation({ summary: 'Get risk findings for a contract' })
  findByContract(@Param('contractId') contractId: string) {
    return this.risksService.findByContract(contractId);
  }

  @Patch('risks/:id/status')
  @Roles('REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update risk finding status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.risksService.updateStatus(id, body.status);
  }
}
