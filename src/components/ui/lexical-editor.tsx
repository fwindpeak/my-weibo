'use client'

import { useEffect, useState } from 'react'
import { Eye, Code2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import MonacoEditorWrapper from './monaco-editor-wrapper'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  height?: string
  enablePreviewToggle?: boolean
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  readOnly = false,
  height = '200px',
  enablePreviewToggle = false
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'source' | 'preview'>(readOnly ? 'preview' : 'source')
  const [isFocused, setIsFocused] = useState(false)

  const showPreview = readOnly || (enablePreviewToggle && mode === 'preview')
  const showToggle = enablePreviewToggle && !readOnly
  const placeholderVisible = !showPreview && !value && !isFocused

  useEffect(() => {
    if (readOnly) {
      setMode('preview')
      return
    }

    if (!enablePreviewToggle) {
      setMode('source')
    }
  }, [readOnly, enablePreviewToggle])

  useEffect(() => {
    if (showPreview) {
      setIsFocused(false)
    }
  }, [showPreview])

  return (
    <div className="relative border border-border rounded-lg overflow-hidden bg-background">
      {showToggle && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md border border-border bg-background/90 px-1.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
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
            <Code2 className="h-3.5 w-3.5" />
            源码
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
            <Eye className="h-3.5 w-3.5" />
            预览
          </button>
        </div>
      )}

      {showPreview ? (
        <div
          className={cn(
            'relative min-h-[120px] overflow-y-auto rounded-lg bg-background p-4 text-base leading-relaxed text-foreground shadow-sm',
            !readOnly && 'border border-border'
          )}
          style={{ minHeight: height }}
        >
          {value?.trim() ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground">预览区域，输入内容后将显示渲染效果...</p>
          )}
        </div>
      ) : (
        <div className="relative" style={{ minHeight: height }}>
          {placeholderVisible && (
            <div className="pointer-events-none absolute left-3 top-3 text-muted-foreground text-sm">
              {placeholder}
            </div>
          )}
          <MonacoEditorWrapper
            value={value}
            onChange={onChange}
            height={height}
            language="markdown"
            withContainer={false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </div>
      )}
    </div>
  )
}
