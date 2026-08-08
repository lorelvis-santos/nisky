export interface UniversityCatalogEntry {
  name: string;
  domain: string;
}

export const UNIVERSITY_CATALOG: UniversityCatalogEntry[] = [
  { name: "ITLA", domain: "https://aulavirtual.itla.edu.do" },
  { name: "INTEC", domain: "https://campusvirtual.intec.edu.do" },
  { name: "PUCMM", domain: "https://campusvirtual.pucmm.edu.do/moodle" },
  { name: "UNAPEC", domain: "https://canvas.unapec.edu.do" },
  { name: "UCNE", domain: "https://ucnevirtual.ucne.edu.do" },
];

export function hostOf(rawDomain: string) {
  try {
    return new URL(rawDomain).host;
  } catch {
    return rawDomain.replace(/^https?:\/\//, "").split("/")[0] ?? rawDomain;
  }
}

export function universityNameFor(rawDomain: string): string | null {
  const host = hostOf(rawDomain);
  for (const entry of UNIVERSITY_CATALOG) {
    if (hostOf(entry.domain) === host) return entry.name;
  }
  return null;
}
