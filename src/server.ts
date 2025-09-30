import { Elysia } from 'elysia'
import { cookie } from '@elysiajs/cookie'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

import { db } from '@/lib/db'
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

          const user = await db.user.findFirst({
            where: {
              username,
              isAdmin: true,
            },
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

          let user = await db.user.findUnique({ where: { email: normalizedEmail } })

          if (!user) {
            if (normalizedUsername) {
              const usernameTaken = await db.user.findUnique({ where: { username: normalizedUsername } })
              if (usernameTaken) {
                set.status = 409
                return { message: '用户名已被占用' }
              }
            }

            const hashedPassword = await hashPassword(password)
            const usernameForCreate = normalizedUsername || normalizedEmail.split('@')[0]

            user = await db.user.create({
              data: {
                username: usernameForCreate,
                email: normalizedEmail,
                password: hashedPassword,
                isAdmin: false,
              },
            })

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
            user = await db.user.update({
              where: { id: user.id },
              data: {
                password: hashedPassword,
                username: normalizedUsername || user.username,
              },
            })
          } else {
            const isValid = await verifyPassword(password, user.password)

            if (!isValid) {
              set.status = 401
              return { message: '邮箱或密码不正确' }
            }

            if (normalizedUsername && normalizedUsername !== user.username) {
              const usernameTaken = await db.user.findUnique({ where: { username: normalizedUsername } })
              if (usernameTaken && usernameTaken.id !== user.id) {
                set.status = 409
                return { message: '用户名已被占用' }
              }

              user = await db.user.update({
                where: { id: user.id },
                data: {
                  username: normalizedUsername,
                },
              })
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
          const whereClause = search
            ? {
                OR: [
                  {
                    content: {
                      contains: search,
                    },
                  },
                ],
              }
            : {}

          const microblogs = await db.microblog.findMany({
            where: whereClause,
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  isAdmin: true,
                },
              },
              images: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
              likes: {
                select: {
                  id: true,
                  userId: true,
                  createdAt: true,
                },
              },
              comments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      isAdmin: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          })

          return microblogs
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

          const { content, images } = body as {
            content?: string
            images?: Array<{ url: string; altText?: string | null }>
          }

          if (!content && (!images || images.length === 0)) {
            set.status = 400
            return { error: 'Content or images are required' }
          }

          const microblog = await db.microblog.create({
            data: {
              content: content || '',
              userId: sessionUser.id,
              images: images
                ? {
                    create: images.map((img) => ({
                      url: img.url,
                      altText: img.altText ?? null,
                    })),
                  }
                : undefined,
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  isAdmin: true,
                },
              },
              images: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
              likes: {
                select: {
                  id: true,
                  userId: true,
                  createdAt: true,
                },
              },
              comments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      isAdmin: true,
                    },
                  },
                },
              },
            },
          })

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

          const microblog = await db.microblog.findUnique({
            where: { id },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  isAdmin: true,
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

          const result = await db.$transaction(async (tx) => {
            if (Array.isArray(deletedImageIds) && deletedImageIds.length > 0) {
              await tx.image.deleteMany({
                where: {
                  id: {
                    in: deletedImageIds,
                  },
                  microblogId: id,
                },
              })
            }

            if (Array.isArray(newImages) && newImages.length > 0) {
              await tx.image.createMany({
                data: newImages.map((img) => ({
                  url: img.url,
                  altText: img.altText ?? null,
                  microblogId: id,
                })),
              })
            }

            return tx.microblog.update({
              where: { id },
              data: {
                content: content.trim(),
                updatedAt: new Date(),
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    isAdmin: true,
                  },
                },
                images: {
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
                likes: {
                  select: {
                    id: true,
                    userId: true,
                    createdAt: true,
                  },
                },
                comments: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        isAdmin: true,
                      },
                    },
                  },
                },
              },
            })
          })

          return result
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

          const microblog = await db.microblog.findUnique({
            where: { id },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  isAdmin: true,
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

          await db.microblog.delete({ where: { id } })
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

          const microblog = await db.microblog.findUnique({ where: { id } })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          const existingLike = await db.like.findUnique({
            where: {
              microblogId_userId: {
                microblogId: id,
                userId: sessionUser.id,
              },
            },
          })

          if (existingLike) {
            await db.like.delete({ where: { id: existingLike.id } })
            return { liked: false }
          }

          const like = await db.like.create({
            data: {
              microblogId: id,
              userId: sessionUser.id,
            },
          })

          return { liked: true, like }
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

          await db.like.deleteMany({ where: { microblogId: id } })
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

          const microblog = await db.microblog.findUnique({ where: { id } })

          if (!microblog) {
            set.status = 404
            return { error: 'Microblog not found' }
          }

          const comments = await db.comment.findMany({
            where: { microblogId: id },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  isAdmin: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          })

          return comments
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

          const microblog = await db.microblog.findUnique({ where: { id } })

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

          const comment = await db.comment.create({
            data: {
              content: content.trim(),
              microblogId: id,
              userId,
              guestName: guestName || null,
              guestEmail: guestEmail || null,
            },
            include: {
              user: {
                select: {
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

          const comment = await db.comment.findUnique({
            where: { id },
            include: {
              user: {
                select: {
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

          const updatedComment = await db.comment.update({
            where: { id },
            data: {
              content: content.trim(),
            },
            include: {
              user: {
                select: {
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

          const comment = await db.comment.findUnique({
            where: { id },
            select: {
              id: true,
              userId: true,
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

          await db.comment.delete({ where: { id } })
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

          if (image.size > 5 * 1024 * 1024) {
            set.status = 400
            return { error: 'File size must be less than 5MB' }
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

function resolveClientDir() {
  const candidates: string[] = []

  const envPath = process.env.CLIENT_ASSETS_DIR?.trim()
  if (envPath) {
    candidates.push(envPath.startsWith('/') ? envPath : join(process.cwd(), envPath))
  }

  candidates.push(
    join(process.cwd(), 'build', 'client'),
    join(process.cwd(), 'dist', 'client'),
    join(process.cwd(), 'dist')
  )

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return join(process.cwd(), 'build', 'client')
}

const clientDir = resolveClientDir()
const publicDir = join(process.cwd(), 'public')

await ensureUploadDir()

app.use(staticPlugin({ assets: clientDir, prefix: '/' }))
app.use(staticPlugin({ assets: publicDir, prefix: '/' }))
app.use(staticPlugin({ assets: UPLOAD_DIR, prefix: '/uploads' }))

app.get('*', async () => {
  const indexFile = join(clientDir, 'index.html')
  const file = Bun.file(indexFile)

  if (await file.exists()) {
    return new Response(file, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  const fallback = Bun.file(join(publicDir, 'index.html'))
  if (await fallback.exists()) {
    return new Response(fallback, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  return new Response('Client build not found. Run `bun run build` first.', {
    status: 404,
  })
})

const port = Number(process.env.PORT || 3000)

app.listen(port, ({ port }) => {
  console.log(`🚀 Server ready at http://localhost:${port}`)
})

export type MyWeiboApp = typeof app
