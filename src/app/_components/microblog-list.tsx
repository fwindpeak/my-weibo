'use client'

import MicroblogCard from './microblog-card'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

interface MicroblogListProps {
  microblogs: Microblog[]
  isLoading: boolean
  isSearching: boolean
  expandedComments: Record<string, boolean>
  commentInputs: Record<string, string>
  commentLoading: Record<string, boolean>
  editingMicroblog: Record<string, boolean>
  editingContent: Record<string, string>
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
  onDeleteMicroblog: (microblogId: string) => void
  onStartEditComment: (microblogId: string, commentId: string, content: string) => void
  onCancelEditComment: (commentId: string) => void
  onEditCommentChange: (commentId: string, value: string) => void
  onSaveEditComment: (microblogId: string, commentId: string) => void
  onDeleteComment: (microblogId: string, commentId: string) => void
}

export default function MicroblogList({
  microblogs,
  isLoading,
  isSearching,
  expandedComments,
  commentInputs,
  commentLoading,
  editingMicroblog,
  editingContent,
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
  onDeleteMicroblog,
  onStartEditComment,
  onCancelEditComment,
  onEditCommentChange,
  onSaveEditComment,
  onDeleteComment,
}: MicroblogListProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
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
          <MicroblogCard
            key={microblog.id}
            microblog={microblog}
            isExpanded={Boolean(expandedComments[microblog.id])}
            commentInput={commentInputs[microblog.id] || ''}
            commentLoading={Boolean(commentLoading[microblog.id])}
            editing={Boolean(editingMicroblog[microblog.id])}
            editingContent={editingContent[microblog.id] || ''}
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
            onDeleteMicroblog={onDeleteMicroblog}
            onStartEditComment={onStartEditComment}
            onCancelEditComment={onCancelEditComment}
            onEditCommentChange={onEditCommentChange}
            onSaveEditComment={onSaveEditComment}
            onDeleteComment={onDeleteComment}
          />
        ))
      )}
    </div>
  )
}
