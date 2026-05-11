const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNewsletter() {
  try {
    console.log('=== Newsletter Test ===');
    
    // Check for newsletter campaigns
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    const campaigns = await prisma.newsletterCampaign.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, subject: true, status: true, createdAt: true }
    });
    
    console.log(`Found ${campaigns.length} newsletter campaigns:`);
    campaigns.forEach(campaign => {
      console.log(`  - ${campaign.name}: ${campaign.subject} (${campaign.status})`);
    });
    
    // Check for subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, email: true, status: true, subscribedAt: true }
    });
    
    console.log(`\nFound ${subscribers.length} newsletter subscribers:`);
    subscribers.forEach(subscriber => {
      console.log(`  - ${subscriber.email} (${subscriber.status})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewsletter();
