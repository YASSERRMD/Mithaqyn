import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ISignatureProvider,
  SigningRequestOptions,
  SigningRequestResult,
} from '../interfaces/signature-provider.interface';

/**
 * UAEPassAdapter — wraps the UAE PASS Digital Signature Service (DSS).
 *
 * UAE PASS is the UAE national digital identity and digital signature platform,
 * operated by the Telecommunications and Digital Government Regulatory Authority (TDRA).
 *
 * Real API base URL (production): https://id.uaepass.ae
 * Real API base URL (staging):    https://stg-id.uaepass.ae
 *
 * Key endpoints used in production:
 *   POST /idshub/sign
 *     – Initiates a document signing request. Body:
 *       { fileHash, fileName, fileType, signerIdn (Emirates ID), redirectUri, transactionId }
 *     – Returns { transactionId, signingUrl } to redirect the user to UAE PASS app.
 *   GET  /idshub/sign/status?transactionId={id}
 *     – Polls for transaction status (INITIATED, PENDING, SUCCESS, FAILED, EXPIRED).
 *   DELETE /idshub/sign/{transactionId}
 *     – Cancels a pending signing transaction.
 *
 * Auth: OAuth 2.0 Client Credentials using UAE PASS issued clientId + clientSecret.
 * The access token is obtained from POST /idshub/token and passed as Bearer.
 *
 * Note: UAE PASS requires the signer to have a verified UAE PASS account linked
 * to their Emirates ID. The signerEmail field is used for notification; the
 * Emirates ID number (IDN) is required for the actual signing request in production.
 *
 * This adapter currently stubs the HTTP calls and returns representative
 * mock data so the rest of the application can be developed and tested
 * without live UAE PASS credentials.
 */
@Injectable()
export class UAEPassAdapter implements ISignatureProvider {
  getProviderName(): string {
    return 'UAE_PASS';
  }

  /**
   * Creates a UAE PASS signing transaction.
   *
   * Production flow:
   *   1. Validate UAE_PASS_CLIENT_ID, UAE_PASS_CLIENT_SECRET env vars.
   *   2. POST /idshub/token — obtain access token via client credentials.
   *   3. Hash the document (SHA-256) for the fileHash field.
   *   4. POST /idshub/sign — create signing transaction.
   *   5. Return { externalId: transactionId, signingUrl, status: 'SENT' }.
   */
  async createSigningRequest(
    opts: SigningRequestOptions,
  ): Promise<SigningRequestResult> {
    const clientId = process.env.UAE_PASS_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException(
        'UAE_PASS_CLIENT_ID environment variable is not set',
      );
    }

    // --- Stub: production code would execute the HTTP requests below ---
    //
    // const clientSecret = process.env.UAE_PASS_CLIENT_SECRET;
    // const baseUrl = process.env.UAE_PASS_BASE_URL ?? 'https://stg-id.uaepass.ae';
    //
    // // Step 1: Get access token
    // const tokenRes = await axios.post(
    //   `${baseUrl}/idshub/token`,
    //   new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    //   { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    // );
    // const accessToken = tokenRes.data.access_token;
    //
    // // Step 2: Compute document hash
    // const fileBuffer = fs.readFileSync(opts.documentPath);
    // const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    //
    // // Step 3: Create signing transaction
    // const transactionId = uuidv4();
    // const signBody = {
    //   transactionId,
    //   fileHash,
    //   fileName: path.basename(opts.documentPath),
    //   fileType: 'PDF',
    //   signerIdn: opts.signerEmail, // In production use Emirates ID; email used as fallback
    //   redirectUri: opts.redirectUrl ?? 'https://app.mithaqyn.com/signing/done',
    // };
    // const signRes = await axios.post(`${baseUrl}/idshub/sign`, signBody, {
    //   headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    // });
    //
    // return {
    //   externalId: signRes.data.transactionId,
    //   signingUrl: signRes.data.signingUrl,
    //   status: 'SENT',
    // };

    const externalId = uuidv4();
    return {
      externalId,
      signingUrl: `https://stg-id.uaepass.ae/idshub/sign?transactionId=${externalId}`,
      status: 'SENT',
    };
  }

  /**
   * Retrieves UAE PASS signing transaction status.
   *
   * Production: GET /idshub/sign/status?transactionId={externalId}
   * Maps INITIATED/PENDING → SENT, SUCCESS → SIGNED, FAILED/EXPIRED → EXPIRED.
   */
  async getStatus(
    externalId: string,
  ): Promise<{ status: string; signedAt?: Date }> {
    // Stub — real impl calls GET /idshub/sign/status?transactionId=:id
    return { status: 'SENT' };
  }

  /**
   * Cancels a UAE PASS signing transaction.
   *
   * Production: DELETE /idshub/sign/{externalId}
   */
  async cancelRequest(externalId: string): Promise<void> {
    // Stub — real impl calls DELETE /idshub/sign/:id
  }
}
