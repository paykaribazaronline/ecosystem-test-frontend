'use client'

/** Admin — Approvals: pending proposal queue with approve / reject / defer. */

import * as React from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Gavel,
  History,
  Plus,
  XCircle,
} from 'lucide-react'

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type {
  ApprovalDecisionRecord,
  Proposal,
  ProposalDecision,
} from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  JsonBlock,
  LoadingBlock,
  PriorityBadge,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

const PROPOSAL_KINDS = [
  'NEW_SOURCE',
  'NEW_CAPABILITY',
  'CAPABILITY_PROMOTION',
  'CAPABILITY_ARCHIVE',
  'DEPLOYMENT',
  'DB_MIGRATION',
  'SECRET_ROTATION',
  'HIGH_RISK_ACTION',
  'LEARNING_PROPOSAL',
] as const

export function ApprovalsTab() {
  const { toast } = useToast()
  const [decideTarget, setDecideTarget] = React.useState<Proposal | null>(null)
  const [decideAction, setDecideAction] = React.useState<ProposalDecision>('APPROVED')
  const [rationale, setRationale] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)

  const proposals = useAsyncData<Proposal[]>(() =>
    ecosystemApi.adminListProposals({ limit: 100 }),
  )

  const pending = (proposals.data ?? []).filter((p) => p.state === 'PENDING')
  const decided = (proposals.data ?? []).filter((p) => p.state !== 'PENDING')

  function openDecision(proposal: Proposal, action: ProposalDecision) {
    setDecideTarget(proposal)
    setDecideAction(action)
    setRationale('')
  }

  async function submitDecision(e: React.FormEvent) {
    e.preventDefault()
    if (!decideTarget || busy) return
    if (decideAction === 'REJECTED' && !rationale.trim()) {
      toast({
        title: 'Rationale required',
        description: 'A rejection must include a rationale.',
        variant: 'destructive',
      })
      return
    }
    setBusy(true)
    try {
      const updated = await ecosystemApi.adminDecideProposal(
        decideTarget.proposal_id,
        decideAction,
        rationale.trim() || undefined,
      )
      toast({
        title: `Proposal ${updated.state.toLowerCase()}`,
        description: updated.title,
      })
      setDecideTarget(null)
      proposals.reload()
    } catch (err) {
      toast({
        title: 'Decision failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Approval gate for every consequential change — {pending.length} pending.
        </p>
        <div className="flex gap-2">
          <RefreshButton onClick={proposals.reload} pending={proposals.loading} />
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New proposal
          </Button>
        </div>
      </div>

      {proposals.error ? <ErrorBlock message={proposals.error} /> : null}
      {proposals.loading ? <LoadingBlock label="Loading proposals…" /> : null}

      {!proposals.loading && pending.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={CheckCircle2}
              title="Nothing pending"
              description="All proposals have been decided. New proposals appear here automatically."
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {pending.map((p) => (
          <Card key={p.proposal_id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-mono">{p.kind}</Badge>
                <PriorityBadge priority={p.priority} />
                <Badge variant="outline">risk: {p.risk_level}</Badge>
              </div>
              <CardTitle className="text-base">{p.title}</CardTitle>
              <CardDescription>
                requested by {p.requested_by} · {formatDate(p.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.summary ? <p className="text-sm text-muted-foreground">{p.summary}</p> : null}
              <Collapsible>
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                    Payload
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {p.proposal_id}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <JsonBlock value={p.payload} maxHeight="max-h-40" />
                </CollapsibleContent>
              </Collapsible>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openDecision(p, 'APPROVED')}>
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openDecision(p, 'REJECTED')}
                >
                  <XCircle className="size-4" /> Reject
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDecision(p, 'DEFERRED')}>
                  <Clock className="size-4" /> Defer
                </Button>
              </div>
              <DecisionHistory proposalId={p.proposal_id} />
            </CardContent>
          </Card>
        ))}
      </div>

      {decided.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decision history (latest)</CardTitle>
            <CardDescription>Recently decided proposals across the queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {decided.slice(0, 20).map((p) => (
              <div
                key={p.proposal_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                <StateBadge state={p.state} />
                <span className="text-muted-foreground">{formatDate(p.updated_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* ---------------- Decision modal ---------------- */}
      <Dialog open={decideTarget !== null} onOpenChange={(o) => !o && setDecideTarget(null)}>
        <DialogContent className="sm:max-w-md">
          {decideTarget ? (
            <form onSubmit={submitDecision}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gavel className="size-4" /> {decideAction === 'APPROVED' ? 'Approve' : decideAction === 'REJECTED' ? 'Reject' : 'Defer'} proposal
                </DialogTitle>
                <DialogDescription>{decideTarget.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="decision">Decision</Label>
                  <Select
                    value={decideAction}
                    onValueChange={(v) => setDecideAction(v as ProposalDecision)}
                  >
                    <SelectTrigger id="decision">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                      <SelectItem value="DEFERRED">DEFERRED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rationale">
                    Rationale {decideAction === 'REJECTED' ? '(required)' : '(optional)'}
                  </Label>
                  <Textarea
                    id="rationale"
                    rows={3}
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder="Why this decision was made…"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDecideTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={decideAction === 'REJECTED' ? 'destructive' : 'default'}
                  disabled={busy}
                >
                  Confirm decision
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ---------------- Create proposal ---------------- */}
      <CreateProposalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false)
          proposals.reload()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------

function DecisionHistory({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = React.useState(false)
  const [records, setRecords] = React.useState<ApprovalDecisionRecord[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || records !== null) return
    ecosystemApi
      .adminListDecisions(proposalId)
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [open, proposalId, records])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <History className="size-3.5" />
        {records ? `${records.length} decision(s)` : 'Decision history'}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {error ? <ErrorBlock message={error} /> : null}
        {records && records.length === 0 ? (
          <p className="text-xs text-muted-foreground">No decisions recorded yet.</p>
        ) : null}
        <div className="space-y-1.5">
          {(records ?? []).map((d) => (
            <div key={d.decision_id} className="rounded-md border p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <StateBadge state={d.decision} />
                <span className="text-muted-foreground">{formatDate(d.decided_at)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                by {d.decided_by}
                {d.rationale ? ` — ${d.rationale}` : ''}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CreateProposalDialog({
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
    kind: 'NEW_CAPABILITY',
    title: '',
    summary: '',
    priority: 'MEDIUM',
    risk_level: 'MEDIUM',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const p = await ecosystemApi.adminCreateProposal({
        kind: form.kind,
        title: form.title,
        summary: form.summary,
        priority: form.priority,
        risk_level: form.risk_level,
      })
      toast({ title: 'Proposal created', description: `${p.title} (${p.state})` })
      setForm({ kind: 'NEW_CAPABILITY', title: '', summary: '', priority: 'MEDIUM', risk_level: 'MEDIUM' })
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
          <DialogTitle>Create proposal</DialogTitle>
          <DialogDescription>
            Manually surface a change for the approval queue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-kind">Kind</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}>
                <SelectTrigger id="prop-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger id="prop-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-title">Title</Label>
            <Input
              id="prop-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Add sentiment analysis capability"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prop-summary">Summary</Label>
            <Textarea
              id="prop-summary"
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Context and motivation…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prop-risk">Risk level</Label>
              <Select
                value={form.risk_level}
                onValueChange={(v) => setForm((f) => ({ ...f, risk_level: v }))}
              >
                <SelectTrigger id="prop-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || !form.title.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
