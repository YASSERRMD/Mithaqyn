import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CounterpartiesService, CreateCounterpartyDto } from './counterparties.service';
import { VendorIntelligenceService } from './vendor-intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('counterparties')
@Controller('counterparties')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CounterpartiesController {
  constructor(
    private readonly svc: CounterpartiesService,
    private readonly vendorIntelligence: VendorIntelligenceService,
  ) {}

  @Post()
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'Create a counterparty' })
  create(@Body() dto: CreateCounterpartyDto) {
    return this.svc.create(dto);
  }

  @Get('exposure-report')
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'Get counterparty exposure report sorted by total value' })
  getExposureReport() {
    return this.vendorIntelligence.getExposureReport();
  }

  @Get('concentration-risk')
  @Roles(UserRole.LEGAL_ADMIN)
  @ApiOperation({ summary: 'Get vendor concentration risk and Herfindahl index' })
  getConcentrationRisk() {
    return this.vendorIntelligence.getConcentrationRisk();
  }

  @Get()
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'List counterparties' })
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }

  @Get(':id/profile')
  @Roles(UserRole.VIEWER)
  @ApiOperation({ summary: 'Get vendor profile with exposure and performance metrics' })
  getVendorProfile(@Param('id') id: string) {
    return this.vendorIntelligence.getVendorProfile(id);
  }

  @Get(':id')
  @Roles(UserRole.VIEWER)
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id/risk-rating')
  @Roles(UserRole.CONTRACT_MANAGER)
  @ApiOperation({ summary: 'Update counterparty risk rating' })
  updateRiskRating(
    @Param('id') id: string,
    @Body() body: { riskRating: string },
  ) {
    return this.vendorIntelligence.updateRiskRating(id, body.riskRating);
  }
}
