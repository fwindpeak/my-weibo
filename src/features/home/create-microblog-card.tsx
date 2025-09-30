'use client'

import { ChangeEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LexicalEditor from '@/components/ui/lexical-editor'
import { Image as ImageIcon, Loader2, Send, TriangleAlert } from 'lucide-react'

export interface SelectedImageItem {
  id: string
  file?: File
  previewUrl: string
  remoteUrl?: string
  alt: string
  uploading: boolean
  uploadError?: boolean
}

interface CreateMicroblogCardProps {
  content: string
  selectedImages: SelectedImageItem[]
  isSubmitting: boolean
  formatFullTime: (dateString: string) => string
  onContentChange: (value: string) => void
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  onSubmit: () => void
}

export default function CreateMicroblogCard({
  content,
  selectedImages,
  isSubmitting,
  formatFullTime,
  onContentChange,
  onImageUpload,
  onRemoveImage,
  onSubmit,
}: CreateMicroblogCardProps) {
  const hasPendingUploads = selectedImages.some((image) => image.uploading)
  const canSubmit = Boolean(content.trim() || selectedImages.length) && !hasPendingUploads

  return (
    <Card className="mb-3 sm:mb-4 shadow-md border-primary/20 hover:shadow-lg transition-all duration-300">
      <CardContent className="space-y-2.5">
        <div className="space-y-2">
          <LexicalEditor
            value={content}
            onChange={onContentChange}
            placeholder="分享你的想法..."
            height="120px"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Markdown
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onImageUpload}
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

        {selectedImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-muted/30 rounded-lg">
            {selectedImages.map((preview, index) => (
              <div
                key={preview.id}
                className="relative group"
                draggable={!preview.uploading && !preview.uploadError}
                onDragStart={(event) => {
                  if (!preview.remoteUrl) {
                    event.preventDefault()
                    return
                  }
                  event.dataTransfer.setData(
                    'text/plain',
                    `![${preview.alt || '图片'}](${preview.remoteUrl} "${preview.alt || ''}")`
                  )
                  event.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <img
                  src={preview.remoteUrl ?? preview.previewUrl}
                  alt={preview.alt || `预览 ${index + 1}`}
                  className="w-full h-20 sm:h-24 object-cover rounded-lg border-2 border-border group-hover:border-primary/40 transition-colors"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors opacity-0 group-hover:opacity-100"
                  type="button"
                >
                  ×
                </button>
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {preview.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {preview.uploadError && !preview.uploading && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-destructive/90 text-destructive-foreground py-1 text-[10px] font-semibold">
                    <TriangleAlert className="h-3 w-3" /> 上传失败
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!canSubmit || isSubmitting} className="px-6">
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
  )
}
