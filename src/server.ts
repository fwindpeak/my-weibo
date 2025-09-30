import { Elysia, cookie, cors, staticPlugin } from '@/lib/server-framework'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { and, asc, desc, eq, inArray, like } from '@/lib/drizzle'

import { db } from '@/lib/db'
import { comments, images, likes, microblogs, users } from '@/lib/schema'
import { hashPassword, verifyPassword } from '@/lib/password'
import { clearSession, createSession, getSessionUser } from '@/lib/session'

function resolveUploadsDir() {
  const envPath = process.env.UPLOADS_DIR?.trim()
  if (envPath) {
    return envPath.startsWith('/') ? envPath : resolve(process.cwd(), envPath)
  }

  return join(process.cwd(), 'storage', 'uploads')
}

const UPLOAD_DIR = resolveUploadsDir()

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true })
}

function resolveClientDir() {
  const candidates: string[] = []

  const envPath = process.env.CLIENT_ASSETS_DIR?.trim()
  if (envPath) {
    candidates.push(envPath.startsWith('/') ? envPath : join(process.cwd(), envPath))
  }

  candidates.push(
    join(process.cwd(), 'client'),
    join(process.cwd(), 'public', 'client'),
    join(process.cwd(), 'build', 'client'),
    join(process.cwd(), 'dist', 'client'),
    join(process.cwd(), 'dist')
  )

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return join(process.cwd(), 'client')
}

function readBooleanEnv(key: string, defaultValue: boolean) {
  const rawValue = process.env[key]
  if (!rawValue) {
    return defaultValue
  }

  const normalized = rawValue.trim().toLowerCase()

  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false
  }

  if (['true', '1', 'on', 'yes'].includes(normalized)) {
    return true
  }

  return defaultValue
}

const serveClientAssets = readBooleanEnv('SERVE_CLIENT', true)

const microblogQueryConfig = {
  user: {
    columns: {
      id: true,
      username: true,
      email: true,
      isAdmin: true,
    },
  },
  images: {
    orderBy: asc(images.createdAt),
  },
  likes: {
    columns: {
      id: true,
      userId: true,
      createdAt: true,
    },
  },
  comments: {
    orderBy: desc(comments.createdAt),
    with: {
      user: {
        columns: {
          id: true,
          username: true,
          isAdmin: true,
        },
      },
    },
  },
} as const

async function getMicroblogById(id: string) {
  return db.query.microblogs.findFirst({
    where: eq(microblogs.id, id),
    with: microblogQueryConfig,
  })
}

const app = new Elysia()
  .use(cors({ origin: true, credentials: true }))
  .use(cookie())
  .get('/api/health', () => ({ message: 'Good!' }))
  .group('/api/auth', (app) =>
    app
      .get('/session', async ({ cookie, removeCookie }) => {
        const user = await getSessionUser(cookie, removeCookie)
        return { user }
      })
      .post('/logout', async ({ cookie, removeCookie, set }) => {
        await clearSession(cookie, removeCookie)
        set.status = 200
        return { success: true }
      })
      .post('/admin-login', async ({ body, set, setCookie }) => {
        try {
          const { username, password } = body as { username?: string; password?: string }

          if (!username || !password) {
            set.status = 400
            return { message: '用户名和密码不能为空' }
          }

          const user = await db.query.users.findFirst({
            where: (fields) => and(eq(fields.username, username), eq(fields.isAdmin, true)),
          })

          if (!user || !user.password) {
            set.status = 401
            return { message: '管理员用户不存在或未设置密码' }
          }

          const isValid = await verifyPassword(password, user.password)

          if (!isValid) {
            set.status = 401
            return { message: '密码错误' }
          }

          await createSession({ setCookie, set }, user.id)
          const { password: _password, ...userWithoutPassword } = user

          return userWithoutPassword
        } catch (error) {
          console.error('Admin login error:', error)
          set.status = 500
          return { message: '登录失败' }
        }
      })
      .post('/login', async ({ body, set, setCookie }) => {
        try {
          const { username, email, password } = body as {
            username?: string
            email?: string
            password?: string
          }

          if (!email || !password) {
            set.status = 400
            return { message: '邮箱和密码不能为空' }
          }

          const normalizedEmail = email.trim().toLowerCase()
          const normalizedUsername = username?.trim()

          let user = await db.query.users.findFirst({
            where: (fields) => eq(fields.email, normalizedEmail),
          })

          if (!user) {
            if (normalizedUsername) {
              const usernameTaken = await db.query.users.findFirst({
                where: (fields) => eq(fields.username, normalizedUsername),
              })
              if (usernameTaken) {
                set.status = 409
                return { message: '用户名已被占用' }
              }
            }

            const hashedPassword = await hashPassword(password)
            const usernameForCreate = normalizedUsername || normalizedEmail.split('@')[0]

            const createdUsers = await db
              .insert(users)
              .values({
                username: usernameForCreate,
                email: normalizedEmail,
                password: hashedPassword,
                isAdmin: false,
              })
              .returning()

            const createdUser = Array.isArray(createdUsers)
              ? ((createdUsers[0] as { id: string; password?: string | null }) ?? null)
              : null
            if (!createdUser) {
              throw new Error('Failed to create user record')
            }

            user = createdUser

            await createSession({ setCookie, set }, user.id)
            const { password: _password, ...userWithoutPassword } = user
            set.status = 201
            return userWithoutPassword
          }

          if (user.isAdmin) {
            set.status = 403
            return { message: '请使用管理员登录入口' }
          }

          if (!user.password) {
            const hashedPassword = await hashPassword(password)
            const updatedUsers = await db
              .update(users)
              .set({
                password: hashedPassword,
                username: normalizedUsername || user.username,
                updatedAt: new Date(),
              })
              .where(eq(users.id, user.id))
              .returning()
            const updatedUser = Array.isArray(updatedUsers)
              ? ((updatedUsers[0] as typeof user) ?? null)
              : null
            user = updatedUser ?? user
          } else {
            const isValid = await verifyPassword(password, user.password)

            if (!isValid) {
              set.status = 401
              return { message: '邮箱或密码不正确' }
            }

            if (normalizedUsername && normalizedUsername !== user.username) {
              const usernameTaken = await db.query.users.findFirst({
                where: (fields) => eq(fields.username, normalizedUsername),
              })
              if (usernameTaken && usernameTaken.id !== user.id) {
                set.status = 409
                return { message: '用户名已被占用' }
              }

              const usernameUpdates = await db
                .update(users)
                .set({
                  username: normalizedUsername,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, user.id))
                .returning()
              const updatedUser = Array.isArray(usernameUpdates)
                ? ((usernameUpdates[0] as typeof user) ?? null)
                : null
              user = updatedUser ?? user
            }
          }

          await createSession({ setCookie, set }, user.id)
          const { password: _password, ...userWithoutPassword } = user

          return userWithoutPassword
        } catch (error) {
          console.error('Login error:', error)
          set.status = 500
          return { message: '登录失败' }
        }
      })
  )
  .group('/api', (app) =>
    app
      .get('/microblogs', async ({ query, set }) => {
        try {
          const search = typeof query?.search === 'string' ? query.search.trim() : ''
          const searchTerm = search.length > 0 ? `%${search}%` : undefined

          const microblogsList = await db.query.microblogs.findMany({
            where: searchTerm ? (fields) => like(fields.content, searchTerm) : undefined,
            orderBy: desc(microblogs.createdAt),
            with: microblogQueryConfig,
          })

          return microblogsList
        } catch (error) {
          console.error('Error fetching microblogs:', error)
          set.status = 500
          return { error: 'Failed to fetch microblogs' }
        }
      })
      .post('/microblogs', async ({ body, cookie, removeCookie, set, setCookie }) => {
        try {
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to create microblog' }
          }

          if (!sessionUser.isAdmin) {
            set.status = 403
            return { error: 'Only administrators can create microblogs' }
          }

          const { content, images: imagePayload } = body as {
            content?: string
            images?: Array<{ url: string; altText?: string | null }>
          }

          if (!content && (!imagePayload || imagePayload.length === 0)) {
            set.status = 400
            return { error: 'Content or images are required' }
          }
          const createdMicroblogs = await db
            .insert(microblogs)
            .values({
              content: content || '',
              userId: sessionUser.id,
            })
            .returning()

          const createdMicroblog = Array.isArray(createdMicroblogs)
            ? ((createdMicroblogs[0] as { id: string }) ?? null)
            : null

          if (!createdMicroblog) {
            throw new Error('Failed to create microblog')
          }

          if (Array.isArray(imagePayload) && imagePayload.length > 0) {
            await db
              .insert(images)
              .values(
                imagePayload.map((img) => ({
                  url: img.url,
                  altText: img.altText ?? null,
                  microblogId: createdMicroblog.id,
                }))
              )
              .run()
          }

          const microblog = await getMicroblogById(createdMicroblog.id)

          set.status = 201
          return microblog
        } catch (error) {
          console.error('Error creating microblog:', error)
          set.status = 500
          return { error: 'Failed to create microblog' }
        }
      })
      .put('/microblogs/:id', async ({ params, body, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to edit microblog' }
          }

          const { content, newImages, deletedImageIds } = body as {
            content?: string
            newImages?: Array<{ url: string; altText?: string | null }>
            deletedImageIds?: string[]
          }

          if (!content || !content.trim()) {
            set.status = 400
            return { error: 'Content is required' }
          }

          const microblog = await db.query.microblogs.findFirst({
            where: eq(microblogs.id, id),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                  email: true,
                },
              },
            },
          })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          if (!sessionUser.isAdmin && microblog.userId !== sessionUser.id) {
            set.status = 403
            return { error: 'You can only edit your own microblogs' }
          }

          const updatedMicroblog = await db.transaction(async (tx) => {
            if (Array.isArray(deletedImageIds) && deletedImageIds.length > 0) {
              await tx
                .delete(images)
                .where(and(inArray(images.id, deletedImageIds), eq(images.microblogId, id)))
            }

            if (Array.isArray(newImages) && newImages.length > 0) {
              await tx
                .insert(images)
                .values(
                  newImages.map((img) => ({
                    url: img.url,
                    altText: img.altText ?? null,
                    microblogId: id,
                  }))
                )
                .run()
            }

            await tx
              .update(microblogs)
              .set({
                content: content.trim(),
                updatedAt: new Date(),
              })
              .where(eq(microblogs.id, id))

            return tx.query.microblogs.findFirst({
              where: eq(microblogs.id, id),
              with: microblogQueryConfig,
            })
          })

          return updatedMicroblog
        } catch (error) {
          console.error('Error updating microblog:', error)
          set.status = 500
          return { error: 'Failed to update microblog' }
        }
      })
      .delete('/microblogs/:id', async ({ params, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to delete microblog' }
          }

          const microblog = await db.query.microblogs.findFirst({
            where: eq(microblogs.id, id),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                  email: true,
                },
              },
            },
          })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          if (!sessionUser.isAdmin && microblog.userId !== sessionUser.id) {
            set.status = 403
            return { error: 'You can only delete your own microblogs' }
          }

          await db.delete(microblogs).where(eq(microblogs.id, id))
          return { message: 'Microblog deleted successfully' }
        } catch (error) {
          console.error('Error deleting microblog:', error)
          set.status = 500
          return { error: 'Failed to delete microblog' }
        }
      })
      .post('/microblogs/:id/like', async ({ params, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to like microblog' }
          }

          const microblog = await db.query.microblogs.findFirst({
            where: eq(microblogs.id, id),
          })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          const existingLike = await db.query.likes.findFirst({
            where: (fields) =>
              and(eq(fields.microblogId, id), eq(fields.userId, sessionUser.id)),
          })

          if (existingLike) {
            await db.delete(likes).where(eq(likes.id, existingLike.id))
            return { liked: false }
          }

          const likeRows = await db
            .insert(likes)
            .values({
              microblogId: id,
              userId: sessionUser.id,
            })
            .returning()

          const likeRecord = Array.isArray(likeRows) ? likeRows[0] ?? null : null

          return { liked: true, like: likeRecord }
        } catch (error) {
          console.error('Error liking microblog:', error)
          set.status = 500
          return { error: 'Failed to like microblog' }
        }
      })
      .delete('/microblogs/:id/like', async ({ params, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to remove likes' }
          }

          if (!sessionUser.isAdmin) {
            set.status = 403
            return { error: 'Only administrators can clear likes' }
          }

          await db.delete(likes).where(eq(likes.microblogId, id))
          return { success: true }
        } catch (error) {
          console.error('Error removing likes:', error)
          set.status = 500
          return { error: 'Failed to unlike microblog' }
        }
      })
      .get('/microblogs/:id/comments', async ({ params, set }) => {
        try {
          const { id } = params as { id: string }

          const microblog = await db.query.microblogs.findFirst({
            where: eq(microblogs.id, id),
          })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          const commentsList = await db.query.comments.findMany({
            where: (fields) => eq(fields.microblogId, id),
            orderBy: desc(comments.createdAt),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                },
              },
            },
          })

          return commentsList
        } catch (error) {
          console.error('Error fetching comments:', error)
          set.status = 500
          return { error: 'Failed to fetch comments' }
        }
      })
      .post('/microblogs/:id/comments', async ({ params, body, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)
          const { content, guestName, guestEmail } = body as {
            content?: string
            guestName?: string
            guestEmail?: string
          }

          if (!content || !content.trim()) {
            set.status = 400
            return { error: 'Content is required' }
          }

          const microblog = await db.query.microblogs.findFirst({
            where: eq(microblogs.id, id),
          })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          let userId: string | null = null
          if (sessionUser) {
            userId = sessionUser.id
          } else if (guestName && guestEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(guestEmail)) {
              set.status = 400
              return { error: 'Invalid email format' }
            }
          } else {
            set.status = 400
            return { error: 'Either session or guestName and guestEmail are required' }
          }

          const createdComments = await db
            .insert(comments)
            .values({
              content: content.trim(),
              microblogId: id,
              userId: userId ?? null,
              guestName: guestName || null,
              guestEmail: guestEmail || null,
            })
            .returning()

          const createdComment = Array.isArray(createdComments)
            ? ((createdComments[0] as { id: string }) ?? null)
            : null
          if (!createdComment) {
            throw new Error('Failed to create comment')
          }

          const comment = await db.query.comments.findFirst({
            where: eq(comments.id, createdComment.id),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                },
              },
            },
          })

          set.status = 201
          return comment
        } catch (error) {
          console.error('Error creating comment:', error)
          set.status = 500
          return { error: 'Failed to create comment' }
        }
      })
      .put('/comments/:id', async ({ params, body, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to edit comment' }
          }

          const { content } = body as { content?: string }

          if (!content || !content.trim()) {
            set.status = 400
            return { error: 'Content is required' }
          }

          const comment = await db.query.comments.findFirst({
            where: eq(comments.id, id),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                },
              },
            },
          })

          if (!comment) {
            set.status = 404
            return { error: 'Comment not found' }
          }

          if (!sessionUser.isAdmin && comment.userId !== sessionUser.id) {
            set.status = 403
            return { error: 'You can only edit your own comments' }
          }

          await db
            .update(comments)
            .set({
              content: content.trim(),
            })
            .where(eq(comments.id, id))

          const updatedComment = await db.query.comments.findFirst({
            where: eq(comments.id, id),
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  isAdmin: true,
                },
              },
            },
          })

          return updatedComment
        } catch (error) {
          console.error('Error updating comment:', error)
          set.status = 500
          return { error: 'Failed to update comment' }
        }
      })
      .delete('/comments/:id', async ({ params, cookie, removeCookie, set }) => {
        try {
          const { id } = params as { id: string }
          const sessionUser = await getSessionUser(cookie, removeCookie)

          if (!sessionUser) {
            set.status = 401
            return { error: 'User must be logged in to delete comment' }
          }

          const comment = await db.query.comments.findFirst({
            where: eq(comments.id, id),
            columns: {
              id: true,
              userId: true,
              microblogId: false,
              content: false,
              guestName: false,
              guestEmail: false,
              createdAt: false,
            },
          })

          if (!comment) {
            set.status = 404
            return { error: 'Comment not found' }
          }

          if (!sessionUser.isAdmin && comment.userId !== sessionUser.id) {
            set.status = 403
            return { error: 'You can only delete your own comments' }
          }

          await db.delete(comments).where(eq(comments.id, id))
          return { message: 'Comment deleted successfully' }
        } catch (error) {
          console.error('Error deleting comment:', error)
          set.status = 500
          return { error: 'Failed to delete comment' }
        }
      })
      .post('/upload', async ({ request, set }) => {
        try {
          const data = await request.formData()
          const image = data.get('image')

          if (!(image instanceof File)) {
            set.status = 400
            return { error: 'No file uploaded' }
          }

          if (!image.type.startsWith('image/')) {
            set.status = 400
            return { error: 'Only image files are allowed' }
          }

          if (image.size > 50 * 1024 * 1024) {
            set.status = 400
            return { error: 'File size must be less than 50MB' }
          }

          await ensureUploadDir()

          const timestamp = Date.now()
          const randomId = Math.random().toString(36).slice(2, 15)
          const extension = image.name.split('.').pop() || 'png'
          const filename = `${timestamp}-${randomId}.${extension}`
          const filePath = join(UPLOAD_DIR, filename)

          const arrayBuffer = await image.arrayBuffer()
          await writeFile(filePath, Buffer.from(arrayBuffer))

          set.status = 201
          return {
            url: `/uploads/${filename}`,
            filename: image.name,
            size: image.size,
            type: image.type,
          }
        } catch (error) {
          console.error('Error uploading file:', error)
          set.status = 500
          return { error: 'Failed to upload file' }
        }
      })
  )

const clientDir = resolveClientDir()
const publicDir = join(process.cwd(), 'public')
const servePublicAssets = readBooleanEnv('SERVE_PUBLIC', serveClientAssets)

await ensureUploadDir()

app.use(staticPlugin({ assets: UPLOAD_DIR, prefix: '/uploads' }))

const staticRoots: string[] = []

if (serveClientAssets) {
  staticRoots.push(clientDir)
}

if (servePublicAssets) {
  staticRoots.push(publicDir)
}

function normalizePath(pathname: string) {
  try {
    return decodeURI(pathname)
  } catch {
    return pathname
  }
}

async function findStaticFile(pathname: string) {
  if (staticRoots.length === 0) {
    return null
  }

  const decodedPath = normalizePath(pathname)
  const trimmed = decodedPath.replace(/^\/+/, '')
  const candidates: string[] = []

  if (trimmed.length === 0) {
    candidates.push('index.html')
  } else {
    candidates.push(trimmed)

    const appearsToBeFile = trimmed.includes('.') && !trimmed.endsWith('/')
    if (!appearsToBeFile) {
      const base = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
      candidates.push(join(base, 'index.html'))
    }
  }

  for (const root of staticRoots) {
    for (const candidate of candidates) {
      if (!candidate) {
        continue
      }

      const file = Bun.file(join(root, candidate))
      if (await file.exists()) {
        return file
      }
    }
  }

  return null
}

if (staticRoots.length > 0) {
  app.get('*', async ({ request }) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
      return new Response('Not Found', { status: 404 })
    }

    const staticFile = await findStaticFile(pathname)
    if (staticFile) {
      return new Response(await staticFile.arrayBuffer())
    }

    if (!serveClientAssets) {
      return new Response('Not Found', { status: 404 })
    }

    if (pathname.includes('.') && !pathname.endsWith('.html')) {
      return new Response('Not Found', { status: 404 })
    }

    const acceptHeader = request.headers.get('accept')?.toLowerCase() ?? ''
    const prefersHtml =
      acceptHeader.length === 0 ||
      acceptHeader.includes('text/html') ||
      acceptHeader.includes('text/*') ||
      acceptHeader.includes('application/xhtml') ||
      acceptHeader.includes('*/*')

    if (!prefersHtml) {
      return new Response('Not Found', { status: 404 })
    }

    const indexFile = Bun.file(join(clientDir, 'index.html'))
    if (await indexFile.exists()) {
      return new Response(await indexFile.arrayBuffer(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    if (servePublicAssets) {
      const publicIndex = Bun.file(join(publicDir, 'index.html'))
      if (await publicIndex.exists()) {
        return new Response(await publicIndex.arrayBuffer(), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        })
      }
    }

    return new Response('Client build not found. Run `bun run build` first.', {
      status: 404,
    })
  })
}

const port = Number(process.env.PORT || 3000)

app.listen(port, ({ port }) => {
  console.log(`🚀 Server ready at http://localhost:${port}`)
  if (serveClientAssets) {
    console.log(`🪄 Serving client assets from ${clientDir}`)
  } else {
    console.log('🛰️ SERVE_CLIENT disabled - running in API-only mode')
  }

  if (servePublicAssets) {
    console.log(`📁 Public assets directory: ${publicDir}`)
  }

  console.log(`📂 Uploads directory: ${UPLOAD_DIR}`)
})

export type MyWeiboApp = typeof app
