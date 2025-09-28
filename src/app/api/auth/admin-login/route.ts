import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { createSession } from '@/lib/session'
import { verifyPassword } from '@/lib/password'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { message: '用户名和密码不能为空' },
        { status: 400 }
      )
    }

    // 查找管理员用户
    const user = await db.user.findFirst({
      where: {
        username,
        isAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: '管理员用户不存在' },
        { status: 401 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { message: '管理员密码未设置' },
        { status: 500 }
      )
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      )
    }

    await createSession(user.id)

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { message: '登录失败' },
      { status: 500 }
    )
  }
}
