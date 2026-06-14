import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LifecycleService, ContractStatus } from './lifecycle.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class TransitionDto {
  toStatus!: ContractStatus;
  reason?: string;
}

@ApiTags('lifecycle')
@Controller('contracts/:id/lifecycle')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LifecycleController {
  constructor(private readonly lifecycleService: LifecycleService) {}

  @Post('transition')
  @Roles('CONTRACT_MANAGER', 'LEGAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Transition contract to a new lifecycle status' })
  transition(
    @Param('id') id: string,
    @Body() body: TransitionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.lifecycleService.transition(id, body.toStatus, user.id, body.reason);
  }

  @Get('timeline')
  @Roles('VIEWER', 'CONTRACT_MANAGER', 'REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get lifecycle timeline for a contract' })
  getTimeline(@Param('id') id: string) {
    return this.lifecycleService.getTimeline(id);
  }

  @Get('transitions')
  @Roles('VIEWER', 'CONTRACT_MANAGER', 'REVIEWER', 'LEGAL_ADMIN', 'SUPER_ADMIN', 'AUDITOR')
  @ApiOperation({ summary: 'Get valid next transitions for a contract' })
  getValidTransitions(@Param('id') id: string) {
    return this.lifecycleService.getValidTransitions(id);
  }
}
