const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEventCreation() {
  try {
    console.log('=== Event Creation Test ===');
    
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    // Create a test event
    const newEvent = await prisma.event.create({
      data: {
        tenantId: tenant.id,
        title: 'Test Event - TPM Integration',
        description: 'Testing event creation functionality',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: 'Test Location',
        status: 'DRAFT',
        format: 'IN_PERSON',
        priceCents: 0,
        capacity: 50,
        attendeeCount: 0,
        tags: ['test', 'tpm-integration']
      }
    });
    
    console.log('Created test event:', {
      id: newEvent.id,
      title: newEvent.title,
      startDate: newEvent.startDate,
      status: newEvent.status
    });
    
    // Get updated events count
    const totalEvents = await prisma.event.count({
      where: { tenantId: tenant.id }
    });
    
    console.log(`Total events for tenant: ${totalEvents}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEventCreation();
