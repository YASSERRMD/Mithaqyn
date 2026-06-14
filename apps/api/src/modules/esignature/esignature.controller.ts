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
import { EsignatureService, CreateSigningRequestDto } from './esignature.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('esignature')
export class EsignatureController {
  constructor(private readonly esignatureService: EsignatureService) {}

  /**
   * POST /contracts/:id/signing-requests
   * Creates and sends a new signing request for a contract.
   * Requires CONTRACT_MANAGER role.
   */
  @Post('contracts/:id/signing-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Create a signing request for a contract' })
  createSigningRequest(
    @Param('id') contractId: string,
    @Body() dto: CreateSigningRequestDto,
  ) {
    return this.esignatureService.createRequest(contractId, dto);
  }

  /**
   * POST /signing-requests/:id/callback
   * Webhook endpoint for e-signature providers to post status updates.
   * This endpoint is intentionally public (no authentication) — providers
   * call it directly. Validate provider signatures in production via
   * HMAC headers (e.g., X-DocuSign-Signature-1).
   */
  @Post('signing-requests/:id/callback')
  @ApiOperation({ summary: 'Receive signing status callback from provider (webhook)' })
  handleCallback(
    @Param('id') requestId: string,
    @Body() body: { status: string; signedAt?: string },
  ) {
    return this.esignatureService.handleCallback(requestId, body);
  }

  /**
   * GET /contracts/:id/signing-requests
   * Lists all signing requests for a contract.
   * Requires VIEWER role.
   */
  @Get('contracts/:id/signing-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('VIEWER')
  @ApiOperation({ summary: 'List all signing requests for a contract' })
  getSigningRequests(@Param('id') contractId: string) {
    return this.esignatureService.getRequests(contractId);
  }

  /**
   * PATCH /signing-requests/:id/cancel
   * Cancels an active signing request.
   * Requires CONTRACT_MANAGER role.
   */
  @Patch('signing-requests/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('CONTRACT_MANAGER')
  @ApiOperation({ summary: 'Cancel an active signing request' })
  cancelSigningRequest(@Param('id') requestId: string) {
    return this.esignatureService.cancelRequest(requestId);
  }
}
