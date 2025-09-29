'use client'

import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

// 动态导入Monaco Editor，避免SSR问题
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
)

import type { OnMount } from '@monaco-editor/react'

interface MonacoEditorWrapperProps {
  value: string
  onChange?: (value: string) => void
  height?: string
  language?: string
  withContainer?: boolean
  onFocus?: () => void
  onBlur?: () => void
  onMount?: OnMount
  className?: string
}

export default function MonacoEditorWrapper({
  value,
  onChange,
  height = '200px',
  language = 'markdown',
  withContainer = true,
  onFocus,
  onBlur,
  onMount,
  className
}: MonacoEditorWrapperProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light'

  const editor = (
    <MonacoEditor
      height={height}
      language={language}
      theme={monacoTheme}
      value={value}
      onChange={(content) => onChange?.(content || '')}
      onMount={(editorInstance, monacoInstance) => {
        onMount?.(editorInstance, monacoInstance)
        editorInstance.onDidFocusEditorText(() => onFocus?.())
        editorInstance.onDidBlurEditorText(() => onBlur?.())
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'off',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        folding: false,
        showFoldingControls: 'never',
        renderLineHighlight: 'none',
        guides: {
          indentation: false,
          highlightActiveIndentation: false
        },
        selectOnLineNumbers: false,
        matchBrackets: 'always',
        autoIndent: 'advanced',
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        parameterHints: { enabled: true },
        wordBasedSuggestions: 'allDocuments',
        tabSize: 2,
        insertSpaces: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false
        },
        lineDecorationsWidth: 0,
        renderWhitespace: 'selection',
        padding: { top: 10, bottom: 10 }
      }}
    />
  )

  if (!withContainer) {
    return editor
  }

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden bg-background', className)}>
      {editor}
    </div>
  )
}
