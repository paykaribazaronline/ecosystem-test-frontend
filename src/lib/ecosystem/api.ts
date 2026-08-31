'use client'

// Ecosystem API client — uses the configured base URL + admin token.

import type {
  Capability,
  TaskRecord,
  ResourceRecord,
  UnifiedHealth,
  Proposal,
  DecisionMemory,
  DeploymentRecord,
  LearningOpportunity,
  AdminOverview,
  MCPManifest,
  MCPCallResult,
} from './types'

const STORAGE_KEY = 'supremeai.ecosystem.settings'

export interface Settings {
  baseUrl: string
  adminToken: string
}

const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'http://127.0.0.1:8765',
  adminToken: 'local-test-token-12345',
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

async function request<T>(
  path: string,
  opts: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    admin?: boolean
    token?: string
    baseUrl?: string
  } = {},
): Promise<T> {
  const settings = loadSettings()
  const base = (opts.baseUrl ?? settings.baseUrl).replace(/\/$/, '')
  const url = `${base}${path}`
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.admin ?? path.includes('/admin/')) {
    if (opts.token ?? settings.adminToken) {
      headers['Authorization'] = `Bearer ${opts.token ?? settings.adminToken}`
    }
  }
  const r = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`HTTP ${r.status} ${r.statusText} — ${text.slice(0, 200)}`)
  }
  return (await r.json()) as T
}

// ── Health ────────────────────────────────────────────────────────────────
export async function getHealth(): Promise<{ status: string; service: string }> {
  return request('/health')
}

export async function getEcosystemHealth(): Promise<{
  composite: string
  resources: UnifiedHealth[]
  top_memory: UnifiedHealth[]
}> {
  return request('/api/v1/ecosystem/health')
}

// ── Capabilities ──────────────────────────────────────────────────────────
export async function listCapabilities(): Promise<Capability[]> {
  return request('/api/v1/ecosystem/capabilities')
}

export async function searchCapabilities(req: {
  requirement: string
  signature_hint?: string
  category_hint?: string
  limit?: number
}): Promise<{ requirement: string; candidates: Capability[]; rule: string; gap_detected: boolean }> {
  return request('/api/v1/ecosystem/capabilities/search', { method: 'POST', body: req })
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export async function listTasks(): Promise<TaskRecord[]> {
  return request('/api/v1/ecosystem/tasks')
}

export async function submitTask(req: {
  goal: string
  owner?: string
  scope?: string
  success_criteria?: Record<string, unknown>
  risk_level?: string
  created_by?: string
}): Promise<TaskRecord> {
  return request('/api/v1/ecosystem/tasks', { method: 'POST', body: req })
}

export async function transitionTask(taskId: string, toState: string): Promise<TaskRecord> {
  return request(`/api/v1/ecosystem/tasks/${taskId}/transition`, {
    method: 'POST',
    body: { to_state: toState, actor: 'dashboard' },
  })
}

export async function deliverTask(taskId: string, result: Record<string, unknown>): Promise<TaskRecord> {
  return request(`/api/v1/ecosystem/tasks/${taskId}/deliver`, {
    method: 'POST',
    body: { result, actor: 'dashboard' },
  })
}

// ── Resources ──────────────────────────────────────────────────────────────
export async function listResources(): Promise<ResourceRecord[]> {
  return request('/api/v1/ecosystem/resources')
}

// ── Deployments ────────────────────────────────────────────────────────────
export async function traceCommit(commitSha: string): Promise<{
  commit_sha: string
  deployment_count: number
  resources_affected: string[]
  deployments: DeploymentRecord[]
}> {
  return request(`/api/v1/ecosystem/deployments/trace/${commitSha}`)
}

export async function listDeployments(resourceId: string): Promise<DeploymentRecord[]> {
  return request(`/api/v1/ecosystem/deployments?resource_id=${encodeURIComponent(resourceId)}`)
}

// ── MCP ────────────────────────────────────────────────────────────────────
export async function getMCPManifest(): Promise<MCPManifest> {
  return request('/api/v1/ecosystem/mcp/manifest')
}

export async function callMCP(
  operation: string,
  args: Record<string, unknown> = {},
): Promise<MCPCallResult> {
  return request('/api/v1/ecosystem/mcp/call', {
    method: 'POST',
    body: { operation, arguments: args },
  })
}

// ── Admin ──────────────────────────────────────────────────────────────────
export async function getAdminOverview(): Promise<AdminOverview> {
  return request('/api/v1/ecosystem/admin/overview', { admin: true })
}

export async function listProposals(): Promise<Proposal[]> {
  return request('/api/v1/ecosystem/admin/proposals', { admin: true })
}

export async function decideProposal(
  proposalId: string,
  decision: 'APPROVED' | 'REJECTED' | 'DEFERRED',
  reason?: string,
): Promise<Proposal> {
  return request(`/api/v1/ecosystem/admin/proposals/${proposalId}/decide`, {
    method: 'POST',
    admin: true,
    body: {
      decision,
      resolved_by: 'dashboard',
      reason,
      policy_scope: 'category',
      policy_value: 'general',
    },
  })
}

export async function listDecisions(): Promise<DecisionMemory[]> {
  return request('/api/v1/ecosystem/admin/decisions', { admin: true })
}

export async function listOpportunities(): Promise<LearningOpportunity[]> {
  return request('/api/v1/ecosystem/admin/opportunities', { admin: true })
}

export async function surfaceOpportunity(req: {
  requirement: string
  usefulness?: string
  feasibility?: string
  risk?: string
  cost?: string
}): Promise<LearningOpportunity> {
  return request('/api/v1/ecosystem/admin/opportunities', {
    method: 'POST',
    admin: true,
    body: req,
  })
}

export async function advanceOpportunity(oppId: string, stage: string): Promise<LearningOpportunity> {
  return request(`/api/v1/ecosystem/admin/opportunities/${oppId}/advance`, {
    method: 'POST',
    admin: true,
    body: { to_stage: stage },
  })
}

export async function listGovernanceDecisions(): Promise<unknown[]> {
  return request('/api/v1/ecosystem/admin/governance/decisions?limit=50', { admin: true })
}

// ── SupremeAI bridge (connects to supremeai-backend-v2) ──────────────────────
export interface SupremeAIHealth {
  resource_id: string
  status: string
  raw_status?: string
  version?: string
  environment?: string
  captured_at: string
  metadata?: {
    total_checks?: number
    passed_checks?: number
    uptime_seconds?: number
    platform?: string
    checks?: Array<{ name: string; status: string; latency_ms: number }>
  }
  error?: string
}

export interface SupremeAIBridgeStatus {
  bridge: string
  health: SupremeAIHealth
  deployment: { service: string; url: string; platform: string; environment: string } | null
  resource_id: string
}

export interface SupremeAIProxyResult {
  ok: boolean
  status_code: number
  data: unknown
  path: string
  method: string
  error?: string
}

export async function getSupremeAIHealth(): Promise<SupremeAIHealth> {
  return request('/api/v1/ecosystem/supremeai/health')
}

export async function getSupremeAIStatus(): Promise<SupremeAIBridgeStatus> {
  return request('/api/v1/ecosystem/supremeai/status')
}

export async function supremeAILogin(email: string, password: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  return request('/api/v1/ecosystem/supremeai/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function supremeAIProxy(method: string, path: string, jsonBody?: Record<string, unknown>): Promise<SupremeAIProxyResult> {
  return request('/api/v1/ecosystem/supremeai/proxy', {
    method: 'POST',
    body: { method, path, json_body: jsonBody },
  })
}
