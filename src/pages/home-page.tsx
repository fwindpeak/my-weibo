'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import 'highlight.js/styles/github.css'
import LoginModal from '@/components/auth/login-modal'
import HomeHeader from '@/features/home/home-header'
import CreateMicroblogCard, { SelectedImageItem } from '@/features/home/create-microblog-card'
import MicroblogList from '@/features/home/microblog-list'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'
import type { EditableImage } from '@/features/home/microblog-card'
import { MessageBox } from '@/components/ui/message-box'
import { apiFetch } from '@/lib/api-client'
import { LogOut, Trash2 } from 'lucide-react'

export default function HomePage() {
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
    mode: 'admin'
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

    const response = await apiFetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.url as string
  }

  const revokeEditingImageUrls = (images: EditableImage[]) => {
    images.forEach((image) => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl)
      }
    })
  }

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
    const loadSession = async () => {
    try {
      const cacheKey = 'my-weibo-next-session'
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null

      if (cached) {
        const parsed = JSON.parse(cached)
        setUser(parsed.user ?? null)
        return
      }

      const response = await apiFetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user ?? null)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(data))
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
    }

    loadSession()
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
      const response = await apiFetch(url)
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
    if (!files.length) return

    const additions = files.map((file) => ({
      id: generateClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
      remoteUrl: undefined,
      alt: file.name,
      uploading: true,
      uploadError: false,
    }))

    setSelectedImages((prev) => [...prev, ...additions])

    additions.forEach(async (item) => {
      try {
        const url = await uploadImageFile(item.file)
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
      const response = await apiFetch('/api/microblogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          images: selectedImages
            .filter((preview) => preview.remoteUrl && !preview.uploadError)
            .map((preview) => ({
              url: preview.remoteUrl as string,
              altText: preview.alt,
            })),
        }),
      })

      if (response.ok) {
        const newMicroblog = await response.json()
        setMicroblogs((prev) => [newMicroblog, ...prev])
        setContent('')
        selectedImages.forEach((preview) => {
          if (preview.previewUrl) {
            URL.revokeObjectURL(preview.previewUrl)
          }
        })
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
    if (!user) {
      openLoginModal('user')
      return
    }

    try {
      const response = await apiFetch(`/api/microblogs/${microblogId}/like`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
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

        const response = await apiFetch(`/api/microblogs/${microblogId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify({
          content: commentContent.trim(),
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

        const response = await apiFetch(`/api/microblogs/${microblogId}/comments`, {
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
    closeLoginModal()
  }

  const requestLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
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
      [microblogId]: microblog?.images?.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText ?? undefined,
        uploading: false,
        uploadError: false,
      })) || []
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
      const response = await apiFetch(`/api/microblogs/${microblogToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
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
            revokeEditingImageUrls(images)
            delete updated[microblogToDelete]
          }
          return updated
        })
        setEditingImagesToDelete((prev) => {
          const updated = { ...prev }
          delete updated[microblogToDelete]
          return updated
        })
      } else {
        console.error('Failed to delete microblog')
      }
    } catch (error) {
      console.error('Error deleting microblog:', error)
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
      revokeEditingImageUrls(editingImages[microblogId])
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

    additions.forEach(async (image) => {
      try {
        if (!image.file) return
        const url = await uploadImageFile(image.file)
        setEditingImages((prev) => {
          const current = prev[microblogId] || []
          return {
            ...prev,
            [microblogId]: current.map((item) =>
              item.tempId && item.tempId === image.tempId
                ? { ...item, url, uploading: false, uploadError: false, file: undefined }
                : item,
            ),
          }
        })
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl)
        }
      } catch (error) {
        console.error('Failed to upload image for editing', error)
        setEditingImages((prev) => {
          const current = prev[microblogId] || []
          return {
            ...prev,
            [microblogId]: current.map((item) =>
              item.tempId && item.tempId === image.tempId
                ? { ...item, uploading: false, uploadError: true }
                : item,
            ),
          }
        })
      }
    })
  }

  const handleRemoveEditingImage = (microblogId: string, index: number) => {
    let removedImage: EditableImage | undefined

    setEditingImages((prev) => {
      const current = prev[microblogId] || []
      removedImage = current[index]

      if (!removedImage) {
        return prev
      }

      if (removedImage.previewUrl) {
        URL.revokeObjectURL(removedImage.previewUrl)
      }

      const updatedImages = current.filter((_, i) => i !== index)

      return {
        ...prev,
        [microblogId]: updatedImages
      }
    })

    if (removedImage?.id) {
      setEditingImagesToDelete((prev) => {
        const existing = prev[microblogId] || []
        if (existing.includes(removedImage!.id!)) {
          return prev
        }
        return {
          ...prev,
          [microblogId]: [...existing, removedImage!.id!]
        }
      })
    }
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
      const response = await apiFetch(`/api/microblogs/${microblogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSave,
          newImages: uploadedImages,
          deletedImageIds: Array.from(new Set(imagesMarkedForDeletion)),
        }),
      })

      if (response.ok) {
        const updatedMicroblog = await response.json()
        setMicroblogs((prev) =>
          prev.map((blog) => (blog.id === microblogId ? updatedMicroblog : blog)),
        )
        if (currentImages.length > 0) {
          revokeEditingImageUrls(currentImages)
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
      openLoginModal('user')
      return
    }

    if (!editingCommentContent[commentId]?.trim()) {
      return
    }

    try {
      const response = await apiFetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editingCommentContent[commentId],
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
      openLoginModal('user')
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('确认删除这条评论吗？')
      if (!confirmed) return
    }

    try {
      const response = await apiFetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
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
        description="退出后将无法执行管理员操作，确定要继续吗？"
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
