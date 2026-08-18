export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "support",
  "me",
  "root",
  "system",
  "nisky",
  "help",
  "settings",
  "profile",
  "login",
  "register",
  "auth",
  "dashboard",
  "projects",
  "tasks",
  "habits",
  "timeblocks",
  "events",
  "integrations",
  "notifications",
  "feedback",
  "journal",
  "notes",
  "focus",
]);

export const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

export function isValidUsername(username: string) {
  const normalized = username.toLowerCase();
  return usernameRegex.test(username) && !RESERVED_USERNAMES.has(normalized);
}