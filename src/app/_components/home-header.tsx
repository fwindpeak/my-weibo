'use client'

import { useEffect, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppUser } from '@/types/microblog'
import { LogIn, MessageCircle, Search, X } from 'lucide-react'

interface HomeHeaderProps {
  searchTerm: string
  isSearching: boolean
  user: AppUser | null
  isSearchVisible: boolean
  showScrollTop: boolean
  onSearchChange: (term: string) => void
  onSearchClick: () => void
  onToggleSearch: () => void
  onClearSearch: () => void
  onScrollTop: () => void
  onLoginClick: () => void
}

export default function HomeHeader({
  searchTerm,
  isSearching,
  user,
  isSearchVisible,
  showScrollTop,
  onSearchChange,
  onSearchClick,
  onToggleSearch,
  onClearSearch,
  onScrollTop,
  onLoginClick,
}: HomeHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isSearchVisible) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [isSearchVisible])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-shadow ${showScrollTop ? 'shadow-sm cursor-pointer' : ''}`}
      onClick={(event) => {
        if (!showScrollTop) return
        const target = event.target as HTMLElement
        if (target.closest('[data-interactive="true"]')) return
        onScrollTop()
      }}
    >
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center" data-interactive="true">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  我的微博
                </h1>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  记录生活点滴，分享精彩瞬间
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex w-full items-center justify-end gap-2 sm:flex-1 sm:justify-end">
              {isSearchVisible ? (
                <div className="flex w-full items-center gap-2 sm:w-auto" data-interactive="true">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="搜索内容..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="h-9 rounded-full border-muted-foreground/20 bg-background/80 pl-10 pr-10 text-sm"
                      data-interactive="true"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClearSearch}
                        className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                        data-interactive="true"
                        aria-label="清除搜索"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-9 rounded-full px-3 text-xs whitespace-nowrap"
                    onClick={onSearchClick}
                    data-interactive="true"
                  >
                    <Search className="mr-1 h-3 w-3" />
                    搜索
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSearch}
                    className="h-9 w-9"
                    data-interactive="true"
                    aria-label="收起搜索"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="h-9 rounded-full px-3 text-xs whitespace-nowrap"
                  onClick={onToggleSearch}
                  data-interactive="true"
                >
                  <Search className="mr-1 h-3 w-3" />
                  搜索
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end" data-interactive="true">
              {isSearching && (
                <Badge variant="secondary" className="w-fit rounded-full px-2 py-0.5 text-[11px]">
                  搜索结果: "{searchTerm}"
                </Badge>
              )}
              {user ? (
                <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px]">
                  {user.isAdmin ? '管理员已登录' : `${user.username}`}
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full px-3 text-xs"
                  onClick={onLoginClick}
                  data-interactive="true"
                >
                  <LogIn className="mr-1 h-3 w-3" />
                  管理登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

