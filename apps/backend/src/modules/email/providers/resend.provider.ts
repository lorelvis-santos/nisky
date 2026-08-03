import type { EmailProvider, SendEmailOptions } from "../email.interface";

export class ResendProvider implements EmailProvider {
  async send(options: SendEmailOptions) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Nisky <no-reply@nisky.local>",
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    });
    if (!response.ok) throw new Error(`Resend error: ${response.status}`);
  }
}
