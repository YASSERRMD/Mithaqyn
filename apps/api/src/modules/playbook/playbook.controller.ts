import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PlaybookService } from './playbook.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

class CreatePlaybookDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contractType?: string;
}

class CreatePlaybookRuleDto {
  @IsString()
  ruleType!: string;

  @IsString()
  clauseType!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  standardText?: string;

  @IsOptional()
  @IsString()
  fallbackText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priority?: number;
}

@ApiTags('playbooks')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PlaybookController {
  constructor(private readonly playbookService: PlaybookService) {}

  @Post('playbooks')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new legal playbook' })
  createPlaybook(@Body() dto: CreatePlaybookDto, @Request() req: { user: { sub: string } }) {
    return this.playbookService.createPlaybook(dto, req.user.sub);
  }

  @Get('playbooks')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'List all active playbooks' })
  getPlaybooks() {
    return this.playbookService.getPlaybooks();
  }

  @Get('playbooks/:id')
  @Roles('VIEWER', 'REVIEWER', 'CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get a playbook with its rules' })
  getPlaybook(@Param('id') id: string) {
    return this.playbookService.getPlaybook(id);
  }

  @Post('playbooks/:id/rules')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add a rule to a playbook' })
  addRule(@Param('id') playbookId: string, @Body() dto: CreatePlaybookRuleDto) {
    return this.playbookService.addRule(playbookId, dto);
  }

  @Post('contracts/:contractId/playbook-check/:playbookId')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check a contract against a playbook' })
  checkContract(
    @Param('contractId') contractId: string,
    @Param('playbookId') playbookId: string,
  ) {
    return this.playbookService.checkContract(contractId, playbookId);
  }

  @Delete('playbooks/:id')
  @Roles('LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Deactivate a playbook (soft delete)' })
  deletePlaybook(@Param('id') id: string) {
    return this.playbookService.deletePlaybook(id);
  }
}
