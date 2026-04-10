import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import React from 'react';
import { DatabaseService } from '../../../database/database.service';
import { EmailQueueService } from '../queues/email.queue';
import { WelcomeEmail } from './email-templates/WelcomeEmail';
import { EventConfirmationEmail } from './email-templates/EventConfirmationEmail';
import { EventReminderEmail } from './email-templates/EventReminderEmail';
import { MembershipExpiryEmail } from './email-templates/MembershipExpiryEmail';
import { VolunteerConfirmationEmail } from './email-templates/VolunteerConfirmationEmail';
import { PaymentReceiptEmail } from './email-templates/PaymentReceiptEmail';
import { AnnouncementEmail } from './email-templates/AnnouncementEmail';
import { MagicLinkEmail } from './email-templates/MagicLinkEmail';
import { GenericEmail } from './email-templates/GenericEmail';

interface TenantBrand {
  id: string;
  name: string;
  primaryColor?: string | null;
  logoUrl?: string | null;
  domain?: string | null;
}

interface MemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface EmailTemplateProps {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  unsubscribeUrl: string;
  tenant: TenantBrand;
  [key: string]: unknown;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly fromName: string;
  private readonly replyTo: string;
  private readonly appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
    private readonly emailQueue: EmailQueueService,
  ) {
    this.resend = new Resend(this.configService.get<string>('email.resendApiKey') ?? '');
    this.fromAddress = this.configService.get<string>('email.fromAddress') ?? 'noreply@orgflow.app';
    this.fromName = this.configService.get<string>('email.fromName') ?? 'OrgFlow';
    this.replyTo = this.configService.get<string>('email.replyTo') ?? 'support@orgflow.app';
    this.appUrl = this.configService.get<string>('app.url') ?? 'https://app.orgflow.app';
  }

  private async renderTemplate(Template: React.ComponentType<any>, props: any) {
    return render(React.createElement(Template, props));
  }

  private renderPlainText(html: string) {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private buildTenantBrand(tenant: TenantBrand) {
    return {
      ...tenant,
      brandColor: tenant.primaryColor ?? '#2563eb',
    };
  }

  private async queueHtmlEmail(
    tenantId: string,
    campaignId: string | undefined,
    memberId: string | undefined,
    toEmail: string,
    subject: string,
    html: string,
    text: string,
  ) {
    const log = await this.db.emailLog.create({
      data: {
        tenantId,
        campaignId: campaignId ?? undefined,
        memberId: memberId ?? undefined,
        toEmail,
        subject,
        status: 'QUEUED',
      },
    });

    await this.emailQueue.enqueueEmail({
      jobId: `email-log-${log.id}`,
      logId: log.id,
      tenantId,
      campaignId: campaignId ?? undefined,
      memberId: memberId ?? undefined,
      toEmail,
      subject,
      html,
      text,
      headers: { 'List-Unsubscribe': `<${this.appUrl}/communications/unsubscribe?email=${encodeURIComponent(toEmail)}>` },
    });

    return log;
  }

  async deliverQueuedEmail(payload: {
    logId: string;
    tenantId: string;
    campaignId?: string;
    memberId?: string;
    toEmail: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  }) {
    const response = await this.resend.emails.send({
      from: `${this.fromName} <${this.fromAddress}>`,
      to: payload.toEmail,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      reply_to: this.replyTo,
      headers: payload.headers,
    });

    await this.db.emailLog.update({
      where: { id: payload.logId },
      data: {
        status: 'SENT',
        resendMessageId: (response as { id?: string }).id ?? undefined,
      },
    });

    return response;
  }

  async sendEmail(
    tenant: TenantBrand,
    to: string,
    subject: string,
    Template: React.ComponentType<any>,
    data: Record<string, unknown> = {},
    campaignId?: string,
    memberId?: string,
  ) {
    const unsubscribeUrl = `${this.appUrl}/communications/unsubscribe?email=${encodeURIComponent(to)}`;
    const props: EmailTemplateProps = {
      unsubscribeUrl,
      tenant: this.buildTenantBrand(tenant),
      firstName: (data.firstName as string) ?? undefined,
      lastName: (data.lastName as string) ?? undefined,
      organizationName: tenant.name,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.primaryColor ?? '#2563eb',
      ...data,
    } as EmailTemplateProps;

    const html = await this.renderTemplate(Template, props);
    const text = this.renderPlainText(html);

    return this.queueHtmlEmail(
      tenant.id,
      campaignId ?? undefined,
      memberId ?? undefined,
      to,
      subject,
      html,
      text,
    );
  }

  async sendWelcomeMember(member: MemberSummary, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Welcome to ${tenant.name}, ${member.firstName}!`,
      WelcomeEmail,
      { firstName: member.firstName, tenant },
      undefined,
      member.id,
    );
  }

  async sendMembershipExpiring(member: MemberSummary, tenant: TenantBrand, daysLeft: number) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your membership expires in ${daysLeft} days`,
      MembershipExpiryEmail,
      { firstName: member.firstName, tenant, daysLeft },
      undefined,
      member.id,
    );
  }

  async sendMembershipExpired(member: MemberSummary, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your membership has expired`,
      MembershipExpiryEmail,
      { firstName: member.firstName, tenant, isExpired: true },
      undefined,
      member.id,
    );
  }

  async sendEventConfirmation(
    member: MemberSummary,
    event: { title: string; startsAt: string; location?: string },
    registration: { confirmationCode: string; ticketName?: string; amountCents?: number },
    ticket?: { name: string; priceCents: number },
    tenant?: TenantBrand,
  ) {
    return this.sendEmail(
      tenant ?? { id: 'unknown', name: 'OrgFlow' },
      member.email,
      `Your registration is confirmed for ${event.title}`,
      EventConfirmationEmail,
      { firstName: member.firstName, tenant, event, registration, ticket },
      undefined,
      member.id,
    );
  }

  async sendEventReminder(
    member: MemberSummary,
    event: { title: string; startsAt: string; location?: string },
    hoursUntil: number,
    tenant: TenantBrand,
  ) {
    return this.sendEmail(
      tenant,
      member.email,
      `Reminder: ${event.title} starts soon`,
      EventReminderEmail,
      { firstName: member.firstName, tenant, event, hoursUntil },
      undefined,
      member.id,
    );
  }

  async sendEventCancellation(member: MemberSummary, event: { title: string }, reason: string, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Event cancelled: ${event.title}`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Event cancelled: ${event.title}`, body: reason },
      undefined,
      member.id,
    );
  }

  async sendVolunteerApplicationReceived(member: MemberSummary, opportunity: { title: string; startsAt?: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your volunteer application was received`,
      VolunteerConfirmationEmail,
      { firstName: member.firstName, tenant, opportunity, status: 'received' },
      undefined,
      member.id,
    );
  }

  async sendVolunteerApplicationApproved(member: MemberSummary, opportunity: { title: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your volunteer application is approved`,
      VolunteerConfirmationEmail,
      { firstName: member.firstName, tenant, opportunity, status: 'approved' },
      undefined,
      member.id,
    );
  }

  async sendVolunteerApplicationRejected(member: MemberSummary, opportunity: { title: string }, reason: string, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your volunteer application has been rejected`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Volunteer application update`, body: reason },
      undefined,
      member.id,
    );
  }

  async sendVolunteerShiftReminder(member: MemberSummary, shift: { name: string; startsAt: string }, opportunity: { title: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Upcoming volunteer shift: ${shift.name}`,
      VolunteerConfirmationEmail,
      { firstName: member.firstName, tenant, opportunity, shift, status: 'shift-reminder' },
      undefined,
      member.id,
    );
  }

  async sendClubInvitation(member: MemberSummary, club: { name: string }, invitedBy: string, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `You're invited to join ${club.name}`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Club invitation`, body: `${invitedBy} invited you to join ${club.name}.` },
      undefined,
      member.id,
    );
  }

  async sendClubJoinApproved(member: MemberSummary, club: { name: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `You've been added to ${club.name}`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Club membership approved`, body: `Your request to join ${club.name} has been approved.` },
      undefined,
      member.id,
    );
  }

  async sendClubJoinRejected(member: MemberSummary, club: { name: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Club membership request update`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Club membership declined`, body: `Unfortunately your request to join ${club.name} was declined.` },
      undefined,
      member.id,
    );
  }

  async sendMagicLink(email: string, link: string, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      email,
      `Sign in to ${tenant.name}`,
      MagicLinkEmail,
      { firstName: undefined, tenant, link },
      undefined,
      undefined,
    );
  }

  async sendPasswordReset(member: MemberSummary, resetLink: string, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Reset your password for ${tenant.name}`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Reset your password`, body: `Use this link to reset your password: ${resetLink}` },
      undefined,
      member.id,
    );
  }

  async sendPaymentReceipt(member: MemberSummary, payment: { amountCents: number; currency: string; description: string; date: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Your payment receipt from ${tenant.name}`,
      PaymentReceiptEmail,
      { firstName: member.firstName, tenant, payment },
      undefined,
      member.id,
    );
  }

  async sendInvoice(member: MemberSummary, invoice: { invoiceNumber: string; totalCents: number; dueDate?: string }, tenant: TenantBrand) {
    return this.sendEmail(
      tenant,
      member.email,
      `Invoice ${invoice.invoiceNumber} from ${tenant.name}`,
      GenericEmail,
      { firstName: member.firstName, tenant, subject: `Invoice ${invoice.invoiceNumber}`, body: `Your invoice total is $${(invoice.totalCents / 100).toFixed(2)}${invoice.dueDate ? ` and due by ${invoice.dueDate}` : ''}.` },
      undefined,
      member.id,
    );
  }

  async sendTeamInvitation(email: string, role: string, tenant: TenantBrand, inviteLink: string) {
    return this.sendEmail(
      tenant,
      email,
      `You're invited to join ${tenant.name}`,
      GenericEmail,
      { firstName: undefined, tenant, subject: `Team invitation`, body: `You have been invited as ${role}. Use this link to join: ${inviteLink}` },
      undefined,
      undefined,
    );
  }

  async sendAnnouncement(members: MemberSummary[], announcement: { title: string; body: string }, tenant: TenantBrand) {
    const sent: unknown[] = [];
    const promises = members.map((member) =>
      this.sendEmail(
        tenant,
        member.email,
        announcement.title,
        AnnouncementEmail,
        { firstName: member.firstName, tenant, announcement },
        undefined,
        member.id,
      ).then((log) => sent.push(log))
    );
    await Promise.all(promises);
    return sent;
  }
}
