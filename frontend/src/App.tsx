import { ChangeEvent, useEffect, useState } from 'react'
import 'highlight.js/styles/github.css'
import { LogOut, Trash2 } from 'lucide-react'

import { LoginModal } from '@/components/auth/LoginModal'
import { MessageBox } from '@/components/ui/message-box'
import { HomeHeader } from '@/components/microblog/HomeHeader'
import { CreateMicroblogCard, SelectedImageItem } from '@/components/microblog/CreateMicroblogCard'
import { MicroblogList } from '@/components/microblog/MicroblogList'
import type { EditableImage } from '@/components/microblog/MicroblogCard'
import { apiFetch } from '@/lib/api'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

export default function App() {
  const [content, setContent] = useState('')
  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([])
  const [microblogs, setMicroblogs] = useState<Microblog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loginModalState, setLoginModalState] = useState<{ open: boolean; mode: 'admin' | 'user' }>({
    open: false,
    mode: 'admin',
  })
  const [editingMicroblog, setEditingMicroblog] = useState<Record<string, boolean>>({})
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})
  const [editingImages, setEditingImages] = useState<Record<string, EditableImage[]>>({})
  const [editingImagesToDelete, setEditingImagesToDelete] = useState<Record<string, string[]>>({})
  const [editingComments, setEditingComments] = useState<Record<string, boolean>>({})
  const [editingCommentContent, setEditingCommentContent] = useState<Record<string, string>>({})
  const [commentGuestInfo, setCommentGuestInfo] = useState<Record<string, GuestIdentity>>({})
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity>({ name: '', email: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [microblogToDelete, setMicroblogToDelete] = useState<string | null>(null)
  const [isDeletingMicroblog, setIsDeletingMicroblog] = useState(false)

  const generateClientId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const uploadImageFile = async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await apiFetch<{ url: string }>(
      '/api/upload',
      {
        method: 'POST',
        body: formData,
      },
    )

    return response.url
  }

  const revokePreviewUrls = (images: SelectedImageItem[]) => {
    images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl)
      }
    })
  }

  useEffect(() => {
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
    fetchMicroblogs().catch((error) => {
      console.error('Failed to load microblogs:', error)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        const cacheKey = 'my-weibo-next-session'
        const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null

        if (cached) {
          const parsed = JSON.parse(cached)
          setUser(parsed.user ?? null)
          return
        }

        const data = await apiFetch<{ user: AppUser | null }>('/api/auth/session', {
          method: 'GET',
        })
        setUser(data.user ?? null)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } catch (error) {
        console.error('Failed to load session:', error)
        setUser(null)
      }
    }

    loadSession()
  }, [])

  useEffect(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('guestIdentity') : null
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
    setIsLoading(true)
    try {
      const url = search ? `/api/microblogs?search=${encodeURIComponent(search)}` : '/api/microblogs'
      const data = await apiFetch<Microblog[]>(url)
      setMicroblogs(data)
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

  const openLoginModal = (mode: 'admin' | 'user') => {
    setLoginModalState({ open: true, mode })
  }

  const closeLoginModal = () => {
    setLoginModalState((prev) => ({ ...prev, open: false }))
  }

  const handleToggleSearchVisibility = () => {
    setIsSearchBarVisible((prev) => {
      const next = !prev
      if (prev) {
        clearSearch().catch((error) => console.error('Failed to clear search:', error))
      }
      return next
    })
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const additions = files.map((file) => ({
      id: generateClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
      remoteUrl: undefined,
      altText: file.name,
      uploading: true,
      uploadError: false,
    }))

    setSelectedImages((prev) => [...prev, ...additions])

    additions.forEach(async (item) => {
      try {
        const url = await uploadImageFile(item.file as File)
        setSelectedImages((prev) =>
          prev.map((image) =>
            image.id === item.id
              ? { ...image, remoteUrl: url, uploading: false, uploadError: false, file: undefined }
              : image,
          ),
        )
      } catch (error) {
        console.error('Failed to upload image:', error)
        setSelectedImages((prev) =>
          prev.map((image) =>
            image.id === item.id
              ? { ...image, uploading: false, uploadError: true }
              : image,
          ),
        )
      }
    })

    event.target.value = ''
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const target = prev[index]
      if (!target) {
        return prev
      }
      if (target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) return

    if (selectedImages.some((image) => image.uploading)) {
      console.warn('Images are still uploading')
      return
    }

    if (!user || !user.isAdmin) {
      openLoginModal('admin')
      return
    }

    setIsSubmitting(true)
    try {
      const newMicroblog = await apiFetch<Microblog>('/api/microblogs', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim(),
          images: selectedImages
            .filter((preview) => preview.remoteUrl && !preview.uploadError)
            .map((preview) => ({
              url: preview.remoteUrl as string,
              altText: preview.altText,
            })),
        }),
      })

      setMicroblogs((prev) => [newMicroblog, ...prev])
      setContent('')
      revokePreviewUrls(selectedImages)
      setSelectedImages([])
    } catch (error) {
      console.error('Failed to create microblog:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = async (microblogId: string) => {
    if (!user) {
      openLoginModal('user')
      return
    }

    try {
      const data = await apiFetch<{ liked: boolean; like?: { id: string } }>(`/api/microblogs/${microblogId}/like`, {
        method: 'POST',
      })

      setMicroblogs((prev) =>
        prev.map((blog) => {
          if (blog.id !== microblogId) {
            return blog
          }

          const alreadyLiked = blog.likes.some((like) => like.userId === user.id)

          if (data.liked === false || alreadyLiked) {
            return {
              ...blog,
              likes: blog.likes.filter((like) => like.userId !== user.id),
            }
          }

          return {
            ...blog,
            likes: [
              ...blog.likes,
              {
                id: data.like?.id || `${microblogId}-${user.id}`,
                userId: user.id,
              },
            ],
          }
        }),
      )
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
        const newComment = await apiFetch<Microblog['comments'][number]>(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            content: commentContent.trim(),
          }),
        })

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
      } catch (error) {
        console.error('Failed to create comment:', error)
      } finally {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: false }))
      }
    } else {
      const guestInfo = commentGuestInfo[microblogId] || guestIdentity
      if (!guestInfo?.name?.trim() || !guestInfo?.email?.trim()) {
        window.alert('请填写用户名和邮箱')
        return
      }

      try {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: true }))
        const normalizedIdentity = {
          name: guestInfo.name.trim(),
          email: guestInfo.email.trim(),
        }
        const newComment = await apiFetch<Microblog['comments'][number]>(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          body: JSON.stringify({
            content: commentContent.trim(),
            guestName: normalizedIdentity.name,
            guestEmail: normalizedIdentity.email,
          }),
        })

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
        setGuestIdentity(normalizedIdentity)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('guestIdentity', JSON.stringify(normalizedIdentity))
        }
        setCommentGuestInfo((prev) => ({
          ...prev,
          [microblogId]: normalizedIdentity,
        }))
      } catch (error) {
        console.error('Failed to create comment:', error)
      } finally {
        setCommentLoading((prev) => ({ ...prev, [microblogId]: false }))
      }
    }
  }

 const handleLogin = (loggedInUser: AppUser) => {
   setUser(loggedInUser)
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('my-weibo-next-session', JSON.stringify({ user: loggedInUser }))
    }
    closeLoginModal()
  }

  const requestLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('my-weibo-next-session')
      }
      setShowLogoutConfirm(false)
    }
  }

  const cancelLogout = () => {
    setShowLogoutConfirm(false)
  }

  const startEditingMicroblog = (microblogId: string, currentContent: string) => {
    setEditingMicroblog((prev) => ({ ...prev, [microblogId]: true }))
    setEditingContent((prev) => ({ ...prev, [microblogId]: currentContent }))

    const microblog = microblogs.find((item) => item.id === microblogId)
    setEditingImages((prev) => ({
      ...prev,
        [microblogId]:
          microblog?.images?.map((image) => ({
            id: image.id,
            url: image.url,
            altText: image.altText ?? undefined,
            uploading: false,
            uploadError: false,
          })) || [],
    }))
    setEditingImagesToDelete((prev) => ({ ...prev, [microblogId]: [] }))
  }

  const requestDeleteMicroblog = (microblogId: string) => {
    if (!user) {
      openLoginModal('user')
      return
    }

    setMicroblogToDelete(microblogId)
  }

  const confirmDeleteMicroblog = async () => {
    if (!user || !microblogToDelete) return

    setIsDeletingMicroblog(true)

    try {
      await apiFetch(`/api/microblogs/${microblogToDelete}`, {
        method: 'DELETE',
      })

      setMicroblogs((prev) => prev.filter((blog) => blog.id !== microblogToDelete))
      setEditingMicroblog((prev) => {
        const updated = { ...prev }
        delete updated[microblogToDelete]
        return updated
      })
      setEditingContent((prev) => {
        const updated = { ...prev }
        delete updated[microblogToDelete]
        return updated
      })
      setEditingImages((prev) => {
        const updated = { ...prev }
        const images = updated[microblogToDelete]
        if (images) {
          revokePreviewUrls(images)
          delete updated[microblogToDelete]
        }
        return updated
      })
      setEditingImagesToDelete((prev) => {
        const updated = { ...prev }
        delete updated[microblogToDelete]
        return updated
      })
    } catch (error) {
      console.error('Failed to delete microblog:', error)
    } finally {
      setIsDeletingMicroblog(false)
      setMicroblogToDelete(null)
    }
  }

  const cancelDeleteMicroblog = () => {
    if (isDeletingMicroblog) return
    setMicroblogToDelete(null)
  }

  const cancelEditing = (microblogId: string) => {
    setEditingMicroblog((prev) => ({ ...prev, [microblogId]: false }))
    setEditingContent((prev) => ({ ...prev, [microblogId]: '' }))
    if (editingImages[microblogId]) {
      revokePreviewUrls(editingImages[microblogId])
    }
    setEditingImages((prev) => {
      const updated = { ...prev }
      delete updated[microblogId]
      return updated
    })
    setEditingImagesToDelete((prev) => {
      const updated = { ...prev }
      delete updated[microblogId]
      return updated
    })
  }

  const handleEditContentChange = (microblogId: string, value: string) => {
    setEditingContent((prev) => ({ ...prev, [microblogId]: value }))
  }

  const handleEditImageUpload = (microblogId: string, files: File[]) => {
    if (!files.length) return

    const additions: EditableImage[] = files.map((file) => ({
      tempId: generateClientId(),
      file,
      url: '',
      previewUrl: URL.createObjectURL(file),
      altText: file.name,
      uploading: true,
      uploadError: false,
    }))

    setEditingImages((prev) => {
      const current = prev[microblogId] || []
      return {
        ...prev,
        [microblogId]: [...current, ...additions],
      }
    })

    additions.forEach(async (addition) => {
      try {
        const url = await uploadImageFile(addition.file as File)
        setEditingImages((prev) => {
          const current = prev[microblogId] || []
          return {
            ...prev,
            [microblogId]: current.map((item) =>
              item.tempId === addition.tempId
                ? { ...item, url, uploading: false, uploadError: false, file: undefined }
                : item,
            ),
          }
        })
      } catch (error) {
        console.error('Failed to upload editing image:', error)
        setEditingImages((prev) => {
          const current = prev[microblogId] || []
          return {
            ...prev,
            [microblogId]: current.map((item) =>
              item.tempId === addition.tempId
                ? { ...item, uploading: false, uploadError: true }
                : item,
            ),
          }
        })
      }
    })
  }

  const handleRemoveEditingImage = (microblogId: string, index: number) => {
    setEditingImages((prev) => {
      const current = prev[microblogId] || []
      const removedImage = current[index]
      if (!removedImage) {
        return prev
      }

      if (removedImage.previewUrl) {
        URL.revokeObjectURL(removedImage.previewUrl)
      }

      const updatedImages = current.filter((_, i) => i !== index)
      return {
        ...prev,
        [microblogId]: updatedImages,
      }
    })

    setEditingImagesToDelete((prev) => {
      const removed = editingImages[microblogId]?.[index]
      if (!removed?.id) {
        return prev
      }
      const existing = prev[microblogId] || []
      if (existing.includes(removed.id)) {
        return prev
      }
      return {
        ...prev,
        [microblogId]: [...existing, removed.id],
      }
    })
  }

  const saveEdit = async (microblogId: string) => {
    const contentToSave = editingContent[microblogId]?.trim()

    if (!contentToSave) {
      console.error('Content is required')
      return
    }

    const currentImages = editingImages[microblogId] || []
    const imagesMarkedForDeletion = editingImagesToDelete[microblogId] || []
    if (currentImages.some((image) => image.uploading)) {
      console.warn('Images are still uploading')
      return
    }

    const uploadedImages = currentImages
      .filter((image) => !image.id && image.url && !image.uploadError)
      .map((image) => ({
        url: image.url,
        altText: image.altText ?? undefined,
      }))

    try {
      const updatedMicroblog = await apiFetch<Microblog>(`/api/microblogs/${microblogId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: contentToSave,
          newImages: uploadedImages,
          deletedImageIds: Array.from(new Set(imagesMarkedForDeletion)),
        }),
      })

      setMicroblogs((prev) => prev.map((blog) => (blog.id === microblogId ? updatedMicroblog : blog)))
      if (currentImages.length > 0) {
        revokePreviewUrls(currentImages)
      }
      setEditingMicroblog((prev) => ({ ...prev, [microblogId]: false }))
      setEditingContent((prev) => ({ ...prev, [microblogId]: '' }))
      setEditingImages((prev) => {
        const updated = { ...prev }
        delete updated[microblogId]
        return updated
      })
      setEditingImagesToDelete((prev) => {
        const updated = { ...prev }
        delete updated[microblogId]
        return updated
      })
    } catch (error) {
      console.error('Failed to update microblog:', error)
    }
  }

  const startEditingComment = (
    microblogId: string,
    commentId: string,
    content: string,
  ) => {
    if (!user) {
      openLoginModal('user')
      return
    }
    setEditingComments((prev) => ({ ...prev, [commentId]: true }))
    setEditingCommentContent((prev) => ({ ...prev, [commentId]: content }))
    setExpandedComments((prev) => ({ ...prev, [microblogId]: true }))
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
      openLoginModal('user')
      return
    }

    if (!editingCommentContent[commentId]?.trim()) {
      return
    }

    try {
      const updatedComment = await apiFetch<Microblog['comments'][number]>(`/api/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: editingCommentContent[commentId],
        }),
      })

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
    } catch (error) {
      console.error('Failed to update comment:', error)
    }
  }

  const deleteComment = async (microblogId: string, commentId: string) => {
    if (!user) {
      openLoginModal('user')
      return
    }

    if (!window.confirm('确认删除这条评论吗？')) {
      return
    }

    try {
      await apiFetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      })

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
    } catch (error) {
      console.error('Failed to delete comment:', error)
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
    if (typeof localStorage !== 'undefined') {
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
        user={user}
        isSearchVisible={isSearchBarVisible}
        showScrollTop={showScrollTop}
        onSearchChange={handleSearch}
        onSearchClick={() => handleSearch(searchTerm)}
        onToggleSearch={handleToggleSearchVisibility}
        onClearSearch={clearSearch}
        onScrollTop={scrollToTop}
        onLoginClick={() => openLoginModal('admin')}
        onLogoutClick={requestLogout}
      />

      <div className="container mx-auto max-w-2xl px-4 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        {user && user.isAdmin && (
          <CreateMicroblogCard
            content={content}
            selectedImages={selectedImages}
            isSubmitting={isSubmitting}
            formatFullTime={formatFullTime}
            onContentChange={setContent}
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
          editingImages={editingImages}
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
          onEditImagesUpload={handleEditImageUpload}
          onRemoveEditingImage={handleRemoveEditingImage}
          onDeleteMicroblog={requestDeleteMicroblog}
          onStartEditComment={startEditingComment}
          onCancelEditComment={cancelEditingComment}
          onEditCommentChange={handleEditCommentChange}
          onSaveEditComment={saveCommentEdit}
          onDeleteComment={deleteComment}
        />
      </div>

      <LoginModal
        isOpen={loginModalState.open}
        initialMode={loginModalState.mode}
        onClose={closeLoginModal}
        onLogin={handleLogin}
      />

      <MessageBox
        open={showLogoutConfirm}
        title="确认退出登录"
        description="退出后无法执行管理员操作，确定要继续吗？"
        confirmText="退出登录"
        cancelText="暂不退出"
        icon={<LogOut className="h-6 w-6" />}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />

      <MessageBox
        open={Boolean(microblogToDelete)}
        title="删除微博"
        description="删除后将无法恢复这条微博，确定要删除吗？"
        confirmText="确认删除"
        cancelText="保留微博"
        variant="destructive"
        loading={isDeletingMicroblog}
        icon={<Trash2 className="h-6 w-6" />}
        onConfirm={confirmDeleteMicroblog}
        onCancel={cancelDeleteMicroblog}
      />
    </div>
  )
}
