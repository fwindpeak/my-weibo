'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { useEffect } from 'react'

interface LexicalMarkdownEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
}

export function LexicalMarkdownEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  readOnly = false
}: LexicalMarkdownEditorProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor) return

    // 更新编辑器内容
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      
      if (value) {
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode(value))
        root.append(paragraph)
      }
    })
  }, [editor, value])

  useEffect(() => {
    if (!editor || readOnly) return

    // 监听编辑器变化
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()
        onChange?.(text)
      })
    })

    return () => {
      unregister()
    }
  }, [editor, onChange, readOnly])

  return null
}