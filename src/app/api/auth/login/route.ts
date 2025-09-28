import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createSession } from '@/lib/session'
import { hashPassword, verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username?.trim()

    let user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      if (normalizedUsername) {
        const usernameTaken = await db.user.findUnique({ where: { username: normalizedUsername } })
        if (usernameTaken) {
          return NextResponse.json(
            { message: '用户名已被占用' },
            { status: 409 }
          )
        }
      }

      const hashedPassword = await hashPassword(password)
      const usernameForCreate = normalizedUsername || normalizedEmail.split('@')[0]

      user = await db.user.create({
        data: {
          username: usernameForCreate,
          email: normalizedEmail,
          password: hashedPassword,
          isAdmin: false
        }
      })

      await createSession(user.id)

      const { password: _, ...userWithoutPassword } = user
      return NextResponse.json(userWithoutPassword, { status: 201 })
    }

    if (user.isAdmin) {
      return NextResponse.json(
        { message: '请使用管理员登录入口' },
        { status: 403 }
      )
    }

    if (!user.password) {
      const hashedPassword = await hashPassword(password)
      user = await db.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          username: normalizedUsername || user.username,
        }
      })
    } else {
      const isValid = await verifyPassword(password, user.password)

      if (!isValid) {
        return NextResponse.json(
          { message: '邮箱或密码不正确' },
          { status: 401 }
        )
      }

      if (normalizedUsername && normalizedUsername !== user.username) {
        const usernameTaken = await db.user.findUnique({ where: { username: normalizedUsername } })
        if (usernameTaken && usernameTaken.id !== user.id) {
          return NextResponse.json(
            { message: '用户名已被占用' },
            { status: 409 }
          )
        }

        user = await db.user.update({
          where: { id: user.id },
          data: {
            username: normalizedUsername,
          }
        })
      }
    }

    await createSession(user.id)

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: '登录失败' },
      { status: 500 }
    )
  }
}
