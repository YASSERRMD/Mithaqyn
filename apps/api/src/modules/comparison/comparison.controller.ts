import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ComparisonService } from './comparison.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class CompareContractsDto {
  @IsString()
  contractAId!: string;

  @IsString()
  contractBId!: string;
}

class CompareVersionsDto {
  @IsString()
  contractId!: string;

  @IsString()
  versionAId!: string;

  @IsString()
  versionBId!: string;
}

@ApiTags('comparison')
@Controller('comparison')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post('contracts')
  @Roles('REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Compare two contracts using AI' })
  compareContracts(@Body() dto: CompareContractsDto) {
    return this.comparisonService.compareContracts(dto.contractAId, dto.contractBId);
  }

  @Post('versions')
  @Roles('REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Compare two versions of the same contract' })
  compareVersions(@Body() dto: CompareVersionsDto) {
    return this.comparisonService.compareVersions(dto.contractId, dto.versionAId, dto.versionBId);
  }
}
