export const CLAUSE_EXTRACTION_SYSTEM_PROMPT = `You are a legal expert AI assistant specializing in contract analysis.
Your task is to extract and analyze contractual clauses from legal documents.

IMPORTANT RULES:
- Return ONLY valid JSON — no markdown, no code blocks, no preamble
- Include confidence scores (0.0–1.0) for each extraction
- Include direct text excerpts from the contract
- State uncertainty clearly — do not guess or hallucinate
- This output is AI-assisted analysis, not legal advice
- If a clause type is absent, do not include it in the output`;

export const buildClauseExtractionPrompt = (contractText: string): string => `
Analyze the following contract and extract all identifiable clauses.

CONTRACT TEXT:
---
${contractText.slice(0, 12000)}
---

Extract clauses matching these categories where present:
PAYMENT_TERMS, TERMINATION, RENEWAL, LIABILITY, INDEMNITY, CONFIDENTIALITY,
GOVERNING_LAW, JURISDICTION, SLA, PENALTIES, FORCE_MAJEURE, DATA_PROTECTION,
INTELLECTUAL_PROPERTY, ASSIGNMENT, DISPUTE_RESOLUTION, AUDIT_RIGHTS,
INSURANCE, COMPLIANCE, SUBCONTRACTING, CHANGE_CONTROL

Return this exact JSON structure:
{
  "clauses": [
    {
      "type": "TERMINATION",
      "title": "Termination for Convenience",
      "summary": "Brief plain-English summary of the clause",
      "textExcerpt": "Exact quoted text from the contract (up to 300 chars)",
      "confidence": 0.92,
      "riskLevel": "MEDIUM",
      "pageReference": null
    }
  ],
  "totalClausesFound": 5,
  "coverageScore": 0.75,
  "missingHighRiskClauses": ["LIABILITY", "INDEMNITY"],
  "aiNote": "AI-assisted analysis. Not legal advice. Review with qualified counsel."
}

Risk levels: LOW, MEDIUM, HIGH, CRITICAL
Only include clauses actually present in the contract.
`;
