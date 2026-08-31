'use client'

/** Admin — Sources: discover URLs, list + transition source states. */

import * as React from 'react'
import { Globe, Globe2, Link2, ShieldCheck, ShieldOff } from 'lucide-react'

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
import type { Source, SourceState } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

const SOURCE_STATES: SourceState[] = [
  'UNKNOWN',
  'DISCOVERED',
  'APPROVAL_PENDING',
  'ALLOWLISTED',
  'BLOCKED',
  'DEFERRED',
]

const SOURCE_CATEGORIES = [
  'AI_DOCS',
  'OSS_REPO',
  'TECH_DOCS',
  'RESEARCH',
  'STANDARDS',
  'PUBLIC_API',
  'TECH_BLOG',
  'MODEL_PROVIDER_DOCS',
  'APPROVED_SITE',
  'APPROVED_DATASET',
  'UNKNOWN',
]

export function SourcesTab() {
  const { toast } = useToast()
  const [url, setUrl] = React.useState('')
  const [category, setCategory] = React.useState('UNKNOWN')
  const [discovering, setDiscovering] = React.useState(false)
  const [stateFilter, setStateFilter] = React.useState('ALL')

  const sources = useAsyncData<Source[]>(() =>
    ecosystemApi.adminListSources({
      state: stateFilter === 'ALL' ? undefined : stateFilter,
      limit: 300,
    }),
  )

  React.useEffect(() => {
    sources.reload()
  }, [stateFilter])

  async function discover(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || discovering) return
    setDiscovering(true)
    try {
      const src = await ecosystemApi.adminDiscoverSource(url.trim(), category)
      toast({
        title: 'Source discovered',
        description: `${src.url} → ${src.state}`,
      })
      setUrl('')
      sources.reload()
    } catch (err) {
      toast({
        title: 'Discover failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setDiscovering(false)
    }
  }

  async function transition(src: Source, toState: string) {
    try {
      const updated = await ecosystemApi.adminTransitionSource(src.source_id, toState)
      toast({ title: 'Source transitioned', description: `${updated.url} → ${updated.state}` })
      sources.reload()
    } catch (err) {
      toast({
        title: 'Transition failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Discover */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="size-4" /> Discover a source
          </CardTitle>
          <CardDescription>
            Register a URL in the source governance system. Existing policies are matched
            automatically to determine its initial state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={discover} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://docs.example.com/api"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={discovering || !url.trim()}>
              <Link2 className="size-4" /> Discover
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters + list */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Governed sources — allowlist, block or defer what the system may learn from.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All states</SelectItem>
              {SOURCE_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RefreshButton onClick={sources.reload} pending={sources.loading} />
        </div>
      </div>

      {sources.error ? <ErrorBlock message={sources.error} /> : null}
      {sources.loading ? <LoadingBlock label="Loading sources…" /> : null}

      {!sources.loading && (sources.data ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No sources discovered"
              description="Discover a URL above — the source governance module tracks it through DISCOVERED → APPROVAL_PENDING → ALLOWLISTED."
            />
          </CardContent>
        </Card>
      ) : null}

      {(sources.data ?? []).length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Last seen</TableHead>
                    <TableHead className="text-right">Transition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sources.data ?? []).map((src) => (
                    <TableRow key={src.source_id}>
                      <TableCell>
                        <p className="max-w-[16rem] truncate font-mono text-xs">{src.url}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {src.source_id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StateBadge state={src.state} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {src.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDate(src.last_seen_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Allowlist"
                            onClick={() => void transition(src, 'ALLOWLISTED')}
                          >
                            <ShieldCheck className="size-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Block"
                            onClick={() => void transition(src, 'BLOCKED')}
                          >
                            <ShieldOff className="size-4 text-rose-600" />
                          </Button>
                          <Select
                            onValueChange={(to) => void transition(src, to)}
                            defaultValue=""
                          >
                            <SelectTrigger className="h-8 w-32 text-xs" size="sm">
                              <SelectValue placeholder="Move to…" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCE_STATES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </div>
  )
}
