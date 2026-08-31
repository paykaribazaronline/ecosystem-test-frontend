'use client'

/** Admin — Overview: KPI tiles + governance budgets + recent authz decisions. */

import {
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  Lightbulb,
  TriangleAlert,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { AdminOverview, Budget, GovDecision } from '@/lib/ecosystem/types'
import {
  ErrorBlock,
  JsonBlock,
  KpiCard,
  LoadingBlock,
  RefreshButton,
  formatDate,
  useAsyncData,
} from '../shared'

export function OverviewTab() {
  const overview = useAsyncData<AdminOverview>(() => ecosystemApi.adminOverview())
  const budgets = useAsyncData<Budget[]>(() => ecosystemApi.adminGovernanceBudgets())
  const decisions = useAsyncData<GovDecision[]>(() =>
    ecosystemApi.adminGovernanceDecisions({ limit: 10 }),
  )

  const reloadAll = () => {
    overview.reload()
    budgets.reload()
    decisions.reload()
  }

  if (overview.loading) return <LoadingBlock label="Loading overview…" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ecosystem health at a glance — aggregated from every subsystem.
        </p>
        <RefreshButton onClick={reloadAll} pending={overview.loading || budgets.loading} />
      </div>

      {overview.error ? <ErrorBlock message={overview.error} /> : null}

      {overview.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Capabilities"
            value={overview.data.capabilities.total}
            hint={`${overview.data.capabilities.active} active · ${overview.data.capabilities.archived} archived`}
            icon={Boxes}
            tone="positive"
          />
          <KpiCard
            title="Pending approvals"
            value={overview.data.approvals_pending}
            hint="Proposals awaiting a decision"
            icon={ClipboardCheck}
            tone={overview.data.approvals_pending > 0 ? 'warning' : 'default'}
          />
          <KpiCard
            title="Learning opportunities"
            value={overview.data.learning_opportunities.total}
            hint={`${overview.data.learning_opportunities.awaiting_approval} awaiting approval`}
            icon={Lightbulb}
          />
          <KpiCard
            title="Escalated tasks"
            value={overview.data.escalated_tasks}
            hint="Tasks needing human attention"
            icon={TriangleAlert}
            tone={overview.data.escalated_tasks > 0 ? 'danger' : 'default'}
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Governance budgets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="size-4" /> Governance budgets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.loading ? <LoadingBlock label="Loading budgets…" /> : null}
            {budgets.error ? <ErrorBlock message={budgets.error} /> : null}
            {budgets.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No budget kinds configured.</p>
            ) : null}
            {(budgets.data ?? []).map((b) => {
              const pct = b.limit > 0 ? Math.min(100, (b.used / b.limit) * 100) : 0
              return (
                <div key={b.kind} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{b.kind}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.used.toFixed(1)} / {b.limit.toFixed(1)} (remaining{' '}
                      {b.remaining.toFixed(1)})
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Recent governance decisions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4" /> Recent governance decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decisions.loading ? <LoadingBlock label="Loading decisions…" /> : null}
            {decisions.error ? <ErrorBlock message={decisions.error} /> : null}
            {decisions.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No governance decisions recorded yet.
              </p>
            ) : null}
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {(decisions.data ?? []).map((d) => (
                <div
                  key={d.decision_id}
                  className="rounded-md border p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono">{d.action}</span>
                    <span
                      className={
                        d.allowed
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'font-semibold text-rose-600 dark:text-rose-400'
                      }
                    >
                      {d.allowed ? 'allowed' : 'denied'}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-muted-foreground">{d.reason}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>risk: {d.risk_level}</span>
                    {d.requires_approval ? <span>· approval required</span> : null}
                    <span>· {formatDate(d.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget detail JSON for completeness */}
      {budgets.data && budgets.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget snapshot (raw)</CardTitle>
          </CardHeader>
          <CardContent>
            <JsonBlock value={budgets.data} maxHeight="max-h-40" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
