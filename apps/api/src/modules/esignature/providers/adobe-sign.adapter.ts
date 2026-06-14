import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ISignatureProvider,
  SigningRequestOptions,
  SigningRequestResult,
} from '../interfaces/signature-provider.interface';

/**
 * AdobeSignAdapter — wraps the Adobe Acrobat Sign REST API v6.
 *
 * Real API base URL: https://api.na1.adobesign.com/api/rest/v6
 *   (shard suffix varies: na1, na2, eu1, eu2, jp1, etc.)
 *
 * Key endpoints used in production:
 *   POST /transientDocuments
 *     – Uploads the contract PDF as a transient document; returns transientDocumentId.
 *   POST /agreements
 *     – Creates an agreement (envelope equivalent) referencing the transient doc.
 *     – Body: { name, fileInfos: [{ transientDocumentId }], participantSetsInfo, signatureType, state }
 *   GET  /agreements/{agreementId}
 *     – Retrieves agreement status (OUT_FOR_SIGNATURE, SIGNED, CANCELLED, EXPIRED, etc.)
 *   PUT  /agreements/{agreementId}/state
 *     – Transitions agreement state, e.g. { state: 'CANCELLED' }.
 *   GET  /agreements/{agreementId}/signingUrls
 *     – Returns the signer URL for embedded or redirect signing.
 *
 * Auth: OAuth 2.0 Authorization Code flow or Application Token.
 * Access token passed as Bearer in Authorization header.
 *
 * This adapter currently stubs the HTTP calls and returns representative
 * mock data so the rest of the application can be developed and tested
 * without live Adobe Sign credentials.
 */
@Injectable()
export class AdobeSignAdapter implements ISignatureProvider {
  getProviderName(): string {
    return 'ADOBE_SIGN';
  }

  /**
   * Creates an Adobe Sign agreement and returns the signing URL.
   *
   * Production flow:
   *   1. Validate ADOBE_SIGN_API_KEY (access token) env var.
   *   2. POST /transientDocuments — upload PDF, get transientDocumentId.
   *   3. POST /agreements — create agreement with signer participant set.
   *   4. GET  /agreements/{id}/signingUrls — get embedded signing URL.
   *   5. Return { externalId: agreementId, signingUrl, status: 'SENT' }.
   */
  async createSigningRequest(
    opts: SigningRequestOptions,
  ): Promise<SigningRequestResult> {
    const apiKey = process.env.ADOBE_SIGN_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'ADOBE_SIGN_API_KEY environment variable is not set',
      );
    }

    // --- Stub: production code would execute the HTTP requests below ---
    //
    // const baseUrl = process.env.ADOBE_SIGN_BASE_URL ?? 'https://api.na1.adobesign.com/api/rest/v6';
    // const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    //
    // // Step 1: Upload transient document
    // const formData = new FormData();
    // formData.append('File-Name', 'contract.pdf');
    // formData.append('File', fs.createReadStream(opts.documentPath));
    // formData.append('Mime-Type', 'application/pdf');
    // const transientRes = await axios.post(`${baseUrl}/transientDocuments`, formData, { headers: { Authorization: `Bearer ${apiKey}` } });
    // const transientDocumentId = transientRes.data.transientDocumentId;
    //
    // // Step 2: Create agreement
    // const agreementBody = {
    //   name: `Contract Signature — ${opts.contractId}`,
    //   fileInfos: [{ transientDocumentId }],
    //   participantSetsInfo: [{
    //     order: 1,
    //     role: 'SIGNER',
    //     memberInfos: [{ email: opts.signerEmail, name: opts.signerName }],
    //   }],
    //   signatureType: 'ESIGN',
    //   state: 'IN_PROCESS',
    //   expirationTime: opts.expiresInDays
    //     ? new Date(Date.now() + opts.expiresInDays * 86400_000).toISOString()
    //     : undefined,
    // };
    // const agreementRes = await axios.post(`${baseUrl}/agreements`, agreementBody, { headers });
    // const agreementId = agreementRes.data.id;
    //
    // // Step 3: Get signing URL
    // const signingUrlRes = await axios.get(`${baseUrl}/agreements/${agreementId}/signingUrls`, { headers });
    // const signingUrl = signingUrlRes.data.signingUrlSetInfos?.[0]?.signingUrls?.[0]?.esignUrl;
    //
    // return { externalId: agreementId, signingUrl, status: 'SENT' };

    const externalId = uuidv4();
    return {
      externalId,
      signingUrl: `https://secure.na1.adobesign.com/public/apiesig/${externalId}`,
      status: 'SENT',
    };
  }

  /**
   * Retrieves agreement status.
   *
   * Production: GET /agreements/{externalId}
   * Maps Adobe Sign status (OUT_FOR_SIGNATURE → SENT, SIGNED → SIGNED, CANCELLED → CANCELLED, etc.)
   */
  async getStatus(
    externalId: string,
  ): Promise<{ status: string; signedAt?: Date }> {
    // Stub — real impl calls GET /agreements/:id
    return { status: 'SENT' };
  }

  /**
   * Cancels an Adobe Sign agreement.
   *
   * Production: PUT /agreements/{externalId}/state
   * Body: { state: 'CANCELLED' }
   */
  async cancelRequest(externalId: string): Promise<void> {
    // Stub — real impl calls PUT /agreements/:id/state with { state: 'CANCELLED' }
  }
}
