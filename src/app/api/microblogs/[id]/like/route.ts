import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
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

    // 创建点赞
    const like = await db.like.create({
      data: {
        microblogId: id
      }
    })

    return NextResponse.json(like, { status: 201 })
  } catch (error) {
    console.error('Error liking microblog:', error)
    return NextResponse.json(
      { error: 'Failed to like microblog' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 删除所有对该微博的点赞（简化版本，实际应用中可能需要根据用户ID删除特定点赞）
    await db.like.deleteMany({
      where: { microblogId: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unliking microblog:', error)
    return NextResponse.json(
      { error: 'Failed to unlike microblog' },
      { status: 500 }
    )
  }
}