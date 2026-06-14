import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ISignatureProvider } from './interfaces/signature-provider.interface';
import { DocuSignAdapter } from './providers/docusign.adapter';
import { AdobeSignAdapter } from './providers/adobe-sign.adapter';
import { UAEPassAdapter } from './providers/uae-pass.adapter';

export interface CreateSigningRequestDto {
  provider: string;
  signerEmail: string;
  signerName: string;
  redirectUrl?: string;
}

@Injectable()
export class EsignatureService {
  private readonly providers: Map<string, ISignatureProvider>;

  constructor(private readonly prisma: PrismaService) {
    this.providers = new Map([
      ['DOCUSIGN', new DocuSignAdapter()],
      ['ADOBE_SIGN', new AdobeSignAdapter()],
      ['UAE_PASS', new UAEPassAdapter()],
    ]);
  }

  /**
   * Returns the adapter for the given provider name.
   * Throws BadRequestException if the provider is unsupported.
   */
  getProvider(name: string): ISignatureProvider {
    const provider = this.providers.get(name.toUpperCase());
    if (!provider) {
      throw new BadRequestException(
        `Unsupported e-signature provider: "${name}". ` +
          `Supported providers: ${[...this.providers.keys()].join(', ')}`,
      );
    }
    return provider;
  }

  /**
   * Creates a new signing request for a contract.
   * Looks up the contract's primary document path, calls the provider adapter,
   * and persists the resulting SigningRequest record.
   */
  async createRequest(contractId: string, dto: CreateSigningRequestDto) {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const adapter = this.getProvider(dto.provider);

    // Use the first document's storage path; fall back to contractId as placeholder
    const documentPath =
      contract.documents[0]?.storagePath ?? `contracts/${contractId}/document.pdf`;

    const result = await adapter.createSigningRequest({
      contractId,
      documentPath,
      signerEmail: dto.signerEmail,
      signerName: dto.signerName,
      redirectUrl: dto.redirectUrl,
      expiresInDays: 30,
    });

    const signingRequest = await this.prisma.signingRequest.create({
      data: {
        contractId,
        provider: adapter.getProviderName(),
        status: result.status,
        externalId: result.externalId,
        signerEmail: dto.signerEmail,
        signerName: dto.signerName,
        redirectUrl: dto.redirectUrl ?? null,
        callbackData: result.signingUrl ? { signingUrl: result.signingUrl } : undefined,
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      ...signingRequest,
      signingUrl: result.signingUrl,
    };
  }

  /**
   * Handles an inbound webhook callback from a signature provider.
   * Updates the SigningRequest status and sets signedAt when SIGNED.
   */
  async handleCallback(
    requestId: string,
    callbackData: { status: string; signedAt?: string },
  ) {
    const signingRequest = await this.prisma.signingRequest.findUnique({
      where: { id: requestId },
    });

    if (!signingRequest) {
      throw new NotFoundException(`SigningRequest ${requestId} not found`);
    }

    const newStatus = callbackData.status?.toUpperCase() ?? signingRequest.status;

    const updated = await this.prisma.signingRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        callbackData: callbackData as object,
        signedAt:
          newStatus === 'SIGNED'
            ? callbackData.signedAt
              ? new Date(callbackData.signedAt)
              : new Date()
            : signingRequest.signedAt,
      },
    });

    return updated;
  }

  /**
   * Returns all signing requests for a contract, ordered newest first.
   */
  async getRequests(contractId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return this.prisma.signingRequest.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancels a signing request by calling the provider adapter and updating the DB record.
   */
  async cancelRequest(requestId: string) {
    const signingRequest = await this.prisma.signingRequest.findUnique({
      where: { id: requestId },
    });

    if (!signingRequest) {
      throw new NotFoundException(`SigningRequest ${requestId} not found`);
    }

    if (signingRequest.status === 'CANCELLED') {
      throw new BadRequestException(`SigningRequest ${requestId} is already cancelled`);
    }

    if (signingRequest.status === 'SIGNED') {
      throw new BadRequestException(`Cannot cancel a signing request that has already been signed`);
    }

    if (signingRequest.externalId) {
      const adapter = this.getProvider(signingRequest.provider);
      await adapter.cancelRequest(signingRequest.externalId);
    }

    return this.prisma.signingRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
  }
}
