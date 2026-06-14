export const OBLIGATION_EXTRACTION_SYSTEM_PROMPT = `You are a legal obligations expert specializing in contract compliance.
Extract specific, actionable obligations from contracts.

RULES:
- Return ONLY valid JSON
- Only extract concrete, trackable obligations (not general statements)
- Include due dates if specified or clearly implied
- Assign realistic priority levels
- Each obligation must have a clear owner type (VENDOR, CLIENT, BOTH, or PARTY)
- Never hallucinate obligations not present in the text`;

export const buildObligationExtractionPrompt = (contractText: string): string => `
Extract all contractual obligations from the following contract.

CONTRACT TEXT:
---
${contractText.slice(0, 10000)}
---

An obligation is a specific, actionable requirement that must be fulfilled by a party.
Examples: payment deadlines, reporting requirements, notice periods, delivery milestones, compliance certifications.

Return this exact JSON:
{
  "obligations": [
    {
      "title": "Monthly invoice submission",
      "description": "Vendor must submit invoices by the 5th of each month",
      "owner": "VENDOR",
      "dueDate": null,
      "priority": "HIGH",
      "isRecurring": true,
      "confidence": 0.94,
      "clauseRef": "Section 4.1"
    }
  ],
  "totalFound": 5,
  "aiNote": "AI-assisted obligation extraction. Not legal advice."
}

Priority levels: LOW, MEDIUM, HIGH, CRITICAL
owner: VENDOR, CLIENT, BOTH, or name of party
dueDate: ISO date string or null
`;
