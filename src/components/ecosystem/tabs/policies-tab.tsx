'use client'

/** Admin — Policies: source policy CRUD + URL matcher. */

import * as React from 'react'
import { ShieldQuestion, Trash2 } from 'lucide-react'

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
import type { PolicyMatchResponse, SourcePolicy } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  JsonBlock,
  LoadingBlock,
  RefreshButton,
  StateBadge,
  formatDate,
  useAsyncData,
} from '../shared'

const SOURCE_STATES = ['UNKNOWN', 'DISCOVERED', 'APPROVAL_PENDING', 'ALLOWLISTED', 'BLOCKED', 'DEFERRED']
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

export function PoliciesTab() {
  const { toast } = useToast()
  const policies = useAsyncData<SourcePolicy[]>(() => ecosystemApi.adminListPolicies(200))

  // Create form
  const [form, setForm] = React.useState({
    url_pattern: '',
    category: 'AI_DOCS',
    state: 'ALLOWLISTED',
    allowed_actions: 'read',
    source_weight: '1',
  })
  const [creating, setCreating] = React.useState(false)

  // Match tester
  const [matchUrl, setMatchUrl] = React.useState('')
  const [matchBusy, setMatchBusy] = React.useState(false)
  const [matchResult, setMatchResult] = React.useState<PolicyMatchResponse | null>(null)

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url_pattern.trim() || creating) return
    setCreating(true)
    try {
      const p = await ecosystemApi.adminCreatePolicy({
        url_pattern: form.url_pattern.trim(),
        category: form.category,
        state: form.state,
        allowed_actions: form.allowed_actions
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        source_weight: Number(form.source_weight) || 1.0,
      })
      toast({ title: 'Policy created', description: p.url_pattern })
      setForm((f) => ({ ...f, url_pattern: '' }))
      policies.reload()
    } catch (err) {
      toast({
        title: 'Create failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  async function runMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!matchUrl.trim() || matchBusy) return
    setMatchBusy(true)
    try {
      const res = await ecosystemApi.adminMatchPolicy(matchUrl.trim())
      setMatchResult(res)
    } catch (err) {
      toast({
        title: 'Match failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setMatchBusy(false)
    }
  }

  async function remove(policy: SourcePolicy) {
    try {
      await ecosystemApi.adminDeletePolicy(policy.policy_id)
      toast({ title: 'Policy deleted', description: policy.url_pattern })
      policies.reload()
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          URL-pattern policies gate what the ecosystem may learn from the internet.
        </p>
        <RefreshButton onClick={policies.reload} pending={policies.loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Create */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create policy</CardTitle>
            <CardDescription>
              Glob-style URL pattern, e.g. <code className="font-mono">docs.python.org/*</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createPolicy} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pol-pattern">URL pattern</Label>
                <Input
                  id="pol-pattern"
                  required
                  placeholder="docs.example.com/*"
                  value={form.url_pattern}
                  onChange={(e) => setForm((f) => ({ ...f, url_pattern: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pol-cat">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger id="pol-cat">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pol-state">State</Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}
                  >
                    <SelectTrigger id="pol-state">
                      <SelectValue />
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pol-actions">Allowed actions (csv)</Label>
                  <Input
                    id="pol-actions"
                    value={form.allowed_actions}
                    onChange={(e) => setForm((f) => ({ ...f, allowed_actions: e.target.value }))}
                    placeholder="read,learn"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pol-weight">Source weight</Label>
                  <Input
                    id="pol-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.source_weight}
                    onChange={(e) => setForm((f) => ({ ...f, source_weight: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit" disabled={creating || !form.url_pattern.trim()}>
                Create policy
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Match tester */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldQuestion className="size-4" /> Test URL against policies
            </CardTitle>
            <CardDescription>
              Check which policy would govern a given URL before it is discovered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={runMatch} className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="https://docs.python.org/3/library/enum.html"
                value={matchUrl}
                onChange={(e) => setMatchUrl(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary" disabled={matchBusy || !matchUrl.trim()}>
                Match
              </Button>
            </form>
            {matchResult ? (
              matchResult.matched && matchResult.policy ? (
                <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
                  <p className="font-medium text-emerald-800 dark:text-emerald-300">
                    Matched policy
                  </p>
                  <JsonBlock value={matchResult.policy} maxHeight="max-h-40" />
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  No policy matches <span className="font-mono">{matchResult.url}</span> — the
                  source will need manual review.
                </div>
              )
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Policy list */}
      {policies.error ? <ErrorBlock message={policies.error} /> : null}
      {policies.loading ? <LoadingBlock label="Loading policies…" /> : null}

      {!policies.loading && (policies.data ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="No policies" description="Create the first source policy above." />
          </CardContent>
        </Card>
      ) : null}

      {(policies.data ?? []).length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Actions</TableHead>
                    <TableHead className="hidden lg:table-cell">Weight</TableHead>
                    <TableHead className="hidden xl:table-cell">Created</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(policies.data ?? []).map((p) => (
                    <TableRow key={p.policy_id}>
                      <TableCell className="font-mono text-xs">{p.url_pattern}</TableCell>
                      <TableCell>
                        <StateBadge state={p.state} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.allowed_actions.map((a) => (
                            <Badge key={a} variant="secondary" className="font-mono text-[10px]">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs tabular-nums">
                        {p.source_weight.toFixed(1)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDate(p.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => void remove(p)}>
                          <Trash2 className="size-4 text-rose-600" />
                        </Button>
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
