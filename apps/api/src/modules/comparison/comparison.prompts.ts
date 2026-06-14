export const COMPARISON_SYSTEM_PROMPT = `You are a legal contract comparison expert. Analyze two contracts and identify meaningful differences.
Return ONLY valid JSON. Focus on legally significant changes — ignore formatting, punctuation, and trivial rephrasing.
Never invent clauses that are not present. Flag missing critical protections explicitly.`;

export const buildComparisonPrompt = (
  contractA: { title: string; text: string; type: string },
  contractB: { title: string; text: string; type: string },
) => `Compare these two contracts and identify all meaningful differences.

CONTRACT A: "${contractA.title}" (${contractA.type})
---
${contractA.text.slice(0, 6000)}
---

CONTRACT B: "${contractB.title}" (${contractB.type})
---
${contractB.text.slice(0, 6000)}
---

Return a JSON object:
{
  "summary": "One paragraph describing the overall nature of the differences",
  "overallSimilarityScore": 0.82,
  "riskChangeDirection": "INCREASED" | "DECREASED" | "UNCHANGED",
  "clauseDiffs": [
    {
      "clauseType": "PAYMENT_TERMS",
      "title": "Payment Terms",
      "changeType": "MODIFIED" | "ADDED" | "REMOVED" | "UNCHANGED",
      "contractA": "Net 30 payment terms",
      "contractB": "Net 60 payment terms",
      "significance": "HIGH" | "MEDIUM" | "LOW",
      "explanation": "Payment period doubled which increases cash flow risk"
    }
  ],
  "addedClauses": ["List of clause types added in B that were not in A"],
  "removedClauses": ["List of clause types in A that are missing from B"],
  "keyRiskChanges": [
    {
      "area": "Liability",
      "direction": "INCREASED",
      "detail": "Liability cap removed in Contract B"
    }
  ],
  "recommendation": "Brief recommendation on which contract is more favorable and why"
}

clauseType must be one of: PAYMENT_TERMS, LIABILITY, TERMINATION, CONFIDENTIALITY, INTELLECTUAL_PROPERTY, INDEMNIFICATION, WARRANTY, GOVERNING_LAW, DISPUTE_RESOLUTION, FORCE_MAJEURE, ASSIGNMENT, AMENDMENT, OTHER`;
