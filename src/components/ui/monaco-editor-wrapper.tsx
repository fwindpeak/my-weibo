'use client'

import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'

// 动态导入Monaco Editor，避免SSR问题
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
)

interface MonacoEditorWrapperProps {
  value: string
  onChange?: (value: string) => void
  height?: string
  language?: string
}

export default function MonacoEditorWrapper({
  value,
  onChange,
  height = '200px',
  language = 'markdown'
}: MonacoEditorWrapperProps) {
  const { theme } = useTheme()
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light'

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <MonacoEditor
        height={height}
        language={language}
        theme={monacoTheme}
        value={value}
        onChange={(value) => onChange?.(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          folding: true,
          showFoldingControls: 'always',
          renderLineHighlight: 'all',
          selectOnLineNumbers: true,
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
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          },
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          padding: { top: 10, bottom: 10 }
        }}
      />
    </div>
  )
}