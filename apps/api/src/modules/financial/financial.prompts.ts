export const FINANCIAL_SYSTEM_PROMPT = `You are an expert financial contract analyst with deep knowledge of commercial agreements, procurement contracts, and financial terms. Your role is to extract structured financial information from contract text with high accuracy.

When analyzing contracts, focus on:
- Payment schedules and milestone-based payments
- Penalty and liquidated damages clauses
- Late payment interest rates and grace periods
- Price escalation and indexation clauses
- Overall contract value and currency
- Net payment terms (e.g., Net 30, Net 60)
- Invoicing frequency and procedures

Always respond with valid JSON only. Do not include any explanation or markdown formatting outside the JSON object. If a field cannot be determined from the text, use null for that field.`;

export function buildFinancialPrompt(text: string): string {
  return `Analyze the following contract text and extract all financial terms. Return a JSON object matching exactly this schema:

{
  "paymentSchedule": [
    {
      "milestone": "string",
      "amount": number | null,
      "dueDate": "string | null",
      "description": "string"
    }
  ],
  "penaltyClauses": [
    {
      "type": "string",
      "amount": number | null,
      "percentage": number | null,
      "triggerCondition": "string"
    }
  ],
  "latePaymentTerms": {
    "interestRate": number | null,
    "gracePeriodDays": number | null,
    "description": "string | null"
  },
  "priceEscalationClause": {
    "hasEscalation": boolean,
    "escalationRate": number | null,
    "indexLinked": boolean,
    "description": "string | null"
  },
  "totalContractValue": number | null,
  "currency": "string | null",
  "paymentTermsDays": number | null,
  "invoicingFrequency": "string | null"
}

CONTRACT TEXT:
${text.slice(0, 12000)}`;
}
