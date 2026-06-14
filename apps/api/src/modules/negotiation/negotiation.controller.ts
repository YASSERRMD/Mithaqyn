import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NegotiationService, AddCommentDto } from './negotiation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('negotiation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}

  @Post('contracts/:id/negotiation/rounds')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Create a new negotiation round for a contract' })
  createRound(
    @Param('id') contractId: string,
    @Body() body: { summary?: string },
  ) {
    return this.negotiationService.createRound(contractId, body.summary);
  }

  @Post('negotiation/rounds/:id/comments')
  @Roles('REVIEWER')
  @ApiOperation({ summary: 'Add a comment to a negotiation round' })
  addComment(
    @Param('id') roundId: string,
    @Body() body: AddCommentDto,
  ) {
    return this.negotiationService.addComment(roundId, body);
  }

  @Patch('negotiation/rounds/:id/close')
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Close or mark a negotiation round as agreed' })
  closeRound(
    @Param('id') roundId: string,
    @Body() body: { status: 'CLOSED' | 'AGREED' },
  ) {
    return this.negotiationService.closeRound(roundId, body.status);
  }

  @Get('contracts/:id/negotiation/rounds')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get all negotiation rounds for a contract' })
  getRounds(@Param('id') contractId: string) {
    return this.negotiationService.getRounds(contractId);
  }

  @Get('contracts/:id/negotiation/summary')
  @Roles('VIEWER')
  @ApiOperation({ summary: 'Get redline summary stats for a contract' })
  getRedlineSummary(@Param('id') contractId: string) {
    return this.negotiationService.getRedlineSummary(contractId);
  }

  @Patch('negotiation/comments/:id/resolve')
  @Roles('REVIEWER')
  @ApiOperation({ summary: 'Mark a clause comment as resolved' })
  resolveComment(@Param('id') commentId: string) {
    return this.negotiationService.resolveComment(commentId);
  }
}
