'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, LogOut, Shield, Settings } from 'lucide-react'

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
    return (
      <div className="mb-4 sm:mb-6">
        {/* 隐藏的管理员登录入口 */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowLogin}
            className="text-xs text-muted-foreground hover:text-primary hover:bg-transparent p-1 h-auto"
          >
            <Settings className="w-3 h-3 mr-1" />
            管理员
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="mb-4 sm:mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{user.username}</span>
                {user.isAdmin && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    管理员
                  </Badge>
                )}
                {!user.isAdmin && (
                  <Badge variant="outline" className="text-xs">
                    普通用户
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{user.email}</span>
              {!user.isAdmin && (
                <div className="text-xs text-muted-foreground mt-1">
                  可以发表评论
                </div>
              )}
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