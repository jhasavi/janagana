import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StripeService } from '../payments/stripe.service';
import { Resend } from 'resend';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CreateDonationDto, ProcessDonationDto } from './dto/create-donation.dto';

@Injectable()
export class DonationsService {
  private resend: Resend;

  constructor(
    private readonly db: DatabaseService,
    private readonly stripeService: StripeService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // === CAMPAIGNS ===

  async createCampaign(tenantId: string, userId: string, dto: CreateCampaignDto) {
    const campaign = await this.db.donationCampaign.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        goalAmountCents: dto.goalAmountCents,
        currency: dto.currency || 'USD',
        startDate: dto.startDate,
        endDate: dto.endDate,
        isPublic: dto.isPublic ?? true,
        showProgressBar: dto.showProgressBar ?? true,
        showDonorList: dto.showDonorList ?? false,
        allowRecurring: dto.allowRecurring ?? false,
        defaultAmounts: dto.defaultAmounts || [1000, 2500, 5000, 10000],
        thankYouMessage: dto.thankYouMessage,
        status: 'DRAFT',
      },
    });

    return campaign;
  }

  async updateCampaign(tenantId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.db.donationCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updated = await this.db.donationCampaign.update({
      where: { id: campaignId },
      data: dto,
    });

    return updated;
  }

  async deleteCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.db.donationCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.db.donationCampaign.delete({
      where: { id: campaignId },
    });

    return { message: 'Campaign deleted' };
  }

  async getCampaigns(tenantId: string, filters: { status?: string; isPublic?: boolean }) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;

    return this.db.donationCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        donations: {
          where: { status: 'SUCCEEDED' },
          select: { amountCents: true, donorName: true, isAnonymous: true },
        },
      },
    });
  }

  async getCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.db.donationCampaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        donations: {
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            amountCents: true,
            currency: true,
            donorName: true,
            message: true,
            isAnonymous: true,
            dedicatedTo: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getCampaignStats(tenantId: string, campaignId: string) {
    const campaign = await this.db.donationCampaign.findFirst({
      where: { id: campaignId, tenantId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const donations = await this.db.donation.findMany({
      where: { campaignId, status: 'SUCCEEDED' },
    });

    const raised = donations.reduce((sum, d) => sum + d.amountCents, 0);
    const donorCount = donations.length;
    const averageDonation = donorCount > 0 ? raised / donorCount : 0;
    const percentage = campaign.goalAmountCents > 0 ? (raised / campaign.goalAmountCents) * 100 : 0;

    return {
      raised,
      goal: campaign.goalAmountCents,
      percentage: Math.min(percentage, 100),
      donorCount,
      averageDonation,
    };
  }

  // === DONATIONS ===

  async createDonationCheckout(tenantId: string, dto: CreateDonationDto) {
    // Validate campaign if provided
    if (dto.campaignId) {
      const campaign = await this.db.donationCampaign.findFirst({
        where: { id: dto.campaignId, tenantId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      if (campaign.status !== 'ACTIVE') {
        throw new BadRequestException('Campaign is not active');
      }
    }

    // Create Stripe checkout session
    const successUrl = `${process.env.WEB_URL}/donation/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.WEB_URL}/donation/cancel`;

    let stripeSession;
    if (dto.isRecurring) {
      // Create subscription for recurring donations
      stripeSession = await this.stripeService.createSubscriptionCheckout({
        amountCents: dto.amountCents,
        currency: dto.currency || 'USD',
        interval: dto.recurringInterval || 'MONTHLY',
        successUrl,
        cancelUrl,
        metadata: {
          tenantId,
          campaignId: dto.campaignId || '',
          memberId: dto.memberId || '',
          donorName: dto.donorName || '',
          donorEmail: dto.donorEmail || '',
          isAnonymous: String(dto.isAnonymous),
          dedicatedTo: dto.dedicatedTo || '',
          message: dto.message || '',
        },
      });
    } else {
      // Create one-time payment
      stripeSession = await this.stripeService.createPaymentCheckout({
        amountCents: dto.amountCents,
        currency: dto.currency || 'USD',
        successUrl,
        cancelUrl,
        metadata: {
          tenantId,
          campaignId: dto.campaignId || '',
          memberId: dto.memberId || '',
          donorName: dto.donorName || '',
          donorEmail: dto.donorEmail || '',
          isAnonymous: String(dto.isAnonymous),
          dedicatedTo: dto.dedicatedTo || '',
          message: dto.message || '',
        },
      });
    }

    return {
      sessionId: stripeSession.id,
      url: stripeSession.url,
    };
  }

  async processDonation(tenantId: string, dto: ProcessDonationDto) {
    // Retrieve Stripe session
    const session = await this.stripeService.retrieveSession(dto.stripeSessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new BadRequestException('Payment not completed');
    }

    const metadata = session.metadata || {};
    const amountCents = session.amount_total || 0;
    const currency = session.currency?.toUpperCase() || 'USD';

    // Check if donation already processed
    const existing = await this.db.donation.findFirst({
      where: { stripePaymentIntentId: session.payment_intent as string },
    });

    if (existing) {
      return existing;
    }

    // Create donation record
    const donation = await this.db.donation.create({
      data: {
        tenantId,
        campaignId: metadata.campaignId || null,
        memberId: metadata.memberId || null,
        amountCents,
        currency,
        donorName: metadata.isAnonymous === 'true' ? null : (metadata.donorName || null),
        donorEmail: metadata.isAnonymous === 'true' ? null : (metadata.donorEmail || null),
        message: metadata.message || null,
        isAnonymous: metadata.isAnonymous === 'true',
        isRecurring: !!session.subscription,
        recurringInterval: session.subscription ? 'MONTHLY' : null,
        dedicatedTo: metadata.dedicatedTo || null,
        status: 'SUCCEEDED',
        stripePaymentIntentId: session.payment_intent as string,
        stripeSubscriptionId: session.subscription as string || null,
        stripeCustomerId: session.customer as string || null,
        paidAt: new Date(),
      },
    });

    // Update campaign raised amount
    if (metadata.campaignId) {
      await this.db.donationCampaign.update({
        where: { id: metadata.campaignId },
        data: {
          raisedAmountCents: {
            increment: amountCents,
          },
        },
      });
    }

    // Send thank you email
    await this.sendThankYouEmail(tenantId, donation);

    return donation;
  }

  async getDonations(tenantId: string, filters: { campaignId?: string; status?: string }) {
    const where: any = { tenantId };
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.status) where.status = filters.status;

    return this.db.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { title: true },
        },
        member: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getDonation(tenantId: string, donationId: string) {
    const donation = await this.db.donation.findFirst({
      where: { id: donationId, tenantId },
      include: {
        campaign: {
          select: { title: true, thankYouMessage: true },
        },
        member: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    return donation;
  }

  async exportDonors(tenantId: string, campaignId?: string) {
    const where: any = { tenantId, status: 'SUCCEEDED' };
    if (campaignId) where.campaignId = campaignId;

    const donations = await this.db.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { title: true } },
        member: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // Convert to CSV
    const headers = ['Date', 'Donor Name', 'Email', 'Amount', 'Currency', 'Campaign', 'Message', 'Is Anonymous', 'Dedicated To'];
    const rows = donations.map((d) => [
      d.paidAt?.toISOString().split('T')[0] || d.createdAt.toISOString().split('T')[0],
      d.isAnonymous ? 'Anonymous' : (d.donorName || `${d.member?.firstName} ${d.member?.lastName}`),
      d.isAnonymous ? '' : (d.donorEmail || d.member?.email || ''),
      (d.amountCents / 100).toFixed(2),
      d.currency,
      d.campaign?.title || 'General',
      d.message || '',
      d.isAnonymous ? 'Yes' : 'No',
      d.dedicatedTo || '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return csv;
  }

  async generateTaxReceipt(tenantId: string, donationId: string) {
    const donation = await this.db.donation.findFirst({
      where: { id: donationId, tenantId },
      include: {
        tenant: { select: { name: true } },
      },
    });

    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (donation.status !== 'SUCCEEDED') {
      throw new BadRequestException('Donation not successful');
    }

    // Generate tax receipt URL (simplified - in production, generate PDF)
    const receiptUrl = `${process.env.WEB_URL}/receipts/${donationId}`;

    // Mark as generated
    await this.db.donation.update({
      where: { id: donationId },
      data: { taxReceiptGenerated: true, taxReceiptUrl: receiptUrl },
    });

    return {
      receiptUrl,
      donationId,
      amount: (donation.amountCents / 100).toFixed(2),
      currency: donation.currency,
      date: donation.paidAt || donation.createdAt,
      organizationName: donation.tenant.name,
    };
  }

  private async sendThankYouEmail(tenantId: string, donation: any) {
    try {
      const tenant = await this.db.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!donation.donorEmail && !donation.memberId) {
        return; // No email to send
      }

      const email = donation.donorEmail || (donation.member ? (await this.db.member.findUnique({ where: { id: donation.memberId } }))?.email : null);
      if (!email) return;

      const campaign = donation.campaignId ? await this.db.donationCampaign.findUnique({ where: { id: donation.campaignId } }) : null;

      await this.resend.emails.send({
        from: `${tenant?.name} <donations@orgflow.app>`,
        to: email,
        subject: 'Thank you for your donation!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Thank You!</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p style="font-size: 16px; line-height: 1.6;">Dear ${donation.donorName || 'Friend'},</p>
              <p style="font-size: 16px; line-height: 1.6;">
                Thank you for your generous donation of <strong>$${(donation.amountCents / 100).toFixed(2)}</strong> to ${tenant?.name}.
              </p>
              ${campaign?.thankYouMessage ? `<p style="font-size: 16px; line-height: 1.6; font-style: italic;">"${campaign.thankYouMessage}"</p>` : ''}
              ${donation.dedicatedTo ? `<p style="font-size: 16px; line-height: 1.6;">This donation is dedicated to: <strong>${donation.dedicatedTo}</strong></p>` : ''}
              <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Your contribution helps us continue our mission.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.WEB_URL}/receipts/${donation.id}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Download Tax Receipt</a>
              </div>
              <p style="font-size: 14px; color: #666;">No goods or services were provided in exchange for this donation.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send thank you email:', error);
    }
  }
}
