'use client'

/** Admin — Opportunities: learning-loop pipeline + learned items (prune/delete). */

import * as React from 'react'
import { BookOpen, Lightbulb, Loader2, Scissors, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { LearnedItem, LearningOpportunity, LearningStage } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

const LEARNING_STAGES: LearningStage[] = [
  'DISCOVERY',
  'SOURCE_CHECK',
  'POLICY_GATE',
  'RESEARCH',
  'KNOWLEDGE_RECORDED',
  'GAP_SIGNAL',
  'CAPABILITY_OPPORTUNITY',
  'PRACTICALITY_ANALYSIS',
  'PROPOSAL',
  'AWAITING_APPROVAL',
  'BUILDING',
  'VALIDATING',
  'REGISTERED',
  'REUSED',
  'REJECTED',
  'ARCHIVED',
]

const STAGE_FLOW: LearningStage[] = [
  'CAPABILITY_OPPORTUNITY',
  'PRACTICALITY_ANALYSIS',
  'PROPOSAL',
  'AWAITING_APPROVAL',
  'BUILDING',
  'VALIDATING',
  'REGISTERED',
]

export function OpportunitiesTab() {
  const { toast } = useToast()
  const [stageFilter, setStageFilter] = React.useState('ALL')

  const opportunities = useAsyncData<LearningOpportunity[]>(() =>
    ecosystemApi.adminListOpportunities({
      stage: stageFilter === 'ALL' ? undefined : stageFilter,
      include_archived: false,
      limit: 200,
    }),
  )
  const learned = useAsyncData<LearnedItem[]>(() =>
    ecosystemApi.adminListLearned({ limit: 200 }),
  )

  React.useEffect(() => {
    opportunities.reload()
  }, [stageFilter])

  async function surface(e: React.FormEvent, form: { hint: string; gap: string; value: string; effort: string }) {
    e.preventDefault()
    if (!form.hint.trim()) return
    try {
      const opp = await ecosystemApi.adminSurfaceOpportunity({
        capability_hint: form.hint.trim(),
        gap_description: form.gap.trim(),
        predicted_value: Number(form.value) || 0,
        predicted_effort: Number(form.effort) || 0,
      })
      toast({ title: 'Opportunity surfaced', description: opp.capability_hint })
      opportunities.reload()
    } catch (err) {
      toast({
        title: 'Surface failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  async function advance(opp: LearningOpportunity, toStage: string) {
    try {
      const updated = await ecosystemApi.adminAdvanceOpportunity(opp.opportunity_id, toStage)
      toast({ title: 'Stage advanced', description: `${updated.capability_hint} → ${updated.stage}` })
      opportunities.reload()
    } catch (err) {
      toast({
        title: 'Advance failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  async function prune() {
    try {
      const res = await ecosystemApi.adminPruneLearned({ threshold: 0.1, max_age_days: 30 })
      toast({ title: 'Learned items pruned', description: `${res.pruned_count} removed` })
      learned.reload()
    } catch (err) {
      toast({
        title: 'Prune failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  async function deleteLearned(item: LearnedItem) {
    try {
      await ecosystemApi.adminDeleteLearned(item.item_id)
      toast({ title: 'Learned item deleted', description: item.source_url })
      learned.reload()
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Surface new opportunity */}
      <SurfaceOpportunityCard onSubmit={surface} />

      {/* Pipeline */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="size-4" /> Capability-gap pipeline — surface, analyze and
          advance opportunities.
        </p>
        <div className="flex gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All stages</SelectItem>
              {LEARNING_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RefreshButton
            onClick={() => {
              opportunities.reload()
              learned.reload()
            }}
            pending={opportunities.loading}
          />
        </div>
      </div>

      {opportunities.error ? <ErrorBlock message={opportunities.error} /> : null}
      {opportunities.loading ? <LoadingBlock label="Loading opportunities…" /> : null}

      {!opportunities.loading && (opportunities.data ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No opportunities"
              description="The learning loop surfaces opportunities when it detects capability gaps."
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(opportunities.data ?? []).map((opp) => {
          const flowIdx = STAGE_FLOW.indexOf(opp.stage as LearningStage)
          return (
            <Card key={opp.opportunity_id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StateBadge state={opp.stage} />
                  <Badge variant="outline" className="font-mono text-[10px]">
                    value {opp.predicted_value.toFixed(1)} · effort {opp.predicted_effort.toFixed(1)}
                  </Badge>
                </div>
                <CardTitle className="text-base">{opp.capability_hint}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {opp.gap_description || 'No gap description.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {flowIdx >= 0 ? (
                  <div className="flex items-center gap-1">
                    {STAGE_FLOW.map((s, i) => (
                      <React.Fragment key={s}>
                        <div
                          className={
                            'h-1.5 flex-1 rounded-full ' +
                            (i <= flowIdx ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-800')
                          }
                          title={s}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {formatDate(opp.created_at)} · {opp.proposal_id ? `proposal ${opp.proposal_id}` : 'no proposal'}
                  </span>
                  <Select
                    onValueChange={(to) => void advance(opp, to)}
                    defaultValue=""
                  >
                    <SelectTrigger className="h-8 w-52 text-xs" size="sm">
                      <SelectValue placeholder="Advance to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Learned items */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4" /> Learned items
              </CardTitle>
              <CardDescription className="mt-1.5">
                Knowledge captured from allowlisted sources — prune low-value entries.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void prune()}>
              <Scissors className="size-4" /> Prune low-value
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {learned.loading ? <LoadingBlock label="Loading learned items…" /> : null}
          {learned.error ? (
            <div className="p-4">
              <ErrorBlock message={learned.error} />
            </div>
          ) : null}
          {!learned.loading && (learned.data ?? []).length === 0 ? (
            <EmptyState title="Nothing learned yet" />
          ) : null}
          {(learned.data ?? []).length > 0 ? (
            <div className="max-h-[50vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="hidden lg:table-cell">Reuses</TableHead>
                    <TableHead className="hidden xl:table-cell">Created</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(learned.data ?? []).map((item) => (
                    <TableRow key={item.item_id}>
                      <TableCell>
                        <p className="max-w-[16rem] truncate text-sm font-medium">
                          {item.title || item.source_url}
                        </p>
                        <p className="max-w-[16rem] truncate font-mono text-[10px] text-muted-foreground">
                          {item.source_url}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {item.value_score.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs tabular-nums">
                        {item.reused_count}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => void deleteLearned(item)}>
                          <Trash2 className="size-4 text-rose-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SurfaceOpportunityCard({
  onSubmit,
}: {
  onSubmit: (
    e: React.FormEvent,
    form: { hint: string; gap: string; value: string; effort: string },
  ) => void
}) {
  const [hint, setHint] = React.useState('')
  const [gap, setGap] = React.useState('')
  const [value, setValue] = React.useState('0')
  const [effort, setEffort] = React.useState('0')
  const [busy, setBusy] = React.useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4" /> Surface a new opportunity
        </CardTitle>
        <CardDescription>
          Manually register a capability gap for the learning loop to pursue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            setBusy(true)
            Promise.resolve(onSubmit(e, { hint, gap, value, effort }))
              .catch(() => undefined)
              .finally(() => setBusy(false))
            setHint('')
            setGap('')
            setValue('0')
            setEffort('0')
          }}
          className="grid gap-3 sm:grid-cols-4"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="opp-hint">Capability hint</Label>
            <Input
              id="opp-hint"
              required
              placeholder="pdf_table_extractor"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-value">Predicted value</Label>
            <Input
              id="opp-value"
              type="number"
              step="0.1"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-effort">Predicted effort</Label>
            <Input
              id="opp-effort"
              type="number"
              step="0.1"
              min="0"
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-4">
            <Label htmlFor="opp-gap">Gap description</Label>
            <Input
              id="opp-gap"
              placeholder="No existing capability parses PDF tables reliably…"
              value={gap}
              onChange={(e) => setGap(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" disabled={busy || !hint.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
              Surface opportunity
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
