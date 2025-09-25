import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    let whereClause = {}
    
    if (search && search.trim()) {
      whereClause = {
        OR: [
          {
            content: {
              contains: search.trim()
            }
          }
        ]
      }
    }
    
    const microblogs = await db.microblog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
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
        likes: {
          select: {
            id: true,
            createdAt: true
          }
        },
        comments: {
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
        }
      }
    })

    return NextResponse.json(microblogs)
  } catch (error) {
    console.error('Error fetching microblogs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch microblogs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, images, userId } = await request.json()

    if (!content && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Content or images are required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User must be logged in to create microblog' },
        { status: 401 }
      )
    }

    // 验证用户存在
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 创建微博
    const microblog = await db.microblog.create({
      data: {
        content: content || '',
        userId,
        images: images ? {
          create: images.map((img: any) => ({
            url: img.url,
            altText: img.altText || null
          }))
        } : undefined
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

    return NextResponse.json(microblog, { status: 201 })
  } catch (error) {
    console.error('Error creating microblog:', error)
    return NextResponse.json(
      { error: 'Failed to create microblog' },
      { status: 500 }
    )
  }
}