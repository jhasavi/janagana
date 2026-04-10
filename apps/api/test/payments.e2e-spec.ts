import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import {
  createTestTenant,
  createTestUser,
  createTestMember,
  createTestMembershipTier,
  getAdminHeaders,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: () => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded' }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test', amount: 5000 }),
    },
    subscriptions: {
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'canceled' }),
    },
  }),
}));

describe('Payments API', () => {
  let app: INestApplication;
  let tenantId: string;
  let userId: string;
  let adminHeaders: Record<string, string>;

  beforeAll(async () => {
    await globalSetup();
    await cleanDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const user = await createTestUser(tenantId, 'OWNER');
    userId = user.id;

    adminHeaders = getAdminHeaders(tenantId, userId);
  });

  afterAll(async () => {
    await app.close();
    await globalTeardown();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    const user = await createTestUser(tenantId, 'OWNER');
    userId = user.id;
    adminHeaders = getAdminHeaders(tenantId, userId);
  });

  describe('Stripe Webhooks', () => {
    describe('POST /webhooks/stripe/payment.succeeded', () => {
      it('should handle payment succeeded webhook', async () => {
        const webhookPayload = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_test',
              amount: 5000,
              currency: 'usd',
              metadata: {
                memberId: 'test-member-id',
                tenantId,
              },
            },
          },
        };

        const response = await request(app.getHttpServer())
          .post('/webhooks/stripe')
          .set('Content-Type', 'application/json')
          .set('Stripe-Signature', 'test-signature')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.received).toBe(true);
      });
    });

    describe('POST /webhooks/stripe/payment.failed', () => {
      it('should handle payment failed webhook', async () => {
        const webhookPayload = {
          type: 'payment_intent.payment_failed',
          data: {
            object: {
              id: 'pi_test',
              amount: 5000,
              currency: 'usd',
              metadata: {
                memberId: 'test-member-id',
                tenantId,
              },
            },
          },
        };

        const response = await request(app.getHttpServer())
          .post('/webhooks/stripe')
          .set('Content-Type', 'application/json')
          .set('Stripe-Signature', 'test-signature')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.received).toBe(true);
      });
    });

    describe('POST /webhooks/stripe/subscription.canceled', () => {
      it('should handle subscription canceled webhook', async () => {
        const webhookPayload = {
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_test',
              status: 'canceled',
              metadata: {
                tenantId,
              },
            },
          },
        };

        const response = await request(app.getHttpServer())
          .post('/webhooks/stripe')
          .set('Content-Type', 'application/json')
          .set('Stripe-Signature', 'test-signature')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.received).toBe(true);
      });
    });
  });

  describe('POST /payments/:id/refund', () => {
    let paymentId: string;

    beforeEach(async () => {
      const member = await createTestMember(tenantId);

      const payment = await prisma.payment.create({
        data: {
          tenantId,
          memberId: member.id,
          amountCents: 5000,
          currency: 'USD',
          status: 'SUCCEEDED',
          stripePaymentIntentId: 'pi_test',
          paidAt: new Date(),
        },
      });
      paymentId = payment.id;
    });

    it('refund processing', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/refund`)
        .set(adminHeaders)
        .send({
          amountCents: 5000,
          reason: 'Customer request',
        })
        .expect(201);

      expect(response.body.amountCents).toBe(5000);
      expect(response.body.stripeRefundId).toBeDefined();
    });
  });

  describe('GET /payments/stats', () => {
    beforeEach(async () => {
      const member = await createTestMember(tenantId);

      // Create successful payments
      await prisma.payment.create({
        data: {
          tenantId,
          memberId: member.id,
          amountCents: 10000,
          currency: 'USD',
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      });

      await prisma.payment.create({
        data: {
          tenantId,
          memberId: member.id,
          amountCents: 5000,
          currency: 'USD',
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      });

      // Create failed payment
      await prisma.payment.create({
        data: {
          tenantId,
          memberId: member.id,
          amountCents: 3000,
          currency: 'USD',
          status: 'FAILED',
          failedAt: new Date(),
        },
      });
    });

    it('revenue stats calculation correct', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/stats')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.totalRevenue).toBe(15000);
      expect(response.body.successfulPayments).toBe(2);
      expect(response.body.failedPayments).toBe(1);
    });
  });

  describe('POST /payments', () => {
    let memberId: string;
    let tierId: string;

    beforeEach(async () => {
      const member = await createTestMember(tenantId);
      memberId = member.id;

      const tier = await createTestMembershipTier(tenantId);
      tierId = tier.id;
    });

    it('should create payment intent', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set(adminHeaders)
        .send({
          memberId,
          amountCents: 7500,
          currency: 'USD',
          description: 'Membership payment',
          metadata: {
            tierId,
          },
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
      expect(response.body.stripePaymentIntentId).toBeDefined();
    });
  });

  describe('GET /payments', () => {
    beforeEach(async () => {
      const member = await createTestMember(tenantId);

      await prisma.payment.create({
        data: {
          tenantId,
          memberId: member.id,
          amountCents: 10000,
          currency: 'USD',
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      });
    });

    it('should return paginated payments', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments?page=1&limit=10')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(1);
      expect(response.body.meta).toBeDefined();
    });
  });
});
