'use client'

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ListItemNode, ListNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { LexicalMarkdownEditor } from './lexical-markdown-editor'

const editorConfig = {
  namespace: 'MicroblogEditor',
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    AutoLinkNode,
    LinkNode,
  ],
  onError(error: Error) {
    console.error(error)
  },
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'line-through',
    },
    heading: {
      h1: 'text-2xl font-bold mt-6 mb-4',
      h2: 'text-xl font-bold mt-5 mb-3',
      h3: 'text-lg font-bold mt-4 mb-2',
    },
    list: {
      nested: {
        listitem: 'list-none',
      },
      ol: 'list-decimal pl-6',
      ul: 'list-disc pl-6',
      listitem: 'my-1',
    },
    quote: 'border-l-4 border-gray-300 pl-4 italic my-4',
    code: 'bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 font-mono text-sm',
    link: 'text-blue-600 dark:text-blue-400 underline',
  },
}

interface LexicalEditorProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  height?: string
}

export default function LexicalEditor({
  value,
  onChange,
  placeholder = '开始输入...',
  readOnly = false,
  height = '200px',
}: LexicalEditorProps) {
  const initialConfig = {
    ...editorConfig,
    editable: !readOnly,
  }

  return (
    <div className="relative border border-border rounded-lg overflow-hidden bg-background">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="min-h-[120px] p-3 outline-none resize-none font-mono text-base"
                style={{ height }}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {!readOnly && (
            <>
              <HistoryPlugin />
              <AutoFocusPlugin />
              <LinkPlugin />
              <ListPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            </>
          )}
          <LexicalMarkdownEditor value={value} onChange={onChange} readOnly={readOnly} />
        </div>
      </LexicalComposer>
    </div>
  )
}