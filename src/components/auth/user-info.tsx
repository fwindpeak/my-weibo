'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { User, LogOut } from 'lucide-react'

interface UserInfoProps {
  user: {
    id: string
    username: string
    email: string
    isAdmin: boolean
  }
  onLogout: () => void
  onShowLogin: () => void
}

export default function UserInfo({ user, onLogout, onShowLogin }: UserInfoProps) {
  if (!user) {
    return <div className="mb-3 sm:mb-4" />
  }

  return (
    <Card className="mb-4 sm:mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <span className="font-medium text-sm text-foreground">{user.username}</span>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="text-xs"
          >
            <LogOut className="w-3 h-3 mr-1" />
            退出
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
