'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Heart, MessageCircle, Image as ImageIcon, Send, Eye, Edit3, Search, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import dynamic from 'next/dynamic'
import LoginModal from '@/components/auth/login-modal'
import UserInfo from '@/components/auth/user-info'
import MonacoEditorWrapper from '@/components/ui/monaco-editor-wrapper'

interface Microblog {
  id: string
  content: string
  images: { id: string; url: string; altText?: string }[]
  likes: { id: string }[]
  comments: { 
    id: string; 
    content: string; 
    createdAt: string;
    user?: {
      id: string;
      username: string;
      isAdmin: boolean;
    };
    guestName?: string;
    guestEmail?: string;
  }[]
  createdAt: string
  user?: {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
  }
}

interface User {
  id: string
  username: string
  email: string
  isAdmin: boolean
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
  const [previewMode, setPreviewMode] = useState<{[key: string]: boolean}>({})
  const [showPreview, setShowPreview] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [commentLoginModal, setCommentLoginModal] = useState<{[key: string]: boolean}>({})
  const [editingMicroblog, setEditingMicroblog] = useState<{[key: string]: boolean}>({})
  const [editingContent, setEditingContent] = useState<{[key: string]: string}>({})
  const [commentGuestInfo, setCommentGuestInfo] = useState<{[key: string]: {name: string; email: string}}>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // 加载微博列表
  useEffect(() => {
    fetchMicroblogs()
  }, [])

  const fetchMicroblogs = async (search?: string) => {
    try {
      setIsLoading(true)
      const url = search ? `/api/microblogs?search=${encodeURIComponent(search)}` : '/api/microblogs'
      const response = await fetch(url)
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

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.trim()) {
      setIsSearching(true)
      await fetchMicroblogs(term)
    } else {
      setIsSearching(false)
      await fetchMicroblogs()
    }
  }

  const clearSearch = async () => {
    setSearchTerm('')
    setIsSearching(false)
    await fetchMicroblogs()
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

    // 检查用户是否登录
    if (!user) {
      setShowLoginModal(true)
      return
    }

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
          images: imageUrls,
          userId: user.id
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

    // 如果是登录用户，直接提交
    if (user) {
      try {
        setCommentLoading(prev => ({ ...prev, [microblogId]: true }))
        
        const response = await fetch(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentContent.trim(),
            userId: user.id
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
    } else {
      // 游客评论，检查是否填写了用户名和邮箱
      const guestInfo = commentGuestInfo[microblogId]
      if (!guestInfo?.name?.trim() || !guestInfo?.email?.trim()) {
        alert('请填写用户名和邮箱')
        return
      }

      try {
        setCommentLoading(prev => ({ ...prev, [microblogId]: true }))
        
        const response = await fetch(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentContent.trim(),
            guestName: guestInfo.name.trim(),
            guestEmail: guestInfo.email.trim()
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

          // 清空输入框和游客信息
          setCommentInputs(prev => ({
            ...prev,
            [microblogId]: ''
          }))
          setCommentGuestInfo(prev => ({
            ...prev,
            [microblogId]: { name: '', email: '' }
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
  }

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser)
    // 清理所有评论登录模态框状态
    setCommentLoginModal({})
  }

  const handleLogout = () => {
    setUser(null)
  }

  const togglePreview = (microblogId: string) => {
    setPreviewMode(prev => ({
      ...prev,
      [microblogId]: !prev[microblogId]
    }))
  }

  const startEditing = (microblogId: string, content: string) => {
    setEditingMicroblog(prev => ({ ...prev, [microblogId]: true }))
    setEditingContent(prev => ({ ...prev, [microblogId]: content }))
  }

  const cancelEditing = (microblogId: string) => {
    setEditingMicroblog(prev => ({ ...prev, [microblogId]: false }))
    setEditingContent(prev => ({ ...prev, [microblogId]: '' }))
  }

  const handleEditContentChange = (microblogId: string, value: string) => {
    setEditingContent(prev => ({ ...prev, [microblogId]: value }))
  }

  const saveEdit = async (microblogId: string) => {
    try {
      const response = await fetch(`/api/microblogs/${microblogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editingContent[microblogId],
          userId: user?.id
        }),
      })

      if (response.ok) {
        const updatedMicroblog = await response.json()
        setMicroblogs(prev => prev.map(blog => 
          blog.id === microblogId ? updatedMicroblog : blog
        ))
        setEditingMicroblog(prev => ({ ...prev, [microblogId]: false }))
        setEditingContent(prev => ({ ...prev, [microblogId]: '' }))
      } else {
        console.error('Failed to update microblog')
      }
    } catch (error) {
      console.error('Error updating microblog:', error)
    }
  }

  const handleCommentGuestInfoChange = (microblogId: string, field: 'name' | 'email', value: string) => {
    setCommentGuestInfo(prev => ({
      ...prev,
      [microblogId]: {
        ...(prev[microblogId] || { name: '', email: '' }),
        [field]: value
      }
    }))
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
          
          {/* 搜索功能 */}
          <div className="mt-6 max-w-md mx-auto">
            {showSearch ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="搜索微博内容..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSearch(false)}
                  className="h-9 w-9 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(true)}
                className="text-xs"
              >
                <Search className="h-3 w-3 mr-2" />
                搜索微博
              </Button>
            )}
          </div>
          
          {/* 搜索状态提示 */}
          {isSearching && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                搜索结果: "{searchTerm}"
              </Badge>
            </div>
          )}
        </header>

        {/* 用户信息 */}
        <UserInfo 
          user={user} 
          onLogout={handleLogout}
          onShowLogin={() => setShowLoginModal(true)}
        />

        {/* 发布区域 - 只有管理员才能发表微博 */}
        {user && user.isAdmin && (
          <Card className="mb-4 sm:mb-6 shadow-md border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                发布新微博
                <Badge variant="outline" className="text-xs ml-auto">
                  支持 Markdown
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 编辑器区域 */}
              <div className="space-y-2">
                {!showPreview ? (
                  <Textarea
                    placeholder="分享你的想法..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[120px] resize-none border-primary/20 focus:border-primary/40 transition-colors font-mono text-base"
                  />
                ) : (
                  <div className="min-h-[120px] p-3 border border-primary/20 rounded-lg bg-muted/20 prose prose-sm max-w-none dark:prose-invert">
                    {content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                      >
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground text-sm">预览区域，输入内容后将显示渲染效果...</p>
                    )}
                  </div>
                )}
              
              {/* 编辑器工具栏 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Markdown
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 预览切换图标 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    {showPreview ? (
                      <Edit3 className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  
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
                  {selectedImages.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedImages.length} 张图片
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatFullTime(new Date().toISOString())}
                  </span>
                </div>
              </div>
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

            {/* 发布按钮 */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmit} 
                disabled={!content.trim() && selectedImages.length === 0 || isSubmitting}
                className="px-6"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                发布微博
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

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
            <Card className="border-dashed border-2 border-muted-foreground/20 bg-gradient-to-br from-background to-muted/10">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-muted-foreground text-lg mb-2">
                  {isSearching ? '没有找到相关微博' : '还没有微博'}
                </p>
                <p className="text-muted-foreground/70 text-sm mb-4">
                  {isSearching ? '试试其他关键词吧！' : '快来发布第一条吧！'}
                </p>
                {!isSearching && (
                  <div className="text-xs text-muted-foreground/50">
                    支持 Markdown 格式，可以插入图片、代码块等
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            microblogs.map((microblog) => (
              <Card 
                key={microblog.id} 
                className="hover:shadow-md transition-all duration-300 border-primary/10 hover:border-primary/20 bg-gradient-to-br from-background to-muted/5"
              >
                <CardContent className="pt-4 pb-4">
                  {/* 内容显示区域 */}
                  <div className="mb-3">
                    {editingMicroblog[microblog.id] ? (
                      <div className="space-y-3">
                        {/* 编辑器区域 */}
                        <MonacoEditorWrapper
                          value={editingContent[microblog.id]}
                          onChange={(value) => handleEditContentChange(microblog.id, value)}
                          height="120px"
                          language="markdown"
                        />
                        
                        {/* 编辑工具栏 */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelEditing(microblog.id)}
                            className="text-xs"
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(microblog.id)}
                            className="text-xs"
                            disabled={!editingContent[microblog.id]?.trim()}
                          >
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 默认显示HTML渲染结果 */}
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {microblog.content}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 图片展示 */}
                  {microblog.images.length > 0 && (
                    <div className={`grid gap-2 mb-3 ${
                      microblog.images.length === 1 ? 'grid-cols-1' :
                      microblog.images.length === 2 ? 'grid-cols-2' :
                      'grid-cols-2 sm:grid-cols-3'
                    }`}>
                      {microblog.images.map((image) => (
                        <div key={image.id} className="relative group overflow-hidden rounded-lg">
                          <img
                            src={image.url}
                            alt={image.altText}
                            className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 互动区域 */}
                  <div className="flex items-center justify-between text-base text-muted-foreground pt-2 border-t border-border/50">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(microblog.id)}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors group"
                        title="点赞"
                      >
                        <Heart className="w-4 h-4 group-hover:fill-current transition-all" />
                        {microblog.likes.length > 0 && (
                          <span className="text-xs font-medium">{microblog.likes.length}</span>
                        )}
                      </button>
                      <button 
                        onClick={() => toggleComments(microblog.id)}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors group"
                        title="评论"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {microblog.comments.length > 0 && (
                          <span className="text-xs font-medium">{microblog.comments.length}</span>
                        )}
                      </button>
                    </div>
                    <span 
                      className="text-xs cursor-help hover:text-foreground transition-colors font-medium"
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
                              {/* 评论用户信息 */}
                              <div className="flex items-center gap-2 mb-2">
                                {comment.user ? (
                                  <>
                                    <span className="font-medium text-xs text-foreground">
                                      {comment.user.username}
                                    </span>
                                    {comment.user.isAdmin && (
                                      <Badge variant="secondary" className="text-xs">
                                        管理员
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-xs text-foreground">
                                      {comment.guestName}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      游客
                                    </Badge>
                                  </>
                                )}
                              </div>
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

                      {/* 评论输入区域 */}
                      {!user ? (
                        // 游客评论 - 需要填写用户名和邮箱
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="你的名字"
                              value={commentGuestInfo[microblog.id]?.name || ''}
                              onChange={(e) => handleCommentGuestInfoChange(microblog.id, 'name', e.target.value)}
                              className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                            />
                            <input
                              type="email"
                              placeholder="你的邮箱"
                              value={commentGuestInfo[microblog.id]?.email || ''}
                              onChange={(e) => handleCommentGuestInfoChange(microblog.id, 'email', e.target.value)}
                              className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="写下你的评论..."
                              value={commentInputs[microblog.id] || ''}
                              onChange={(e) => handleCommentInput(microblog.id, e.target.value)}
                              className="flex-1 px-3 py-2 text-base border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSubmitComment(microblog.id)
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleSubmitComment(microblog.id)}
                              disabled={
                                !commentInputs[microblog.id]?.trim() || 
                                !commentGuestInfo[microblog.id]?.name?.trim() || 
                                !commentGuestInfo[microblog.id]?.email?.trim() ||
                                commentLoading[microblog.id]
                              }
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
                      ) : (
                        // 登录用户评论
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="写下你的评论..."
                            value={commentInputs[microblog.id] || ''}
                            onChange={(e) => handleCommentInput(microblog.id, e.target.value)}
                            className="flex-1 px-3 py-2 text-base border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
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
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 登录模态框 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      {/* 评论登录模态框 */}
      {Object.entries(commentLoginModal).map(([microblogId, isOpen]) => (
        <LoginModal
          key={microblogId}
          isOpen={isOpen}
          onClose={() => setCommentLoginModal(prev => ({ ...prev, [microblogId]: false }))}
          onLogin={handleLogin}
        />
      ))}
    </div>
  )
}