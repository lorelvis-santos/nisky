import { createEmailProvider } from "./email.factory";

export class EmailService {
  private readonly provider = createEmailProvider();

  send(options: { to: string | string[]; subject: string; text: string; html?: string }) {
    return this.provider.send(options);
  }
}

export const emailService = new EmailService();
