import { PrismaClient } from '@prisma/client'
import { generateApiKey, hashApiKey, extractApiKeyPrefix } from '../lib/plugin-auth'

const prisma = new PrismaClient()

async function generateApiKeys() {
  console.log('Fetching tenants...')
  const tenants = await prisma.tenant.findMany()

  if (tenants.length === 0) {
    console.log('No tenants found. Please create a tenant first via the application.')
    console.log('API keys can only be generated for existing tenants.')
    return
  }

  console.log(`Found ${tenants.length} tenant(s)`)

  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.name} (${tenant.slug})`)

    // Check if API key already exists
    const existingKey = await prisma.apiKey.findFirst({
      where: { tenantId: tenant.id },
    })

    if (existingKey) {
      console.log(`  ✓ API key already exists: ${existingKey.keyPrefix}...`)
      continue
    }

    // Generate new API key
    const apiKey = generateApiKey('jg_live_')
    const keyHash = hashApiKey(apiKey)
    const keyPrefix = extractApiKeyPrefix(apiKey)

    // Store in database
    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        name: `${tenant.name} Plugin API Key`,
        keyHash,
        keyPrefix,
        permissions: ['crm:read', 'crm:write', 'members:read', 'events:read'],
        isActive: true,
      },
    })

    console.log(`  ✓ Generated API key: ${apiKey}`)
    console.log(`  ✓ Key prefix: ${keyPrefix}`)
  }

  console.log('\n✅ API key generation complete!')
}

generateApiKeys()
  .catch((error) => {
    console.error('Error generating API keys:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
