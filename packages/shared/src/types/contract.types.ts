export type ContractType =
  | 'MASTER_AGREEMENT'
  | 'AMENDMENT'
  | 'PROCUREMENT_AGREEMENT'
  | 'VENDOR_AGREEMENT'
  | 'NDA'
  | 'SLA'
  | 'MOU'
  | 'LEASE'
  | 'EMPLOYMENT_CONTRACT'
  | 'CUSTOM';

export type ContractStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'UNDER_REVIEW'
  | 'PENDING_SIGNATURE'
  | 'ARCHIVED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ClauseType =
  | 'PAYMENT_TERMS'
  | 'TERMINATION'
  | 'RENEWAL'
  | 'LIABILITY'
  | 'INDEMNITY'
  | 'CONFIDENTIALITY'
  | 'GOVERNING_LAW'
  | 'JURISDICTION'
  | 'SLA'
  | 'PENALTIES'
  | 'FORCE_MAJEURE'
  | 'DATA_PROTECTION'
  | 'INTELLECTUAL_PROPERTY'
  | 'ASSIGNMENT'
  | 'DISPUTE_RESOLUTION'
  | 'AUDIT_RIGHTS'
  | 'INSURANCE'
  | 'COMPLIANCE'
  | 'SUBCONTRACTING'
  | 'CHANGE_CONTROL';

export type ObligationStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'WAIVED'
  | 'CANCELLED';

export interface ICounterparty {
  id: string;
  name: string;
  type: 'VENDOR' | 'CLIENT' | 'PARTNER' | 'GOVERNMENT' | 'OTHER';
  registrationNumber?: string;
  email?: string;
  country?: string;
}

export interface IContract {
  id: string;
  title: string;
  contractNumber?: string;
  type: ContractType;
  status: ContractStatus;
  counterpartyId: string;
  counterparty?: ICounterparty;
  effectiveDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  autoRenewal: boolean;
  noticePeriodDays?: number;
  value?: number;
  currency?: string;
  tags: string[];
  riskScore?: number;
  riskLevel?: RiskLevel;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IClause {
  id: string;
  contractId: string;
  type: ClauseType;
  title: string;
  summary: string;
  textExcerpt: string;
  confidence: number;
  riskLevel: RiskLevel;
  pageReference?: number;
  reviewStatus: 'PENDING' | 'APPROVED' | 'FLAGGED';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface IRiskFinding {
  id: string;
  contractId: string;
  category: string;
  severity: RiskLevel;
  title: string;
  explanation: string;
  recommendation: string;
  confidence: number;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ACCEPTED';
}

export interface IObligation {
  id: string;
  contractId: string;
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  reminderDate?: string;
  status: ObligationStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isEscalated: boolean;
}
