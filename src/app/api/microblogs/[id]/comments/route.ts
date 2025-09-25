import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const { content } = await request.json()

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

    // 创建评论
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        microblogId: id
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