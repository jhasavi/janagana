import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import {
  createTestTenant,
  createTestUser,
  createTestMember,
  getAdminHeaders,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

describe('Members API', () => {
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

    // Setup test data
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
    // Clean database before each test
    await cleanDatabase();
    
    // Recreate tenant and user
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const user = await createTestUser(tenantId, 'OWNER');
    userId = user.id;

    adminHeaders = getAdminHeaders(tenantId, userId);
  });

  describe('POST /members', () => {
    it('should create a new member with all fields', async () => {
      const memberData = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
        countryCode: 'US',
        bio: 'Test bio',
      };

      const response = await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send(memberData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: memberData.email,
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        status: 'ACTIVE',
        tenantId,
      });
    });

    it('should reject duplicate email within same tenant', async () => {
      const memberData = {
        email: 'duplicate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        countryCode: 'US',
      };

      // Create first member
      await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send(memberData)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send(memberData)
        .expect(409);
    });

    it('should allow same email in different tenants', async () => {
      const memberData = {
        email: 'shared@example.com',
        firstName: 'John',
        lastName: 'Doe',
        countryCode: 'US',
      };

      // Create member in first tenant
      await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send(memberData)
        .expect(201);

      // Create second tenant
      const tenant2 = await createTestTenant({ slug: 'tenant2' });
      const user2 = await createTestUser(tenant2.id, 'OWNER');
      const headers2 = getAdminHeaders(tenant2.id, user2.id);

      // Create member with same email in second tenant
      const response = await request(app.getHttpServer())
        .post('/members')
        .set(headers2)
        .send(memberData)
        .expect(201);

      expect(response.body.email).toBe(memberData.email);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send({
          email: 'test@example.com',
          // Missing firstName, lastName, countryCode
        })
        .expect(400);

      expect(response.body.message).toContain('firstName');
      expect(response.body.message).toContain('lastName');
    });

    it('should handle custom fields', async () => {
      // Create custom field
      await prisma.memberCustomField.create({
        data: {
          tenantId,
          name: 'Shirt Size',
          slug: 'shirt-size',
          fieldType: 'SELECT',
          options: ['S', 'M', 'L', 'XL'],
          isRequired: true,
        },
      });

      const memberData = {
        email: 'custom@example.com',
        firstName: 'John',
        lastName: 'Doe',
        countryCode: 'US',
        customFields: {
          'shirt-size': 'L',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/members')
        .set(adminHeaders)
        .send(memberData)
        .expect(201);

      expect(response.body.email).toBe(memberData.email);
    });
  });

  describe('GET /members', () => {
    beforeEach(async () => {
      // Create test members
      await createTestMember(tenantId, { email: 'member1@example.com', firstName: 'Alice', lastName: 'Smith' });
      await createTestMember(tenantId, { email: 'member2@example.com', firstName: 'Bob', lastName: 'Jones' });
      await createTestMember(tenantId, { email: 'member3@example.com', firstName: 'Charlie', lastName: 'Brown', status: 'INACTIVE' });
    });

    it('should return paginated list', async () => {
      const response = await request(app.getHttpServer())
        .get('/members?page=1&limit=10')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(3);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.total).toBe(3);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/members?status=ACTIVE')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.data.every((m: any) => m.status === 'ACTIVE')).toBe(true);
    });

    it('should search by name and email', async () => {
      const response = await request(app.getHttpServer())
        .get('/members?search=Alice')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].firstName).toBe('Alice');
    });

    it('should only return members for current tenant', async () => {
      // Create member in another tenant
      const tenant2 = await createTestTenant({ slug: 'tenant2' });
      await createTestMember(tenant2.id, { email: 'other@example.com', firstName: 'Other' });

      const response = await request(app.getHttpServer())
        .get('/members')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.data.length).toBe(3);
      expect(response.body.data.every((m: any) => m.tenantId === tenantId)).toBe(true);
    });
  });

  describe('PATCH /members/:id', () => {
    it('should update member fields', async () => {
      const member = await createTestMember(tenantId);

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1987654321',
      };

      const response = await request(app.getHttpServer())
        .patch(`/members/${member.id}`)
        .set(adminHeaders)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);
      expect(response.body.lastName).toBe(updateData.lastName);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should not update another tenant member', async () => {
      const tenant2 = await createTestTenant({ slug: 'tenant2' });
      const member2 = await createTestMember(tenant2.id);

      const response = await request(app.getHttpServer())
        .patch(`/members/${member2.id}`)
        .set(adminHeaders)
        .send({ firstName: 'Hacked' })
        .expect(403);
    });
  });

  describe('POST /members/import', () => {
    it('should import valid CSV', async () => {
      const csvContent = `email,firstName,lastName,countryCode
import1@example.com,Import,User1,US
import2@example.com,Import,User2,US
import3@example.com,Import,User3,US`;

      const response = await request(app.getHttpServer())
        .post('/members/import')
        .set(adminHeaders)
        .set('Content-Type', 'multipart/form-data')
        .field('strategy', 'create')
        .attach('file', Buffer.from(csvContent), 'members.csv')
        .expect(201);

      expect(response.body.imported).toBe(3);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should report errors for invalid rows', async () => {
      const csvContent = `email,firstName,lastName,countryCode
invalid-email,Missing,LastName,US
valid@example.com,Valid,User,US`;

      const response = await request(app.getHttpServer())
        .post('/members/import')
        .set(adminHeaders)
        .set('Content-Type', 'multipart/form-data')
        .field('strategy', 'create')
        .attach('file', Buffer.from(csvContent), 'members.csv')
        .expect(201);

      expect(response.body.imported).toBe(1);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle duplicates per strategy', async () => {
      // Create existing member
      await createTestMember(tenantId, { email: 'existing@example.com' });

      const csvContent = `email,firstName,lastName,countryCode
existing@example.com,Updated,Name,US
new@example.com,New,User,US`;

      const response = await request(app.getHttpServer())
        .post('/members/import')
        .set(adminHeaders)
        .set('Content-Type', 'multipart/form-data')
        .field('strategy', 'skip')
        .attach('file', Buffer.from(csvContent), 'members.csv')
        .expect(201);

      expect(response.body.imported).toBe(1);
      expect(response.body.skipped).toBe(1);
    });
  });

  describe('GET /members/stats', () => {
    beforeEach(async () => {
      await createTestMember(tenantId, { status: 'ACTIVE' });
      await createTestMember(tenantId, { status: 'ACTIVE' });
      await createTestMember(tenantId, { status: 'INACTIVE' });
      await createTestMember(tenantId, { status: 'PENDING' });
    });

    it('should return correct member statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/members/stats')
        .set(adminHeaders)
        .expect(200);

      expect(response.body.total).toBe(4);
      expect(response.body.active).toBe(2);
      expect(response.body.inactive).toBe(1);
      expect(response.body.pending).toBe(1);
    });
  });
});
