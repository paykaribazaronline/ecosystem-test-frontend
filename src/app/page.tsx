'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Activity, Boxes, Cpu, Github, ListChecks, Network, PlayCircle,
  Settings, Shield, Sparkles, Workflow, Rocket, Database, Search,
  Plus, RefreshCw, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle,
} from 'lucide-react'
import * as api from '@/lib/ecosystem/api'
import { loadSettings, saveSettings, type Settings } from '@/lib/ecosystem/api'
import type {
  Capability, TaskRecord, ResourceRecord, Proposal, DecisionMemory,
  LearningOpportunity, AdminOverview, MCPManifest, MCPCallResult, UnifiedHealth,
  DeploymentRecord,
} from '@/lib/ecosystem/types'

// ── helpers ────────────────────────────────────────────────────────────────
const HEALTH_COLOR: Record<string, string> = {
  HEALTHY: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  DEGRADED: 'bg-amber-100 text-amber-700 border-amber-300',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  UNKNOWN: 'bg-slate-100 text-slate-600 border-slate-300',
  MAINTENANCE: 'bg-blue-100 text-blue-700 border-blue-300',
}
const STATE_COLOR: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700', UNDERSTANDING: 'bg-blue-100 text-blue-700',
  PLANNING: 'bg-blue-100 text-blue-700', CAPABILITY_CHECK: 'bg-purple-100 text-purple-700',
  RESOURCE_CHECK: 'bg-purple-100 text-purple-700', PREPARING: 'bg-cyan-100 text-cyan-700',
  EXECUTING: 'bg-cyan-100 text-cyan-700', VERIFYING: 'bg-indigo-100 text-indigo-700',
  REPAIRING: 'bg-amber-100 text-amber-700', DELIVERING: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-red-100 text-red-700',
  ESCALATED: 'bg-orange-100 text-orange-700', CANCELLED: 'bg-slate-100 text-slate-500',
}
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300',
  LOW: 'bg-slate-100 text-slate-600 border-slate-300',
}
const RISK_COLOR: Record<string, string> = {
  safe: 'bg-emerald-100 text-emerald-700', low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}
function fmtDate(s: string | null): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleString() } catch { return s }
}
function short(s: string | null | undefined, n = 12): string {
  if (!s) return '—'
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ── main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings>({ baseUrl: '', adminToken: '' })
  const [connected, setConnected] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const reconnect = useCallback(async () => {
    try {
      saveSettings(settings)
      const h = await api.getHealth()
      setConnected(h.status === 'ok')
      toast({ title: 'Connected', description: `Backend at ${settings.baseUrl}` })
    } catch (e) {
      setConnected(false)
      toast({ title: 'Connection failed', description: String(e).slice(0, 200), variant: 'destructive' })
    }
  }, [settings, toast])

  useEffect(() => {
    if (!settings.baseUrl) return
    api.getHealth().then(() => setConnected(true)).catch(() => setConnected(false))
  }, [settings.baseUrl])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">SupremeAI Ecosystem</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Autonomous capability foundation — live dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500'}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {connected === null ? 'checking…' : connected ? 'connected' : 'disconnected'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('settings')}>
              <Settings className="w-4 h-4 mr-1" /> Configure
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto bg-white border border-slate-200 p-1 rounded-lg gap-1">
            <TabsTrigger value="overview" className="gap-1.5"><Activity className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="capabilities" className="gap-1.5"><Boxes className="w-4 h-4" /> Capabilities</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><ListChecks className="w-4 h-4" /> Tasks</TabsTrigger>
            <TabsTrigger value="resources" className="gap-1.5"><Network className="w-4 h-4" /> Resources</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5"><Shield className="w-4 h-4" /> Approvals</TabsTrigger>
            <TabsTrigger value="sources" className="gap-1.5"><Search className="w-4 h-4" /> Sources</TabsTrigger>
            <TabsTrigger value="deployments" className="gap-1.5"><Rocket className="w-4 h-4" /> Deployments</TabsTrigger>
            <TabsTrigger value="mcp" className="gap-1.5"><Workflow className="w-4 h-4" /> MCP</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="capabilities" className="mt-6"><CapabilitiesTab /></TabsContent>
          <TabsContent value="tasks" className="mt-6"><TasksTab /></TabsContent>
          <TabsContent value="resources" className="mt-6"><ResourcesTab /></TabsContent>
          <TabsContent value="approvals" className="mt-6"><ApprovalsTab /></TabsContent>
          <TabsContent value="sources" className="mt-6"><SourcesTab /></TabsContent>
          <TabsContent value="deployments" className="mt-6"><DeploymentsTab /></TabsContent>
          <TabsContent value="mcp" className="mt-6"><MCPTab /></TabsContent>
          <TabsContent value="settings" className="mt-6">
            <SettingsTab settings={settings} setSettings={setSettings} onReconnect={reconnect} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto bg-slate-900 text-slate-300 text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>SupremeAI Ecosystem Foundation v1.0.0</span>
          </div>
          <div className="text-slate-400">
            {connected ? `Backend: ${settings.baseUrl}` : 'Not connected — open Settings tab'}
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [ov, setOv] = useState<AdminOverview | null>(null)
  const [health, setHealth] = useState<{ composite: string; resources: UnifiedHealth[]; top_memory: UnifiedHealth[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [o, h] = await Promise.all([api.getAdminOverview(), api.getEcosystemHealth()])
      setOv(o); setHealth(h)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return <Loading />
  if (!ov || !health) return <ErrorState onRetry={refresh} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">System Overview</h2>
          <p className="text-sm text-slate-500">ROADMAP §47 — single centralized admin surface</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Composite health + KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardDescription>Composite Health</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Badge className={HEALTH_COLOR[health.composite] || HEALTH_COLOR.UNKNOWN}>{health.composite}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">{health.resources.length} resources reporting</CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardDescription>Capabilities</CardDescription>
            <CardTitle className="text-2xl">{ov.capabilities.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">{ov.capabilities.active} active</span>
            {' · '}
            <span className="text-slate-500">{ov.capabilities.archived} archived</span>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardDescription>Approvals Pending</CardDescription>
            <CardTitle className="text-2xl">{ov.approvals_pending}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">awaiting admin decision</CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-3"><CardDescription>Escalated Tasks</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{ov.escalated_tasks}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">need intervention</CardContent>
        </Card>
      </div>

      {/* Resource health table */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4" /> Resource Health</CardTitle></CardHeader>
        <CardContent>
          {health.resources.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No health snapshots yet. Visit the Resources tab to trigger a live probe.</p>
          ) : (
            <div className="space-y-2">
              {health.resources.map(h => (
                <div key={h.resource_id} className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge className={HEALTH_COLOR[h.status] || HEALTH_COLOR.UNKNOWN}>{h.status}</Badge>
                    <code className="text-xs text-slate-600">{short(h.resource_id, 16)}</code>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    {h.memory_current_mb && <span>mem {h.memory_current_mb.toFixed(0)} MB</span>}
                    {h.latency_ms && <span>{h.latency_ms.toFixed(0)} ms</span>}
                    <span>{fmtDate(h.captured_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning opportunities summary */}
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-4 h-4" /> Learning Opportunities</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><div className="text-2xl font-semibold">{ov.learning_opportunities.total}</div><div className="text-xs text-slate-500">total surfaced</div></div>
          <div><div className="text-2xl font-semibold text-amber-600">{ov.learning_opportunities.awaiting_approval}</div><div className="text-xs text-slate-500">awaiting approval</div></div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Capabilities Tab ──────────────────────────────────────────────────────────
function CapabilitiesTab() {
  const { toast } = useToast()
  const [caps, setCaps] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [req, setReq] = useState('extract text from pdf')
  const [searchResult, setSearchResult] = useState<{ candidates: Capability[]; gap_detected: boolean } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setCaps(await api.listCapabilities()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const doSearch = async () => {
    try {
      const r = await api.searchCapabilities({ requirement: req })
      setSearchResult({ candidates: r.candidates, gap_detected: r.gap_detected })
      toast({ title: r.gap_detected ? 'Capability gap detected' : 'Matches found', description: `${r.candidates.length} candidate(s)` })
    } catch (e) { toast({ title: 'Search failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Capability Registry</h2>
          <p className="text-sm text-slate-500">ROADMAP §12, §14 — REUSE {'>'} ADAPT {'>'} EXTEND {'>'} CREATE</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Search className="w-4 h-4" /> Capability Search</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={req} onChange={e => setReq(e.target.value)} placeholder="describe what you need…" />
            <Button onClick={doSearch}>Search</Button>
          </div>
          {searchResult && (
            <div>
              <Badge className={searchResult.gap_detected ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}>
                {searchResult.gap_detected ? 'GAP — would require new capability' : `${searchResult.candidates.length} match(es) found`}
              </Badge>
              <div className="mt-2 space-y-1">
                {searchResult.candidates.map(c => (
                  <div key={c.capability_id} className="text-sm border border-slate-200 rounded px-3 py-2 flex justify-between">
                    <span className="font-medium">{c.name}</span>
                    <code className="text-xs text-slate-500">{c.signature}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">All Capabilities ({caps.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[480px]">
            <div className="space-y-2">
              {caps.map(c => (
                <div key={c.capability_id} className="border border-slate-200 rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.purpose}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={c.runtime_tier === 'HOT' ? 'bg-red-100 text-red-700 border-red-300' : c.runtime_tier === 'WARM' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-300'}>{c.runtime_tier}</Badge>
                      <Badge variant="outline" className="text-xs">{c.lifecycle_state}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded">{c.signature}</code>
                    <span>uses: {c.usage_count}</span>
                    <span>success: {(c.success_rate * 100).toFixed(0)}%</span>
                    <span className="capitalize">{c.execution_method}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setTasks(await api.listTasks()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const submit = async () => {
    if (!goal.trim()) return
    try {
      const t = await api.submitTask({ goal, created_by: 'dashboard' })
      toast({ title: 'Task submitted', description: `id ${short(t.task_id)}` })
      setGoal('')
      refresh()
    } catch (e) { toast({ title: 'Failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  const advance = async (t: TaskRecord) => {
    const next: Record<string, string> = {
      RECEIVED: 'UNDERSTANDING', UNDERSTANDING: 'PLANNING', PLANNING: 'CAPABILITY_CHECK',
      CAPABILITY_CHECK: 'RESOURCE_CHECK', RESOURCE_CHECK: 'PREPARING', PREPARING: 'EXECUTING',
      EXECUTING: 'VERIFYING', VERIFYING: 'DELIVERING', DELIVERING: 'COMPLETED',
    }
    const to = next[t.state]
    if (!to) return
    try {
      if (to === 'COMPLETED') {
        await api.deliverTask(t.task_id, { delivered_by: 'dashboard' })
      } else {
        await api.transitionTask(t.task_id, to)
      }
      toast({ title: `→ ${to}` })
      refresh()
    } catch (e) { toast({ title: 'Transition failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Task Engine</h2>
          <p className="text-sm text-slate-500">ROADMAP §22 — autonomous goal execution state machine</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Submit New Goal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. analyze this PDF and produce a summary report" rows={2} />
          <Button onClick={submit} disabled={!goal.trim()}>Submit Task</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">All Tasks ({tasks.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[480px]">
            <div className="space-y-2">
              {tasks.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No tasks yet. Submit one above.</p>}
              {tasks.map(t => (
                <div key={t.task_id} className="border border-slate-200 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{t.goal}</div>
                      <div className="text-xs text-slate-500 mt-0.5">by {t.created_by} · {fmtDate(t.created_at)}</div>
                    </div>
                    <Badge className={STATE_COLOR[t.state] || 'bg-slate-100 text-slate-600'}>{t.state}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <code>{short(t.task_id, 20)}</code>
                    <div className="flex items-center gap-2">
                      <span>risk: <span className={RISK_COLOR[t.risk_level] || ''}>{t.risk_level}</span></span>
                      <span>retries: {t.retry_count}/{t.retry_limit}</span>
                      {!['COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED'].includes(t.state) && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => advance(t)}>
                          Advance <ChevronRight className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Resources Tab ─────────────────────────────────────────────────────────────
function ResourcesTab() {
  const { toast } = useToast()
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [liveHealth, setLiveHealth] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setResources(await api.listResources()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const probeHealth = async (rid: string) => {
    try {
      const r = await api.callMCP('get_health', { resource_id: rid })
      setLiveHealth(prev => ({ ...prev, [rid]: r }))
      toast({ title: r.ok ? 'Probe complete' : 'Probe failed', description: JSON.stringify(r.result || r.error).slice(0, 120) })
    } catch (e) { toast({ title: 'Probe failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Resource Registry</h2>
          <p className="text-sm text-slate-500">ROADMAP §36, §37 — dynamic resource_id, N-nodes abstraction</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(r => {
          const lh = liveHealth[r.resource_id] as MCPCallResult | undefined
          const lhResult = (lh?.result as UnifiedHealth) | undefined
          return (
            <Card key={r.resource_id} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ProviderIcon provider={r.provider} />
                    {r.name}
                  </CardTitle>
                  <Badge className={HEALTH_COLOR[r.state] || HEALTH_COLOR.UNKNOWN}>{r.state}</Badge>
                </div>
                <CardDescription className="capitalize">{r.provider} · {r.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-slate-500 space-y-1">
                  <div><code className="text-slate-700">{short(r.resource_id, 24)}</code></div>
                  <div>capabilities: {r.capabilities.join(', ') || '—'}</div>
                  {lh && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Live:</span>
                        {lh.ok && lhResult ? (
                          <Badge className={HEALTH_COLOR[lhResult.status] || HEALTH_COLOR.UNKNOWN}>{lhResult.status}</Badge>
                        ) : (
                          <Badge variant="destructive">{lh.error || 'failed'}</Badge>
                        )}
                      </div>
                      {lhResult?.error && <div className="text-red-600 mt-1 text-[11px]">{String(lhResult.error).slice(0, 80)}</div>}
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => probeHealth(r.resource_id)}>
                  <PlayCircle className="w-3.5 h-3.5 mr-1" /> Probe health
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'github') return <Github className="w-4 h-4" />
  if (provider === 'render') return <Rocket className="w-4 h-4" />
  if (provider === 'supabase') return <Database className="w-4 h-4" />
  if (provider === 'redis') return <Cpu className="w-4 h-4" />
  return <Network className="w-4 h-4" />
}

// ── Approvals Tab ────────────────────────────────────────────────────────────
function ApprovalsTab() {
  const { toast } = useToast()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [decisions, setDecisions] = useState<DecisionMemory[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [p, d] = await Promise.all([api.listProposals(), api.listDecisions()])
      setProposals(p); setDecisions(d)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const decide = async (id: string, decision: 'APPROVED' | 'REJECTED' | 'DEFERRED') => {
    try {
      await api.decideProposal(id, decision, 'decided via dashboard')
      toast({ title: `Proposal ${decision.toLowerCase()}` })
      refresh()
    } catch (e) { toast({ title: 'Failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Approval Workflow</h2>
          <p className="text-sm text-slate-500">ROADMAP §9, §26, §27 — decision memory + dedup + cooldown</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-4 h-4" /> Pending Proposals ({proposals.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-2">
              {proposals.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No pending proposals.</p>}
              {proposals.map(p => (
                <div key={p.proposal_id} className="border border-slate-200 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={PRIORITY_COLOR[p.priority] || 'bg-slate-100 text-slate-600 border-slate-300'}>{p.priority}</Badge>
                        <Badge variant="outline" className="text-xs">{p.kind}</Badge>
                        <span className="font-medium text-sm">{p.title}</span>
                      </div>
                      <div className="text-xs text-slate-500">{p.description}</div>
                      <div className="text-[11px] text-slate-400 mt-1">by {p.proposed_by} · {fmtDate(p.created_at)} · dedup: {p.dedup_key || '—'}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => decide(p.proposal_id, 'APPROVED')}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => decide(p.proposal_id, 'REJECTED')}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => decide(p.proposal_id, 'DEFERRED')}>Defer</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Decision Memory ({decisions.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {decisions.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No decisions yet.</p>}
              {decisions.map(d => (
                <div key={d.memory_id} className="text-xs border border-slate-200 rounded px-3 py-2 flex justify-between items-center">
                  <div>
                    <Badge variant="outline" className="text-[10px] mr-2">{d.decision}</Badge>
                    <span className="text-slate-700">{d.kind}</span>
                    {d.dedup_key && <code className="ml-2 text-slate-400">{d.dedup_key}</code>}
                  </div>
                  <span className="text-slate-400">{fmtDate(d.time)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sources Tab (Source governance + Learning) ─────────────────────────────────
function SourcesTab() {
  const { toast } = useToast()
  const [opps, setOpps] = useState<LearningOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [requirement, setRequirement] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setOpps(await api.listOpportunities()) } finally { setLoading(false) }
  }, [])
  useEffect(() => { refresh() }, [refresh])

  const surface = async () => {
    if (!requirement.trim()) return
    try {
      await api.surfaceOpportunity({ requirement, usefulness: 'high', feasibility: 'feasible', risk: 'low', cost: 'low' })
      toast({ title: 'Opportunity surfaced' })
      setRequirement(''); refresh()
    } catch (e) { toast({ title: 'Failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  const advance = async (o: LearningOpportunity, to: string) => {
    try { await api.advanceOpportunity(o.opportunity_id, to); toast({ title: `→ ${to}` }); refresh() }
    catch (e) { toast({ title: 'Failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Source Governance + Learning</h2>
          <p className="text-sm text-slate-500">ROADMAP §7, §8, §57 — permission-first learning loop</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-4 h-4" /> Surface a Capability Opportunity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={requirement} onChange={e => setRequirement(e.target.value)} placeholder="e.g. OCR for scanned PDFs" rows={2} />
          <Button onClick={surface} disabled={!requirement.trim()}><Plus className="w-4 h-4 mr-1" /> Surface</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Opportunities ({opps.length})</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[480px]">
            <div className="space-y-2">
              {opps.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No opportunities yet.</p>}
              {opps.map(o => (
                <div key={o.opportunity_id} className="border border-slate-200 rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{o.requirement}</div>
                      <div className="text-xs text-slate-500 mt-0.5">usefulness: {o.usefulness} · risk: {o.risk} · cost: {o.cost}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{o.stage}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-[11px] text-slate-400">{short(o.opportunity_id, 24)}</code>
                    <div className="ml-auto flex gap-1">
                      {!['PROPOSAL', 'AWAITING_APPROVAL', 'REGISTERED', 'ARCHIVED'].includes(o.stage) && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => advance(o, 'PRACTICALITY_ANALYSIS')}>Practicality</Button>
                      )}
                      {o.stage === 'PRACTICALITY_ANALYSIS' && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => advance(o, 'PROPOSAL')}>→ Proposal</Button>}
                      {o.stage === 'PROPOSAL' && <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => advance(o, 'AWAITING_APPROVAL')}>→ Await Approval</Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Deployments Tab ────────────────────────────────────────────────────────────
function DeploymentsTab() {
  const { toast } = useToast()
  const [commitSha, setCommitSha] = useState('')
  const [trace, setTrace] = useState<{ commit_sha: string; deployment_count: number; resources_affected: string[]; deployments: DeploymentRecord[] } | null>(null)

  const doTrace = async () => {
    if (!commitSha.trim()) return
    try {
      const t = await api.traceCommit(commitSha.trim())
      setTrace(t)
      toast({ title: `${t.deployment_count} deployment(s) found` })
    } catch (e) { toast({ title: 'Trace failed', description: String(e).slice(0, 150), variant: 'destructive' }) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Deployment Tracking</h2>
        <p className="text-sm text-slate-500">ROADMAP §40, §44 — which commit caused which incident?</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Trace by Commit SHA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={commitSha} onChange={e => setCommitSha(e.target.value)} placeholder="e.g. abc123 or full 40-char SHA" />
            <Button onClick={doTrace}>Trace</Button>
          </div>
          {trace && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-slate-500 text-xs">Commit</div><code className="text-xs">{trace.commit_sha}</code></div>
                <div><div className="text-slate-500 text-xs">Deployments</div><div className="font-semibold">{trace.deployment_count}</div></div>
                <div><div className="text-slate-500 text-xs">Resources affected</div><div className="font-semibold">{trace.resources_affected.length}</div></div>
              </div>
              <Separator />
              <div className="space-y-1">
                {trace.deployments.map(d => (
                  <div key={d.deployment_id} className="text-xs border border-slate-200 rounded px-3 py-2">
                    <div className="flex justify-between">
                      <code>{short(d.deployment_id, 24)}</code>
                      <Badge variant="outline">{d.status}</Badge>
                    </div>
                    <div className="text-slate-500 mt-1">resource: {short(d.resource_id)} · env: {d.environment} · by: {d.triggered_by}</div>
                    {d.health_after_deploy && <div className="text-emerald-600">health: {d.health_after_deploy}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── MCP Playground Tab ──────────────────────────────────────────────────────────
function MCPTab() {
  const { toast } = useToast()
  const [manifest, setManifest] = useState<MCPManifest | null>(null)
  const [selected, setSelected] = useState('')
  const [argsText, setArgsText] = useState('{}')
  const [result, setResult] = useState<MCPCallResult | null>(null)

  useEffect(() => { api.getMCPManifest().then(setManifest).catch(() => {}) }, [])

  const call = async () => {
    try {
      const args = JSON.parse(argsText || '{}')
      const r = await api.callMCP(selected, args)
      setResult(r)
    } catch (e) {
      toast({ title: 'Failed', description: String(e).slice(0, 150), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">MCP Playground</h2>
        <p className="text-sm text-slate-500">ROADMAP §45, §46 — generic control op (Observe / Analyze / Act)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-lg">Manifest</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {manifest && (
              <div className="space-y-2">
                {(['observe', 'analyze', 'act'] as const).map(cat => (
                  <div key={cat}>
                    <div className="text-xs uppercase text-slate-500 mb-1 flex items-center gap-1">
                      {cat === 'act' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      {cat}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {manifest[cat].map(op => (
                        <button key={op} onClick={() => setSelected(op)}
                          className={`text-xs px-2 py-1 rounded border ${selected === op ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}>
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-lg">Call</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Operation</Label>
              <Input value={selected} onChange={e => setSelected(e.target.value)} placeholder="e.g. get_health" />
            </div>
            <div>
              <Label className="text-xs">Arguments (JSON)</Label>
              <Textarea value={argsText} onChange={e => setArgsText(e.target.value)} rows={4} className="font-mono text-xs" />
            </div>
            <Button onClick={call} disabled={!selected}><PlayCircle className="w-4 h-4 mr-1" /> Call MCP</Button>
            {result && (
              <div>
                <Label className="text-xs">Result</Label>
                <pre className="bg-slate-900 text-slate-100 text-xs p-3 rounded-md overflow-auto max-h-64 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Settings Tab ────────────────────────────────────────────────────────────────
function SettingsTab({ settings, setSettings, onReconnect }: {
  settings: Settings
  setSettings: (s: Settings) => void
  onReconnect: () => void
}) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Configure the backend URL + admin token</p>
      </div>
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">Connection</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Backend URL</Label>
            <Input value={settings.baseUrl} onChange={e => setSettings({ ...settings, baseUrl: e.target.value })} placeholder="http://127.0.0.1:8765" />
          </div>
          <div>
            <Label>Admin Token (Bearer)</Label>
            <Input value={settings.adminToken} onChange={e => setSettings({ ...settings, adminToken: e.target.value })} type="password" />
          </div>
          <Button onClick={onReconnect}>Save + Reconnect</Button>
          <p className="text-xs text-slate-500">
            The dashboard talks directly to the backend (browser → backend CORS-enabled).
            For production deployments, set the same admin token in the backend&apos;s <code>ADMIN_TOKEN</code> env var.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── shared components ──────────────────────────────────────────────────────────
function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mr-2" />
      <span className="text-sm text-slate-500">Loading…</span>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <AlertTriangle className="w-6 h-6 text-amber-500" />
      <span className="text-sm text-slate-600">Failed to load. Is the backend reachable?</span>
      <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="w-4 h-4 mr-1" /> Retry</Button>
    </div>
  )
}
