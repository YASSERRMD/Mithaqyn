import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderName } from './providers/provider.factory';

class TestProviderDto {
  @ApiProperty({ enum: ['openai', 'azure-openai', 'anthropic', 'google-gemini', 'mistral', 'cohere', 'groq', 'together', 'deepseek', 'ollama', 'openai-compatible'] })
  @IsString()
  provider: ProviderName;

  @ApiPropertyOptional()
  @IsOptional()
  overrides?: Record<string, string>;
}

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('providers')
  @ApiOperation({ summary: 'List all AI providers and their configuration status' })
  getProviders() {
    return this.aiService.getAvailableProviders();
  }

  @Post('providers/test')
  @Roles('SUPER_ADMIN', 'LEGAL_ADMIN')
  @ApiOperation({ summary: 'Test connectivity to an AI provider' })
  testProvider(@Body() dto: TestProviderDto) {
    return this.aiService.testProvider(dto.provider, dto.overrides);
  }
}
