import { createContext, useContext, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

interface DialogContextValue {
  open: boolean
  onOpenChange?: (open: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return <DialogContext.Provider value={{ open, onOpenChange }}>{open ? children : null}</DialogContext.Provider>
}

function useDialogContext(component: string) {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error(`${component} must be used within a Dialog`)
  }
  return context
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
}

export function DialogContent({ className, showCloseButton = true, children, ...props }: DialogContentProps) {
  const { open, onOpenChange } = useDialogContext('DialogContent')

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange?.(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const portalTarget = typeof document !== 'undefined' ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-xl border border-border bg-background shadow-xl focus:outline-none',
          className
        )}
        {...props}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            aria-label="关闭"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>,
    portalTarget
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2 border-b border-border px-6 py-4 text-center', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end', className)} {...props} />
}
