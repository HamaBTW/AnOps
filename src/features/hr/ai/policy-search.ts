import { COMPANY_POLICIES } from "@/features/hr/policies/company-policies";

export type PolicySection = { source: string; section: string; text: string };

const SECTION_HEADING = /^\d+\.\s+\*\*(.+?)\*\*:?\s*$/;

/** Splits each policy into its numbered sections, so answers can cite the section they used. */
function buildSections(): PolicySection[] {
  const sections: PolicySection[] = [];
  for (const policy of COMPANY_POLICIES) {
    let current: PolicySection | null = null;
    for (const line of policy.content.split("\n")) {
      const heading = line.match(SECTION_HEADING);
      if (heading) {
        current = { source: policy.title, section: heading[1], text: "" };
        sections.push(current);
      } else if (current) {
        current.text += `${line}\n`;
      }
    }
  }
  return sections;
}

const POLICY_SECTIONS = buildSections();

/** Section titles, given to the model so it knows what can be searched. */
export function policyIndex(): string {
  return POLICY_SECTIONS.map((s) => `- ${s.source} > ${s.section}`).join("\n");
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
}

/** Keyword search over policy sections. A title match counts more than a body match. */
export function searchPolicies(query: string, limit = 3): PolicySection[] {
  const terms = [...new Set(tokenize(query))];
  return POLICY_SECTIONS.map((section) => {
    const title = tokenize(`${section.source} ${section.section}`);
    const body = tokenize(section.text);
    const score = terms.reduce(
      (sum, term) => sum + (title.includes(term) ? 3 : 0) + (body.includes(term) ? 1 : 0),
      0
    );
    return { section, score };
  })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => hit.section);
}
