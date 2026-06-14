import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcurementService, UpsertProcurementRefDto } from './procurement.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('procurement')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Put('contracts/:id/procurement')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Upsert procurement reference for a contract' })
  upsertRef(
    @Param('id') contractId: string,
    @Body() body: UpsertProcurementRefDto,
  ) {
    return this.procurementService.upsertRef(contractId, body);
  }

  @Get('contracts/:id/procurement')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get procurement reference for a contract' })
  getRef(@Param('id') contractId: string) {
    return this.procurementService.getRef(contractId);
  }

  @Get('procurement/analytics')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get procurement analytics by category' })
  getAnalytics() {
    return this.procurementService.getProcurementAnalytics();
  }

  @Get('procurement/search')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Search contracts by purchase order number' })
  searchByPO(@Query('po') poNumber: string) {
    return this.procurementService.searchByPO(poNumber ?? '');
  }
}
