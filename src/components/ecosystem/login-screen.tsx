'use client'

/**
 * Login / Register screen for the SupremeAI ecosystem dashboard.
 * The first account registered on a fresh backend becomes the admin.
 */

import * as React from 'react'
import { ArrowRight, Loader2, LogIn, ShieldCheck, UserPlus, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ecosystemApi, getBackendUrl } from '@/lib/ecosystem/api'
import type { ServiceHealth, User } from '@/lib/ecosystem/types'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register'

export function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void
}) {
  const [mode, setMode] = React.useState<Mode>('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [health, setHealth] = React.useState<ServiceHealth | null>(null)
  const [healthChecked, setHealthChecked] = React.useState(false)

  // Probe backend reachability so the user gets a clear signal early.
  React.useEffect(() => {
    let cancelled = false
    ecosystemApi
      .health()
      .then((h) => {
        if (!cancelled) setHealth(h)
      })
      .catch(() => {
        if (!cancelled) setHealth(null)
      })
      .finally(() => {
        if (!cancelled) setHealthChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const res =
        mode === 'login'
          ? await ecosystemApi.login(email.trim(), password)
          : await ecosystemApi.register(email.trim(), password, name.trim() || undefined)
      onAuthenticated(res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
            <Zap className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SupremeAI Ecosystem</h1>
            <p className="text-sm text-muted-foreground">
              Self-evolving capability control plane
            </p>
          </div>
          {healthChecked ? (
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                health
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  health ? 'bg-emerald-500' : 'bg-amber-500',
                )}
              />
              {health
                ? `Backend online · v${health.version} · ${health.service}`
                : `Backend unreachable at ${getBackendUrl()} — adjust in Settings`}
            </div>
          ) : null}
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === 'login' ? (
                <>
                  <LogIn className="size-4" /> Sign in
                </>
              ) : (
                <>
                  <UserPlus className="size-4" /> Create account
                </>
              )}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Use your ecosystem credentials to access the dashboard.'
                : 'Register a new account. The very first account becomes the admin.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === 'register' ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={4}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                {mode === 'login' ? 'Sign in' : 'Register'}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError(null)
                }}
              >
                {mode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already have an account? Sign in'}
              </button>
            </CardFooter>
          </form>
        </Card>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Sessions are JWT-backed and rotate on refresh. Tokens are stored locally
          in your browser.
        </p>
      </div>
    </div>
  )
}
