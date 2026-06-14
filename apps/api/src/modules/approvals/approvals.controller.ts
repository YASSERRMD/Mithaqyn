import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalsService, CreateStepInput, DecideInput } from './approvals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

interface AuthRequest extends Request {
  user: { id: string; role: string };
}

@ApiTags('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('contracts/:id/approvals')
  @Roles('LEGAL_ADMIN')
  @ApiOperation({ summary: 'Create an approval workflow for a contract' })
  createWorkflow(
    @Param('id') contractId: string,
    @Body() body: { steps: CreateStepInput[] },
  ) {
    return this.approvalsService.createWorkflow(contractId, body.steps);
  }

  @Post('approvals/steps/:id/decide')
  @Roles('REVIEWER')
  @ApiOperation({ summary: 'Approve or reject an approval step' })
  decide(
    @Param('id') stepId: string,
    @Body() body: DecideInput,
    @Request() req: AuthRequest,
  ) {
    return this.approvalsService.decide(stepId, req.user.id, body);
  }

  @Get('contracts/:id/approvals')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get the approval workflow for a contract' })
  getWorkflow(@Param('id') contractId: string) {
    return this.approvalsService.getWorkflow(contractId);
  }

  @Get('approvals/inbox')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get pending approval steps for the current user' })
  inbox(
    @Request() req: AuthRequest,
    @Query('role') role?: string,
  ) {
    return this.approvalsService.getPendingApprovals(req.user.id, role);
  }
}
