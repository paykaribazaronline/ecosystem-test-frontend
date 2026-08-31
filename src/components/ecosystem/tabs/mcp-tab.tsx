'use client'

/** Admin — MCP: operations manifest + playground with response inspector. */

import * as React from 'react'
import { Play, Puzzle, Terminal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import type { McpCallResult, McpManifest } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  JsonBlock,
  LoadingBlock,
  RefreshButton,
  useAsyncData,
} from '../shared'

const CATEGORY_TONE: Record<string, string> = {
  OBSERVE: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  ANALYZE: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ACT: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

export function McpTab() {
  const { toast } = useToast()
  const manifest = useAsyncData<McpManifest>(() => ecosystemApi.mcpManifest())

  const [operation, setOperation] = React.useState('')
  const [paramsText, setParamsText] = React.useState('{}')
  const [calling, setCalling] = React.useState(false)
  const [result, setResult] = React.useState<McpCallResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const ops = manifest.data?.operations ?? []
  const selected = ops.find((o) => o.operation === operation)

  async function call(e: React.FormEvent) {
    e.preventDefault()
    if (!operation || calling) return
    let params: Record<string, unknown> = {}
    try {
      params = paramsText.trim() ? JSON.parse(paramsText) : {}
    } catch {
      setError('Params must be valid JSON')
      return
    }
    setCalling(true)
    setError(null)
    try {
      const res = await ecosystemApi.mcpCall(operation, params)
      setResult(res)
      toast({ title: `Called ${res.operation}`, description: `category ${res.category}` })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Call failed')
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Model Context Protocol surface — OBSERVE / ANALYZE for everyone, ACT is
          governance-gated.
        </p>
        <RefreshButton onClick={manifest.reload} pending={manifest.loading} />
      </div>

      {manifest.error ? <ErrorBlock message={manifest.error} /> : null}
      {manifest.loading ? <LoadingBlock label="Loading manifest…" /> : null}

      {!manifest.loading && ops.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Puzzle}
              title="No operations registered"
              description="The MCP skeleton registers default operations at startup."
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Manifest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Puzzle className="size-4" /> Manifest ({ops.length} operations)
            </CardTitle>
            <CardDescription>
              Categories: {(manifest.data?.categories ?? []).join(', ') || '—'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
              {ops.map((op) => (
                <button
                  key={op.operation}
                  type="button"
                  onClick={() => {
                    setOperation(op.operation)
                    setResult(null)
                    setError(null)
                  }}
                  className={
                    'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors hover:bg-accent ' +
                    (op.operation === operation ? 'border-foreground bg-accent' : '')
                  }
                >
                  <span className="truncate font-mono">{op.operation}</span>
                  <Badge className={'font-mono text-[10px] ' + (CATEGORY_TONE[op.category] ?? '')}>
                    {op.category}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Playground */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4" /> Playground
            </CardTitle>
            <CardDescription>
              Call an operation with JSON params and inspect the raw response.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={call} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mcp-op">Operation</Label>
                <Select
                  value={operation}
                  onValueChange={(v) => {
                    setOperation(v)
                    setResult(null)
                    setError(null)
                  }}
                >
                  <SelectTrigger id="mcp-op">
                    <SelectValue placeholder="Pick an operation…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ops.map((op) => (
                      <SelectItem key={op.operation} value={op.operation}>
                        {op.operation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected ? (
                  <p className="text-xs text-muted-foreground">
                    Category <span className="font-mono">{selected.category}</span>
                    {selected.category === 'ACT'
                      ? ' — requires admin role and passes the governance gate.'
                      : ' — available to all authenticated users.'}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcp-params">Params (JSON)</Label>
                <Textarea
                  id="mcp-params"
                  rows={5}
                  className="font-mono text-xs"
                  value={paramsText}
                  onChange={(e) => setParamsText(e.target.value)}
                  placeholder='{"resource_id": "res-…"}'
                />
              </div>
              <Button type="submit" disabled={!operation || calling}>
                <Play className="size-4" /> {calling ? 'Calling…' : 'Call operation'}
              </Button>
            </form>

            {error ? (
              <div className="mt-4">
                <ErrorBlock message={error} />
              </div>
            ) : null}

            {result ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Response</p>
                <JsonBlock value={result} maxHeight="max-h-64" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
