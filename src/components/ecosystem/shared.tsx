'use client'

/**
 * Shared ecosystem UI primitives: state badges, KPI cards, JSON viewer,
 * loading/error/empty blocks, task state-machine stepper and the SSE hook
 * that patches tasks live from the backend event stream.
 */

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Inbox, Loader2, RefreshCw, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { Task, TaskState } from '@/lib/ecosystem/types'

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortenId(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 14 ? `${id.slice(0, 11)}…` : id
}

// ---------------------------------------------------------------------------
// State badge — maps any ecosystem state to a semantic color
// ---------------------------------------------------------------------------

const GREEN_STATES = new Set([
  'ACTIVE', 'APPROVED', 'ALLOWLISTED', 'SUCCEEDED', 'COMPLETED', 'HEALTHY',
  'REGISTERED', 'REUSED', 'ok',
])
const AMBER_STATES = new Set([
  'RECEIVED', 'UNDERSTANDING', 'PLANNING', 'CAPABILITY_CHECK', 'RESOURCE_CHECK',
  'PREPARING', 'EXECUTING', 'VERIFYING', 'DELIVERING', 'PENDING',
  'APPROVAL_PENDING', 'DISCOVERED', 'BUILDING', 'VALIDATING', 'MEASURED',
  'IN_PROGRESS', 'DEFERRED', 'MAINTENANCE', 'AWAITING_APPROVAL',
  'PRACTICALITY_ANALYSIS', 'PROPOSAL', 'RESEARCH', 'SOURCE_CHECK', 'POLICY_GATE',
  'DISCOVERY', 'KNOWLEDGE_RECORDED', 'GAP_SIGNAL', 'CAPABILITY_OPPORTUNITY',
])
const ROSE_STATES = new Set([
  'FAILED', 'REJECTED', 'BLOCKED', 'CRITICAL', 'ESCALATED', 'OFFLINE',
])
const ORANGE_STATES = new Set(['DEGRADED', 'WARNING', 'REPAIRING', 'UNKNOWN'])

const BADGE_CLASSES: Record<string, string> = {
  green: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  rose: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  orange: 'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  gray: 'border-transparent bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

function stateTone(state: string): keyof typeof BADGE_CLASSES {
  const s = state.toUpperCase()
  if (GREEN_STATES.has(s)) return 'green'
  if (ROSE_STATES.has(s)) return 'rose'
  if (ORANGE_STATES.has(s)) return 'orange'
  if (AMBER_STATES.has(s)) return 'amber'
  return 'gray'
}

export function StateBadge({
  state,
  className,
}: {
  state: string | null | undefined
  className?: string
}) {
  if (!state) return <Badge variant="outline" className={className}>—</Badge>
  return (
    <Badge className={cn(BADGE_CLASSES[stateTone(state)], 'font-mono', className)}>
      {state}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return null
  const p = priority.toUpperCase()
  const cls =
    p === 'CRITICAL'
      ? BADGE_CLASSES.rose
      : p === 'HIGH'
        ? BADGE_CLASSES.orange
        : p === 'LOW'
          ? BADGE_CLASSES.gray
          : BADGE_CLASSES.amber
  return <Badge className={cn(cls, 'font-mono')}>{p}</Badge>
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  title: string
  value: React.ReactNode
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'positive' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'positive'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
        : tone === 'danger'
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-lg p-1.5', toneCls)}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// JSON block
// ---------------------------------------------------------------------------

export function JsonBlock({
  value,
  maxHeight = 'max-h-64',
  className,
}: {
  value: unknown
  maxHeight?: string
  className?: string
}) {
  let text: string
  try {
    const isEmpty =
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    text = isEmpty ? '—' : JSON.stringify(value, null, 2)
  } catch {
    text = String(value)
  }
  return (
    <pre
      className={cn(
        'overflow-auto rounded-md border bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200',
        maxHeight,
        className,
      )}
    >
      {text}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Loading / error / empty states
// ---------------------------------------------------------------------------

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <XCircle className="mt-0.5 size-4 shrink-0" />
      <span className="break-words">{message}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Refresh button
// ---------------------------------------------------------------------------

export function RefreshButton({
  onClick,
  pending,
  label = 'Refresh',
}: {
  onClick: () => void
  pending?: boolean
  label?: string
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      <RefreshCw className={cn('size-4', pending && 'animate-spin')} />
      {label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Task state machine stepper
// ---------------------------------------------------------------------------

export const TASK_FLOW: TaskState[] = [
  'RECEIVED',
  'UNDERSTANDING',
  'PLANNING',
  'CAPABILITY_CHECK',
  'RESOURCE_CHECK',
  'PREPARING',
  'EXECUTING',
  'VERIFYING',
  'DELIVERING',
  'COMPLETED',
]

const TERMINAL_BAD: TaskState[] = ['FAILED', 'ESCALATED', 'CANCELLED']

export function TaskStateMachine({ state }: { state: TaskState }) {
  const isTerminalBad = TERMINAL_BAD.includes(state)
  const idx = TASK_FLOW.indexOf(state)
  // REPAIRING loops back between VERIFYING and EXECUTING.
  const currentIdx = state === 'REPAIRING' ? TASK_FLOW.indexOf('VERIFYING') : idx

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {TASK_FLOW.map((s, i) => {
          const reached = currentIdx >= i && currentIdx !== -1
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold',
                    reached
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-zinc-300 bg-background text-muted-foreground dark:border-zinc-700',
                  )}
                >
                  {reached ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-medium uppercase tracking-wide',
                    s === state ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.replace(/_/g, ' ')}
                </span>
              </div>
              {i < TASK_FLOW.length - 1 ? (
                <div
                  className={cn(
                    'mb-4 h-0.5 w-3 sm:w-5',
                    currentIdx > i ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-800',
                  )}
                />
              ) : null}
            </React.Fragment>
          )
        })}
      </div>
      {state === 'REPAIRING' ? (
        <p className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
          <RefreshCw className="size-3.5 animate-spin" />
          Repairing — retrying execution after verification failed.
        </p>
      ) : null}
      {isTerminalBad ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-3.5" />
          Task ended in {state}.
        </p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live task SSE hook — patches a task in place whenever the stream emits
// ---------------------------------------------------------------------------

export function useTaskStream(
  taskId: string | null,
  onTask: (task: Task) => void,
): { live: boolean } {
  const cbRef = React.useRef(onTask)
  React.useEffect(() => {
    cbRef.current = onTask
  })
  const [live, setLive] = React.useState(false)

  React.useEffect(() => {
    if (!taskId) {
      setLive(false)
      return
    }
    setLive(true)
    const unsubscribe = ecosystemApi.subscribeTaskEvents(
      taskId,
      (frame) => {
        if (frame.event === 'task') {
          try {
            cbRef.current(JSON.parse(frame.data) as Task)
          } catch {
            /* ignore malformed frame */
          }
        } else if (frame.event === 'close') {
          setLive(false)
        }
      },
      () => setLive(false),
    )
    return () => {
      setLive(false)
      unsubscribe()
    }
  }, [taskId])

  return { live }
}

/** Poll helper — setInterval with immediate first call, pausable. */
export function usePolling(callback: () => void, ms: number, enabled = true) {
  const ref = React.useRef(callback)
  React.useEffect(() => {
    ref.current = callback
  })
  React.useEffect(() => {
    if (!enabled) return
    ref.current()
    const t = window.setInterval(() => ref.current(), ms)
    return () => window.clearInterval(t)
  }, [ms, enabled])
}

/**
 * Generic async data loader with reload + error state. The loader is kept in a
 * ref so callers can pass inline closures without retriggering requests.
 */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const loaderRef = React.useRef(loader)
  React.useEffect(() => {
    loaderRef.current = loader
  })
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [nonce, setNonce] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    loaderRef
      .current()
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Request failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nonce])

  const reload = React.useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload, setData }
}
