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
  getAuthToken,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

describe('Auth & Authorization API', () => {
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

  describe('Tenant Isolation', () => {
    it('cannot access other tenant data', async () => {
      // Create second tenant
      const tenant2 = await createTestTenant({ slug: 'tenant2' });
      const user2 = await createTestUser(tenant2.id, 'OWNER');
      const headers2 = getAdminHeaders(tenant2.id, user2.id);

      // Create member in tenant 1
      const member1 = await createTestMember(tenantId, { email: 'member1@example.com' });

      // Try to access from tenant 2
      const response = await request(app.getHttpServer())
        .get(`/members/${member1.id}`)
        .set(headers2)
        .expect(403);

      expect(response.body.message).toContain('access');
    });

    it('should only return data for current tenant', async () => {
      // Create members in tenant 1
      await createTestMember(tenantId, { email: 'tenant1@example.com' });

      // Create second tenant with member
      const tenant2 = await createTestTenant({ slug: 'tenant2' });
      await createTestMember(tenant2.id, { email: 'tenant2@example.com' });

      // Query from tenant 1
      const response = await request(app.getHttpServer())
        .get('/members')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].tenantId).toBe(tenantId);
    });
  });

  describe('Role Checks', () => {
    let staffHeaders: Record<string, string>;
    let readonlyHeaders: Record<string, string>;
    let memberId: string;

    beforeEach(async () => {
      // Create users with different roles
      const staffUser = await createTestUser(tenantId, 'STAFF', { email: 'staff@example.com' });
      staffHeaders = getAdminHeaders(tenantId, staffUser.id);

      const readonlyUser = await createTestUser(tenantId, 'READONLY', { email: 'readonly@example.com' });
      readonlyHeaders = getAdminHeaders(tenantId, readonlyUser.id);

      const member = await createTestMember(tenantId);
      memberId = member.id;
    });

    it('staff cannot delete members', async () => {
      await request(app.getHttpServer())
        .delete(`/members/${memberId}`)
        .set(staffHeaders)
        .expect(403);
    });

    it('readonly can only view', async () => {
      // Readonly should be able to view
      await request(app.getHttpServer())
        .get('/members')
        .set(readonlyHeaders)
        .expect(200);

      // But not create
      await request(app.getHttpServer())
        .post('/members')
        .set(readonlyHeaders)
        .send({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          countryCode: 'US',
        })
        .expect(403);
    });

    it('owner can perform all actions', async () => {
      // Owner should be able to delete
      await request(app.getHttpServer())
        .delete(`/members/${memberId}`)
        .set(adminHeaders)
        .expect(200);
    });
  });

  describe('Authentication', () => {
    it('unauthenticated request rejected', async () => {
      const response = await request(app.getHttpServer())
        .get('/members')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('invalid token rejected', async () => {
      const response = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Tenant-Id', tenantId)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('missing tenant header rejected', async () => {
      const response = await request(app.getHttpServer())
        .get('/members')
        .set('Authorization', `Bearer ${getAuthToken(userId, tenantId)}`)
        .expect(400);
    });

    it('valid token accepted', async () => {
      await request(app.getHttpServer())
        .get('/members')
        .set(adminHeaders)
        .expect(200);
    });
  });

  describe('Permission Checks', () => {
    let staffHeaders: Record<string, string>;
    let eventId: string;

    beforeEach(async () => {
      const staffUser = await createTestUser(tenantId, 'STAFF', { email: 'staff@example.com' });
      staffHeaders = getAdminHeaders(tenantId, staffUser.id);

      const event = await createTestEvent(tenantId);
      eventId = event.id;
    });

    it('staff cannot delete events without permission', async () => {
      await request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .set(staffHeaders)
        .expect(403);
    });

    it('owner can delete events', async () => {
      await request(app.getHttpServer())
        .delete(`/events/${eventId}`)
        .set(adminHeaders)
        .expect(200);
    });
  });
});
