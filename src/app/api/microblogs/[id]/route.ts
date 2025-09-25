import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content, userId } = await request.json()

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be logged in to edit microblog' },
        { status: 401 }
      )
    }

    // 检查微博是否存在
    const microblog = await db.microblog.findUnique({
      where: { id },
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

    if (!microblog) {
      return NextResponse.json(
        { error: 'Microblog not found' },
        { status: 404 }
      )
    }

    // 检查用户是否有权限编辑（只有作者可以编辑）
    if (microblog.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own microblogs' },
        { status: 403 }
      )
    }

    // 更新微博
    const updatedMicroblog = await db.microblog.update({
      where: { id },
      data: {
        content: content.trim(),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isAdmin: true
          }
        },
        images: true,
        likes: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                isAdmin: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedMicroblog)
  } catch (error) {
    console.error('Error updating microblog:', error)
    return NextResponse.json(
      { error: 'Failed to update microblog' },
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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be logged in to delete microblog' },
        { status: 401 }
      )
    }

    // 检查微博是否存在
    const microblog = await db.microblog.findUnique({
      where: { id },
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

    if (!microblog) {
      return NextResponse.json(
        { error: 'Microblog not found' },
        { status: 404 }
      )
    }

    // 检查用户是否有权限删除（只有作者可以删除）
    if (microblog.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own microblogs' },
        { status: 403 }
      )
    }

    // 删除微博（级联删除相关的图片、点赞和评论）
    await db.microblog.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Microblog deleted successfully' })
  } catch (error) {
    console.error('Error deleting microblog:', error)
    return NextResponse.json(
      { error: 'Failed to delete microblog' },
      { status: 500 }
    )
  }
}