'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Image as ImageIcon, Send } from 'lucide-react'

interface Microblog {
  id: string
  content: string
  images: { id: string; url: string; altText?: string }[]
  likes: { id: string }[]
  comments: { id: string; content: string; createdAt: string }[]
  createdAt: string
}

export default function Home() {
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [microblogs, setMicroblogs] = useState<Microblog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({})
  const [expandedComments, setExpandedComments] = useState<{[key: string]: boolean}>({})
  const [commentLoading, setCommentLoading] = useState<{[key: string]: boolean}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 加载微博列表
  useEffect(() => {
    fetchMicroblogs()
  }, [])

  const fetchMicroblogs = async () => {
    try {
      const response = await fetch('/api/microblogs')
      if (response.ok) {
        const data = await response.json()
        setMicroblogs(data)
      }
    } catch (error) {
      console.error('Error fetching microblogs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) return

    setIsSubmitting(true)
    try {
      // 上传图片并获取URL
      const imageUrls = []
      for (const file of selectedImages) {
        const formData = new FormData()
        formData.append('image', file)
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const data = await response.json()
          imageUrls.push({
            url: data.url,
            altText: file.name
          })
        }
      }

      // 创建微博
      const response = await fetch('/api/microblogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          images: imageUrls
        }),
      })

      if (response.ok) {
        const newMicroblog = await response.json()
        setMicroblogs(prev => [newMicroblog, ...prev])
        setContent('')
        setSelectedImages([])
      } else {
        console.error('Failed to create microblog')
      }
    } catch (error) {
      console.error('Error submitting microblog:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async (microblogId: string) => {
    try {
      const response = await fetch(`/api/microblogs/${microblogId}/like`, {
        method: 'POST'
      })

      if (response.ok) {
        // 更新本地状态
        setMicroblogs(prev => prev.map(blog => 
          blog.id === microblogId 
            ? { ...blog, likes: [...blog.likes, { id: Date.now().toString() }] }
            : blog
        ))
      }
    } catch (error) {
      console.error('Error liking microblog:', error)
    }
  }

  const handleCommentInput = (microblogId: string, value: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [microblogId]: value
    }))
  }

  const toggleComments = (microblogId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [microblogId]: !prev[microblogId]
    }))
  }

  const handleSubmitComment = async (microblogId: string) => {
    const commentContent = commentInputs[microblogId]
    if (!commentContent || !commentContent.trim()) return

    try {
      setCommentLoading(prev => ({ ...prev, [microblogId]: true }))
      
      const response = await fetch(`/api/microblogs/${microblogId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentContent.trim()
        }),
      })

      if (response.ok) {
        const newComment = await response.json()
        
        // 更新本地状态
        setMicroblogs(prev => prev.map(blog => 
          blog.id === microblogId 
            ? { ...blog, comments: [...blog.comments, newComment] }
            : blog
        ))

        // 清空输入框
        setCommentInputs(prev => ({
          ...prev,
          [microblogId]: ''
        }))
      } else {
        console.error('Failed to create comment')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setCommentLoading(prev => ({ ...prev, [microblogId]: false }))
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`
    
    // 超过一周显示具体日期
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    
    // 如果是今年，不显示年份
    if (year === now.getFullYear()) {
      return `${month}月${day}日 ${hour}:${minute}`
    }
    
    return `${year}年${month}月${day}日 ${hour}:${minute}`
  }

  const formatFullTime = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        {/* 头部 */}
        <header className="py-6 sm:py-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            我的微博
          </h1>
          <p className="text-muted-foreground text-center mt-2 text-sm sm:text-base">
            记录生活点滴，分享精彩瞬间
          </p>
        </header>

        {/* 发布区域 */}
        <Card className="mb-6 sm:mb-8 shadow-lg border-primary/20 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              发布新微博
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="分享你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-primary/20 focus:border-primary/40 transition-colors"
              maxLength={200}
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button variant="outline" size="sm" asChild className="hover:bg-primary/10">
                    <span className="cursor-pointer">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      添加图片
                    </span>
                  </Button>
                </label>
                <Badge variant="secondary" className="text-xs">
                  {content.length}/200
                </Badge>
                {selectedImages.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedImages.length} 张图片
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatFullTime(new Date().toISOString())}
                </span>
              </div>
              <Button 
                onClick={handleSubmit} 
                disabled={!content.trim() && selectedImages.length === 0 || isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                发布
              </Button>
            </div>
            
            {/* 预览选中的图片 */}
            {selectedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`预览 ${index + 1}`}
                      className="w-full h-20 sm:h-24 object-cover rounded-lg border-2 border-border group-hover:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                    <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 微博列表 */}
        <div className="space-y-4 sm:space-y-6">
          {isLoading ? (
            <Card className="animate-pulse">
              <CardContent className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </CardContent>
            </Card>
          ) : microblogs.length === 0 ? (
            <Card className="border-dashed border-2 border-muted-foreground/20">
              <CardContent className="py-16 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-2">还没有微博</p>
                <p className="text-muted-foreground/70 text-sm">快来发布第一条吧！</p>
              </CardContent>
            </Card>
          ) : (
            microblogs.map((microblog) => (
              <Card 
                key={microblog.id} 
                className="hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/20"
              >
                <CardContent className="pt-6">
                  <p className="text-sm mb-4 whitespace-pre-wrap leading-relaxed">
                    {microblog.content}
                  </p>
                  
                  {/* 图片展示 */}
                  {microblog.images.length > 0 && (
                    <div className={`grid gap-3 mb-4 ${
                      microblog.images.length === 1 ? 'grid-cols-1' :
                      microblog.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2 sm:grid-cols-3'
                    }`}>
                      {microblog.images.map((image) => (
                        <div key={image.id} className="relative group overflow-hidden rounded-lg">
                          <img
                            src={image.url}
                            alt={image.altText}
                            className="w-full h-48 sm:h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 互动区域 */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-3 border-t border-border">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(microblog.id)}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors group"
                        title="点赞"
                      >
                        <Heart className="w-4 h-4 group-hover:fill-current" />
                        {microblog.likes.length > 0 && (
                          <span className="text-xs">{microblog.likes.length}</span>
                        )}
                      </button>
                      <button 
                        onClick={() => toggleComments(microblog.id)}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors group"
                        title="评论"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {microblog.comments.length > 0 && (
                          <span className="text-xs">{microblog.comments.length}</span>
                        )}
                      </button>
                    </div>
                    <span 
                      className="text-xs cursor-help hover:text-foreground transition-colors"
                      title={`发布时间：${formatFullTime(microblog.createdAt)}`}
                    >
                      {formatTime(microblog.createdAt)}
                    </span>
                  </div>

                  {/* 评论区域 */}
                  {expandedComments[microblog.id] && (
                    <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-300">
                      {/* 评论列表 */}
                      {microblog.comments.length > 0 && (
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                          {microblog.comments.map((comment) => (
                            <div key={comment.id} className="bg-muted/30 p-3 rounded-lg text-sm">
                              <p className="text-foreground leading-relaxed">{comment.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <span 
                                  className="cursor-help hover:text-foreground transition-colors"
                                  title={`评论时间：${formatFullTime(comment.createdAt)}`}
                                >
                                  {formatTime(comment.createdAt)}
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 评论输入 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="写下你的评论..."
                          value={commentInputs[microblog.id] || ''}
                          onChange={(e) => handleCommentInput(microblog.id, e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSubmitComment(microblog.id)
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleSubmitComment(microblog.id)}
                          disabled={!commentInputs[microblog.id]?.trim() || commentLoading[microblog.id]}
                          size="sm"
                          className="px-4"
                        >
                          {commentLoading[microblog.id] ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            '发送'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}