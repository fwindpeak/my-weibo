import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { content, userId } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be logged in to edit comment' },
        { status: 401 },
      )
    }

    const requestingUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAdmin: true,
      },
    })

    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const comment = await db.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (!requestingUser.isAdmin && comment.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 },
      )
    }

    const updatedComment = await db.comment.update({
      where: { id },
      data: {
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isAdmin: true,
          },
        },
      },
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be logged in to delete comment' },
        { status: 401 },
      )
    }

    const requestingUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAdmin: true,
      },
    })

    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const comment = await db.comment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (!requestingUser.isAdmin && comment.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 },
      )
    }

    await db.comment.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 },
    )
  }
}

