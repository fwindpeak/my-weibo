import { randomBytes } from 'crypto'
import { eq } from '@/lib/drizzle'

import { db } from '@/lib/db'
import { sessions } from '@/lib/schema'

export const SESSION_COOKIE_NAME = 'my_weibo_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type CookieValues = Record<string, unknown>
export type SetCookieFn = (name: string, value: string, options?: any) => void
export type RemoveCookieFn = ((name: string) => void) | undefined

export interface SessionCookieContext {
  setCookie?: SetCookieFn
  set?: {
    headers?: Record<string, string | string[]> | Headers
  }
}

function buildCookieHeader(token: string) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    'HttpOnly',
  ]

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function setSessionCookie(context: SessionCookieContext, token: string) {
  if (typeof context.setCookie === 'function') {
    context.setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return
  }

  if (!context.set) {
    console.warn('Session cookie could not be set: missing setCookie helper')
    return
  }

  let headers = context.set.headers ?? {}

  if (headers instanceof Headers) {
    const record: Record<string, string | string[]> = {}
    headers.forEach((value, key) => {
      record[key] = value
    })
    headers = record
  }

  const headerValue = buildCookieHeader(token)
  const existing = headers['Set-Cookie']

  if (Array.isArray(existing)) {
    existing.push(headerValue)
    headers['Set-Cookie'] = existing
  } else if (typeof existing === 'string' && existing.length > 0) {
    headers['Set-Cookie'] = [existing, headerValue]
  } else {
    headers['Set-Cookie'] = headerValue
  }

  context.set.headers = headers
}

function normalizeCookieValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    if ('value' in value && typeof (value as { value?: unknown }).value === 'string') {
      return (value as { value: string }).value
    }

    if (
      'initial' in value &&
      typeof (value as { initial?: { value?: unknown } }).initial?.value === 'string'
    ) {
      return (value as { initial: { value: string } }).initial.value
    }
  }

  return undefined
}

export async function createSession(context: SessionCookieContext, userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await db.delete(sessions).where(eq(sessions.userId, userId))
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt,
  })

  setSessionCookie(context, token)
  return token
}

export async function getSessionUser(cookie: CookieValues, removeCookie: RemoveCookieFn) {
  const token = normalizeCookieValue(cookie[SESSION_COOKIE_NAME])

  if (!token) {
    return null
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: {
      user: {
        columns: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
        },
      },
    },
  })

  if (!session || !session.user) {
    if (typeof removeCookie === 'function') {
      removeCookie(SESSION_COOKIE_NAME)
    }
    return null
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token))
    if (typeof removeCookie === 'function') {
      removeCookie(SESSION_COOKIE_NAME)
    }
    return null
  }

  return session.user
}

export async function clearSession(cookie: CookieValues, removeCookie: RemoveCookieFn) {
  const token = normalizeCookieValue(cookie[SESSION_COOKIE_NAME])

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }

  if (typeof removeCookie === 'function') {
    removeCookie(SESSION_COOKIE_NAME)
  }
}
