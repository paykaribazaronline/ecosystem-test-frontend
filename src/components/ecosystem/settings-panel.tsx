'use client'

/**
 * Settings — backend URL configuration (validated against /health), token
 * refresh, and account actions. Accessible to every authenticated user.
 */

import * as React from 'react'
import { CheckCircle2, Database, KeyRound, LogOut, RefreshCw, ServerCog } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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
import { useToast } from '@/hooks/use-toast'
import {
  ecosystemApi,
  getBackendUrl,
  getToken,
  parseBackendUrl,
  setBackendUrl,
} from '@/lib/ecosystem/api'
import type { ServiceHealth, User } from '@/lib/ecosystem/types'
import {
  ErrorBlock,
  JsonBlock,
  formatDate,
} from './shared'

export function SettingsPanel({
  currentUser,
  onLogout,
}: {
  currentUser: User
  onLogout: () => void
}) {
  const { toast } = useToast()
  const [url, setUrl] = React.useState(getBackendUrl())
  const [probe, setProbe] = React.useState<ServiceHealth | null>(null)
  const [probing, setProbing] = React.useState(false)
  const [probeError, setProbeError] = React.useState<string | null>(null)
  const [tokenMasked, setTokenMasked] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const parsed = parseBackendUrl(url)

  async function validateAndSave(e: React.FormEvent) {
    e.preventDefault()
    setProbing(true)
    setProbeError(null)
    setProbe(null)
    const previous = getBackendUrl()
    setBackendUrl(url.trim())
    try {
      const h = await ecosystemApi.health()
      setProbe(h)
      toast({
        title: 'Backend reachable',
        description: `${h.service} v${h.version} · uptime ${h.uptime.toFixed(0)}s`,
      })
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : 'Health check failed')
      toast({
        title: 'Health check failed',
        description: 'The URL was saved, but the backend did not answer /health.',
        variant: 'destructive',
      })
      if (previous !== url.trim()) setBackendUrl(previous)
    } finally {
      setProbing(false)
    }
  }

  async function doRefresh() {
    setRefreshing(true)
    try {
      const res = await ecosystemApi.refreshToken()
      toast({
        title: 'Token rotated',
        description: `New session issued (${res.token.slice(0, 12)}…)`,
      })
      setTokenState(getToken())
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const [token, setTokenState] = React.useState<string | null>(null)
  React.useEffect(() => {
    setTokenState(getToken())
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Backend connection, session management and account.
        </p>
      </div>

      {/* Backend URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ServerCog className="size-4" /> Backend URL
          </CardTitle>
          <CardDescription>
            Where the ecosystem API is served. A port in the URL (e.g.{' '}
            <code className="font-mono">http://localhost:8010</code>) is routed through the
            gateway automatically.
          </CardDescription>
        </CardHeader>
        <form onSubmit={validateAndSave}>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="backend-url">Base URL</Label>
              <Input
                id="backend-url"
                className="font-mono text-sm"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:8010"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="font-mono">
                path prefix: {parsed.prefix || '/'}
              </Badge>
              <Badge variant="outline" className="font-mono">
                gateway port: {parsed.port ?? 'same-origin'}
              </Badge>
            </div>
            {probeError ? <ErrorBlock message={probeError} /> : null}
            {probe ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" /> {probe.service} v{probe.version} — {probe.status}
                </p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400">
                  uptime {probe.uptime.toFixed(1)}s
                </p>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={probing || !url.trim()}>
              {probing ? <RefreshCw className="size-4 animate-spin" /> : <Database className="size-4" />}
              Validate & save
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> Session
          </CardTitle>
          <CardDescription>
            Signed in as {currentUser.email} ({currentUser.role}) — last login{' '}
            {formatDate(currentUser.last_login_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="token">Current token (JWT)</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setTokenMasked((m) => !m)}
              >
                {tokenMasked ? 'Reveal' : 'Hide'}
              </button>
            </div>
            <Input
              id="token"
              readOnly
              className="font-mono text-xs"
              value={
                token
                  ? tokenMasked
                    ? `${token.slice(0, 14)}${'•'.repeat(18)}${token.slice(-8)}`
                    : token
                  : '—'
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void doRefresh()} disabled={refreshing}>
              <RefreshCw className={'size-4' + (refreshing ? ' animate-spin' : '')} />
              Rotate token
            </Button>
            <Button variant="destructive" onClick={onLogout}>
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account record</CardTitle>
          <CardDescription>As stored by the auth service.</CardDescription>
        </CardHeader>
        <CardContent>
          <JsonBlock value={currentUser} maxHeight="max-h-48" />
        </CardContent>
      </Card>
    </div>
  )
}

