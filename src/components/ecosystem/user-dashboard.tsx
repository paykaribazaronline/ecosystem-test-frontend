'use client'

/**
 * User dashboard — submit tasks, follow them through the state machine with
 * live SSE updates, and search the capability registry.
 */

import * as React from 'react'
import {
  Ban,
  Boxes,
  ChevronRight,
  CircleDot,
  Loader2,
  Rocket,
  Search,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react'

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type {
  Capability,
  CapabilitySearchResponse,
  Task,
  User,
} from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  JsonBlock,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  TaskStateMachine,
  formatDate,
  shortenId,
  usePolling,
  useTaskStream,
} from './shared'

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED'])

export function UserDashboard({
  user,
  onUnauthorized,
}: {
  user: User
  onUnauthorized: () => void
}) {
  const { toast } = useToast()
  const [tab, setTab] = React.useState('tasks')

  // ---------------- Submit-task form ----------------
  const [goal, setGoal] = React.useState('')
  const [risk, setRisk] = React.useState('LOW')
  const [submitting, setSubmitting] = React.useState(false)

  // ---------------- My tasks ----------------
  const [tasks, setTasks] = React.useState<Task[] | null>(null)
  const [tasksError, setTasksError] = React.useState<string | null>(null)
  const [tasksLoading, setTasksLoading] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)

  // ---------------- Capability search ----------------
  const [requirement, setRequirement] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const [searchResult, setSearchResult] = React.useState<CapabilitySearchResponse | null>(null)
  const [searchError, setSearchError] = React.useState<string | null>(null)

  const loadTasks = React.useCallback(async () => {
    setTasksLoading(true)
    try {
      const rows = await ecosystemApi.listTasks({ limit: 200 })
      setTasks(rows)
      setTasksError(null)
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Failed to load tasks')
      if ((err as { status?: number }).status === 401) onUnauthorized()
    } finally {
      setTasksLoading(false)
    }
  }, [onUnauthorized])

  React.useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  // Poll for updates on any in-flight task; cheap + covers non-selected rows.
  const hasInflight = (tasks ?? []).some((t) => !TERMINAL_STATES.has(t.state))
  usePolling(() => void loadTasks(), 5000, hasInflight)

  // Live-patch the open task via SSE while its dialog is open.
  const { live } = useTaskStream(selectedTask?.task_id ?? null, (patched) => {
    setSelectedTask((cur) => (cur && cur.task_id === patched.task_id ? patched : cur))
    setTasks((rows) =>
      (rows ?? []).map((t) => (t.task_id === patched.task_id ? patched : t)),
    )
  })

  async function submitTask(e: React.FormEvent) {
    e.preventDefault()
    if (!goal.trim() || submitting) return
    setSubmitting(true)
    try {
      const task = await ecosystemApi.submitTask({ goal: goal.trim(), risk_level: risk })
      toast({ title: 'Task submitted', description: `${shortenId(task.task_id)} — ${task.state}` })
      setGoal('')
      setRisk('LOW')
      setTab('tasks')
      setSelectedTask(task)
      await loadTasks()
    } catch (err) {
      toast({
        title: 'Submit failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelTask(task: Task) {
    try {
      const updated = await ecosystemApi.cancelTask(task.task_id, 'Cancelled by user')
      toast({ title: 'Task cancelled', description: shortenId(updated.task_id) })
      setTasks((rows) => (rows ?? []).map((t) => (t.task_id === updated.task_id ? updated : t)))
      setSelectedTask((cur) => (cur && cur.task_id === updated.task_id ? updated : cur))
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!requirement.trim() || searching) return
    setSearching(true)
    setSearchError(null)
    try {
      const res = await ecosystemApi.searchCapabilities({
        requirement: requirement.trim(),
        limit: 12,
      })
      setSearchResult(res)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const activeCount = (tasks ?? []).filter((t) => !TERMINAL_STATES.has(t.state)).length
  const completedCount = (tasks ?? []).filter((t) => t.state === 'COMPLETED').length

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat icon={<CircleDot className="size-4" />} label="In flight" value={activeCount} />
        <MiniStat icon={<Boxes className="size-4" />} label="Total tasks" value={tasks?.length ?? 0} />
        <MiniStat icon={<Rocket className="size-4" />} label="Completed" value={completedCount} />
        <MiniStat icon={<Search className="size-4" />} label="Signed in as" value={<span className="text-sm">{user.email}</span>} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="tasks">My tasks</TabsTrigger>
          <TabsTrigger value="submit">Submit task</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>

        {/* ------------------------- My tasks ------------------------- */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tasks are scoped to your account and update live.
            </p>
            <RefreshButton onClick={() => void loadTasks()} pending={tasksLoading} />
          </div>

          {tasksError ? <ErrorBlock message={tasksError} /> : null}
          {!tasksError && tasks === null ? <LoadingBlock label="Loading your tasks…" /> : null}

          {tasks !== null && tasks.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Send}
                  title="No tasks yet"
                  description="Submit your first task — the engine will plan, check capabilities and resources, execute and verify it."
                />
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-3">
            {(tasks ?? []).map((task) => (
              <Card
                key={task.task_id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StateBadge state={task.state} />
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {shortenId(task.task_id)}
                      </Badge>
                      <Badge variant="outline">risk: {task.risk_level}</Badge>
                    </div>
                    <p className="truncate text-sm font-medium">{task.goal}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(task.created_at)} · created by {task.created_by}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!TERMINAL_STATES.has(task.state) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          void cancelTask(task)
                        }}
                      >
                        <Ban className="size-4" /> Cancel
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTask(task)
                      }}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ------------------------- Submit task ------------------------- */}
        <TabsContent value="submit">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="size-4" /> Submit a new task
              </CardTitle>
              <CardDescription>
                Describe the goal you want achieved. The task engine walks it through
                understanding → planning → capability check → execution → verification →
                delivery.
              </CardDescription>
            </CardHeader>
            <form onSubmit={submitTask}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Textarea
                    id="goal"
                    required
                    rows={4}
                    placeholder="e.g. Summarize last week's deployment incidents and propose mitigations"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk">Risk level</Label>
                  <Select value={risk} onValueChange={setRisk}>
                    <SelectTrigger id="risk" className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting || !goal.trim()}>
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Submit task
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* ------------------------- Capability search ------------------------- */}
        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-4" /> Capability search
              </CardTitle>
              <CardDescription>
                REUSE &gt; ADAPT &gt; EXTEND &gt; CREATE — the registry is searched before any new
                capability is proposed.
              </CardDescription>
            </CardHeader>
            <form onSubmit={runSearch}>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Input
                  placeholder="Describe what you need, e.g. 'fetch and parse RSS feeds'"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                />
                <Button type="submit" disabled={searching || !requirement.trim()} className="sm:w-32">
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  Search
                </Button>
              </CardContent>
            </form>
          </Card>

          {searchError ? <ErrorBlock message={searchError} /> : null}

          {searchResult ? (
            searchResult.candidates.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    title="Gap detected"
                    description="No existing capability matches this requirement. The ecosystem may surface a learning opportunity for it."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {searchResult.candidates.map((cap) => (
                  <CapabilityCard key={cap.capability_id} cap={cap} />
                ))}
              </div>
            )
          ) : null}
        </TabsContent>
      </Tabs>

      {/* ------------------------- Task detail dialog ------------------------- */}
      <Dialog
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  <StateBadge state={selectedTask.state} />
                  {live ? (
                    <Badge variant="outline" className="gap-1 text-emerald-600">
                      <Wifi className="size-3" /> live
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <WifiOff className="size-3" /> idle
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {selectedTask.task_id}
                </DialogDescription>
              </DialogHeader>

              <p className="text-sm font-medium">{selectedTask.goal}</p>

              <TaskStateMachine state={selectedTask.state} />

              {selectedTask.error ? <ErrorBlock message={selectedTask.error} /> : null}

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">Created</p>
                  {formatDate(selectedTask.created_at)}
                </div>
                <div>
                  <p className="font-medium text-foreground">Updated</p>
                  {formatDate(selectedTask.updated_at)}
                </div>
                <div>
                  <p className="font-medium text-foreground">Owner</p>
                  {selectedTask.owner} · {selectedTask.risk_level}
                </div>
                <div>
                  <p className="font-medium text-foreground">Retries</p>
                  {selectedTask.retry_count}/{selectedTask.retry_limit}
                </div>
              </div>

              <div className="space-y-2">
                <CollapsibleSection title="Result" payload={selectedTask.result} />
                <CollapsibleSection title="Plan" payload={selectedTask.plan} />
                <CollapsibleSection title="Capability requirements" payload={selectedTask.capability_requirements} />
                <CollapsibleSection title="Success criteria" payload={selectedTask.success_criteria} />
                <CollapsibleSection title="Verification" payload={selectedTask.verification_result} />
                <CollapsibleSection title="Artifacts" payload={selectedTask.artifacts} />
              </div>

              {!TERMINAL_STATES.has(selectedTask.state) ? (
                <Button
                  variant="outline"
                  onClick={() => void cancelTask(selectedTask)}
                  className="w-full"
                >
                  <Ban className="size-4" /> Cancel this task
                </Button>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function CapabilityCard({ cap }: { cap: Capability }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{cap.name}</CardTitle>
          <StateBadge state={cap.lifecycle_state} />
        </div>
        <CardDescription className="text-xs">
          {cap.category} · v{cap.version} · {cap.runtime_tier} tier
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-xs text-muted-foreground">{cap.purpose}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="outline" className="font-mono">
            uses: {cap.usage_count}
          </Badge>
          <Badge variant="outline" className="font-mono">
            success: {(cap.success_rate * 100).toFixed(0)}%
          </Badge>
          <Badge variant="outline" className="font-mono">
            quality: {cap.quality_score.toFixed(2)}
          </Badge>
        </div>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{cap.signature}</p>
      </CardContent>
    </Card>
  )
}

function CollapsibleSection({
  title,
  payload,
}: {
  title: string
  payload: unknown
}) {
  const isEmpty =
    payload === null ||
    payload === undefined ||
    (Array.isArray(payload) && payload.length === 0) ||
    (typeof payload === 'object' && payload !== null && Object.keys(payload).length === 0)
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-accent">
        {title}
        <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pt-2">
        {isEmpty ? (
          <p className="px-2 text-xs text-muted-foreground">—</p>
        ) : (
          <JsonBlock value={payload} />
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
