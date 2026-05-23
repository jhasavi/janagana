import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { config as dotenv } from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'

dotenvExpand(dotenv({ path: path.join(process.cwd(), '.env'), override: false }))
dotenvExpand(dotenv({ path: path.join(process.cwd(), '.env.local'), override: true }))
dotenvExpand(dotenv({ path: path.join(process.cwd(), '.env.test'), override: true }))

execFileSync('npx', ['prisma', 'validate'], {
  stdio: 'inherit',
  env: process.env,
})
