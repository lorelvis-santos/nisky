import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailOptions } from "../email.interface";

export class SmtpProvider implements EmailProvider {
  private readonly transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });

  async send(options: SendEmailOptions) {
    await this.transport.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@nisky.local",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }
}
