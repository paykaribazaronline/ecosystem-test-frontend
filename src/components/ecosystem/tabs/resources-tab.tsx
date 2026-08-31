'use client'

/** Admin — Resources: registry list + composite ecosystem health probe. */

import * as React from 'react'
import { Activity, HeartPulse, Server } from 'lucide-react'

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ecosystemApi } from '@/lib/ecosystem/api'
import type { EcosystemHealthResponse, ResourceRecord } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  JsonBlock,
  KpiCard,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

export function ResourcesTab() {
  const resources = useAsyncData<ResourceRecord[]>(() =>
    ecosystemApi.listResources({ limit: 500 }),
  )
  const health = useAsyncData<EcosystemHealthResponse>(() =>
    ecosystemApi.ecosystemHealth(),
  )

  const reloadAll = () => {
    resources.reload()
    health.reload()
  }

  const byState = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of resources.data ?? []) map.set(r.state, (map.get(r.state) ?? 0) + 1)
    return map
  }, [resources.data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Provider-agnostic resource registry + unified health aggregation.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reloadAll} disabled={health.loading}>
            <HeartPulse className={'size-4' + (health.loading ? ' animate-pulse' : '')} />
            Probe health
          </Button>
          <RefreshButton onClick={reloadAll} pending={resources.loading} />
        </div>
      </div>

      {resources.error ? <ErrorBlock message={resources.error} /> : null}
      {health.error ? <ErrorBlock message={health.error} /> : null}

      {/* Composite health strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Composite health"
          value={<span className="font-mono text-lg">{health.data?.composite ?? '—'}</span>}
          icon={HeartPulse}
          tone={
            health.data?.composite === 'HEALTHY'
              ? 'positive'
              : health.data && health.data.composite !== 'HEALTHY'
                ? 'warning'
                : 'default'
          }
        />
        <KpiCard title="Resources" value={resources.data?.length ?? 0} icon={Server} />
        <KpiCard
          title="Reporting health"
          value={health.data?.resources.length ?? 0}
          hint="sources with recent samples"
          icon={Activity}
        />
        <KpiCard
          title="States"
          value={
            <span className="flex flex-wrap gap-1">
              {[...byState.entries()].map(([s, n]) => (
                <Badge key={s} variant="outline" className="font-mono text-[10px]">
                  {s}:{n}
                </Badge>
              ))}
            </span>
          }
          icon={Server}
        />
      </div>

      {resources.loading ? <LoadingBlock label="Loading resources…" /> : null}

      {!resources.loading && (resources.data ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No resources registered"
              description="Resources are registered provider-side (RENDER, GITHUB, KAGGLE, …) and appear here."
            />
          </CardContent>
        </Card>
      ) : null}

      {(resources.data ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registry</CardTitle>
            <CardDescription>Registered compute resources across providers.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="hidden lg:table-cell">External id</TableHead>
                    <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(resources.data ?? []).map((r) => (
                    <TableRow key={r.resource_id}>
                      <TableCell>
                        <p className="text-sm font-medium">{r.name || r.resource_id}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {r.resource_id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {r.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StateBadge state={r.state} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[12rem] truncate font-mono text-xs">
                        {r.external_id}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDate(r.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Health detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4" /> Unified health (latest samples)
          </CardTitle>
          <CardDescription>Latest health record per source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.loading ? <LoadingBlock label="Probing ecosystem health…" /> : null}
          {!health.loading && (health.data?.resources.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No health samples recorded in the last hour.
            </p>
          ) : null}
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {(health.data?.resources ?? []).map((h) => (
              <div key={h.record_id} className="rounded-md border p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono">{h.source}</span>
                  <StateBadge state={h.status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-5">
                  <span>cpu: {h.cpu_percent.toFixed(1)}%</span>
                  <span>disk: {h.disk_percent.toFixed(1)}%</span>
                  <span>latency: {h.latency_ms.toFixed(0)}ms</span>
                  <span>errors: {(h.error_rate * 100).toFixed(2)}%</span>
                  <span>mem: {h.memory.percent.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
          {health.data && health.data.resources.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Raw health payload
              </summary>
              <div className="pt-2">
                <JsonBlock value={health.data} maxHeight="max-h-48" />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
