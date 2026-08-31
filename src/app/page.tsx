'use client'

/**
 * SupremeAI Ecosystem dashboard — single-page app shell.
 *
 * Routing model (client-side, no URL routes):
 *   - No session            → LoginScreen
 *   - Session + user role   → UserDashboard
 *   - Session + admin role  → AdminDashboard  (10 tabs)
 *   - Settings view         → SettingsPanel (any authenticated role)
 *
 * A sticky footer is anchored to the bottom of the viewport via a
 * min-h-screen flex column layout.
 */

import * as React from 'react'
import { Loader2, LogOut, Settings, ShieldCheck, User as UserIcon, Zap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  clearSession,
  ecosystemApi,
  getStoredUser,
  onUnauthorized,
  setStoredUser,
} from '@/lib/ecosystem/api'
import type { User } from '@/lib/ecosystem/types'
import { AdminDashboard } from '@/components/ecosystem/admin-dashboard'
import { LoginScreen } from '@/components/ecosystem/login-screen'
import { SettingsPanel } from '@/components/ecosystem/settings-panel'
import { UserDashboard } from '@/components/ecosystem/user-dashboard'

type View = 'dashboard' | 'settings'

export default function Home() {
  const { toast } = useToast()
  const [user, setUser] = React.useState<User | null>(null)
  const [booting, setBooting] = React.useState(true)
  const [view, setView] = React.useState<View>('dashboard')

  // Boot: restore session from localStorage and validate against /auth/me.
  React.useEffect(() => {
    let cancelled = false
    const stored = getStoredUser()
    if (!stored) {
      setBooting(false)
      return
    }
    setUser(stored)
    ecosystemApi
      .getMe()
      .then((me) => {
        if (cancelled) return
        setStoredUser(me) // refresh the cached profile (e.g. after a role change)
        setUser(me)
      })
      .catch(() => {
        if (cancelled) return
        // 401s clear the session in the client; drop back to the login screen.
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-logout on any 401 from the API layer (expired/revoked token).
  React.useEffect(() => {
    const off = onUnauthorized(() => {
      setUser(null)
      setView('dashboard')
    })
    return off
  }, [])

  async function handleLogout() {
    try {
      await ecosystemApi.logout()
      toast({ title: 'Signed out', description: 'Session invalidated.' })
    } catch {
      // Session already dead server-side — clearing locally is enough.
      clearSession()
      toast({ title: 'Signed out', description: 'Cleared local session.' })
    } finally {
      setUser(null)
      setView('dashboard')
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Restoring session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onAuthenticated={(u) => setUser(u)} />
  }

  const isAdmin = user.role === 'admin'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ------------------------- Header ------------------------- */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <Zap className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                SupremeAI Ecosystem
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {isAdmin ? 'Admin control center' : 'Task workspace'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge
              variant="outline"
              className={
                isAdmin
                  ? 'gap-1 border-zinc-300 bg-zinc-100 font-medium dark:border-zinc-700 dark:bg-zinc-800'
                  : 'gap-1 font-medium'
              }
            >
              {isAdmin ? <ShieldCheck className="size-3" /> : <UserIcon className="size-3" />}
              <span className="hidden max-w-[10rem] truncate sm:inline">{user.email}</span>
              <span className="sm:hidden">{user.role}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              title="Settings"
              aria-label="Open settings"
              onClick={() => setView(view === 'settings' ? 'dashboard' : 'settings')}
            >
              <Settings className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Log out"
              aria-label="Log out"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------- Main ------------------------- */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {view === 'settings' ? (
          <SettingsPanel currentUser={user} onLogout={() => void handleLogout()} />
        ) : isAdmin ? (
          <AdminDashboard currentUser={user} />
        ) : (
          <UserDashboard user={user} onUnauthorized={() => setUser(null)} />
        )}
      </main>

      {/* ------------------------- Footer ------------------------- */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-1 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>SupremeAI Ecosystem — self-evolving capability control plane</p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
            48-endpoint backend · REUSE &gt; ADAPT &gt; EXTEND &gt; CREATE
          </p>
        </div>
      </footer>
    </div>
  )
}
