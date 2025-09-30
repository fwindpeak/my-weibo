import { randomUUID } from 'crypto'
import { relations } from '@/lib/drizzle'
import { integer, sqliteTable, text, uniqueIndex } from '@/lib/drizzle/sqlite-core'

const now = () => new Date()

export const users = sqliteTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    password: text('password'),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  }
)

export const microblogs = sqliteTable(
  'microblogs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    content: text('content').notNull().default(''),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  }
)

export const images = sqliteTable(
  'images',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    url: text('url').notNull(),
    altText: text('alt_text'),
    microblogId: text('microblog_id')
      .notNull()
      .references(() => microblogs.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  }
)

export const likes = sqliteTable(
  'likes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    microblogId: text('microblog_id')
      .notNull()
      .references(() => microblogs.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  },
  (table) => ({
    microblogUserUnique: uniqueIndex('likes_microblog_user_unique').on(
      table.microblogId,
      table.userId
    ),
  })
)

export const comments = sqliteTable(
  'comments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    content: text('content').notNull(),
    microblogId: text('microblog_id')
      .notNull()
      .references(() => microblogs.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id),
    guestName: text('guest_name'),
    guestEmail: text('guest_email'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  }
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(now),
  }
)

export const usersRelations = relations(users, ({ many }) => ({
  microblogs: many(microblogs),
  comments: many(comments),
  likes: many(likes),
  sessions: many(sessions),
}))

export const microblogsRelations = relations(microblogs, ({ one, many }) => ({
  user: one(users, {
    fields: [microblogs.userId],
    references: [users.id],
  }),
  images: many(images),
  likes: many(likes),
  comments: many(comments),
}))

export const imagesRelations = relations(images, ({ one }) => ({
  microblog: one(microblogs, {
    fields: [images.microblogId],
    references: [microblogs.id],
  }),
}))

export const likesRelations = relations(likes, ({ one }) => ({
  microblog: one(microblogs, {
    fields: [likes.microblogId],
    references: [microblogs.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  microblog: one(microblogs, {
    fields: [comments.microblogId],
    references: [microblogs.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))
