import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ClauseLibraryService } from './clause-library.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateClauseTemplateDto {
  @IsString()
  title!: string;

  @IsString()
  clauseType!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

class UpdateClauseTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  clauseType?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

@ApiTags('clause-library')
@Controller('clause-library')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClauseLibraryController {
  constructor(private readonly clauseLibraryService: ClauseLibraryService) {}

  @Post()
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new clause template' })
  createTemplate(
    @Body() dto: CreateClauseTemplateDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.clauseLibraryService.createTemplate(dto, req.user.sub);
  }

  @Get('search')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Search clause templates by title, type, or content' })
  @ApiQuery({ name: 'q', required: false })
  searchTemplates(@Query('q') q?: string) {
    return this.clauseLibraryService.searchTemplates(q ?? '');
  }

  @Get()
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'List clause templates with optional filters' })
  @ApiQuery({ name: 'clauseType', required: false })
  @ApiQuery({ name: 'contractType', required: false })
  @ApiQuery({ name: 'jurisdiction', required: false })
  @ApiQuery({ name: 'tags', required: false, isArray: true })
  getTemplates(
    @Query('clauseType') clauseType?: string,
    @Query('contractType') contractType?: string,
    @Query('jurisdiction') jurisdiction?: string,
    @Query('tags') tags?: string | string[],
  ) {
    const tagsArray = tags
      ? Array.isArray(tags)
        ? tags
        : tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    return this.clauseLibraryService.getTemplates({
      clauseType,
      contractType,
      jurisdiction,
      tags: tagsArray,
    });
  }

  @Get(':id')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get a clause template (increments usage count)' })
  getTemplate(@Param('id') id: string) {
    return this.clauseLibraryService.getTemplate(id);
  }

  @Patch(':id')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a clause template (bumps version)' })
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateClauseTemplateDto) {
    return this.clauseLibraryService.updateTemplate(id, dto);
  }

  @Patch(':id/favorite')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Toggle favorite status of a clause template' })
  toggleFavorite(@Param('id') id: string) {
    return this.clauseLibraryService.toggleFavorite(id);
  }

  @Delete(':id')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a clause template' })
  deleteTemplate(@Param('id') id: string) {
    return this.clauseLibraryService.deleteTemplate(id);
  }
}
