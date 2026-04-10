import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StripeService } from '../../payments/stripe.service';
import { CreateCheckoutDto, CreateInvoiceDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly stripeService: StripeService,
  ) {}

  async findAll(tenantId: string, pagination: PaginationDto) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    return this.db.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.db.payment.findFirst({ where: { id, tenantId } });
  }

  async findInvoices(tenantId: string, pagination: PaginationDto) {
    const take = pagination.limit ?? 20;
    const skip = ((pagination.page ?? 1) - 1) * take;
    return this.db.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { items: true },
    });
  }

  async createCheckout(body: CreateCheckoutDto, tenantId: string) {
    if (body.type === 'membership') {
      if (!body.tierId) throw new Error('tierId is required for membership checkout');
      return this.stripeService.createMembershipCheckout(
        tenantId,
        body.memberId,
        body.tierId,
        body.billingInterval ?? 'MONTHLY',
      );
    }

    if (body.type === 'event') {
      if (!body.eventId || !body.tickets?.length) {
        throw new Error('eventId and tickets are required for event checkout');
      }
      return this.stripeService.createEventCheckout(tenantId, body.eventId, body.tickets, body.memberId);
    }

    throw new Error('Unsupported checkout type');
  }

  async createInvoice(body: CreateInvoiceDto, tenantId: string) {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`;
    const subtotalCents = body.items.reduce((sum, item) => sum + item.quantity * item.unitCents, 0);
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;
    return this.db.invoice.create({
      data: {
        tenantId,
        memberId: body.memberId,
        invoiceNumber,
        status: 'DRAFT',
        subtotalCents,
        taxCents,
        totalCents,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes,
        currency: 'USD',
        items: {
          create: body.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitCents: item.unitCents,
            totalCents: item.quantity * item.unitCents,
          })),
        },
      },
      include: { items: true },
    });
  }

  async sendInvoice(invoiceId: string, tenantId: string) {
    await this.db.invoice.updateMany({
      where: { id: invoiceId, tenantId },
      data: { status: 'OPEN', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    return { sent: true };
  }

  async markInvoicePaid(invoiceId: string, tenantId: string) {
    await this.db.invoice.updateMany({
      where: { id: invoiceId, tenantId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return { paid: true };
  }

  async getStats(tenantId: string, from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth() - 11, 1);
    const payments = await this.db.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCEEDED',
        paidAt: { gte: start, lte: end },
      },
      orderBy: { paidAt: 'asc' },
    });

    const outstanding = await this.db.invoice.aggregate({
      _sum: { totalCents: true },
      where: { tenantId, status: 'OPEN' },
    });

    const month = end.toISOString().slice(0, 7);
    const monthRevenueCents = payments
      .filter((payment) => payment.paidAt && payment.paidAt.toISOString().slice(0, 7) === month)
      .reduce((sum, p) => sum + p.amountCents, 0);

    const monthlyMap = new Map<string, number>();
    const months = Array.from({ length: 12 }).map((_, index) => {
      const target = new Date(end.getFullYear(), end.getMonth() - (11 - index), 1);
      const key = target.toISOString().slice(0, 7);
      monthlyMap.set(key, 0);
      return key;
    });

    payments.forEach((payment) => {
      if (!payment.paidAt) return;
      const key = payment.paidAt.toISOString().slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + payment.amountCents);
    });

    return {
      mrrCents: payments.reduce((sum, p) => sum + p.amountCents, 0) / 12,
      totalRevenueCents: payments.reduce((sum, p) => sum + p.amountCents, 0),
      monthRevenueCents,
      outstandingCents: outstanding._sum.totalCents ?? 0,
      chart: months.map((monthKey) => ({ month: monthKey, amount: monthlyMap.get(monthKey) ?? 0 })),
    };
  }

  async getConnectOnboardingUrl(tenantId: string) {
    return this.stripeService.getConnectOnboardingUrl(tenantId);
  }

  async getConnectAccountStatus(tenantId: string) {
    return this.stripeService.getConnectAccountStatus(tenantId);
  }

  async getBillingPortalUrl(tenantId: string) {
    return this.stripeService.getSaaSPortalUrl(tenantId);
  }

  async refund(paymentId: string, tenantId: string, amountCents?: number, reason?: string) {
    return this.stripeService.processRefund(tenantId, paymentId, amountCents, reason);
  }
}
