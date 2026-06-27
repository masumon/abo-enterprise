/** Map legacy V1 / form lead_type values to LeadV2 API values */
export function toLeadV2Type(leadType: string): string {
  const map: Record<string, string> = {
    software_development: "software",
    ai_solutions: "ai",
    automation: "automation",
    python_automation: "automation",
    web_development: "software",
    mobile_app: "software",
    erp: "erp",
    consulting: "general",
    general: "general",
    other: "general",
  };
  return map[leadType] ?? leadType.replace(/-/g, "_");
}
