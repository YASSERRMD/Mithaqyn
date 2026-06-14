import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType, ContractStatus } from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({ example: 'Software License Agreement with Acme Corp' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'CTR-2024-001' })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  type: ContractType;

  @ApiPropertyOptional({ enum: ContractStatus, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  noticePeriodDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsString()
  counterpartyId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
