import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import {
  createTestTenant,
  createTestUser,
  createTestMember,
  createTestEvent,
  getAdminHeaders,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

describe('Events API', () => {
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

  describe('POST /events', () => {
    it('should create event with tickets', async () => {
      const eventData = {
        title: 'Test Event with Tickets',
        slug: 'test-event-tickets',
        description: 'Test event',
        format: 'IN_PERSON',
        location: 'Test Location',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        capacity: 100,
        isPublic: true,
        tickets: [
          { name: 'General Admission', priceCents: 1000, capacity: 50 },
          { name: 'VIP', priceCents: 5000, capacity: 10 },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/events')
        .set(adminHeaders)
        .send(eventData)
        .expect(201);

      expect(response.body.title).toBe(eventData.title);
      expect(response.body.tickets).toHaveLength(2);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set(adminHeaders)
        .send({
          title: 'Missing Fields',
          // Missing required fields
        })
        .expect(400);
    });
  });

  describe('PATCH /events/:id/publish', () => {
    it('should publish event', async () => {
      const event = await createTestEvent(tenantId, { status: 'DRAFT' });

      const response = await request(app.getHttpServer())
        .patch(`/events/${event.id}/publish`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.status).toBe('PUBLISHED');
    });
  });

  describe('POST /events/:id/registrations', () => {
    let eventId: string;
    let memberId: string;
    let ticketId: string;

    beforeEach(async () => {
      const event = await createTestEvent(tenantId);
      eventId = event.id;

      const ticket = await prisma.eventTicket.create({
        data: {
          eventId,
          name: 'Free Ticket',
          priceCents: 0,
          isFree: true,
          capacity: 50,
        },
      });
      ticketId = ticket.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;
    });

    it('should register member for free ticket', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/registrations`)
        .set(adminHeaders)
        .send({
          memberId,
          ticketId,
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.confirmationCode).toBeDefined();
    });

    it('should register member for paid ticket (Stripe mock)', async () => {
      const paidTicket = await prisma.eventTicket.create({
        data: {
          eventId,
          name: 'Paid Ticket',
          priceCents: 5000,
          isFree: false,
          capacity: 50,
        },
      });

      // Mock Stripe payment intent
      jest.mock('@stripe/stripe-js', () => ({
        loadStripe: () => ({
          paymentIntents: {
            create: jest.fn().mockResolvedValue({ id: 'pi_test' }),
          },
        }),
      }));

      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/registrations`)
        .set(adminHeaders)
        .send({
          memberId,
          ticketId: paidTicket.id,
          paymentMethodId: 'pm_test',
        })
        .expect(201);

      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should check capacity limits', async () => {
      // Create ticket with capacity of 1
      const limitedTicket = await prisma.eventTicket.create({
        data: {
          eventId,
          name: 'Limited Ticket',
          priceCents: 0,
          isFree: true,
          capacity: 1,
        },
      });

      // Register first member
      await request(app.getHttpServer())
        .post(`/events/${eventId}/registrations`)
        .set(adminHeaders)
        .send({ memberId, ticketId: limitedTicket.id })
        .expect(201);

      // Try to register second member
      const member2 = await createTestMember(tenantId);
      await request(app.getHttpServer())
        .post(`/events/${eventId}/registrations`)
        .set(adminHeaders)
        .send({ memberId: member2.id, ticketId: limitedTicket.id })
        .expect(409);
    });

    it('should add to waitlist when full', async () => {
      const limitedTicket = await prisma.eventTicket.create({
        data: {
          eventId,
          name: 'Full Ticket',
          priceCents: 0,
          isFree: true,
          capacity: 1,
        },
      });

      // Fill capacity
      await request(app.getHttpServer())
        .post(`/events/${eventId}/registrations`)
        .set(adminHeaders)
        .send({ memberId, ticketId: limitedTicket.id })
        .expect(201);

      // Add to waitlist
      const member2 = await createTestMember(tenantId);
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/waitlist`)
        .set(adminHeaders)
        .send({ memberId: member2.id })
        .expect(201);

      expect(response.body.position).toBeDefined();
    });
  });

  describe('POST /events/:id/attendances', () => {
    let eventId: string;
    let memberId: string;

    beforeEach(async () => {
      const event = await createTestEvent(tenantId);
      eventId = event.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;

      // Create registration
      await prisma.eventRegistration.create({
        data: {
          tenantId,
          eventId,
          memberId,
          status: 'CONFIRMED',
        },
      });
    });

    it('should check in member', async () => {
      const response = await request(app.getHttpServer())
        .post(`/events/${eventId}/attendances`)
        .set(adminHeaders)
        .send({ memberId })
        .expect(201);

      expect(response.body.checkedInAt).toBeDefined();
    });
  });

  describe('DELETE /events/:id/registrations/:registrationId', () => {
    let eventId: string;
    let registrationId: string;

    beforeEach(async () => {
      const event = await createTestEvent(tenantId);
      eventId = event.id;

      const member = await createTestMember(tenantId);

      const ticket = await prisma.eventTicket.create({
        data: {
          eventId,
          name: 'Refundable Ticket',
          priceCents: 5000,
          isFree: false,
          capacity: 50,
        },
      });

      const registration = await prisma.eventRegistration.create({
        data: {
          tenantId,
          eventId,
          memberId: member.id,
          ticketId: ticket.id,
          status: 'CONFIRMED',
          amountCents: 5000,
        },
      });
      registrationId = registration.id;
    });

    it('should cancel registration with refund', async () => {
      // Mock Stripe refund
      jest.mock('@stripe/stripe-js', () => ({
        loadStripe: () => ({
          refunds: {
            create: jest.fn().mockResolvedValue({ id: 're_test' }),
          },
        }),
      }));

      const response = await request(app.getHttpServer())
        .delete(`/events/${eventId}/registrations/${registrationId}`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.status).toBe('CANCELED');
    });
  });

  describe('GET /events/calendar', () => {
    beforeEach(async () => {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await createTestEvent(tenantId, {
        title: 'Event 1',
        startsAt: now,
      });
      await createTestEvent(tenantId, {
        title: 'Event 2',
        startsAt: nextMonth,
      });
    });

    it('should get calendar view', async () => {
      const response = await request(app.getHttpServer())
        .get('/events/calendar?start=2024-01-01&end=2024-12-31')
        .set(adminHeaders)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /events/public', () => {
    it('public events visible without auth', async () => {
      await createTestEvent(tenantId, { isPublic: true });

      const response = await request(app.getHttpServer())
        .get('/events/public')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });

    it('members-only events require auth', async () => {
      await createTestEvent(tenantId, { isPublic: false });

      const response = await request(app.getHttpServer())
        .get('/events/public')
        .set(adminHeaders)
        .expect(200);

      // Public endpoint should not return non-public events
      expect(response.body.every((e: any) => e.isPublic === true)).toBe(true);
    });
  });
});
