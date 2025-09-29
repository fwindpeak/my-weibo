import { MessageCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

import { EditableImage, MicroblogCard } from './MicroblogCard'

interface MicroblogListProps {
  microblogs: Microblog[]
  isLoading: boolean
  isSearching: boolean
  expandedComments: Record<string, boolean>
  commentInputs: Record<string, string>
  commentLoading: Record<string, boolean>
  editingMicroblog: Record<string, boolean>
  editingContent: Record<string, string>
  editingImages: Record<string, EditableImage[]>
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

export function MicroblogList({
  microblogs,
  isLoading,
  isSearching,
  expandedComments,
  commentInputs,
  commentLoading,
  editingMicroblog,
  editingContent,
  editingImages,
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
}: MicroblogListProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">加载中...</p>
        </CardContent>
      </Card>
    )
  }

  if (microblogs.length === 0) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-background to-muted/10">
        <CardContent className="py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-8 w-8 text-primary/60" />
          </div>
          <p className="mb-2 text-lg text-muted-foreground">
            {isSearching ? '没有找到相关微博' : '还没有微博'}
          </p>
          <p className="mb-4 text-sm text-muted-foreground/70">
            {isSearching ? '试试其他关键词吧！' : '快来发布第一条吧！'}
          </p>
          {!isSearching && <div className="text-xs text-muted-foreground/50">支持 Markdown 格式，可以插入图片代码块等</div>}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {microblogs.map((microblog) => (
        <MicroblogCard
          key={microblog.id}
          microblog={microblog}
          isExpanded={Boolean(expandedComments[microblog.id])}
          commentInput={commentInputs[microblog.id] || ''}
          commentLoading={Boolean(commentLoading[microblog.id])}
          editing={Boolean(editingMicroblog[microblog.id])}
          editingContent={editingContent[microblog.id] || ''}
          editingImages={editingImages[microblog.id] || []}
          editingComments={editingComments}
          editingCommentContent={editingCommentContent}
          user={user}
          getGuestInfo={getGuestInfo}
          formatTime={formatTime}
          formatFullTime={formatFullTime}
          onLike={onLike}
          onToggleComments={onToggleComments}
          onCommentInputChange={onCommentInputChange}
          onSubmitComment={onSubmitComment}
          onCommentGuestInfoChange={onCommentGuestInfoChange}
          onStartEditing={onStartEditing}
          onCancelEditing={onCancelEditing}
          onSaveEdit={onSaveEdit}
          onEditContentChange={onEditContentChange}
          onEditImagesUpload={onEditImagesUpload}
          onRemoveEditingImage={onRemoveEditingImage}
          onDeleteMicroblog={onDeleteMicroblog}
          onStartEditComment={onStartEditComment}
          onCancelEditComment={onCancelEditComment}
          onEditCommentChange={onEditCommentChange}
          onSaveEditComment={onSaveEditComment}
          onDeleteComment={onDeleteComment}
        />
      ))}
    </div>
  )
}
