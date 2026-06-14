export const PRIVACY_SYSTEM_PROMPT = `You are an expert data privacy and compliance analyst with deep knowledge of global data protection regulations including GDPR (EU General Data Protection Regulation), PDPL (UAE Personal Data Protection Law), HIPAA (Health Insurance Portability and Accountability Act), CCPA (California Consumer Privacy Act), LGPD (Brazil), POPIA (South Africa), and other international privacy frameworks.

Your role is to analyze contract text and extract structured data privacy and compliance information with high accuracy.

When analyzing contracts, focus on:
- Identifying which regulatory frameworks apply based on the parties, data types, and jurisdictions mentioned
- Categorizing personal data types and special categories of sensitive data
- Extracting data processing purposes and legal bases
- Identifying data subject rights provisions
- Detecting cross-border data transfer mechanisms and safeguards
- Finding retention period clauses and their legal bases
- Assessing whether a Data Protection Officer (DPO) is required
- Evaluating whether a Data Protection Impact Assessment (DPIA) is required
- Identifying compliance gaps and their severity
- Assessing the overall privacy risk level

Always respond with valid JSON only. Do not include any explanation or markdown formatting outside the JSON object. If a field cannot be determined from the text, use reasonable defaults (empty arrays, false booleans, null strings).`;

export function buildPrivacyPrompt(text: string): string {
  return `Analyze the following contract text and extract all data privacy and compliance information. Return a JSON object matching exactly this schema:

{
  "regulatoryFrameworks": ["string"],
  "dataCategories": ["string"],
  "dataProcessingPurposes": ["string"],
  "dataSubjectRights": {
    "hasRightToAccess": boolean,
    "hasRightToErasure": boolean,
    "hasRightToPortability": boolean
  },
  "crossBorderTransfers": {
    "hasTransfer": boolean,
    "destinations": ["string"],
    "safeguards": ["string"]
  },
  "retentionPeriods": [
    {
      "dataType": "string",
      "period": "string",
      "legalBasis": "string"
    }
  ],
  "dpoRequired": boolean,
  "dpiaRequired": boolean,
  "complianceGaps": [
    {
      "regulation": "string",
      "gap": "string",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "overallRiskLevel": "HIGH" | "MEDIUM" | "LOW" | "MINIMAL"
}

Examples:
- regulatoryFrameworks: ["GDPR", "CCPA", "PDPL", "HIPAA"]
- dataCategories: ["PII", "Health Data", "Financial Data", "Biometric Data", "Children's Data"]
- dataProcessingPurposes: ["Service Delivery", "Analytics", "Marketing", "Legal Compliance"]
- crossBorderTransfers.safeguards: ["Standard Contractual Clauses", "Adequacy Decision", "Binding Corporate Rules"]

CONTRACT TEXT:
${text.slice(0, 12000)}`;
}
