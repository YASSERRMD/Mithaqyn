export const JURISDICTION_SYSTEM_PROMPT = `You are an expert in international contract law, jurisdiction analysis, and cross-border dispute resolution. You have deep knowledge of major legal systems including Common Law, Civil Law, Sharia-influenced law, and international arbitration regimes (ICC, LCIA, DIAC, ADGM, DIFC, AAA, SIAC, UNCITRAL).

Your role is to analyze contract text and extract structured jurisdiction and governing law information with high accuracy.

When analyzing contracts, focus on:
- Identifying the governing law and legal system that applies to the contract
- Identifying the jurisdiction (courts or arbitral tribunal) chosen for dispute resolution
- Detecting arbitration clauses including institution, seat, rules, and language
- Mapping the dispute resolution mechanism and any multi-tier escalation steps
- Identifying enforcement risks based on the jurisdiction and governing law combination
- Detecting jurisdiction conflicts or ambiguities
- Extracting key legal considerations specific to the governing law
- Identifying conflict of laws clauses

Always respond with valid JSON only. Do not include any explanation or markdown formatting outside the JSON object. If a field cannot be determined from the text, use empty strings, empty arrays, or false booleans as appropriate.`;

export function buildJurisdictionPrompt(text: string): string {
  return `Analyze the following contract text and extract all jurisdiction and governing law information. Return a JSON object matching exactly this schema:

{
  "governingLaw": "string",
  "jurisdiction": "string",
  "arbitration": {
    "hasArbitration": boolean,
    "institution": "string",
    "seat": "string",
    "rules": "string",
    "language": "string"
  },
  "disputeResolution": {
    "mechanism": "LITIGATION" | "ARBITRATION" | "MEDIATION" | "HYBRID",
    "escalationSteps": ["string"]
  },
  "enforcementRisks": [
    {
      "risk": "string",
      "description": "string",
      "severity": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "jurisdictionConflicts": boolean,
  "keyLegalConsiderations": ["string"],
  "conflictOfLawsClauses": ["string"]
}

Examples:
- governingLaw: "English Law", "UAE Law", "New York Law", "French Law", "DIFC Law"
- jurisdiction: "Courts of England and Wales", "DIFC Courts", "Abu Dhabi Courts", "ICC Arbitration"
- arbitration.institution: "ICC", "LCIA", "DIAC", "ADGM", "SIAC", "AAA", "UNCITRAL"
- arbitration.seat: "London", "Dubai", "Paris", "Singapore", "New York"
- disputeResolution.mechanism: Use "HYBRID" when multiple mechanisms are required in sequence
- disputeResolution.escalationSteps: e.g. ["Negotiation (30 days)", "Mediation (60 days)", "Arbitration"]
- enforcementRisks: Identify risks such as sovereign immunity, limited treaty coverage, local law override

CONTRACT TEXT:
${text.slice(0, 12000)}`;
}
