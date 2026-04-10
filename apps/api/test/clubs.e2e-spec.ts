import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import {
  createTestTenant,
  createTestUser,
  createTestMember,
  createTestClub,
  getAdminHeaders,
  cleanDatabase,
  globalSetup,
  globalTeardown,
} from './setup';

const prisma = new PrismaClient();

describe('Clubs API', () => {
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

  describe('POST /clubs', () => {
    it('should create club', async () => {
      const clubData = {
        name: 'Test Club',
        slug: 'test-club',
        description: 'Test club description',
        visibility: 'PUBLIC',
      };

      const response = await request(app.getHttpServer())
        .post('/clubs')
        .set(adminHeaders)
        .send(clubData)
        .expect(201);

      expect(response.body.name).toBe(clubData.name);
      expect(response.body.visibility).toBe('PUBLIC');
    });
  });

  describe('POST /clubs/:id/memberships', () => {
    let clubId: string;
    let memberId: string;

    beforeEach(async () => {
      const club = await createTestClub(tenantId, { visibility: 'PUBLIC' });
      clubId = club.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;
    });

    it('member joins public club', async () => {
      const response = await request(app.getHttpServer())
        .post(`/clubs/${clubId}/memberships`)
        .set(adminHeaders)
        .send({ memberId })
        .expect(201);

      expect(response.body.role).toBe('MEMBER');
      expect(response.body.joinedAt).toBeDefined();
    });

    it('join request for private club', async () => {
      const privateClub = await createTestClub(tenantId, { visibility: 'PRIVATE' });

      const response = await request(app.getHttpServer())
        .post(`/clubs/${privateClub.id}/memberships`)
        .set(adminHeaders)
        .send({ memberId })
        .expect(201);

      expect(response.body.role).toBe('MEMBER');
      expect(response.body.status).toBe('PENDING');
    });
  });

  describe('PATCH /clubs/:id/memberships/:membershipId/approve', () => {
    let membershipId: string;

    beforeEach(async () => {
      const club = await createTestClub(tenantId, { visibility: 'PRIVATE' });
      const member = await createTestMember(tenantId);

      const membership = await prisma.clubMembership.create({
        data: {
          tenantId,
          clubId: club.id,
          memberId: member.id,
          role: 'MEMBER',
        },
      });
      membershipId = membership.id;
    });

    it('leader approves join request', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/clubs/${membershipId}/approve`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.status).toBe('APPROVED');
    });
  });

  describe('POST /clubs/:id/posts', () => {
    let clubId: string;
    let memberId: string;

    beforeEach(async () => {
      const club = await createTestClub(tenantId);
      clubId = club.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;

      // Add member to club
      await prisma.clubMembership.create({
        data: {
          tenantId,
          clubId,
          memberId,
          role: 'MEMBER',
        },
      });
    });

    it('create post', async () => {
      const postData = {
        memberId,
        title: 'Test Post',
        body: 'This is a test post content.',
      };

      const response = await request(app.getHttpServer())
        .post(`/clubs/${clubId}/posts`)
        .set(adminHeaders)
        .send(postData)
        .expect(201);

      expect(response.body.title).toBe(postData.title);
      expect(response.body.body).toBe(postData.body);
    });
  });

  describe('POST /clubs/:id/posts/:postId/comments', () => {
    let clubId: string;
    let postId: string;
    let memberId: string;

    beforeEach(async () => {
      const club = await createTestClub(tenantId);
      clubId = club.id;

      const member = await createTestMember(tenantId);
      memberId = member.id;

      await prisma.clubMembership.create({
        data: {
          tenantId,
          clubId,
          memberId,
          role: 'MEMBER',
        },
      });

      const post = await prisma.clubPost.create({
        data: {
          tenantId,
          clubId,
          authorId: memberId,
          title: 'Test Post',
          body: 'Test content',
        },
      });
      postId = post.id;
    });

    it('comment on post', async () => {
      const commentData = {
        memberId,
        body: 'This is a comment.',
      };

      const response = await request(app.getHttpServer())
        .post(`/clubs/${clubId}/posts/${postId}/comments`)
        .set(adminHeaders)
        .send(commentData)
        .expect(201);

      expect(response.body.body).toBe(commentData.body);
    });
  });

  describe('DELETE /clubs/:id/memberships/:membershipId', () => {
    let clubId: string;
    let membershipId: string;

    beforeEach(async () => {
      const club = await createTestClub(tenantId);
      clubId = club.id;

      const member = await createTestMember(tenantId);

      const membership = await prisma.clubMembership.create({
        data: {
          tenantId,
          clubId,
          memberId: member.id,
          role: 'MEMBER',
        },
      });
      membershipId = membership.id;
    });

    it('leave club', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/clubs/${clubId}/memberships/${membershipId}`)
        .set(adminHeaders)
        .expect(200);

      expect(response.body.message).toBeDefined();
    });
  });
});
