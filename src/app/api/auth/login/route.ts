import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { username, email } = await request.json()

    if (!username || !email) {
      return NextResponse.json(
        { message: '用户名和邮箱不能为空' },
        { status: 400 }
      )
    }

    // 检查用户是否已存在
    let user = await db.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })

    // 如果用户不存在，创建新用户
    if (!user) {
      user = await db.user.create({
        data: {
          username,
          email,
          isAdmin: false
        }
      })
    }

    // 返回用户信息（不包含密码）
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: '登录失败' },
      { status: 500 }
    )
  }
}