// ─── Redline Prompts ──────────────────────────────────────────────────────────

export const REDLINE_SYSTEM_PROMPT = `You are an expert contract negotiator and redlining specialist with 20+ years of experience in commercial and corporate legal practice.

Your role is to review individual contract clauses and produce professional redlines — suggested edits that protect the client's position, reduce legal risk, and reflect market-standard negotiation positions.

IMPORTANT RULES:
- Return ONLY valid JSON — no markdown, no code blocks, no preamble
- Preserve the original clause structure while improving problematic terms
- Focus on risk allocation, liability exposure, ambiguous language, and missing protective provisions
- Provide clear reasoning for every change
- Classify each change by risk level (HIGH, MEDIUM, LOW)
- The redlinedText should read as clean, final contract language — not a tracked-changes markup
- This is AI-assisted analysis, not formal legal advice. Recommend qualified counsel review.`;

export interface RedlineContext {
  counterpartyType?: 'BUYER' | 'SELLER' | 'VENDOR' | 'PARTNER';
  contractType?: string;
  partyPosition?: 'DRAFTING_PARTY' | 'REVIEWING_PARTY';
}

export interface RedlineChange {
  type: 'ADDITION' | 'DELETION' | 'MODIFICATION';
  original: string;
  suggested: string;
  reason: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RedlineResult {
  originalText: string;
  redlinedText: string;
  changes: RedlineChange[];
  negotiationPosition: string;
  alternativeFallback: string;
  summary: string;
}

export const buildRedlinePrompt = (
  clauseText: string,
  context?: RedlineContext,
): string => {
  const counterpartyInfo = context?.counterpartyType
    ? `Counterparty type: ${context.counterpartyType}`
    : 'Counterparty type: unknown';

  const contractInfo = context?.contractType
    ? `Contract type: ${context.contractType}`
    : 'Contract type: general commercial agreement';

  const positionInfo = context?.partyPosition
    ? `Our client's position: ${context.partyPosition === 'DRAFTING_PARTY' ? 'Drafting Party (our client wrote this clause)' : 'Reviewing Party (counterparty drafted this clause)'}`
    : 'Position: Reviewing Party (counterparty drafted this clause)';

  return `You are redlining the following contract clause on behalf of our client.

CONTEXT:
- ${counterpartyInfo}
- ${contractInfo}
- ${positionInfo}

CLAUSE TEXT TO REDLINE:
---
${clauseText.slice(0, 6000)}
---

Analyze this clause and produce a professional redline. Focus on:
1. Removing or limiting unlimited liability or indemnity exposure
2. Clarifying vague or ambiguous language
3. Adding missing protective provisions (e.g., notice requirements, cure periods, caps)
4. Correcting unfair risk allocation
5. Ensuring mutual reciprocity where appropriate
6. Strengthening exit rights and limitation of liability

Return this exact JSON structure:
{
  "originalText": "The exact clause text as provided",
  "redlinedText": "The improved clause text after redlining — clean final language",
  "changes": [
    {
      "type": "MODIFICATION",
      "original": "the exact original phrase being changed",
      "suggested": "the replacement phrase",
      "reason": "Clear explanation of why this change protects our client",
      "riskLevel": "HIGH"
    }
  ],
  "negotiationPosition": "Brief description of the preferred negotiation outcome and why",
  "alternativeFallback": "If counterparty rejects the preferred position, describe acceptable compromise language",
  "summary": "2-3 sentence plain-English summary of what this redline achieves and the key risks addressed"
}

Risk levels: HIGH (material financial or legal exposure), MEDIUM (significant but manageable risk), LOW (housekeeping or clarity improvements)
Change types: ADDITION (new text added), DELETION (text removed), MODIFICATION (text changed)
Return ONLY the JSON object.`;
};
