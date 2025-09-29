import { useEffect, useRef } from 'react'
import { LogIn, LogOut, MessageCircle, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppUser } from '@/types/microblog'

interface HomeHeaderProps {
  searchTerm: string
  user: AppUser | null
  isSearchVisible: boolean
  showScrollTop: boolean
  onSearchChange: (term: string) => void
  onSearchClick: () => void
  onToggleSearch: () => void
  onClearSearch: () => void
  onScrollTop: () => void
  onLoginClick: () => void
  onLogoutClick: () => void
}

export function HomeHeader({
  searchTerm,
  user,
  isSearchVisible,
  showScrollTop,
  onSearchChange,
  onSearchClick,
  onToggleSearch,
  onClearSearch,
  onScrollTop,
  onLoginClick,
  onLogoutClick,
}: HomeHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isSearchVisible) return
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [isSearchVisible])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-background/95 backdrop-blur transition-shadow ${showScrollTop ? 'shadow-sm cursor-pointer' : ''}`}
      onClick={(event) => {
        if (!showScrollTop) return
        const target = event.target as HTMLElement
        if (target.closest('[data-interactive="true"]')) return
        onScrollTop()
      }}
    >
      <div className="container mx-auto max-w-2xl px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className={`${isSearchVisible ? 'hidden sm:flex' : 'flex'} min-w-0 flex-1 items-center gap-3`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10" data-interactive="true">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="truncate">
              <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-xl font-bold text-transparent">
                我的微博
              </h1>
              <p className="text-[11px] leading-4 text-muted-foreground">随时记录想法</p>
            </div>
          </div>
          <div className={`flex items-center justify-end gap-2 ${isSearchVisible ? 'flex-1' : 'flex-shrink-0'}`}>
            {isSearchVisible ? (
              <div className="flex w-full items-center gap-2" data-interactive="true">
                <div className="relative min-w-[160px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="搜索内容..."
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        onSearchClick()
                      } else if (event.key === 'Escape') {
                        onToggleSearch()
                      }
                    }}
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
                className="h-9 whitespace-nowrap rounded-full px-3 text-xs"
                onClick={onToggleSearch}
                data-interactive="true"
              >
                <Search className="mr-1 h-3 w-3" /> 搜索
              </Button>
            )}
          </div>
          <div className={`${isSearchVisible ? 'hidden sm:flex' : 'flex'} flex-shrink-0 items-center justify-end gap-2`} data-interactive="true">
            {user ? (
              <LogOut className="h-5 w-5 cursor-pointer" onClick={onLogoutClick} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full px-3 text-xs"
                onClick={onLoginClick}
              >
                <LogIn className="mr-1 h-3 w-3" /> 管理登录
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
