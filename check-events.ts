import { prisma } from './lib/prisma'

async function checkEvents() {
  const events = await prisma.event.findMany({
    where: { tenant: { slug: 'purple-wings' } },
    select: {
      id: true,
      title: true,
      startDate: true,
      status: true,
      tags: true,
      attendeeCount: true,
      tenant: { select: { slug: true } }
    },
    orderBy: { startDate: 'desc' }
  })
  
  console.log('Total events:', events.length)
  console.log('\nEvent details:')
  events.forEach(event => {
    console.log(`- ${event.title} (${event.status}) - ${event.startDate}`)
  })
  
  const upcoming = events.filter(e => e.status === 'PUBLISHED' && new Date(e.startDate) > new Date())
  const past = events.filter(e => e.status === 'COMPLETED' || (e.status === 'PUBLISHED' && new Date(e.startDate) <= new Date()))
  
  console.log('\nUpcoming (PUBLISHED, future):', upcoming.length)
  console.log('Past (COMPLETED or past PUBLISHED):', past.length)
  
  await prisma.$disconnect()
}

checkEvents().catch(console.error)
