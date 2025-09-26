import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    // 简单的密码验证（实际项目中应该使用bcrypt等加密方式）
    if (user.password !== password) {
      return NextResponse.json(
        { message: '密码错误' },
        { status: 401 }
      )
    }

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
