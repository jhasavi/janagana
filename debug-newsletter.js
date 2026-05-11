const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugNewsletter() {
  try {
    console.log('=== Debug Newsletter API ===');
    
    // Test tenant lookup
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    console.log('Tenant found:', tenant ? tenant.name : 'Not found');
    
    if (!tenant) {
      console.log('Available tenants:');
      const allTenants = await prisma.tenant.findMany({
        select: { id: true, name: true, slug: true }
      });
      allTenants.forEach(t => {
        console.log(`  - ${t.name} (${t.slug})`);
      });
      return;
    }
    
    // Test contact creation
    const testContact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        email: 'debug-test@example.com',
        firstName: 'Debug',
        lastName: 'Test',
        lifecycleStage: 'LEAD',
        engagementScore: 0,
        tags: ['newsletter-subscriber', 'debug-test'],
        marketingConsent: true,
        source: 'debug-script',
      },
    });
    
    console.log('Created test contact:', testContact);
    
    // Clean up
    await prisma.contact.delete({
      where: { id: testContact.id }
    });
    console.log('Cleaned up test contact');
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNewsletter();
