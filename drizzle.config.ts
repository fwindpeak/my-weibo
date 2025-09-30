import { defineConfig } from 'drizzle-kit'

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim()
  if (url && url.length > 0) {
    return url
  }

  return 'file:./sqlite.db'
}

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
})
