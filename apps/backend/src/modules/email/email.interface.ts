export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<void>;
}
