import {
  UASD_GATEWAY_URL,
  UASD_LOGIN_URL,
  UASD_SELECTION_URL,
  UasdError,
} from "./types";
import type { UasdLoginAssignment, UasdLoginRecord, UasdSelectionRecord } from "./types";
import type { UasdHttpClient, UasdHttpResponse } from "./transport";

export interface UasdGatewaySession {
  matricula: string;
  matricula2: string;
  token: string;
  assignments: UasdLoginAssignment[];
}

export interface UasdLoginOptions {
  username: string;
  password: string;
  captcha?: string;
}

export async function loginGateway(client: UasdHttpClient, options: UasdLoginOptions): Promise<UasdGatewaySession> {
  const landing = await client.request(`${UASD_GATEWAY_URL}/`, {
    method: "GET",
    headers: gatewayHeaders("text/html,application/xhtml+xml"),
  });
  assertGatewayResponse(landing, "la pagina de login");

  const response = await client.request(UASD_LOGIN_URL, {
    method: "POST",
    headers: gatewayHeaders("application/json, text/javascript, */*; q=0.01"),
    body: buildLoginBody(options.username, options.password, options.captcha),
  });
  assertGatewayResponse(response, "el login");

  const record = parseLoginResponse(response.body);
  return {
    matricula: record.MATRICULA,
    matricula2: record.MATRICULA2,
    token: record.TOKEN,
    assignments: record.ASIGNATURAS,
  };
}

export async function selectPeriod(
  client: UasdHttpClient,
  session: UasdGatewaySession,
  period: string,
): Promise<UasdSelectionRecord[]> {
  const response = await client.request(UASD_SELECTION_URL, {
    method: "POST",
    headers: gatewayHeaders("application/json, text/javascript, */*; q=0.01"),
    body: buildSelectionBody(period),
  });
  assertGatewayResponse(response, "la seleccion de periodo");
  return parseSelectionResponse(response.body, session, period);
}

export function buildLoginBody(username: string, password: string, captcha?: string): string {
  let encodedPassword: string;
  try {
    encodedPassword = encodeURI(password);
  } catch {
    throw new UasdError("INVALID_INPUT", "La contrasena contiene caracteres no validos");
  }
  return `{\'txtidbanner\':\'${gatewayValue(username)}\',\'txtpassword\':\'${gatewayValue(encodedPassword)}\',\'captcha\':\'${gatewayValue(captcha ?? "undefined")}\'}`;
}

export function buildSelectionBody(period: string): string {
  return `{\'periodo\':\'${gatewayValue(period)}\'}`;
}

export function parseGatewayPayload(body: string): unknown {
  let envelope: unknown;
  try {
    envelope = JSON.parse(body);
  } catch {
    throw new UasdError("PARSE_ERROR", "La respuesta del gateway UASD no es JSON");
  }

  const wrapped = asRecord(envelope);
  const rawPayload = wrapped && "d" in wrapped ? wrapped.d : envelope;
  if (typeof rawPayload === "string") {
    try {
      return JSON.parse(rawPayload);
    } catch {
      throw new UasdError("PARSE_ERROR", "El contenido d del gateway UASD no es JSON");
    }
  }
  return rawPayload;
}

export function parseLoginResponse(body: string): UasdLoginRecord {
  const rows = arrayPayload(parseGatewayPayload(body), "login");
  const first = rows[0];
  const responseCode = numeric(first?.response);
  const firstMessage = stringValue(first?.mensaje)?.toLocaleLowerCase() ?? "";

  if (!first) throw new UasdError("AUTH_FAILED", "El gateway UASD no devolvio datos de login");
  if (!hasCredentials(first)) {
    if (responseCode === 3 || firstMessage.includes("captcha") || firstMessage.includes("codigo")) {
      throw new UasdError("CAPTCHA_REQUIRED", "El gateway UASD requiere un captcha");
    }
    throw new UasdError("AUTH_FAILED", "El gateway UASD rechazo las credenciales");
  }

  const assignments = parseLoginAssignments(first.ASIGNATURAS, responseCode);
  const record: UasdLoginRecord = {
    ...(responseCode === undefined ? {} : { response: responseCode }),
    MATRICULA: requiredString(first.MATRICULA, "MATRICULA"),
    MATRICULA2: requiredString(first.MATRICULA2, "MATRICULA2"),
    TOKEN: requiredString(first.TOKEN, "TOKEN"),
    ASIGNATURAS: assignments,
  };
  return record;
}

export function parseSelectionResponse(
  body: string,
  session: UasdGatewaySession,
  period: string,
): UasdSelectionRecord[] {
  const rows = arrayPayload(parseGatewayPayload(body), "seleccion");
  const responseCode = numeric(rows[0]?.response);
  if (responseCode === 0 && rows.length === 1) return [];
  if (responseCode !== undefined && responseCode !== 777) {
    if (responseCode === 3) throw new UasdError("AUTH_FAILED", "La sesion UASD no pudo consultar el periodo");
    throw new UasdError("UNEXPECTED_RESPONSE", "El gateway UASD rechazo la seleccion de periodo");
  }

  const records = rows.map((row) => normalizeSelectionRecord(row, session));
  const matching = records.filter((record) => record.PERIODO === period);
  if (matching.length === 0 && records.length > 0) {
    throw new UasdError("UNEXPECTED_RESPONSE", "El gateway UASD no devolvio el periodo solicitado");
  }
  return matching;
}

function parseLoginAssignments(raw: unknown, fallbackResponse?: number): UasdLoginAssignment[] {
  if (!Array.isArray(raw)) {
    if (fallbackResponse === 0) return [];
    throw new UasdError("UNEXPECTED_RESPONSE", "El login UASD no contiene asignaturas");
  }
  if (raw.length === 1 && numeric(asRecord(raw[0])?.response) === 0 && !asRecord(raw[0])?.CLAVE) return [];
  return raw.map((value) => normalizeLoginAssignment(value, fallbackResponse));
}

function normalizeLoginAssignment(value: unknown, fallbackResponse?: number): UasdLoginAssignment {
  const row = asRecord(value);
  if (!row) throw new UasdError("UNEXPECTED_RESPONSE", "Una asignatura UASD no tiene formato valido");
  return {
    ASIGNATURA: requiredString(row.ASIGNATURA, "ASIGNATURA"),
    CLAVE: requiredString(row.CLAVE, "CLAVE"),
    CLAVE2: requiredString(row.CLAVE2, "CLAVE2"),
    CRN: requiredString(row.CRN, "CRN"),
    ESCUELA: requiredString(row.ESCUELA, "ESCUELA"),
    FACULTAD: requiredString(row.FACULTAD, "FACULTAD"),
    MODALIDAD: requiredString(row.MODALIDAD, "MODALIDAD"),
    PERIODO: requiredString(row.PERIODO, "PERIODO"),
    SECCION: requiredString(row.SECCION, "SECCION"),
    URL: requiredString(row.URL, "URL"),
    ...(stringValue(row.URL2) ? { URL2: stringValue(row.URL2) } : {}),
    response: numeric(row.response) ?? fallbackResponse ?? 777,
  };
}

function normalizeSelectionRecord(value: unknown, session: UasdGatewaySession): UasdSelectionRecord {
  const row = asRecord(value);
  if (!row) throw new UasdError("UNEXPECTED_RESPONSE", "Una seleccion UASD no tiene formato valido");
  const assignment = normalizeLoginAssignment(row);
  return {
    ...assignment,
    MATRICULA: stringValue(row.MATRICULA) ?? session.matricula,
    MATRICULA2: stringValue(row.MATRICULA2) ?? session.matricula2,
    TOKEN: stringValue(row.TOKEN) ?? session.token,
  };
}

function assertGatewayResponse(response: UasdHttpResponse, operation: string): void {
  if (response.status === 429) throw new UasdError("RATE_LIMITED", `El gateway UASD limito ${operation}`, true, response.status);
  if (response.status === 403) throw new UasdError("REMOTE_BLOCKED", `El gateway UASD bloqueo ${operation}`, true, response.status);
  if (response.status < 200 || response.status >= 300) {
    throw new UasdError("HTTP_ERROR", `El gateway UASD devolvio HTTP ${response.status} durante ${operation}`, response.status >= 500, response.status);
  }
}

function gatewayHeaders(accept: string): Record<string, string> {
  return {
    Accept: accept,
    "Accept-Language": "es-DO,es;q=0.9,en;q=0.8",
    "Content-Type": "application/json; charset=utf-8",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${UASD_GATEWAY_URL}/`,
  };
}

function gatewayValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function hasCredentials(value: Record<string, unknown>): boolean {
  return Boolean(stringValue(value.MATRICULA) && stringValue(value.MATRICULA2) && stringValue(value.TOKEN));
}

function arrayPayload(value: unknown, operation: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new UasdError("UNEXPECTED_RESPONSE", `La respuesta UASD de ${operation} no es una lista`);
  const rows = value.map(asRecord);
  if (rows.some((row) => !row)) throw new UasdError("UNEXPECTED_RESPONSE", `La respuesta UASD de ${operation} contiene filas invalidas`);
  return rows as Record<string, unknown>[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString(value: unknown, name: string): string {
  const result = stringValue(value);
  if (!result) throw new UasdError("UNEXPECTED_RESPONSE", `La respuesta UASD no contiene ${name}`);
  return result;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
}
