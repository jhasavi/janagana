const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testEventRetrieval() {
  try {
    // Test: Get the-purple-wings tenant
    const activeTenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    console.log('Active tenant:', activeTenant);
    
    // Test: Get all events for this tenant
    const events = await prisma.event.findMany({
      where: { tenantId: activeTenant.id },
      select: { id: true, title: true, startDate: true, status: true }
    });
    
    console.log(`Events for ${activeTenant.name}: ${events.length}`);
    events.forEach(event => {
      console.log(`  - ${event.title} (${event.startDate.toISOString().split('T')[0]})`);
    });
    
    // Test: Check purple-wings tenant
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: 'purple-wings' }
    });
    
    const otherEvents = await prisma.event.findMany({
      where: { tenantId: otherTenant.id },
      select: { id: true, title: true, startDate: true, status: true }
    });
    
    console.log(`Events for ${otherTenant.name}: ${otherEvents.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEventRetrieval();
