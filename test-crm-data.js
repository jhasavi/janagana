const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCRM() {
  try {
    console.log('=== CRM Data Test ===');
    
    // Check contacts in the-purple-wings tenant
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    console.log('Active tenant:', tenant.name);
    
    // Get contacts for this tenant
    const contacts = await prisma.contact.findMany({
      where: { tenantId: tenant.id },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        email: true, 
        phone: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${contacts.length} contacts:`);
    contacts.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email})`);
    });
    
    // Check if there are any members (legacy data)
    const members = await prisma.member.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    console.log(`\nFound ${members.length} members (legacy):`);
    members.forEach(member => {
      console.log(`  - ${member.firstName} ${member.lastName} (${member.email})`);
    });
    
    // Test creating a new contact
    if (contacts.length === 0) {
      console.log('\n=== Creating Test Contact ===');
      const newContact = await prisma.contact.create({
        data: {
          tenantId: tenant.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '+1234567890',
          lifecycleStage: 'LEAD',
          engagementScore: 0,
        }
      });
      
      console.log('Created test contact:', newContact);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCRM();
