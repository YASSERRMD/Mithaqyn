export const RISK_ANALYSIS_SYSTEM_PROMPT = `You are a legal risk assessment expert specializing in contract risk analysis.
Your role is to identify contractual risks objectively and provide actionable recommendations.

IMPORTANT RULES:
- Return ONLY valid JSON
- Be specific about risk categories and severity
- Provide actionable recommendations for each risk
- Include confidence scores (0.0–1.0)
- Distinguish between present risks and hypothetical ones
- Do not hallucinate risks that are not supported by the text
- This is AI-assisted analysis, not legal advice`;

export const buildRiskScoringPrompt = (contractText: string, clauseSummaries?: string): string => `
Analyze the following contract for legal and business risks.

CONTRACT TEXT:
---
${contractText.slice(0, 10000)}
---
${clauseSummaries ? `\nEXTRACTED CLAUSES:\n${clauseSummaries}\n` : ''}

Identify risks in these categories where applicable:
Financial, Legal, Compliance, Operational, Data Privacy, Renewal,
Vendor Lock-in, Liability, Missing Clause, Ambiguous Clause

For each risk, assign severity: LOW, MEDIUM, HIGH, or CRITICAL

Return this exact JSON:
{
  "risks": [
    {
      "category": "Liability",
      "severity": "HIGH",
      "title": "Unlimited liability exposure",
      "explanation": "The contract contains no liability cap, exposing the party to unlimited damages.",
      "recommendation": "Negotiate a mutual liability cap of 12 months of fees paid.",
      "confidence": 0.88,
      "clauseRef": "Section 8.2"
    }
  ],
  "overallRiskScore": 72,
  "overallRiskLevel": "HIGH",
  "summary": "Brief 2-3 sentence risk summary",
  "criticalCount": 1,
  "highCount": 2,
  "mediumCount": 3,
  "lowCount": 1,
  "aiNote": "AI-assisted risk analysis. Not legal advice."
}

overallRiskScore is 0-100 (higher = more risk).
Only include real, present risks — not hypothetical ones.
`;
