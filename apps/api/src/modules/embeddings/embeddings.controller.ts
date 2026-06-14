import { Controller, Post, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmbeddingsService } from './embeddings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('embeddings')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmbeddingsController {
  constructor(private readonly embeddingsService: EmbeddingsService) {}

  @Post('contracts/:id/embed')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate embeddings for a contract' })
  embedContract(@Param('id') id: string) {
    return this.embeddingsService.embedContract(id);
  }

  @Post('clauses/:id/embed')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate embedding for a clause' })
  embedClause(@Param('id') id: string) {
    return this.embeddingsService.embedClause(id);
  }

  @Get('search/semantic')
  @ApiOperation({ summary: 'Semantic search across all embedded contracts' })
  semanticSearch(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.embeddingsService.semanticSearch(query, limit ? parseInt(limit) : 10);
  }

  @Get('search/hybrid')
  @ApiOperation({ summary: 'Hybrid keyword + semantic search' })
  hybridSearch(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    return this.embeddingsService.hybridSearch(query, limit ? parseInt(limit) : 10);
  }
}
