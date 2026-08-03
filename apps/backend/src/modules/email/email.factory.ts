import { ResendProvider } from "./providers/resend.provider";
import { SmtpProvider } from "./providers/smtp.provider";
import type { EmailProvider } from "./email.interface";

export function createEmailProvider(): EmailProvider {
  return (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase() === "resend"
    ? new ResendProvider()
    : new SmtpProvider();
}
