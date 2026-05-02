import { getEvents } from './lib/actions/events'

async function testDashboardAPI() {
  console.log('Testing dashboard getEvents API...')
  
  // Test with no filters (should return all events)
  const result1 = await getEvents({})
  console.log('No filters - Success:', result1.success)
  console.log('No filters - Count:', result1.data?.length || 0)
  console.log('No filters - Events:', result1.data?.map(e => ({ id: e.id, title: e.title, status: e.status })))
  
  // Test with status=all (explicit)
  const result2 = await getEvents({ status: 'all' })
  console.log('Status=all - Success:', result2.success)
  console.log('Status=all - Count:', result2.data?.length || 0)
  
  // Test with status=PUBLISHED
  const result3 = await getEvents({ status: 'PUBLISHED' })
  console.log('Status=PUBLISHED - Count:', result3.data?.length || 0)
  
  // Test with status=COMPLETED
  const result4 = await getEvents({ status: 'COMPLETED' })
  console.log('Status=COMPLETED - Count:', result4.data?.length || 0)
}

testDashboardAPI().catch(console.error)
