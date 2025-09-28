import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 检查微博是否存在
    const microblog = await db.microblog.findUnique({
      where: { id }
    })

    if (!microblog) {
      return NextResponse.json(
        { error: 'Microblog not found' },
        { status: 404 }
      )
    }

    // 获取评论列表
    const comments = await db.comment.findMany({
      where: { microblogId: id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser()
    const { content, guestName, guestEmail } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // 检查微博是否存在
    const microblog = await db.microblog.findUnique({
      where: { id }
    })

    if (!microblog) {
      return NextResponse.json(
        { error: 'Microblog not found' },
        { status: 404 }
      )
    }

    let userId: string | null = null
    if (sessionUser) {
      userId = sessionUser.id
    } else if (guestName && guestEmail) {
      // 游客评论，验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(guestEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Either session or guestName and guestEmail are required' },
        { status: 400 }
      )
    }

    // 创建评论
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        microblogId: id,
        userId,
        guestName: guestName || null,
        guestEmail: guestEmail || null
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true
          }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
