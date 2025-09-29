'use client'

import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
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
  onSubmitShortcut?: () => void
}

const MIN_EDITOR_HEIGHT = 60

const parseHeight = (value: string | number | undefined) => {
  if (typeof value === 'number') {
    return value
  }

  if (!value) {
    return 200
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 200
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  readOnly = false,
  height = '200px',
  enablePreviewToggle = true,
  onSubmitShortcut,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'source' | 'preview'>(readOnly ? 'preview' : 'source')
  const [isFocused, setIsFocused] = useState(false)
  const [editorHeight, setEditorHeight] = useState(() => Math.max(MIN_EDITOR_HEIGHT, parseHeight(height)))

  const showPreview = readOnly || (enablePreviewToggle && mode === 'preview')
  const showToggle = enablePreviewToggle && !readOnly
  const placeholderVisible = !showPreview && !value && !isFocused

  useEffect(() => {
    setEditorHeight((current) => {
      const next = Math.max(MIN_EDITOR_HEIGHT, parseHeight(height))
      return current === next ? current : next
    })
  }, [height])

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

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (readOnly) return

    event.preventDefault()
    const startY = event.clientY
    const startHeight = editorHeight

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const delta = pointerEvent.clientY - startY
      setEditorHeight(Math.max(MIN_EDITOR_HEIGHT, startHeight + delta))
    }

    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)
  }

  return (
    <div className="relative flex flex-col border border-border rounded-lg bg-background overflow-hidden">
      <div className="relative flex-1">
        {showPreview ? (
          <div
            className="relative overflow-y-auto bg-background px-4 py-3 text-base leading-relaxed text-foreground"
            style={{ minHeight: editorHeight }}
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
          <div className="relative" style={{ height: editorHeight }}>
            {placeholderVisible && (
              <div className="pointer-events-none absolute left-4 top-3 z-10 text-muted-foreground text-sm">
                {placeholder}
              </div>
            )}
            <MonacoEditorWrapper
              value={value}
              onChange={(nextValue) => {
                const sanitizedValue = nextValue?.replace(/\$0/g, '') ?? ''
                onChange?.(sanitizedValue)
              }}
              height={`${editorHeight}px`}
              language="markdown"
              withContainer={false}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onMount={(editorInstance, monacoInstance) => {
                if (!onSubmitShortcut) {
                  return
                }

                editorInstance.addCommand(
                  monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
                  () => {
                    onSubmitShortcut()
                  },
                )
              }}
              className="h-full px-4"
            />
          </div>
        )}
      </div>

      {showToggle && (
        <div className="flex items-center gap-1 border-t border-border bg-background/95 px-2.5 py-1.5 text-xs font-medium">
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

      {!readOnly && (
        <div
          role="separator"
          aria-label="调整编辑器高度"
          className="flex h-3 cursor-row-resize items-center justify-center border-t border-border bg-muted/30 hover:bg-muted/50"
          onPointerDown={startResize}
        >
          <span className="h-1 w-8 rounded-full bg-border" />
        </div>
      )}
    </div>
  )
}
