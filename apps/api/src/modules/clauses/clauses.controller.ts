import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClausesService } from './clauses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clauses')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClausesController {
  constructor(private readonly clausesService: ClausesService) {}

  @Post('contracts/:contractId/extract-clauses')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Extract clauses from contract document using AI' })
  extractClauses(@Param('contractId') contractId: string) {
    return this.clausesService.extractClauses(contractId);
  }

  @Get('contracts/:contractId/clauses')
  @ApiOperation({ summary: 'Get all clauses for a contract' })
  findByContract(@Param('contractId') contractId: string) {
    return this.clausesService.findByContract(contractId);
  }

  @Patch('clauses/:id/review')
  @Roles('REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update clause review status' })
  reviewClause(
    @Param('id') id: string,
    @Body() body: { reviewStatus: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.clausesService.reviewClause(id, body.reviewStatus, user.id);
  }
}
