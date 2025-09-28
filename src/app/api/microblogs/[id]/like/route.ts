import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'User must be logged in to like microblog' },
        { status: 401 }
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

    const existingLike = await db.like.findUnique({
      where: {
        microblogId_userId: {
          microblogId: id,
          userId: sessionUser.id,
        }
      }
    })

    if (existingLike) {
      await db.like.delete({ where: { id: existingLike.id } })
      return NextResponse.json({ liked: false })
    }

    const like = await db.like.create({
      data: {
        microblogId: id,
        userId: sessionUser.id,
      }
    })

    return NextResponse.json({ liked: true, like })
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
    const sessionUser = await getSessionUser()

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'User must be logged in to remove likes' },
        { status: 401 }
      )
    }

    if (!sessionUser.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can clear likes' },
        { status: 403 }
      )
    }

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
