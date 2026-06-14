import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ISignatureProvider,
  SigningRequestOptions,
  SigningRequestResult,
} from '../interfaces/signature-provider.interface';

/**
 * DocuSignAdapter — wraps the DocuSign eSignature REST API.
 *
 * Real API base URL (production):  https://na1.docusign.net/restapi/v2.1
 * Real API base URL (demo/sandbox): https://demo.docusign.net/restapi/v2.1
 *
 * Key endpoints used in production:
 *   POST /accounts/{accountId}/envelopes
 *     – Creates a new envelope and sends it to signers.
 *     – Body: { emailSubject, documents: [...], recipients: { signers: [...] }, status: "sent" }
 *   GET  /accounts/{accountId}/envelopes/{envelopeId}
 *     – Retrieves envelope details including current status.
 *   PUT  /accounts/{accountId}/envelopes/{envelopeId}
 *     – Updates an envelope, e.g. { status: "voided", voidedReason: "..." }
 *   POST /accounts/{accountId}/envelopes/{envelopeId}/views/recipient
 *     – Creates an embedded signing URL (redirectUrl for in-app signing).
 *
 * Auth: OAuth 2.0 JWT Grant (RS256). Exchange private key for an access token
 * from https://account-d.docusign.com/oauth/token, then pass as Bearer token.
 *
 * This adapter currently stubs the HTTP calls and returns representative
 * mock data so the rest of the application can be developed and tested
 * without live DocuSign credentials.
 */
@Injectable()
export class DocuSignAdapter implements ISignatureProvider {
  getProviderName(): string {
    return 'DOCUSIGN';
  }

  /**
   * Creates a DocuSign envelope and returns the signing URL.
   *
   * Production flow:
   *   1. Validate DOCUSIGN_API_KEY, DOCUSIGN_ACCOUNT_ID env vars.
   *   2. POST /accounts/{accountId}/envelopes with document + signer tab config.
   *   3. If redirectUrl provided, POST /envelopes/{id}/views/recipient for embedded URL.
   *   4. Return { externalId: envelopeId, signingUrl, status: 'SENT' }.
   */
  async createSigningRequest(
    opts: SigningRequestOptions,
  ): Promise<SigningRequestResult> {
    const apiKey = process.env.DOCUSIGN_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'DOCUSIGN_API_KEY environment variable is not set',
      );
    }

    // --- Stub: production code would execute the HTTP request below ---
    //
    // const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    // const baseUrl   = process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi/v2.1';
    //
    // const envelopeBody = {
    //   emailSubject: `Please sign: ${opts.contractId}`,
    //   documents: [{ documentId: '1', name: 'contract.pdf', documentBase64: '<base64>' }],
    //   recipients: {
    //     signers: [{
    //       email: opts.signerEmail,
    //       name:  opts.signerName,
    //       recipientId: '1',
    //       tabs: { signHereTabs: [{ documentId: '1', pageNumber: '1', xPosition: '100', yPosition: '150' }] },
    //       redirectUrl: opts.redirectUrl,
    //     }],
    //   },
    //   status: 'sent',
    //   expirationDateTime: opts.expiresInDays
    //     ? new Date(Date.now() + opts.expiresInDays * 86400_000).toISOString()
    //     : undefined,
    // };
    //
    // const response = await axios.post(
    //   `${baseUrl}/accounts/${accountId}/envelopes`,
    //   envelopeBody,
    //   { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
    // );
    // const envelopeId = response.data.envelopeId;
    //
    // // Get embedded signing URL
    // const viewResponse = await axios.post(
    //   `${baseUrl}/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    //   { authenticationMethod: 'none', email: opts.signerEmail, recipientId: '1',
    //     returnUrl: opts.redirectUrl ?? 'https://app.mithaqyn.com/signing/done' },
    //   { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } },
    // );
    // return { externalId: envelopeId, signingUrl: viewResponse.data.url, status: 'SENT' };

    const externalId = uuidv4();
    return {
      externalId,
      signingUrl: `https://demo.docusign.net/Member/PowerFormSigning.aspx?PowerFormId=${externalId}`,
      status: 'SENT',
    };
  }

  /**
   * Retrieves envelope status.
   *
   * Production: GET /accounts/{accountId}/envelopes/{externalId}
   * Returns envelope.status ('sent' | 'delivered' | 'completed' | 'declined' | 'voided')
   * and envelope.completedDateTime when signed.
   */
  async getStatus(
    externalId: string,
  ): Promise<{ status: string; signedAt?: Date }> {
    // Stub — real impl calls GET /envelopes/:id
    return { status: 'SENT' };
  }

  /**
   * Voids an envelope (cancels it).
   *
   * Production: PUT /accounts/{accountId}/envelopes/{externalId}
   * Body: { status: 'voided', voidedReason: 'Cancelled by contract manager' }
   */
  async cancelRequest(externalId: string): Promise<void> {
    // Stub — real impl calls PUT /envelopes/:id with status VOIDED
  }
}
