export type AIProviderName =
  | 'openai'
  | 'azure-openai'
  | 'anthropic'
  | 'google-gemini'
  | 'mistral'
  | 'cohere'
  | 'groq'
  | 'together'
  | 'deepseek'
  | 'ollama'
  | 'openai-compatible';

export interface IAIProviderConfig {
  id: string;
  name: string;
  provider: AIProviderName;
  model: string;
  embeddingModel?: string;
  baseUrl?: string;
  isActive: boolean;
  isDefault: boolean;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface IAIAnalysisResult {
  jobId: string;
  contractId: string;
  analysisType:
    | 'CLAUSE_EXTRACTION'
    | 'RISK_SCORING'
    | 'OBLIGATION_EXTRACTION'
    | 'RENEWAL_PREDICTION'
    | 'SUMMARIZATION';
  provider: AIProviderName;
  model: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: Record<string, unknown>;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface IExtractedClause {
  type: string;
  title: string;
  summary: string;
  textExcerpt: string;
  confidence: number;
  riskLevel: string;
  pageReference?: number;
}

export interface IExtractedRisk {
  category: string;
  severity: string;
  title: string;
  explanation: string;
  recommendation: string;
  confidence: number;
}

export interface IExtractedObligation {
  title: string;
  description: string;
  dueDate?: string;
  owner?: string;
  priority: string;
  confidence: number;
}

export interface IRenewalPrediction {
  expiryDate?: string;
  renewalDate?: string;
  autoRenewal: boolean;
  noticePeriodDays?: number;
  daysUntilExpiry?: number;
  renewalRiskScore: number;
  confidence: number;
}
