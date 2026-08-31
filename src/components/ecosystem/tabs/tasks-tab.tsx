'use client'

/** Admin — Tasks: every user's tasks, filters, live SSE detail view. */

import * as React from 'react'
import { Ban, ChevronRight, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { Task } from '@/lib/ecosystem/types'
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
  useAsyncData,
  useTaskStream,
} from '../shared'

const TASK_STATES = [
  'RECEIVED',
  'UNDERSTANDING',
  'PLANNING',
  'CAPABILITY_CHECK',
  'RESOURCE_CHECK',
  'PREPARING',
  'EXECUTING',
  'VERIFYING',
  'REPAIRING',
  'DELIVERING',
  'COMPLETED',
  'FAILED',
  'ESCALATED',
  'CANCELLED',
] as const

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED'])

export function TasksTab() {
  const { toast } = useToast()
  const [stateFilter, setStateFilter] = React.useState('ALL')
  const [userFilter, setUserFilter] = React.useState('')
  const [detail, setDetail] = React.useState<Task | null>(null)

  const tasks = useAsyncData<Task[]>(() =>
    ecosystemApi.listTasks({
      state: stateFilter === 'ALL' ? undefined : stateFilter,
      limit: 300,
    }),
  )

  React.useEffect(() => {
    tasks.reload()
  }, [stateFilter])

  const filtered = React.useMemo(() => {
    const q = userFilter.trim().toLowerCase()
    const rows = tasks.data ?? []
    if (!q) return rows
    return rows.filter(
      (t) =>
        t.user_email?.toLowerCase().includes(q) ||
        t.created_by?.toLowerCase().includes(q) ||
        t.goal.toLowerCase().includes(q) ||
        t.task_id.toLowerCase().includes(q),
    )
  }, [tasks.data, userFilter])

  // Live-patch the open task via SSE.
  useTaskStream(detail?.task_id ?? null, (patched) => {
    setDetail((cur) => (cur && cur.task_id === patched.task_id ? patched : cur))
    tasks.setData((rows) =>
      (rows ?? []).map((t) => (t.task_id === patched.task_id ? patched : t)),
    )
  })

  async function cancel(task: Task) {
    try {
      const updated = await ecosystemApi.cancelTask(task.task_id, 'Cancelled by admin')
      toast({ title: 'Task cancelled', description: shortenId(updated.task_id) })
      tasks.setData((rows) =>
        (rows ?? []).map((t) => (t.task_id === updated.task_id ? updated : t)),
      )
      setDetail((cur) => (cur && cur.task_id === updated.task_id ? updated : cur))
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All states</SelectItem>
              {TASK_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter by user email, goal or task id…"
            className="flex-1 sm:max-w-xs"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="size-3" /> {filtered.length} tasks
          </Badge>
          <RefreshButton onClick={tasks.reload} pending={tasks.loading} />
        </div>
      </div>

      {tasks.error ? <ErrorBlock message={tasks.error} /> : null}
      {tasks.loading ? <LoadingBlock label="Loading tasks…" /> : null}

      {!tasks.loading && filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="No tasks found" description="Adjust the filters above." />
          </CardContent>
        </Card>
      ) : null}

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="hidden md:table-cell">User</TableHead>
                    <TableHead className="hidden lg:table-cell">Risk</TableHead>
                    <TableHead className="hidden xl:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((task) => (
                    <TableRow key={task.task_id} className="cursor-pointer" onClick={() => setDetail(task)}>
                      <TableCell>
                        <p className="max-w-[18rem] truncate text-sm font-medium">{task.goal}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {task.task_id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StateBadge state={task.state} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="max-w-[10rem] truncate text-xs">{task.user_email || task.created_by}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">{task.risk_level}</Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDate(task.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {!TERMINAL_STATES.has(task.state) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Cancel task"
                              onClick={() => void cancel(task)}
                            >
                              <Ban className="size-4" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" onClick={() => setDetail(task)}>
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Detail dialog ---------------- */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  <StateBadge state={detail.state} />
                  {detail.user_email || detail.created_by}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {detail.task_id}
                </DialogDescription>
              </DialogHeader>

              <p className="text-sm font-medium">{detail.goal}</p>
              <TaskStateMachine state={detail.state} />

              {detail.error ? <ErrorBlock message={detail.error} /> : null}

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">Created</p>
                  {formatDate(detail.created_at)}
                </div>
                <div>
                  <p className="font-medium text-foreground">Updated</p>
                  {formatDate(detail.updated_at)}
                </div>
                <div>
                  <p className="font-medium text-foreground">Risk</p>
                  {detail.risk_level}
                </div>
                <div>
                  <p className="font-medium text-foreground">Retries</p>
                  {detail.retry_count}/{detail.retry_limit}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Result</p>
                <JsonBlock value={detail.result} />
                <p className="text-sm font-medium">Plan</p>
                <JsonBlock value={detail.plan} maxHeight="max-h-40" />
                <p className="text-sm font-medium">Capability requirements</p>
                <JsonBlock value={detail.capability_requirements} maxHeight="max-h-40" />
              </div>

              {!TERMINAL_STATES.has(detail.state) ? (
                <Button variant="outline" className="w-full" onClick={() => void cancel(detail)}>
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
