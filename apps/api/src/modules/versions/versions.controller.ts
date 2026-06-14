import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VersionsService } from './versions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface AuthenticatedRequest {
  user: { userId: string };
}

@ApiTags('versions')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get('contracts/:id/versions')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'List all versions for a contract' })
  listVersions(@Param('id') contractId: string) {
    return this.versionsService.listVersions(contractId);
  }

  @Get('versions/compare')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Compare two contract versions' })
  compareVersions(@Query('v1') v1: string, @Query('v2') v2: string) {
    return this.versionsService.compareVersions(v1, v2);
  }

  @Get('versions/:versionId')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get a single version with full snapshot' })
  getVersion(@Param('versionId') versionId: string) {
    return this.versionsService.getVersion(versionId);
  }

  @Post('contracts/:id/versions/:versionId/restore')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Restore a contract to a previous version' })
  restoreVersion(
    @Param('id') contractId: string,
    @Param('versionId') versionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.versionsService.restoreVersion(contractId, versionId, req.user.userId);
  }

  @Patch('versions/:versionId/tag')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Tag a contract version with a label' })
  tagVersion(@Param('versionId') versionId: string, @Body() body: { tag: string }) {
    return this.versionsService.tagVersion(versionId, body.tag);
  }
}
