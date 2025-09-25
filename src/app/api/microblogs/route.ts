import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const microblogs = await db.microblog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        images: true,
        likes: {
          select: {
            id: true,
            createdAt: true
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true
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
    const { content, images } = await request.json()

    if (!content && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Content or images are required' },
        { status: 400 }
      )
    }

    // 创建微博
    const microblog = await db.microblog.create({
      data: {
        content: content || '',
        images: images ? {
          create: images.map((img: any) => ({
            url: img.url,
            altText: img.altText || null
          }))
        } : undefined
      },
      include: {
        images: true,
        likes: true,
        comments: true
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