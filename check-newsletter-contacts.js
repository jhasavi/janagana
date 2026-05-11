const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNewsletterContacts() {
  try {
    console.log('=== Newsletter Subscribers in CRM ===');
    
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    const contacts = await prisma.contact.findMany({
      where: { 
        tenantId: tenant.id,
        tags: { has: 'newsletter-subscriber' }
      },
      select: {
        id: true,
        emails: true,
        firstName: true,
        lastName: true,
        tags: true,
        lifecycleStage: true,
        source: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${contacts.length} newsletter subscribers:`);
    contacts.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.emails?.[0] || 'No email'})`);
      console.log(`    Tags: ${contact.tags?.join(', ') || 'None'}`);
      console.log(`    Source: ${contact.source || 'Unknown'}`);
      console.log(`    Created: ${contact.createdAt.toISOString()}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewsletterContacts();
