import type { IntegrationProvider } from "@/types/entities";

export interface UniversityCatalogEntry {
  slug: string;
  name: string;
  logoUrl?: string;
  domain?: string;
  provider?: IntegrationProvider;
  credentialsMode?: "both" | "token-only" | "uasd";
  helpUrl?: string;
  helpHint: string;
}

export const UNIVERSITY_CATALOG: UniversityCatalogEntry[] = [
  {
    slug: "uasd",
    name: "UASD",
    logoUrl: "/universities/uasd.jpeg",
    domain: "https://app.uasd.edu.do",
    provider: "UASD",
    credentialsMode: "uasd",
    helpHint: "Usuario y contraseña de UASD. El período se selecciona automáticamente y la primera sincronización puede tardar unos segundos.",
  },
  {
    slug: "itla",
    name: "ITLA",
    logoUrl: "/universities/itla.png",
    domain: "https://aulavirtual.itla.edu.do",
    provider: "MOODLE",
    credentialsMode: "both",
    helpHint: "Usuario y contraseña de ITLA, o pega un token de Moodle.",
  },
  {
    slug: "intec",
    name: "INTEC",
    logoUrl: "/universities/intec.png",
    domain: "https://campusvirtual.intec.edu.do",
    provider: "MOODLE",
    credentialsMode: "token-only",
    helpUrl: "https://campusvirtual.intec.edu.do/user/managetoken.php",
    helpHint: "Ingresa al enlace, regenera el token «Moodle mobile web service» y pégalo aquí.",
  },
  {
    slug: "pucmm",
    name: "PUCMM",
    logoUrl: "/universities/pucmm.png",
    domain: "https://campusvirtual.pucmm.edu.do/moodle",
    provider: "MOODLE",
    credentialsMode: "both",
    helpHint: "Usuario y contraseña de PUCMM (PVA), o pega un token de Moodle.",
  },
  {
    slug: "unapec",
    name: "UNAPEC",
    logoUrl: "/universities/unapec.png",
    domain: "https://canvas.unapec.edu.do",
    provider: "CANVAS",
    helpUrl: "https://canvas.unapec.edu.do/profile/settings",
    helpHint: "Pega un token de acceso personal de Canvas (Account › Settings › Integraciones aprobadas).",
  },
  {
    slug: "unphu",
    name: "UNPHU",
    logoUrl: "/universities/unphu.png",
    domain: "https://virtual.unphu.edu.do",
    provider: "MOODLE",
    credentialsMode: "both",
    helpHint: "Usuario y contraseña de UNPHU, o pega un token de Moodle.",
  },
  {
    slug: "ucne",
    name: "UCNE",
    logoUrl: "/universities/ucne.png",
    domain: "https://ucnevirtual.ucne.edu.do",
    provider: "MOODLE",
    credentialsMode: "both",
    helpHint: "Usuario y contraseña de UCNE, o pega un token de Moodle.",
  },
  {
    slug: "uteco",
    name: "UTECO",
    logoUrl: "/universities/uteco.jpg",
    domain: "https://campusvirtual.uteco.edu.do",
    provider: "MOODLE",
    credentialsMode: "token-only",
    helpUrl: "https://campusvirtual.uteco.edu.do/user/managetoken.php",
    helpHint: "Ingresa al enlace, regenera el token «Moodle mobile web service» y pégalo aquí.",
  },
  {
    slug: "otra",
    name: "Otra institución",
    helpHint: "Indica la plataforma y el dominio completo de tu institución.",
  },
];
