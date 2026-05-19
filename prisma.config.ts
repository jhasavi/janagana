import { defineConfig } from '@prisma/config'

export default defineConfig({
  migrations: {
    seed: 'node --import tsx prisma/seed.ts',
  },
})
