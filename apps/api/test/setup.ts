import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/orgflow_test';

// Helper to create a test tenant
export async function createTestTenant(overrides: Partial<any> = {}) {
  return prisma.tenant.create({
    data: {
      slug: `test-${Date.now()}`,
      name: overrides.name || 'Test Organization',
      domain: overrides.domain || `test-${Date.now()}.orgflow.test`,
      countryCode: 'US',
      timezone: 'UTC',
      ...overrides,
    },
  });
}

// Helper to create a test user
export async function createTestUser(tenantId: string, role: string = 'STAFF', overrides: Partial<any> = {}) {
  return prisma.user.create({
    data: {
      tenantId,
      email: overrides.email || `test-${Date.now()}@example.com`,
      fullName: overrides.fullName || 'Test User',
      role: role as any,
      isActive: true,
      ...overrides,
    },
  });
}

// Helper to create a test member
export async function createTestMember(tenantId: string, overrides: Partial<any> = {}) {
  return prisma.member.create({
    data: {
      tenantId,
      email: overrides.email || `member-${Date.now()}@example.com`,
      firstName: overrides.firstName || 'John',
      lastName: overrides.lastName || 'Doe',
      countryCode: 'US',
      status: 'ACTIVE',
      joinedAt: new Date(),
      ...overrides,
    },
  });
}

// Helper to create a test event
export async function createTestEvent(tenantId: string, overrides: Partial<any> = {}) {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  const endsAt = new Date(startsAt);
  endsAt.setHours(endsAt.getHours() + 2);

  return prisma.event.create({
    data: {
      tenantId,
      title: overrides.title || 'Test Event',
      slug: overrides.slug || `test-event-${Date.now()}`,
      description: overrides.description || 'Test event description',
      status: 'PUBLISHED',
      format: 'IN_PERSON',
      location: 'Test Location',
      startsAt,
      endsAt,
      capacity: 100,
      isPublic: true,
      ...overrides,
    },
  });
}

// Helper to create a test membership tier
export async function createTestMembershipTier(tenantId: string, overrides: Partial<any> = {}) {
  return prisma.membershipTier.create({
    data: {
      tenantId,
      name: overrides.name || 'Test Tier',
      slug: overrides.slug || `test-tier-${Date.now()}`,
      description: 'Test tier description',
      monthlyPriceCents: 1000,
      annualPriceCents: 10000,
      isFree: false,
      isPublic: true,
      sortOrder: 0,
      ...overrides,
    },
  });
}

// Helper to create a test volunteer opportunity
export async function createTestVolunteerOpportunity(tenantId: string, overrides: Partial<any> = {}) {
  const startsAt = new Date();
  startsAt.setDate(startsAt.getDate() + 7);
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 30);

  return prisma.volunteerOpportunity.create({
    data: {
      tenantId,
      title: overrides.title || 'Test Volunteer Opportunity',
      slug: overrides.slug || `test-vol-${Date.now()}`,
      description: 'Test volunteer opportunity',
      location: 'Test Location',
      isVirtual: false,
      isActive: true,
      startsAt,
      endsAt,
      totalHours: 20,
      ...overrides,
    },
  });
}

// Helper to create a test club
export async function createTestClub(tenantId: string, overrides: Partial<any> = {}) {
  return prisma.club.create({
    data: {
      tenantId,
      name: overrides.name || 'Test Club',
      slug: overrides.slug || `test-club-${Date.now()}`,
      description: 'Test club description',
      visibility: 'PUBLIC',
      isActive: true,
      ...overrides,
    },
  });
}

// Mock Clerk JWT token generation
export function getAuthToken(userId: string, tenantId: string): string {
  const payload = {
    sub: userId,
    tenantId,
    email: 'test@example.com',
    metadata: { tenantId },
  };

  return jwt.sign(payload, 'test-secret-key', {
    expiresIn: '1h',
  });
}

// Get admin headers for authenticated requests
export function getAdminHeaders(tenantId: string, userId: string): Record<string, string> {
  const token = getAuthToken(userId, tenantId);
  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json',
  };
}

// Get basic headers without auth
export function getHeaders(tenantId: string): Record<string, string> {
  return {
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json',
  };
}

// Setup test database
export async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');

  // Set test database URL
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  try {
    // Create database if it doesn't exist
    execSync(`psql postgres://postgres:password@localhost:5432/postgres -c "CREATE DATABASE orgflow_test;"`, {
      stdio: 'ignore',
    });
  } catch (error) {
    // Database likely already exists, ignore error
  }

  // Run migrations
  console.log('📦 Running migrations...');
  execSync('npx prisma migrate deploy --skip-generate', {
    cwd: '/Users/sanjeevjha/janagana/packages/database',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Seed minimal test data
  console.log('🌱 Seeding test data...');
  await seedMinimalData();

  console.log('✅ Test database ready');
}

// Seed minimal test data for tests
async function seedMinimalData() {
  // Create a default plan
  await prisma.plan.upsert({
    where: { slug: 'STARTER' },
    update: {},
    create: {
      slug: 'STARTER',
      name: 'Starter',
      description: 'Test plan',
      monthlyPriceCents: 2900,
      annualPriceCents: 29000,
      maxMembers: 100,
      maxUsers: 3,
      maxEvents: 10,
      maxClubs: 5,
      hasCustomDomain: false,
      hasApiAccess: false,
      hasAdvancedReports: false,
    },
  });
}

// Cleanup test database
export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');

  // Disconnect Prisma
  await prisma.$disconnect();

  // Drop test database
  try {
    execSync(`psql postgres://postgres:password@localhost:5432/postgres -c "DROP DATABASE IF EXISTS orgflow_test;"`, {
      stdio: 'ignore',
    });
  } catch (error) {
    console.error('Error dropping test database:', error);
  }

  console.log('✅ Test database cleaned up');
}

// Clean all data from tables (for between tests)
export async function cleanDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const table of tables) {
    if (table.tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table.tablename}" CASCADE;`);
      } catch (error) {
        // Ignore errors for tables that don't support TRUNCATE
      }
    }
  }
}

// Global setup for all tests
export async function globalSetup() {
  await setupTestDatabase();
}

// Global teardown for all tests
export async function globalTeardown() {
  await cleanupTestDatabase();
}
