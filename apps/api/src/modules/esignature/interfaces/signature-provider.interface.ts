export interface SigningRequestOptions {
  contractId: string;
  documentPath: string;
  signerEmail: string;
  signerName: string;
  redirectUrl?: string;
  expiresInDays?: number;
}

export interface SigningRequestResult {
  externalId: string;
  signingUrl?: string;
  status: string;
}

export interface ISignatureProvider {
  getProviderName(): string;
  createSigningRequest(opts: SigningRequestOptions): Promise<SigningRequestResult>;
  getStatus(externalId: string): Promise<{ status: string; signedAt?: Date }>;
  cancelRequest(externalId: string): Promise<void>;
}
