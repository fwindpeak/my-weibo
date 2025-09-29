import { useEffect, useState } from 'react'
import { Lock, Mail, User, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import { AppUser } from '@/types/microblog'

interface LoginModalProps {
  isOpen: boolean
  initialMode?: 'admin' | 'user'
  onClose: () => void
  onLogin: (user: AppUser) => void
}

type LoginMode = 'admin' | 'user'

type AdminForm = {
  username: string
  password: string
}

type UserForm = {
  username: string
  email: string
  password: string
}

const adminDefaults: AdminForm = { username: '', password: '' }
const userDefaults: UserForm = { username: '', email: '', password: '' }

export function LoginModal({ isOpen, initialMode = 'admin', onClose, onLogin }: LoginModalProps) {
  const [mode, setMode] = useState<LoginMode>(initialMode)
  const [adminForm, setAdminForm] = useState<AdminForm>(adminDefaults)
  const [userForm, setUserForm] = useState<UserForm>(userDefaults)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setMode(initialMode)
    setAdminForm({ ...adminDefaults })
    setUserForm({ ...userDefaults })
    setError('')
    setIsLoading(false)
  }, [isOpen, initialMode])

  const handleModeChange = (next: LoginMode) => {
    if (mode === next) return
    setMode(next)
    setError('')
    if (next === 'admin') {
      setAdminForm({ ...adminDefaults })
    } else {
      setUserForm({ ...userDefaults })
    }
  }

  const parseErrorMessage = (value: unknown) => {
    if (!value) return '登录失败'
    if (value instanceof Error) {
      try {
        const parsed = JSON.parse(value.message)
        if (parsed && typeof parsed === 'object' && 'message' in parsed) {
          return String(parsed.message)
        }
      } catch {
        // ignore
      }
      return value.message || '登录失败'
    }
    return '登录失败'
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setIsLoading(true)
      setError('')

      if (mode === 'admin') {
        if (!adminForm.username.trim() || !adminForm.password) {
          setError('请输入用户名和密码')
          return
        }
        const user = await apiFetch<AppUser>('/api/auth/admin-login', {
          method: 'POST',
          body: JSON.stringify({
            username: adminForm.username.trim(),
            password: adminForm.password,
          }),
        })
        onLogin(user)
        onClose()
        return
      }

      if (!userForm.email.trim() || !userForm.password) {
        setError('请输入邮箱和密码')
        return
      }

      const user = await apiFetch<AppUser>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: userForm.username.trim() || undefined,
          email: userForm.email.trim(),
          password: userForm.password,
        }),
      })
      onLogin(user)
      onClose()
    } catch (err) {
      setError(parseErrorMessage(err))
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

        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-base">
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === 'admin' ? 'default' : 'outline'}
                onClick={() => handleModeChange('admin')}
              >
                管理员登录
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'user' ? 'default' : 'outline'}
                onClick={() => handleModeChange('user')}
              >
                普通登录
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'admin' ? (
              <div className="space-y-2">
                <Label htmlFor="admin-username" className="text-sm font-medium">
                  用户名
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="admin-username"
                    type="text"
                    value={adminForm.username}
                    onChange={(event) =>
                      setAdminForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    className="pl-10"
                    placeholder="请输入管理员用户名"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="user-username" className="text-sm font-medium">
                    昵称（可选）
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="user-username"
                      type="text"
                      value={userForm.username}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, username: event.target.value }))
                      }
                      className="pl-10"
                      placeholder="用于展示的昵称"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-email" className="text-sm font-medium">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="user-email"
                      type="email"
                      value={userForm.email}
                      onChange={(event) =>
                        setUserForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="pl-10"
                      placeholder="请输入邮箱"
                      required
                    />
                  </div>
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
                  value={mode === 'admin' ? adminForm.password : userForm.password}
                  onChange={(event) =>
                    mode === 'admin'
                      ? setAdminForm((prev) => ({ ...prev, password: event.target.value }))
                      : setUserForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  className="pl-10"
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {error && <div className="rounded-md bg-red-50 p-2 text-center text-sm text-red-600">{error}</div>}

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
