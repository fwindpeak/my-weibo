import { ChangeEvent } from 'react'
import { ImagePlus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MarkdownEditor } from '@/components/ui/markdown-editor'

export interface SelectedImageItem {
  id: string
  file?: File
  previewUrl?: string
  remoteUrl?: string
  altText?: string
  uploading?: boolean
  uploadError?: boolean
}

interface CreateMicroblogCardProps {
  content: string
  selectedImages: SelectedImageItem[]
  isSubmitting: boolean
  formatFullTime: (value: string) => string
  onContentChange: (value: string) => void
  onImageUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  onSubmit: () => void
}

export function CreateMicroblogCard({
  content,
  selectedImages,
  isSubmitting,
  formatFullTime,
  onContentChange,
  onImageUpload,
  onRemoveImage,
  onSubmit,
}: CreateMicroblogCardProps) {
  return (
    <Card className="mb-6 border-primary/10 bg-gradient-to-br from-background to-muted/10">
      <CardContent className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">发布新微博</h2>
            <p className="text-xs text-muted-foreground">支持 Markdown 格式，图片将自动展示</p>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
            {formatFullTime(new Date().toISOString())}
          </Badge>
        </div>

        <MarkdownEditor
          value={content}
          onChange={onContentChange}
          placeholder="今天想记录些什么？支持 Markdown 语法"
          height="180px"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>图片</span>
            <label className="cursor-pointer text-primary hover:text-primary/80">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageUpload}
              />
              <span className="inline-flex items-center gap-1">
                <ImagePlus className="h-4 w-4" /> 上传图片
              </span>
            </label>
          </div>

          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {selectedImages.map((image, index) => (
                <div key={image.id} className="group relative overflow-hidden rounded-lg border border-border/60">
                  <img
                    src={image.remoteUrl || image.previewUrl}
                    alt={image.altText || `选择的图片 ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground shadow"
                    aria-label="移除图片"
                  >
                    ×
                  </button>
                  {image.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                      上传中...
                    </div>
                  )}
                  {image.uploadError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 text-xs text-destructive-foreground">
                      上传失败
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={isSubmitting || (!content.trim() && selectedImages.length === 0)}>
            {isSubmitting ? '发布中...' : '发布微博'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
