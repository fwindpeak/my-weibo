'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle } from 'lucide-react'
import MonacoEditorWrapper from '@/components/ui/monaco-editor-wrapper'
import { AppUser, GuestIdentity, Microblog } from '@/types/microblog'

interface MicroblogCardProps {
  microblog: Microblog
  isExpanded: boolean
  commentInput: string
  commentLoading: boolean
  editing: boolean
  editingContent: string
  user: AppUser | null
  getGuestInfo: (microblogId: string) => GuestIdentity
  formatTime: (dateString: string) => string
  formatFullTime: (dateString: string) => string
  onLike: (microblogId: string) => void
  onToggleComments: (microblogId: string) => void
  onCommentInputChange: (microblogId: string, value: string) => void
  onSubmitComment: (microblogId: string) => void
  onCommentGuestInfoChange: (microblogId: string, field: 'name' | 'email', value: string) => void
  onCancelEditing: (microblogId: string) => void
  onSaveEdit: (microblogId: string) => void
  onEditContentChange: (microblogId: string, value: string) => void
}

export default function MicroblogCard({
  microblog,
  isExpanded,
  commentInput,
  commentLoading,
  editing,
  editingContent,
  user,
  getGuestInfo,
  formatTime,
  formatFullTime,
  onLike,
  onToggleComments,
  onCommentInputChange,
  onSubmitComment,
  onCommentGuestInfoChange,
  onCancelEditing,
  onSaveEdit,
  onEditContentChange,
}: MicroblogCardProps) {
  const guestInfo = getGuestInfo(microblog.id)
  const handleGuestKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmitComment(microblog.id)
    }
  }

  const handleUserKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmitComment(microblog.id)
    }
  }

  return (
    <Card className="hover:shadow-md transition-all duration-300 border-primary/10 hover:border-primary/20 bg-gradient-to-br from-background to-muted/5">
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="mb-2.5">
          {editing ? (
            <div className="space-y-3">
              <MonacoEditorWrapper
                value={editingContent}
                onChange={(value) => onEditContentChange(microblog.id, value)}
                height="120px"
                language="markdown"
              />
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
                  disabled={!editingContent?.trim()}
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
          <div
            className={`grid gap-1.5 mb-2.5 ${
              microblog.images.length === 1
                ? 'grid-cols-1'
                : microblog.images.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
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

        <div className="flex items-center justify-between text-base text-muted-foreground pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLike(microblog.id)}
              className="flex items-center gap-1 hover:text-red-500 transition-colors group"
              title="点赞"
            >
              <Heart className="w-4 h-4 group-hover:fill-current transition-all" />
              {microblog.likes.length > 0 && <span className="text-xs font-medium">{microblog.likes.length}</span>}
            </button>
            <button
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
                {microblog.comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/30 px-3 py-2.5 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      {comment.user ? (
                        <span className="font-medium text-xs text-foreground">{comment.user.username}</span>
                      ) : (
                        <span className="font-medium text-xs text-foreground">{comment.guestName}</span>
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
                  <input
                    type="text"
                    placeholder="写下你的评论..."
                    value={commentInput}
                    onChange={(e) => onCommentInputChange(microblog.id, e.target.value)}
                    className="flex-1 px-3 py-2 text-base border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    onKeyPress={handleGuestKeyPress}
                  />
                  <Button
                    onClick={() => onSubmitComment(microblog.id)}
                    disabled={
                      !commentInput?.trim() ||
                      !guestInfo.name.trim() ||
                      !guestInfo.email.trim() ||
                      commentLoading
                    }
                    size="sm"
                    className="px-4"
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
                <input
                  type="text"
                  placeholder="写下你的评论..."
                  value={commentInput}
                  onChange={(e) => onCommentInputChange(microblog.id, e.target.value)}
                  className="flex-1 px-3 py-2 text-base border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  onKeyPress={handleUserKeyPress}
                />
                <Button
                  onClick={() => onSubmitComment(microblog.id)}
                  disabled={!commentInput?.trim() || commentLoading}
                  size="sm"
                  className="px-4"
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
    </Card>
  )
}
