'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Edit3, Trash2, Loader2, TriangleAlert } from 'lucide-react'
import LexicalEditor from '@/components/ui/lexical-editor'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface EditableImage {
  id?: string
  url: string
  altText?: string | null
  file?: File
  previewUrl?: string
  uploading?: boolean
  uploadError?: boolean
  tempId?: string
}

interface MicroblogCardProps {
  microblog: Microblog
  isExpanded: boolean
  commentInput: string
  commentLoading: boolean
  editing: boolean
  editingContent: string
  editingImages?: EditableImage[]
  editingComments: Record<string, boolean>
  editingCommentContent: Record<string, string>
  user: AppUser | null
  getGuestInfo: (microblogId: string) => GuestIdentity
  formatTime: (dateString: string) => string
  formatFullTime: (dateString: string) => string
  onLike: (microblogId: string) => void
  onToggleComments: (microblogId: string) => void
  onCommentInputChange: (microblogId: string, value: string) => void
  onSubmitComment: (microblogId: string) => void
  onCommentGuestInfoChange: (microblogId: string, field: 'name' | 'email', value: string) => void
  onStartEditing: (microblogId: string, content: string) => void
  onCancelEditing: (microblogId: string) => void
  onSaveEdit: (microblogId: string) => void
  onEditContentChange: (microblogId: string, value: string) => void
  onEditImagesUpload: (microblogId: string, files: File[]) => void
  onRemoveEditingImage: (microblogId: string, index: number) => void
  onDeleteMicroblog: (microblogId: string) => void
  onStartEditComment: (microblogId: string, commentId: string, content: string) => void
  onCancelEditComment: (commentId: string) => void
  onEditCommentChange: (commentId: string, value: string) => void
  onSaveEditComment: (microblogId: string, commentId: string) => void
  onDeleteComment: (microblogId: string, commentId: string) => void
}

export default function MicroblogCard({
  microblog,
  isExpanded,
  commentInput,
  commentLoading,
  editing,
  editingContent,
  editingImages = [],
  editingComments,
  editingCommentContent,
  user,
  getGuestInfo,
  formatTime,
  formatFullTime,
  onLike,
  onToggleComments,
  onCommentInputChange,
  onSubmitComment,
  onCommentGuestInfoChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onEditContentChange,
  onEditImagesUpload,
  onRemoveEditingImage,
  onDeleteMicroblog,
  onStartEditComment,
  onCancelEditComment,
  onEditCommentChange,
  onSaveEditComment,
  onDeleteComment,
}: MicroblogCardProps) {
  const guestInfo = getGuestInfo(microblog.id)
  const [previewImage, setPreviewImage] = useState<{ url: string; altText: string } | null>(null)

  const canManageMicroblog = Boolean(
    user?.isAdmin || (user && microblog.user && microblog.user.id === user.id),
  )

  const isLiked = Boolean(user && microblog.likes.some((like) => like.userId === user.id))
  const canSaveMicroblogEdit = Boolean(editingContent?.trim())
  const trimmedCommentInput = commentInput.trim()
  const guestNameFilled = Boolean(guestInfo.name.trim())
  const guestEmailFilled = Boolean(guestInfo.email.trim())
  const canSubmitGuestComment =
    Boolean(trimmedCommentInput) && guestNameFilled && guestEmailFilled && !commentLoading
  const canSubmitUserComment = Boolean(trimmedCommentInput) && !commentLoading

  const handleImageDragStart = (
    event: React.DragEvent,
    altText: string | undefined | null,
    url: string,
  ) => {
    if (!url) {
      event.preventDefault()
      return
    }
    const markdown = `![${altText || '图片'}](${url})`
    event.dataTransfer.setData('text/plain', markdown)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <Card className="hover:shadow-md transition-all duration-300 border-primary/10 hover:border-primary/20 bg-gradient-to-br from-background to-muted/5">
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="mb-2.5 flex flex-col gap-2">
          {canManageMicroblog && !editing && (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => onStartEditing(microblog.id, microblog.content)}
              >
                <Edit3 className="mr-1 h-3 w-3" />
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteMicroblog(microblog.id)}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                删除
              </Button>
            </div>
          )}
          {editing ? (
            <div className="space-y-3">
              <LexicalEditor
                value={editingContent}
                onChange={(value) => onEditContentChange(microblog.id, value)}
                placeholder="编辑微博内容..."
                height="120px"
                onSubmitShortcut={() => {
                  if (canSaveMicroblogEdit) {
                    onSaveEdit(microblog.id)
                  }
                }}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">图片</span>
                  <div className="flex items-center gap-2">
                    <input
                      id={`edit-image-upload-${microblog.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        const files = event.target.files
                        if (files && files.length > 0) {
                          onEditImagesUpload(microblog.id, Array.from(files))
                          event.target.value = ''
                        }
                      }}
                    />
                    <label htmlFor={`edit-image-upload-${microblog.id}`}>
                      <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                        <span className="cursor-pointer">添加图片</span>
                      </Button>
                    </label>
                  </div>
                </div>
                {editingImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {editingImages.map((image, index) => (
                      <div
                        key={image.id ?? image.tempId ?? `${image.url}-${index}`}
                        className="relative group"
                        draggable={!image.uploading && !image.uploadError && Boolean(image.url)}
                        onDragStart={(event) =>
                          handleImageDragStart(event, image.altText, image.url)
                        }
                      >
                        <img
                          src={image.url || image.previewUrl || ''}
                          alt={image.altText || `编辑图片 ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-border/60"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveEditingImage(microblog.id, index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm hover:bg-destructive/90"
                          aria-label="删除图片"
                        >
                          ×
                        </button>
                        {!image.id && !image.uploadError && (
                          <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                            新
                          </span>
                        )}
                        {image.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-primary">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        )}
                        {image.uploadError && !image.uploading && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-destructive/90 text-destructive-foreground py-1 text-[10px] font-semibold">
                            <TriangleAlert className="h-3 w-3" /> 上传失败
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                    暂无图片，点击右上角添加
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelEditing(microblog.id)}
                  className="text-xs"
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(microblog.id)}
                  className="text-xs"
                  disabled={!canSaveMicroblogEdit}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {microblog.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {microblog.images.length > 0 && (
          <div className="mb-2.5 overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            <details>
              <summary className="list-none cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                {`图片 (${microblog.images.length})`}
              </summary>
              <div
                className={`grid gap-1.5 p-3 border-t border-border/40 ${microblog.images.length === 1
                  ? 'grid-cols-1'
                  : microblog.images.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
                  }`}
              >
                {microblog.images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    draggable
                    onClick={() =>
                      setPreviewImage({ url: image.url, altText: image.altText || '图片' })
                    }
                    onDragStart={(event) => handleImageDragStart(event, image.altText, image.url)}
                    className={cn(
                      'relative group overflow-hidden rounded-lg focus:outline-none',
                      'focus-visible:ring-2 focus-visible:ring-primary/60',
                    )}
                    aria-label="查看大图"
                  >
                    <img
                      src={image.url}
                      alt={image.altText}
                      className="w-full h-40 sm:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white transition-all duration-300 group-hover:bg-black/40 group-hover:text-white">
                      <span className="opacity-0 group-hover:opacity-100">点击查看大图</span>
                    </div>
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}

        <div className="flex items-center justify-between text-base text-muted-foreground pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onLike(microblog.id)}
              className={`flex items-center gap-1 transition-colors group ${isLiked ? 'text-red-500' : 'hover:text-red-500'
                }`}
              title="点赞"
            >
              <Heart
                className="w-4 h-4 transition-all"
                fill={isLiked ? 'currentColor' : 'none'}
              />
              {microblog.likes.length > 0 && <span className="text-xs font-medium">{microblog.likes.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => onToggleComments(microblog.id)}
              className="flex items-center gap-1 hover:text-blue-500 transition-colors group"
              title="评论"
            >
              <MessageCircle className="w-4 h-4" />
              {microblog.comments.length > 0 && <span className="text-xs font-medium">{microblog.comments.length}</span>}
            </button>
          </div>
          <span
            className="text-xs cursor-help hover:text-foreground transition-colors font-medium"
            title={`发布时间：${formatFullTime(microblog.createdAt)}`}
          >
            {formatTime(microblog.createdAt)}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-2 duration-300">
            {microblog.comments.length > 0 && (
              <div className="space-y-2.5 mb-3 max-h-60 overflow-y-auto custom-scrollbar">
                {microblog.comments.map((comment) => {
                  const commentValue = editingCommentContent[comment.id] || ''
                  const canSaveCommentEdit = Boolean(commentValue.trim())

                  return (
                    <div key={comment.id} className="bg-muted/30 px-3 py-2.5 rounded-lg text-sm space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          {comment.user ? (
                            <span className="font-medium text-xs text-foreground">{comment.user.username}</span>
                          ) : (
                            <span className="font-medium text-xs text-foreground">{comment.guestName}</span>
                          )}
                        </div>
                        {(user?.isAdmin || (comment.user && user?.id === comment.user.id)) && (
                          <div className="flex items-center gap-1">
                            {!editingComments[comment.id] && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    onStartEditComment(microblog.id, comment.id, comment.content)
                                  }
                                  aria-label="编辑评论"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => onDeleteComment(microblog.id, comment.id)}
                                  aria-label="删除评论"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {editingComments[comment.id] ? (
                        <div className="space-y-2">
                          <LexicalEditor
                            value={commentValue}
                            onChange={(value) => onEditCommentChange(comment.id, value)}
                            placeholder="编辑评论..."
                            height="80px"
                            onSubmitShortcut={() => {
                              if (canSaveCommentEdit) {
                                onSaveEditComment(microblog.id, comment.id)
                              }
                            }}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => onCancelEditComment(comment.id)}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-3 text-xs"
                              disabled={!canSaveCommentEdit}
                              onClick={() => onSaveEditComment(microblog.id, comment.id)}
                            >
                              保存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        <span
                          className="cursor-help hover:text-foreground transition-colors"
                          title={`评论时间：${formatFullTime(comment.createdAt)}`}
                        >
                          {formatTime(comment.createdAt)}
                        </span>
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {!user ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="你的名字"
                    value={guestInfo.name}
                    onChange={(e) => onCommentGuestInfoChange(microblog.id, 'name', e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="你的邮箱"
                    value={guestInfo.email}
                    onChange={(e) => onCommentGuestInfoChange(microblog.id, 'email', e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <LexicalEditor
                      value={commentInput}
                      onChange={(value) => onCommentInputChange(microblog.id, value)}
                      placeholder="写下你的评论..."
                      height="60px"
                      onSubmitShortcut={() => {
                        if (canSubmitGuestComment) {
                          onSubmitComment(microblog.id)
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => onSubmitComment(microblog.id)}
                    disabled={!canSubmitGuestComment}
                    size="sm"
                    className="px-4 self-end"
                  >
                    {commentLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      '发送'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <LexicalEditor
                    value={commentInput}
                    onChange={(value) => onCommentInputChange(microblog.id, value)}
                    placeholder="写下你的评论..."
                    height="60px"
                    onSubmitShortcut={() => {
                      if (canSubmitUserComment) {
                        onSubmitComment(microblog.id)
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => onSubmitComment(microblog.id)}
                  disabled={!canSubmitUserComment}
                  size="sm"
                  className="px-4 self-end"
                >
                  {commentLoading ? (
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

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl border-none bg-background/95 p-0 shadow-xl">
          {previewImage ? (
            <div className="flex max-h-[80vh] w-full items-center justify-center bg-black">
              <img
                src={previewImage.url}
                alt={previewImage.altText}
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
