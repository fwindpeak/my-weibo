'use client'

import { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

type MessageBoxVariant = 'default' | 'destructive'

interface MessageBoxProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  icon?: ReactNode
  variant?: MessageBoxVariant
  onConfirm: () => void
  onCancel: () => void
}

export function MessageBox({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  loading = false,
  icon,
  variant = 'default',
  onConfirm,
  onCancel,
}: MessageBoxProps) {
  const iconStyles =
    variant === 'destructive'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-primary/10 text-primary'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel()
        }
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconStyles}`}>
            {icon ?? <AlertTriangle className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

