import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  provider: (process.env.EMAIL_PROVIDER ?? 'resend') as 'resend' | 'sendgrid' | 'ses',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  fromAddress: process.env.EMAIL_FROM ?? 'noreply@namasteneedham.com',
  fromName: process.env.EMAIL_FROM_NAME ?? 'Jana Gana',
  replyTo: process.env.EMAIL_REPLY_TO ?? 'support@namasteneedham.com',
}));

export type EmailConfig = ReturnType<typeof emailConfig>;
