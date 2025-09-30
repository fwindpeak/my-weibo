import { mkdirSync } from 'fs'
import { dirname, isAbsolute, join, resolve } from 'path'
import { Database } from 'bun:sqlite'
import { drizzle } from '@/lib/drizzle/bun-sqlite'

import * as schema from '@/lib/schema'

type GlobalStore = {
  db: ReturnType<typeof drizzle> | undefined
  sqlite: Database | undefined
}

function normalizeDatabasePath(rawUrl: string | undefined) {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return join(process.cwd(), 'sqlite.db')
  }

  const trimmed = rawUrl.trim()

  if (trimmed.startsWith('file:')) {
    const filePath = trimmed.slice('file:'.length)
    if (isAbsolute(filePath)) {
      return filePath
    }
    return resolve(process.cwd(), filePath)
  }

  return isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed)
}

function prepareDatabase() {
  const filePath = normalizeDatabasePath(process.env.DATABASE_URL)
  const directory = dirname(filePath)
  mkdirSync(directory, { recursive: true })

  const sqlite = new Database(filePath, { create: true })
  sqlite.exec('PRAGMA foreign_keys = ON;')
  sqlite.exec('PRAGMA journal_mode = WAL;')
  initializeSchema(sqlite)

  const db = drizzle(sqlite, { schema })
  return { db, sqlite }
}

function initializeSchema(sqlite: Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS microblogs (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      alt_text TEXT,
      microblog_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (microblog_id) REFERENCES microblogs(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      microblog_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (microblog_id) REFERENCES microblogs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_microblog_user ON likes (microblog_id, user_id);
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      microblog_id TEXT NOT NULL,
      user_id TEXT,
      guest_name TEXT,
      guest_email TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (microblog_id) REFERENCES microblogs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `)
}

const globalForDb = globalThis as unknown as GlobalStore

if (!globalForDb.db || !globalForDb.sqlite) {
  const { db, sqlite } = prepareDatabase()
  globalForDb.db = db
  globalForDb.sqlite = sqlite
}

export const db = globalForDb.db!
export { schema }
