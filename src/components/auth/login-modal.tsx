'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppUser } from '@/types/microblog'
import { Lock, Mail, User, X } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  initialMode?: 'admin' | 'user'
  onClose: () => void
  onLogin: (user: AppUser) => void
}

type LoginMode = 'admin' | 'user'

type AdminLoginData = {
  username: string
  password: string
}

type UserLoginData = {
  username: string
  email: string
  password: string
}

const adminDefaults: AdminLoginData = { username: '', password: '' }
const userDefaults: UserLoginData = { username: '', email: '', password: '' }

export default function LoginModal({ isOpen, initialMode = 'admin', onClose, onLogin }: LoginModalProps) {
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [adminData, setAdminData] = useState<AdminLoginData>(adminDefaults)
  const [userData, setUserData] = useState<UserLoginData>(userDefaults)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setAdminData({ ...adminDefaults })
    setUserData({ ...userDefaults })
    setIsLoading(false)
    setError('')
  }, [isOpen, initialMode])

  const handleModeChange = (nextMode: LoginMode) => {
    if (mode === nextMode) return
    setMode(nextMode)
    setError('')
    if (nextMode === 'admin') {
      setAdminData({ ...adminDefaults })
    } else {
      setUserData({ ...userDefaults })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    let endpoint = '/api/auth/admin-login'
    let payload: Record<string, string | undefined> = {}

    if (mode === 'admin') {
      if (!adminData.username.trim() || !adminData.password) {
        setError('请输入用户名和密码')
        return
      }
      payload = {
        username: adminData.username.trim(),
        password: adminData.password,
      }
    } else {
      if (!userData.email.trim() || !userData.password) {
        setError('请输入邮箱和密码')
        return
      }

      endpoint = '/api/auth/login'
      payload = {
        username: userData.username.trim() || undefined,
        email: userData.email.trim(),
        password: userData.password,
      }
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch (parseError) {
        data = null
      }

      if (!response.ok || !data) {
        setError(data?.message || '登录失败')
        return
      }

      onLogin(data)
      onClose()
    } catch (loginError) {
      console.error('Login error:', loginError)
      setError('网络错误，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="relative w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-2 top-2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-base"><div className="flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'admin' ? 'default' : 'outline'}
              onClick={() => handleModeChange('admin')}
            >
              管理员登录
            </Button>
            
          </div></CardTitle>
          
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="admin-username" className="text-sm font-medium">
                  用户名
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-username"
                    type="text"
                    value={adminData.username}
                    onChange={(event) =>
                      setAdminData((prev) => ({ ...prev, username: event.target.value }))
                    }
                    className="pl-10"
                    placeholder="请输入管理员用户名"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={mode === 'admin' ? adminData.password : userData.password}
                  onChange={(event) =>
                    mode === 'admin'
                      ? setAdminData((prev) => ({ ...prev, password: event.target.value }))
                      : setUserData((prev) => ({ ...prev, password: event.target.value }))
                  }
                  className="pl-10"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-2 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
