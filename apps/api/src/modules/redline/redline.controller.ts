import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { RedlineService } from './redline.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class RedlineClauseDto {
  @ApiProperty({ required: false, enum: ['BUYER', 'SELLER', 'VENDOR', 'PARTNER'] })
  @IsOptional()
  @IsString()
  @IsIn(['BUYER', 'SELLER', 'VENDOR', 'PARTNER'])
  counterpartyType?: 'BUYER' | 'SELLER' | 'VENDOR' | 'PARTNER';

  @ApiProperty({ required: false, example: 'NDA' })
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiProperty({ required: false, enum: ['DRAFTING_PARTY', 'REVIEWING_PARTY'] })
  @IsOptional()
  @IsString()
  @IsIn(['DRAFTING_PARTY', 'REVIEWING_PARTY'])
  partyPosition?: 'DRAFTING_PARTY' | 'REVIEWING_PARTY';
}

class RedlineTextDto {
  @ApiProperty({ description: 'Clause or contract text to redline' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  context?: RedlineClauseDto;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('redline')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RedlineController {
  constructor(private readonly redlineService: RedlineService) {}

  @Post('clauses/:id/redline')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI redline a specific clause by ID' })
  redlineClause(
    @Param('id') id: string,
    @Body() dto: RedlineClauseDto,
  ) {
    return this.redlineService.redlineClause(id, dto);
  }

  @Post('redline/text')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'AI redline arbitrary clause text (no DB clause needed)' })
  redlineText(@Body() dto: RedlineTextDto) {
    return this.redlineService.redlineText(dto.text, dto.context);
  }

  @Get('clauses/:id/redline-history')
  @Roles('VIEWER', 'AUDITOR', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all redline history for a clause' })
  getRedlineHistory(@Param('id') id: string) {
    return this.redlineService.getRedlineHistory(id);
  }

  @Post('clauses/:id/redline/:jobId/accept')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Accept a redline and update clause text' })
  acceptRedline(
    @Param('id') clauseId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.redlineService.acceptRedline(clauseId, jobId);
  }
}
