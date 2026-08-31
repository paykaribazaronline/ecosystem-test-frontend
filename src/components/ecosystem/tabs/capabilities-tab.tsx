'use client'

/** Admin — Capabilities: registry list, search, create + lifecycle management. */

import * as React from 'react'
import { Archive, ArrowUpCircle, Loader2, Plus, Search, Trash2, Workflow } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { Capability } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

const LIFECYCLE_STATES = [
  'IDEA',
  'DISCOVERED',
  'PROPOSED',
  'APPROVAL_PENDING',
  'APPROVED',
  'BUILDING',
  'VALIDATING',
  'ACTIVE',
  'MEASURED',
  'DEPRECATED',
  'ARCHIVED',
  'BLOCKED',
] as const

export function CapabilitiesTab() {
  const { toast } = useToast()
  const [stateFilter, setStateFilter] = React.useState<string>('ALL')
  const [query, setQuery] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detail, setDetail] = React.useState<Capability | null>(null)

  const capabilities = useAsyncData<Capability[]>(() =>
    ecosystemApi.listCapabilities({
      state: stateFilter === 'ALL' ? undefined : stateFilter,
      limit: 500,
    }),
  )

  // Re-fetch when the state filter changes.
  React.useEffect(() => {
    capabilities.reload()
  }, [stateFilter])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = capabilities.data ?? []
    if (!q) return rows
    return rows.filter((c) =>
      `${c.name} ${c.purpose} ${c.category} ${c.signature}`.toLowerCase().includes(q),
    )
  }, [capabilities.data, query])

  async function act(label: string, fn: () => Promise<Capability>) {
    try {
      const updated = await fn()
      toast({ title: label, description: `${updated.name} → ${updated.lifecycle_state}` })
      capabilities.reload()
      setDetail((cur) => (cur && cur.capability_id === updated.capability_id ? updated : cur))
    } catch (err) {
      toast({
        title: `${label} failed`,
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search name, purpose, signature…"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All states</SelectItem>
              {LIFECYCLE_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={capabilities.reload} pending={capabilities.loading} />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New capability
          </Button>
        </div>
      </div>

      {capabilities.error ? <ErrorBlock message={capabilities.error} /> : null}
      {capabilities.loading ? <LoadingBlock label="Loading capabilities…" /> : null}

      {!capabilities.loading && filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No capabilities found"
              description="Adjust the filters, or register a new capability to seed the registry."
            />
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
                    <TableHead>Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Tier</TableHead>
                    <TableHead className="hidden lg:table-cell">Usage</TableHead>
                    <TableHead className="hidden xl:table-cell">Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cap) => (
                    <TableRow
                      key={cap.capability_id}
                      className="cursor-pointer"
                      onClick={() => setDetail(cap)}
                    >
                      <TableCell>
                        <p className="font-medium">{cap.name}</p>
                        <p className="max-w-[16rem] truncate text-xs text-muted-foreground">
                          {cap.purpose}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StateBadge state={cap.lifecycle_state} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{cap.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">
                        {cap.runtime_tier}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs tabular-nums">
                        {cap.usage_count} · {(cap.success_rate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDate(cap.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Promote to HOT tier"
                            onClick={() =>
                              void act('Promoted', () =>
                                ecosystemApi.adminPromoteCapability(cap.capability_id),
                              )
                            }
                          >
                            <ArrowUpCircle className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Archive"
                            onClick={() =>
                              void act('Archived', () =>
                                ecosystemApi.adminArchiveCapability(cap.capability_id),
                              )
                            }
                          >
                            <Archive className="size-4" />
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

      {/* ---------------- Create dialog ---------------- */}
      <CreateCapabilityDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          capabilities.reload()
        }}
      />

      {/* ---------------- Detail dialog ---------------- */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  <StateBadge state={detail.lifecycle_state} />
                  {detail.name}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  {detail.capability_id}
                </DialogDescription>
              </DialogHeader>

              <p className="text-sm">{detail.purpose}</p>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div>
                  <p className="font-medium text-foreground">Version</p>
                  {detail.version}
                </div>
                <div>
                  <p className="font-medium text-foreground">Category</p>
                  {detail.category}
                </div>
                <div>
                  <p className="font-medium text-foreground">Tier</p>
                  {detail.runtime_tier}
                </div>
                <div>
                  <p className="font-medium text-foreground">Security</p>
                  {detail.security_level}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Workflow className="size-4" /> Lifecycle transition
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LifecycleSelect
                    onTransition={(to) =>
                      void act('Transitioned', () =>
                        ecosystemApi.adminTransitionCapability(detail.capability_id, to),
                      )
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void act('Promoted', () =>
                          ecosystemApi.adminPromoteCapability(detail.capability_id),
                        )
                      }
                    >
                      <ArrowUpCircle className="size-4" /> Promote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void act('Archived', () =>
                          ecosystemApi.adminArchiveCapability(detail.capability_id),
                        )
                      }
                    >
                      <Archive className="size-4" /> Archive
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      title="Hard delete (requires ECOSYSTEM_ALLOW_DELETE=true)"
                      onClick={() =>
                        void act('Deleted', async () => {
                          await ecosystemApi.adminDeleteCapability(detail.capability_id)
                          setDetail(null)
                          return detail
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <pre className="max-h-64 overflow-auto rounded-md border bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-950">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LifecycleSelect({ onTransition }: { onTransition: (to: string) => void }) {
  const [to, setTo] = React.useState<string>('ACTIVE')
  return (
    <div className="flex flex-1 gap-2">
      <Select value={to} onValueChange={setTo}>
        <SelectTrigger className="flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIFECYCLE_STATES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="secondary" onClick={() => onTransition(to)}>
        Transition
      </Button>
    </div>
  )
}

function CreateCapabilityDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [busy, setBusy] = React.useState(false)
  const [form, setForm] = React.useState({
    name: '',
    purpose: '',
    signature: '',
    category: 'general',
    runtime_tier: 'WARM',
    owner: 'admin',
  })

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const cap = await ecosystemApi.adminCreateCapability({
        name: form.name,
        purpose: form.purpose,
        signature: form.signature,
        category: form.category,
        runtime_tier: form.runtime_tier,
        owner: form.owner,
      })
      toast({ title: 'Capability created', description: `${cap.name} (${cap.capability_id})` })
      setForm({
        name: '',
        purpose: '',
        signature: '',
        category: 'general',
        runtime_tier: 'WARM',
        owner: 'admin',
      })
      onCreated()
    } catch (err) {
      toast({
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register capability</DialogTitle>
          <DialogDescription>
            New capabilities start in the IDEA lifecycle state.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cap-name">Name</Label>
            <Input
              id="cap-name"
              required
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="rss_feed_parser"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-purpose">Purpose</Label>
            <Textarea
              id="cap-purpose"
              required
              rows={3}
              value={form.purpose}
              onChange={(e) => set('purpose')(e.target.value)}
              placeholder="Fetch and parse RSS/Atom feeds into structured items"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-sig">Signature</Label>
            <Input
              id="cap-sig"
              required
              value={form.signature}
              onChange={(e) => set('signature')(e.target.value)}
              placeholder="parse_feed(url: str) -> FeedItems"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cap-cat">Category</Label>
              <Input
                id="cap-cat"
                value={form.category}
                onChange={(e) => set('category')(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cap-tier">Runtime tier</Label>
              <Select value={form.runtime_tier} onValueChange={set('runtime_tier')}>
                <SelectTrigger id="cap-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOT">HOT</SelectItem>
                  <SelectItem value="WARM">WARM</SelectItem>
                  <SelectItem value="COLD">COLD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-owner">Owner</Label>
            <Input
              id="cap-owner"
              value={form.owner}
              onChange={(e) => set('owner')(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
