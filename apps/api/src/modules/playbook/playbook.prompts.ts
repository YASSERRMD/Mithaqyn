export interface PlaybookRuleInput {
  id: string;
  ruleType: string;
  clauseType: string;
  description: string;
  standardText?: string | null;
  fallbackText?: string | null;
  priority: number;
}

export const PLAYBOOK_CHECK_SYSTEM_PROMPT = `You are a senior legal counsel reviewing a contract against a legal playbook.
Your task is to check each playbook rule against the contract text and determine compliance status.
Return ONLY valid JSON. Be precise and cite specific contract language when relevant.`;

export const buildPlaybookCheckPrompt = (
  contractText: string,
  rules: PlaybookRuleInput[],
): string => {
  const rulesJson = rules.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    clauseType: r.clauseType,
    description: r.description,
    standardText: r.standardText ?? null,
    fallbackText: r.fallbackText ?? null,
  }));

  return `You are reviewing a contract against the following legal playbook rules.
For each rule, determine compliance status based on the contract text provided.

CONTRACT TEXT:
---
${contractText.slice(0, 10000)}
---

PLAYBOOK RULES TO CHECK:
${JSON.stringify(rulesJson, null, 2)}

For each rule, evaluate and return:
- "COMPLIANT": Contract fully satisfies this rule per standard text or better
- "NON_COMPLIANT": Contract explicitly violates or contradicts this rule
- "MISSING": The clause type is not present in the contract at all
- "ACCEPTABLE": Contract addresses the clause but deviates from standard (may be per fallback position)

Return a JSON object with this exact structure:
{
  "results": [
    {
      "ruleId": "<the rule id>",
      "clauseType": "<clauseType from rule>",
      "ruleType": "<ruleType from rule>",
      "status": "COMPLIANT" | "NON_COMPLIANT" | "MISSING" | "ACCEPTABLE",
      "explanation": "Specific explanation citing contract language or absence thereof",
      "recommendation": "Concrete action to take to bring the contract into compliance, or 'No action needed' if compliant"
    }
  ],
  "overallCompliance": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT",
  "summary": "One paragraph summary of overall playbook compliance"
}

Rules with ruleType MUST_HAVE that are MISSING should be flagged as high priority.
Rules with ruleType MUST_NOT_HAVE that appear in the contract are NON_COMPLIANT.`;
};
