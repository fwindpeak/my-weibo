import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Heart, MessageCircle, Edit3, Trash2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { cn } from '@/lib/utils'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

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
  formatTime: (value: string) => string
  formatFullTime: (value: string) => string
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

export function MicroblogCard({
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const canManage = Boolean(user?.isAdmin || (user && microblog.user && microblog.user.id === user.id))
  const isLiked = Boolean(user && microblog.likes.some((like) => like.userId === user.id))

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

  const openPreview = (url: string, altText: string) => {
    setPreviewImage({ url, altText })
    setIsPreviewOpen(true)
  }

  return (
    <Card className="bg-gradient-to-br from-background to-muted/5 border-primary/10 transition-all duration-300 hover:border-primary/20 hover:shadow-md">
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="mb-2.5 flex flex-col gap-2">
          {canManage && !editing && (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => onStartEditing(microblog.id, microblog.content)}
              >
                <Edit3 className="mr-1 h-3 w-3" /> 编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => onDeleteMicroblog(microblog.id)}
              >
                <Trash2 className="mr-1 h-3 w-3" /> 删除
              </Button>
            </div>
          )}

          {editing ? (
            <div className="space-y-3">
              <MarkdownEditor
                value={editingContent}
                onChange={(value) => onEditContentChange(microblog.id, value)}
                placeholder="编辑微博内容..."
                height="160px"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>图片</span>
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
                    <label htmlFor={`edit-image-upload-${microblog.id}`} className="cursor-pointer text-primary">
                      添加图片
                    </label>
                  </div>
                </div>
                {editingImages.length > 0 ? (
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {editingImages.map((image, index) => (
                      <div
                        key={image.id ?? image.tempId ?? `${image.url}-${index}`}
                        className="relative overflow-hidden rounded-lg border border-border/60"
                      >
                        <img
                          src={image.url || image.previewUrl || ''}
                          alt={image.altText || `编辑图片 ${index + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveEditingImage(microblog.id, index)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground shadow"
                          aria-label="删除图片"
                        >
                          ×
                        </button>
                        {!image.id && !image.uploadError && (
                          <span className="absolute left-1 bottom-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                            新
                          </span>
                        )}
                        {image.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                            上传中...
                          </div>
                        )}
                        {image.uploadError && !image.uploading && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-destructive/80 py-1 text-[10px] font-semibold text-destructive-foreground">
                            上传失败
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                    暂无图片，点击上方添加
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => onCancelEditing(microblog.id)}>
                  取消
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => onSaveEdit(microblog.id)}
                  disabled={!editingContent?.trim()}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {microblog.content || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {microblog.images.length > 0 && (
          <div className="mb-2.5 overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            <details>
              <summary className="cursor-pointer list-none select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                {`图片 (${microblog.images.length})`}
              </summary>
              <div
                className={`grid gap-1.5 border-t border-border/40 p-3 ${
                  microblog.images.length === 1
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
                    onClick={() => openPreview(image.url, image.altText || '图片')}
                    onDragStart={(event) => handleImageDragStart(event, image.altText, image.url)}
                    className={cn(
                      'group relative overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
                    )}
                    aria-label="查看大图"
                  >
                    <img
                      src={image.url}
                      alt={image.altText || ''}
                      className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-48"
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

        <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-base text-muted-foreground">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onLike(microblog.id)}
              className={`group flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'hover:text-red-500'}`}
              title="点赞"
            >
              <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
              {microblog.likes.length > 0 && <span className="text-xs font-medium">{microblog.likes.length}</span>}
            </button>
            <button
              type="button"
              onClick={() => onToggleComments(microblog.id)}
              className="group flex items-center gap-1 transition-colors hover:text-blue-500"
              title="评论"
            >
              <MessageCircle className="h-4 w-4" />
              {microblog.comments.length > 0 && <span className="text-xs font-medium">{microblog.comments.length}</span>}
            </button>
          </div>
          <span
            className="cursor-help text-xs font-medium hover:text-foreground"
            title={`发布时间：${formatFullTime(microblog.createdAt)}`}
          >
            {formatTime(microblog.createdAt)}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-3 border-t border-border pt-3">
            {microblog.comments.length > 0 && (
              <div className="mb-3 max-h-60 space-y-2.5 overflow-y-auto pr-1 text-sm">
                {microblog.comments.map((comment) => (
                  <div key={comment.id} className="space-y-2 rounded-lg bg-muted/30 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        {comment.user ? (
                          <span className="text-xs font-medium text-foreground">{comment.user.username}</span>
                        ) : (
                          <span className="text-xs font-medium text-foreground">{comment.guestName}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">{formatTime(comment.createdAt)}</span>
                      </div>
                      {(user?.isAdmin || (comment.user && user?.id === comment.user.id)) && (
                        <div className="flex items-center gap-1">
                          {!editingComments[comment.id] && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onStartEditComment(microblog.id, comment.id, comment.content)}
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
                        <textarea
                          value={editingCommentContent[comment.id] || ''}
                          onChange={(event) => onEditCommentChange(comment.id, event.target.value)}
                          className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                          rows={3}
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
                            disabled={!editingCommentContent[comment.id]?.trim()}
                            onClick={() => onSaveEditComment(microblog.id, comment.id)}
                          >
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground">{comment.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 text-sm">
              {user ? (
                <p className="text-xs text-muted-foreground">以 {user.username} 的身份评论</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`guest-name-${microblog.id}`}>
                      昵称
                    </label>
                    <input
                      id={`guest-name-${microblog.id}`}
                      type="text"
                      value={guestInfo.name}
                      onChange={(event) => onCommentGuestInfoChange(microblog.id, 'name', event.target.value)}
                      className="h-9 w-full rounded-full border border-input bg-background px-3 text-sm"
                      placeholder="请输入昵称"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`guest-email-${microblog.id}`}>
                      邮箱
                    </label>
                    <input
                      id={`guest-email-${microblog.id}`}
                      type="email"
                      value={guestInfo.email}
                      onChange={(event) => onCommentGuestInfoChange(microblog.id, 'email', event.target.value)}
                      className="h-9 w-full rounded-full border border-input bg-background px-3 text-sm"
                      placeholder="用于展示头像"
                    />
                  </div>
                </div>
              )}

              <textarea
                value={commentInput}
                onChange={(event) => onCommentInputChange(microblog.id, event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                placeholder="写下你的评论..."
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="px-3 text-xs"
                  disabled={commentLoading || !commentInput.trim()}
                  onClick={() => onSubmitComment(microblog.id)}
                >
                  {commentLoading ? '提交中...' : '发表评论'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={isPreviewOpen && Boolean(previewImage)}
        onOpenChange={(open) => {
          setIsPreviewOpen(open)
          if (!open) {
            setPreviewImage(null)
          }
        }}
      >
        {previewImage ? (
          <DialogContent className="max-w-3xl" showCloseButton>
            <img src={previewImage.url} alt={previewImage.altText} className="h-full w-full rounded-lg object-contain" />
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  )
}
