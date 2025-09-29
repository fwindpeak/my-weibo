import { useEffect, useMemo, useState } from 'react'
import { Eye, Code2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

import { cn } from '@/lib/utils'

export interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  height?: string
  enablePreviewToggle?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  readOnly = false,
  height = '200px',
  enablePreviewToggle = true,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'source' | 'preview'>(readOnly ? 'preview' : 'source')
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (readOnly) {
      setMode('preview')
    } else if (!enablePreviewToggle) {
      setMode('source')
    }
  }, [readOnly, enablePreviewToggle])

  const showPreview = readOnly || (enablePreviewToggle && mode === 'preview')
  const showToggle = enablePreviewToggle && !readOnly
  const placeholderVisible = !showPreview && !value && !isFocused

  const markdown = useMemo(
    () => (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {value || ''}
      </ReactMarkdown>
    ),
    [value]
  )

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="relative flex-1" style={{ minHeight: height }}>
        {showPreview ? (
          <div className="prose prose-sm max-w-none p-4 dark:prose-invert">
            {value?.trim() ? markdown : (
              <p className="text-sm text-muted-foreground">预览区域，输入内容后将显示渲染效果...</p>
            )}
          </div>
        ) : (
          <div className="relative h-full">
            {placeholderVisible && (
              <div className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground">
                {placeholder}
              </div>
            )}
            <textarea
              value={value}
              onChange={(event) => onChange?.(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="h-full w-full resize-none bg-transparent p-4 text-sm outline-none"
              style={{ minHeight: height }}
            />
          </div>
        )}
      </div>
      {showToggle && (
        <div className="flex items-center gap-1 border-t border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode('source')}
            className={cn(
              'flex items-center gap-1 rounded-sm px-2 py-1 transition-colors',
              mode === 'source'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={mode === 'source'}
          >
            <Code2 className="h-3.5 w-3.5" /> 源码
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'flex items-center gap-1 rounded-sm px-2 py-1 transition-colors',
              mode === 'preview'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={mode === 'preview'}
          >
            <Eye className="h-3.5 w-3.5" /> 预览
          </button>
        </div>
      )}
    </div>
  )
}
