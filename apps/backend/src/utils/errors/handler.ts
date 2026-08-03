import { ZodError } from "zod";
import { ERRORS, type ErrorCode } from "./index";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly http: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERRORS[code].msg);
    this.name = "AppError";
    this.code = code;
    this.http = ERRORS[code].http;
    this.details = details;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(
      "BAD_REQUEST",
      ERRORS.BAD_REQUEST.msg,
      error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    );
  }

  if (error instanceof Error) console.error(error);
  return new AppError("INTERNAL");
}
