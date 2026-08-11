export function sanitizeDomain(raw: string): string {
  const url = new URL(raw.trim());
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString().replace(/\/+$/, "");
}