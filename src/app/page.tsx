'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import 'highlight.js/styles/github.css'
import LoginModal from '@/components/auth/login-modal'
import UserInfo from '@/components/auth/user-info'
import HomeHeader from './_components/home-header'
import CreateMicroblogCard from './_components/create-microblog-card'
import MicroblogList from './_components/microblog-list'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

export default function Home() {
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [microblogs, setMicroblogs] = useState<Microblog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [commentLoginModal, setCommentLoginModal] = useState<Record<string, boolean>>({})
  const [editingMicroblog, setEditingMicroblog] = useState<Record<string, boolean>>({})
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})
  const [editingComments, setEditingComments] = useState<Record<string, boolean>>({})
  const [editingCommentContent, setEditingCommentContent] = useState<Record<string, string>>({})
  const [commentGuestInfo, setCommentGuestInfo] = useState<Record<string, GuestIdentity>>({})
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity>({ name: '', email: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 120)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    fetchMicroblogs()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('guestIdentity')
      if (stored) {
        const parsed = JSON.parse(stored)
        setGuestIdentity({
          name: parsed?.name || '',
          email: parsed?.email || '',
        })
      }
    } catch (error) {
      console.error('Failed to load guest identity:', error)
    }
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
      if (!isSearchBarVisible) {
        setIsSearchBarVisible(true)
      }
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

  const handleToggleSearchVisibility = () => {
    setIsSearchBarVisible((prev) => {
      const next = !prev
      if (prev) {
        clearSearch()
      }
      return next
    })
  }

  const scrollToTop = () => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedImages((prev) => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) return

    if (!user) {
      setShowLoginModal(true)
      return
    }

    setIsSubmitting(true)
    try {
      const imageUrls = [] as { url: string; altText: string }[]
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
            altText: file.name,
          })
        }
      }

      const response = await fetch('/api/microblogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          images: imageUrls,
          userId: user.id,
        }),
      })

      if (response.ok) {
        const newMicroblog = await response.json()
        setMicroblogs((prev) => [newMicroblog, ...prev])
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
        method: 'POST',
      })

      if (response.ok) {
        setMicroblogs((prev) =>
          prev.map((blog) =>
            blog.id === microblogId
              ? { ...blog, likes: [...blog.likes, { id: Date.now().toString() }] }
              : blog,
          ),
        )
      }
    } catch (error) {
      console.error('Error liking microblog:', error)
    }
  }

  const handleCommentInput = (microblogId: string, value: string) => {
    setCommentInputs((prev) => ({
      ...prev,
      [microblogId]: value,
    }))
  }

  const toggleComments = (microblogId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [microblogId]: !prev[microblogId],
    }))
    setCommentGuestInfo((prev) => {
      if (prev[microblogId]) return prev
      if (!guestIdentity.name && !guestIdentity.email) return prev
      return {
        ...prev,
        [microblogId]: {
          name: guestIdentity.name,
          email: guestIdentity.email,
        },
      }
    })
  }

  const handleSubmitComment = async (microblogId: string) => {
    const commentContent = commentInputs[microblogId]
    if (!commentContent || !commentContent.trim()) return

    if (user) {
      try {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: true }))

        const response = await fetch(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentContent.trim(),
            userId: user.id,
          }),
        })

        if (response.ok) {
          const newComment = await response.json()
          setMicroblogs((prev) =>
            prev.map((blog) =>
              blog.id === microblogId
                ? { ...blog, comments: [...blog.comments, newComment] }
                : blog,
            ),
          )
          setCommentInputs((prev) => ({
            ...prev,
            [microblogId]: '',
          }))
        } else {
          console.error('Failed to create comment')
        }
      } catch (error) {
        console.error('Error submitting comment:', error)
      } finally {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: false }))
      }
    } else {
      const guestInfo = commentGuestInfo[microblogId] || guestIdentity
      if (!guestInfo?.name?.trim() || !guestInfo?.email?.trim()) {
        alert('请填写用户名和邮箱')
        return
      }

      try {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: true }))

        const response = await fetch(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentContent.trim(),
            guestName: guestInfo.name.trim(),
            guestEmail: guestInfo.email.trim(),
          }),
        })

        if (response.ok) {
          const newComment = await response.json()
          setMicroblogs((prev) =>
            prev.map((blog) =>
              blog.id === microblogId
                ? { ...blog, comments: [...blog.comments, newComment] }
                : blog,
            ),
          )
          setCommentInputs((prev) => ({
            ...prev,
            [microblogId]: '',
          }))

          const normalizedIdentity = {
            name: guestInfo.name.trim(),
            email: guestInfo.email.trim(),
          }
          setGuestIdentity(normalizedIdentity)
          if (typeof window !== 'undefined') {
            localStorage.setItem('guestIdentity', JSON.stringify(normalizedIdentity))
          }
          setCommentGuestInfo((prev) => ({
            ...prev,
            [microblogId]: normalizedIdentity,
          }))
        } else {
          console.error('Failed to create comment')
        }
      } catch (error) {
        console.error('Error submitting comment:', error)
      } finally {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: false }))
      }
    }
  }

  const handleLogin = (loggedInUser: AppUser) => {
    setUser(loggedInUser)
    setCommentLoginModal({})
  }

  const handleLogout = () => {
    setUser(null)
  }

  const startEditingMicroblog = (microblogId: string, currentContent: string) => {
    setEditingMicroblog((prev) => ({ ...prev, [microblogId]: true }))
    setEditingContent((prev) => ({ ...prev, [microblogId]: currentContent }))
  }

  const deleteMicroblog = async (microblogId: string) => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('确认删除这条微博吗？')
      if (!confirmed) return
    }

    try {
      const response = await fetch(`/api/microblogs/${microblogId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      if (response.ok) {
        setMicroblogs((prev) => prev.filter((blog) => blog.id !== microblogId))
        setEditingMicroblog((prev) => {
          const updated = { ...prev }
          delete updated[microblogId]
          return updated
        })
        setEditingContent((prev) => {
          const updated = { ...prev }
          delete updated[microblogId]
          return updated
        })
      } else {
        console.error('Failed to delete microblog')
      }
    } catch (error) {
      console.error('Error deleting microblog:', error)
    }
  }

  const cancelEditing = (microblogId: string) => {
    setEditingMicroblog((prev) => ({ ...prev, [microblogId]: false }))
    setEditingContent((prev) => ({ ...prev, [microblogId]: '' }))
  }

  const handleEditContentChange = (microblogId: string, value: string) => {
    setEditingContent((prev) => ({ ...prev, [microblogId]: value }))
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
          userId: user?.id,
        }),
      })

      if (response.ok) {
        const updatedMicroblog = await response.json()
        setMicroblogs((prev) =>
          prev.map((blog) => (blog.id === microblogId ? updatedMicroblog : blog)),
        )
        setEditingMicroblog((prev) => ({ ...prev, [microblogId]: false }))
        setEditingContent((prev) => ({ ...prev, [microblogId]: '' }))
      } else {
        console.error('Failed to update microblog')
      }
    } catch (error) {
      console.error('Error updating microblog:', error)
    }
  }

  const startEditingComment = (
    _microblogId: string,
    commentId: string,
    content: string,
  ) => {
    setEditingComments((prev) => ({ ...prev, [commentId]: true }))
    setEditingCommentContent((prev) => ({ ...prev, [commentId]: content }))
  }

  const cancelEditingComment = (commentId: string) => {
    setEditingComments((prev) => {
      const updated = { ...prev }
      delete updated[commentId]
      return updated
    })
    setEditingCommentContent((prev) => {
      const updated = { ...prev }
      delete updated[commentId]
      return updated
    })
  }

  const handleEditCommentChange = (commentId: string, value: string) => {
    setEditingCommentContent((prev) => ({ ...prev, [commentId]: value }))
  }

  const saveCommentEdit = async (microblogId: string, commentId: string) => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    if (!editingCommentContent[commentId]?.trim()) {
      return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editingCommentContent[commentId],
          userId: user.id,
        }),
      })

      if (response.ok) {
        const updatedComment = await response.json()
        setMicroblogs((prev) =>
          prev.map((blog) =>
            blog.id === microblogId
              ? {
                  ...blog,
                  comments: blog.comments.map((comment) =>
                    comment.id === commentId ? updatedComment : comment,
                  ),
                }
              : blog,
          ),
        )
        cancelEditingComment(commentId)
      } else {
        console.error('Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const deleteComment = async (microblogId: string, commentId: string) => {
    if (!user) {
      setShowLoginModal(true)
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('确认删除这条评论吗？')
      if (!confirmed) return
    }

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      })

      if (response.ok) {
        setMicroblogs((prev) =>
          prev.map((blog) =>
            blog.id === microblogId
              ? {
                  ...blog,
                  comments: blog.comments.filter((comment) => comment.id !== commentId),
                }
              : blog,
          ),
        )
        cancelEditingComment(commentId)
      } else {
        console.error('Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleCommentGuestInfoChange = (
    microblogId: string,
    field: 'name' | 'email',
    value: string,
  ) => {
    const updatedIdentity = {
      ...guestIdentity,
      [field]: value,
    }

    setGuestIdentity(updatedIdentity)
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestIdentity', JSON.stringify(updatedIdentity))
    }

    setCommentGuestInfo((prev) => ({
      ...prev,
      [microblogId]: {
        ...(prev[microblogId] || updatedIdentity),
        [field]: value,
      },
    }))
  }

  const getGuestInfo = (microblogId: string) => commentGuestInfo[microblogId] ?? guestIdentity

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')

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
      <HomeHeader
        searchTerm={searchTerm}
        isSearching={isSearching}
        user={user}
        isSearchVisible={isSearchBarVisible}
        showScrollTop={showScrollTop}
        onSearchChange={handleSearch}
        onSearchClick={() => handleSearch(searchTerm)}
        onToggleSearch={handleToggleSearchVisibility}
        onClearSearch={clearSearch}
        onScrollTop={scrollToTop}
        onLoginClick={() => setShowLoginModal(true)}
      />

      <div className="container mx-auto max-w-2xl px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <UserInfo user={user} onLogout={handleLogout} onShowLogin={() => setShowLoginModal(true)} />

        {user && user.isAdmin && (
          <CreateMicroblogCard
            content={content}
            showPreview={showPreview}
            selectedImages={selectedImages}
            isSubmitting={isSubmitting}
            formatFullTime={formatFullTime}
            onContentChange={setContent}
            onTogglePreview={() => setShowPreview((prev) => !prev)}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onSubmit={handleSubmit}
          />
        )}

        <MicroblogList
          microblogs={microblogs}
          isLoading={isLoading}
          isSearching={isSearching}
          expandedComments={expandedComments}
          commentInputs={commentInputs}
          commentLoading={commentLoading}
          editingMicroblog={editingMicroblog}
          editingContent={editingContent}
          editingComments={editingComments}
          editingCommentContent={editingCommentContent}
          user={user}
          getGuestInfo={getGuestInfo}
          formatTime={formatTime}
          formatFullTime={formatFullTime}
          onLike={handleLike}
          onToggleComments={toggleComments}
          onCommentInputChange={handleCommentInput}
          onSubmitComment={handleSubmitComment}
          onCommentGuestInfoChange={handleCommentGuestInfoChange}
          onStartEditing={startEditingMicroblog}
          onCancelEditing={cancelEditing}
          onSaveEdit={saveEdit}
          onEditContentChange={handleEditContentChange}
          onDeleteMicroblog={deleteMicroblog}
          onStartEditComment={startEditingComment}
          onCancelEditComment={cancelEditingComment}
          onEditCommentChange={handleEditCommentChange}
          onSaveEditComment={saveCommentEdit}
          onDeleteComment={deleteComment}
        />
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />

      {Object.entries(commentLoginModal).map(([microblogId, isOpen]) => (
        <LoginModal
          key={microblogId}
          isOpen={isOpen}
          onClose={() =>
            setCommentLoginModal((prev) => ({ ...prev, [microblogId]: false }))
          }
          onLogin={handleLogin}
        />
      ))}
    </div>
  )
}
