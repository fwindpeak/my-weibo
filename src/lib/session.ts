import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

import { db } from '@/lib/db'

const SESSION_COOKIE_NAME = 'my_weibo_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await db.session.deleteMany({ where: { userId } })

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      },
    },
  })

  if (!session) {
    cookieStore.delete({ name: SESSION_COOKIE_NAME, path: '/' })
    return null
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { token } })
    cookieStore.delete({ name: SESSION_COOKIE_NAME, path: '/' })
    return null
  }

  return session
}

export async function getSessionUser() {
  const session = await getSession()
  return session?.user ?? null
}

export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await db.session.deleteMany({ where: { token } })
  }

  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: '/' })
}
