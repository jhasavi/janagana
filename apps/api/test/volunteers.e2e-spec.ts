import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import {
  createTestTenant,
  createTestUser,
  createTestMember,
  createTestVolunteerOpportunity,
  getAdminHeaders,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

describe('Volunteers API', () => {
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

  describe('POST /volunteer-opportunities', () => {
    it('should create opportunity with shifts', async () => {
      const opportunityData = {
        title: 'Test Volunteer Opportunity',
        slug: 'test-volunteer',
        description: 'Test description',
        location: 'Test Location',
        isVirtual: false,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
        totalHours: 20,
        shifts: [
          {
            name: 'Morning Shift',
            startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
            capacity: 10,
          },
          {
            name: 'Afternoon Shift',
            startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
            capacity: 10,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/volunteer-opportunities')
        .set(adminHeaders)
        .send(opportunityData)
        .expect(201);

      expect(response.body.title).toBe(opportunityData.title);
      expect(response.body.shifts).toHaveLength(2);
    });
  });

  describe('POST /volunteer-opportunities/:id/applications', () => {
    let opportunityId: string;
    let memberId: string;

    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      opportunityId = opportunity.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;
    });

    it('member submits application', async () => {
      const response = await request(app.getHttpServer())
        .post(`/volunteer-opportunities/${opportunityId}/applications`)
        .set(adminHeaders)
        .send({
          memberId,
          coverLetter: 'I would love to volunteer!',
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
    });
  });

  describe('PATCH /volunteer-applications/:id/approve', () => {
    let applicationId: string;

    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      const member = await createTestMember(tenantId);

      const application = await prisma.volunteerApplication.create({
        data: {
          tenantId,
          opportunityId: opportunity.id,
          memberId: member.id,
          status: 'PENDING',
        },
      });
      applicationId = application.id;
    });

    it('admin approves application', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/volunteer-applications/${applicationId}/approve`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.reviewedAt).toBeDefined();
    });
  });

  describe('POST /volunteer-shifts/:id/signups', () => {
    let shiftId: string;
    let memberId: string;

    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      const member = await createTestMember(tenantId);
      memberId = member.id;

      const shift = await prisma.volunteerShift.create({
        data: {
          tenantId,
          opportunityId: opportunity.id,
          name: 'Test Shift',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          capacity: 10,
          status: 'OPEN',
        },
      });
      shiftId = shift.id;

      // Approve application
      await prisma.volunteerApplication.create({
        data: {
          tenantId,
          opportunityId: opportunity.id,
          memberId: member.id,
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      });
    });

    it('member signs up for shift', async () => {
      const response = await request(app.getHttpServer())
        .post(`/volunteer-shifts/${shiftId}/signups`)
        .set(adminHeaders)
        .send({ memberId })
        .expect(201);

      expect(response.body.confirmedAt).toBeDefined();
    });
  });

  describe('POST /volunteer-hours', () => {
    let memberId: string;
    let opportunityId: string;

    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      opportunityId = opportunity.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;

      // Approve application
      await prisma.volunteerApplication.create({
        data: {
          tenantId,
          opportunityId,
          memberId,
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      });
    });

    it('admin logs hours', async () => {
      const response = await request(app.getHttpServer())
        .post('/volunteer-hours')
        .set(adminHeaders)
        .send({
          memberId,
          opportunityId,
          hours: 5,
          date: new Date().toISOString(),
          description: 'Great work!',
        })
        .expect(201);

      expect(response.body.hours).toBe(5);
      expect(response.body.isApproved).toBe(false);
    });
  });

  describe('PATCH /volunteer-hours/:id/approve', () => {
    let hoursId: string;

    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      const member = await createTestMember(tenantId);

      const hours = await prisma.volunteerHours.create({
        data: {
          tenantId,
          memberId: member.id,
          opportunityId: opportunity.id,
          hours: 5,
          date: new Date(),
          isApproved: false,
        },
      });
      hoursId = hours.id;
    });

    it('approve hours', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/volunteer-hours/${hoursId}/approve`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.isApproved).toBe(true);
      expect(response.body.approvedAt).toBeDefined();
    });
  });

  describe('GET /volunteer-hours/stats', () => {
    beforeEach(async () => {
      const opportunity = await createTestVolunteerOpportunity(tenantId);
      const member = await createTestMember(tenantId);

      await prisma.volunteerHours.create({
        data: {
          tenantId,
          memberId: member.id,
          opportunityId: opportunity.id,
          hours: 5,
          date: new Date(),
          isApproved: true,
          approvedAt: new Date(),
        },
      });

      await prisma.volunteerHours.create({
        data: {
          tenantId,
          memberId: member.id,
          opportunityId: opportunity.id,
          hours: 3,
          date: new Date(),
          isApproved: false,
        },
      });
    });

    it('stats calculation correct', async () => {
      const response = await request(app.getHttpServer())
        .get('/volunteer-hours/stats')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.totalHours).toBe(8);
      expect(response.body.approvedHours).toBe(5);
      expect(response.body.pendingHours).toBe(3);
    });
  });
});
