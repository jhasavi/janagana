const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStatusCheck() {
  try {
    console.log('=== Debug Status Check ===');
    
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'the-purple-wings' }
    });
    
    const testEmail = 'test-1778444031757@newsletter-test.com';
    
    // Try different query approaches
    console.log('Approach 1: Using "has" operator');
    const contact1 = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        emails: {
          has: testEmail.toLowerCase().trim()
        }
      },
    });
    console.log('Result 1:', contact1 ? 'Found' : 'Not found');
    
    console.log('\nApproach 2: Using "some" with "equals"');
    const contact2 = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        emails: {
          some: {
            equals: testEmail.toLowerCase().trim()
          }
        }
      },
    });
    console.log('Result 2:', contact2 ? 'Found' : 'Not found');
    
    console.log('\nApproach 3: Simple string match (if emails stored as string)');
    const contact3 = await prisma.contact.findFirst({
      where: {
        tenantId: tenant.id,
        emails: testEmail.toLowerCase().trim()
      },
    });
    console.log('Result 3:', contact3 ? 'Found' : 'Not found');
    
    // Check actual data structure
    if (contact1) {
      console.log('\nContact data structure:');
      console.log('ID:', contact1.id);
      console.log('Emails:', contact1.emails);
      console.log('Emails type:', typeof contact1.emails);
      console.log('First email:', contact1.emails?.[0]);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStatusCheck();
