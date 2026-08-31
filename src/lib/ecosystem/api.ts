/**
 * SupremeAI Ecosystem API client.
 *
 * Covers all 48 backend endpoints of `ecosystem/standalone_app.py`:
 *   - Auth (7): register / login / me / logout / refresh / list users / set role
 *   - Public (11): health, capabilities (+search/+one), tasks (+one), resources,
 *     ecosystem health, deployments (+trace), mcp manifest
 *   - User (4): submit task, cancel task, task SSE events, mcp call
 *   - Admin (26): capabilities CRUD+lifeccycle, proposals+decisions, sources,
 *     policies, learned, opportunities, governance, overview
 *
 * Transport notes:
 *   - Every request is a RELATIVE URL (sandbox gateway requirement). The
 *     configured backend URL is parsed into a path prefix + port; the port is
 *     forwarded via the `XTransformPort` query parameter so the gateway can
 *     route to the right upstream service.
 *   - Bearer token is injected from localStorage on every request.
 *   - The SSE endpoint is consumed with a streaming `fetch` (not EventSource)
 *     so the Authorization header can be attached.
 */

import type {
  AdminOverview,
  ApprovalDecisionRecord,
  AuthResponse,
  Budget,
  Capability,
  CapabilityCreateRequest,
  CapabilitySearchRequest,
  CapabilitySearchResponse,
  DeploymentListParams,
  DeploymentRecord,
  DeploymentTraceResponse,
  EcosystemHealthResponse,
  GovDecision,
  GovDecisionListParams,
  LearnedItem,
  LearnedListParams,
  LearningOpportunity,
  McpCallResult,
  McpManifest,
  OpportunityAdvanceRequest,
  OpportunityCreateRequest,
  OpportunityListParams,
  PolicyMatchResponse,
  PolicyCreateRequest,
  PruneLearnedRequest,
  PruneLearnedResponse,
  Proposal,
  ProposalCreateRequest,
  ProposalDecision,
  ProposalDecisionRequest,
  ProposalListParams,
  RefreshResponse,
  ResourceListParams,
  ResourceRecord,
  Role,
  ServiceHealth,
  Source,
  SourceDiscoverRequest,
  SourceListParams,
  SourcePolicy,
  SourceTransitionRequest,
  Task,
  TaskEventFrame,
  TaskListParams,
  TaskSubmitRequest,
  User,
} from './types'

// ---------------------------------------------------------------------------
// Local session storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'ecosystem.token'
const USER_KEY = 'ecosystem.user'
const BACKEND_KEY = 'ecosystem.backendUrl'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function setSession(auth: { user: User; token: string }): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, auth.token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
}

export function setStoredUser(user: User): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

// ---------------------------------------------------------------------------
// Backend URL config (path prefix + gateway port), persisted in localStorage
// ---------------------------------------------------------------------------

const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_ECOSYSTEM_API_URL || 'http://localhost:8010'

export function getBackendUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BACKEND_URL
  try {
    return window.localStorage.getItem(BACKEND_KEY) || DEFAULT_BACKEND_URL
  } catch {
    return DEFAULT_BACKEND_URL
  }
}

export function setBackendUrl(url: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BACKEND_KEY, url)
}

interface ParsedBackend {
  /** Path prefix to prepend to every endpoint ("" when none). */
  prefix: string
  /** Upstream port — forwarded as `XTransformPort` for the sandbox gateway. */
  port: number | null
}

export function parseBackendUrl(raw: string): ParsedBackend {
  const value = (raw || '').trim()
  if (!value || value === '/') return { prefix: '', port: null }
  try {
    // Absolute URL (e.g. "http://localhost:8010" or "http://host:8010/prefix")
    const u = new URL(value)
    const prefix = u.pathname.replace(/\/+$/, '')
    return { prefix, port: u.port ? Number(u.port) : null }
  } catch {
    // Relative path (e.g. "/api" or "/")
    const prefix = value.startsWith('/') ? value.replace(/\/+$/, '') : `/${value}`
    return { prefix, port: null }
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const { prefix, port } = parseBackendUrl(getBackendUrl())
  // Path is always relative so requests stay same-origin through the gateway.
  let url = path.startsWith('/') ? path : `/${path}`
  if (prefix) url = `${prefix}${url}`
  const qs = new URLSearchParams()
  if (port) qs.set('XTransformPort', String(port))
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue
      qs.set(k, String(v))
    }
  }
  const query = qs.toString()
  return query ? `${url}?${query}` : url
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class EcosystemApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail || `Ecosystem API error (${status})`)
    this.name = 'EcosystemApiError'
    this.status = status
    this.detail = detail
  }
}

type UnauthorizedHandler = () => void
const unauthorizedHandlers = new Set<UnauthorizedHandler>()

/** Register a callback fired when any request gets a 401 (token expired/revoked). */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler)
  return () => unauthorizedHandlers.delete(handler)
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  opts?: {
    params?: Record<string, unknown>
    body?: unknown
    /** Set for the login/register calls — avoids clearing session on 401. */
    skipAuth?: boolean
    signal?: AbortSignal
  },
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts?.body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (token && !opts?.skipAuth) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts?.params), {
      method,
      headers,
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts?.signal,
      cache: 'no-store',
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new EcosystemApiError(0, 'Network error — is the ecosystem backend reachable?')
  }

  if (res.status === 401 && !opts?.skipAuth) {
    clearSession()
    unauthorizedHandlers.forEach((h) => h())
    throw new EcosystemApiError(401, 'Session expired or invalid — please sign in again.')
  }

  if (!res.ok) {
    let detail = res.statusText || 'Request failed'
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
      else if (typeof data?.detail === 'object' && data.detail !== null) {
        detail = JSON.stringify(data.detail)
      } else if (typeof data === 'string') detail = data
    } catch {
      // keep statusText
    }
    throw new EcosystemApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

const get = <T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal) =>
  request<T>('GET', path, { params, signal })
const post = <T>(path: string, body?: unknown, params?: Record<string, unknown>) =>
  request<T>('POST', path, { body, params })
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body })
const del = <T>(path: string, params?: Record<string, unknown>) =>
  request<T>('DELETE', path, { params })

// ===========================================================================
//  API surface — 48 endpoints
// ===========================================================================

export const ecosystemApi = {
  // -------------------------------------------------------------------
  // Auth (7)
  // -------------------------------------------------------------------

  /** A1 — POST /api/v1/auth/register */
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('POST', '/api/v1/auth/register', {
      body: { email, password, name: name || '' },
      skipAuth: true,
    })
    setSession(res)
    return res
  },

  /** A2 — POST /api/v1/auth/login */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('POST', '/api/v1/auth/login', {
      body: { email, password },
      skipAuth: true,
    })
    setSession(res)
    return res
  },

  /** A3 — GET /api/v1/auth/me */
  async getMe(): Promise<User> {
    return get<User>('/api/v1/auth/me')
  },

  /** A4 — POST /api/v1/auth/logout */
  async logout(): Promise<{ ok: boolean }> {
    try {
      return await post<{ ok: boolean }>('/api/v1/auth/logout')
    } finally {
      clearSession()
    }
  },

  /** A7 — POST /api/v1/auth/refresh (rotates the token) */
  async refreshToken(): Promise<RefreshResponse> {
    const res = await post<RefreshResponse>('/api/v1/auth/refresh')
    if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, res.token)
    return res
  },

  /** A5 — GET /api/v1/auth/users (admin) */
  async listUsers(): Promise<User[]> {
    return get<User[]>('/api/v1/auth/users')
  },

  /** A6 — PATCH /api/v1/auth/users/{id}/role (admin) */
  async changeRole(userId: string, role: Role | string): Promise<User> {
    return patch<User>(`/api/v1/auth/users/${encodeURIComponent(userId)}/role`, { role })
  },

  // -------------------------------------------------------------------
  // Public ecosystem (11)
  // -------------------------------------------------------------------

  /** P1 — GET /health */
  async health(): Promise<ServiceHealth> {
    return get<ServiceHealth>('/health')
  },

  /** P2 — GET /api/v1/ecosystem/capabilities */
  async listCapabilities(opts?: { state?: string; category?: string; limit?: number }): Promise<Capability[]> {
    return get<Capability[]>('/api/v1/ecosystem/capabilities', opts as Record<string, unknown>)
  },

  /** P3 — POST /api/v1/ecosystem/capabilities/search */
  async searchCapabilities(req: CapabilitySearchRequest): Promise<CapabilitySearchResponse> {
    return post<CapabilitySearchResponse>('/api/v1/ecosystem/capabilities/search', {
      requirement: req.requirement,
      signature_hint: req.signature_hint ?? null,
      limit: req.limit ?? 10,
    })
  },

  /** P4 — GET /api/v1/ecosystem/capabilities/{id} */
  async getCapability(id: string): Promise<Capability> {
    return get<Capability>(`/api/v1/ecosystem/capabilities/${encodeURIComponent(id)}`)
  },

  /** P5 — GET /api/v1/ecosystem/tasks */
  async listTasks(opts?: TaskListParams): Promise<Task[]> {
    return get<Task[]>('/api/v1/ecosystem/tasks', opts as Record<string, unknown>)
  },

  /** P6 — GET /api/v1/ecosystem/tasks/{id} */
  async getTask(id: string): Promise<Task> {
    return get<Task>(`/api/v1/ecosystem/tasks/${encodeURIComponent(id)}`)
  },

  /** P7 — GET /api/v1/ecosystem/resources */
  async listResources(opts?: ResourceListParams): Promise<ResourceRecord[]> {
    return get<ResourceRecord[]>('/api/v1/ecosystem/resources', opts as Record<string, unknown>)
  },

  /** P8 — GET /api/v1/ecosystem/health */
  async ecosystemHealth(): Promise<EcosystemHealthResponse> {
    return get<EcosystemHealthResponse>('/api/v1/ecosystem/health')
  },

  /** P9 — GET /api/v1/ecosystem/deployments */
  async listDeployments(opts?: DeploymentListParams): Promise<DeploymentRecord[]> {
    return get<DeploymentRecord[]>('/api/v1/ecosystem/deployments', opts as Record<string, unknown>)
  },

  /** P10 — GET /api/v1/ecosystem/deployments/trace/{sha} */
  async traceCommit(sha: string): Promise<DeploymentTraceResponse> {
    return get<DeploymentTraceResponse>(
      `/api/v1/ecosystem/deployments/trace/${encodeURIComponent(sha)}`,
    )
  },

  /** P11 — GET /api/v1/ecosystem/mcp/manifest */
  async mcpManifest(): Promise<McpManifest> {
    return get<McpManifest>('/api/v1/ecosystem/mcp/manifest')
  },

  // -------------------------------------------------------------------
  // User-authenticated (4)
  // -------------------------------------------------------------------

  /** U1 — POST /api/v1/ecosystem/tasks */
  async submitTask(req: TaskSubmitRequest): Promise<Task> {
    return post<Task>('/api/v1/ecosystem/tasks', {
      goal: req.goal,
      success_criteria: req.success_criteria ?? {},
      capability_requirements: req.capability_requirements ?? [],
      risk_level: req.risk_level ?? 'LOW',
      tenant_id: req.tenant_id ?? null,
      scope: req.scope ?? {},
    })
  },

  /** U2 — POST /api/v1/ecosystem/tasks/{id}/cancel */
  async cancelTask(id: string, reason?: string): Promise<Task> {
    return post<Task>(`/api/v1/ecosystem/tasks/${encodeURIComponent(id)}/cancel`, {
      reason: reason ?? null,
    })
  },

  /**
   * U3 — GET /api/v1/ecosystem/tasks/{id}/events (SSE).
   *
   * Implemented with a streaming fetch (rather than EventSource) so the
   * Authorization header can be sent. Emits parsed frames to `onFrame`.
   * Returns an unsubscribe function.
   */
  subscribeTaskEvents(
    taskId: string,
    onFrame: (frame: TaskEventFrame) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const controller = new AbortController()
    const token = getToken()
    const headers: Record<string, string> = { Accept: 'text/event-stream' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const run = async () => {
      try {
        const res = await fetch(buildUrl(`/api/v1/ecosystem/tasks/${encodeURIComponent(taskId)}/events`), {
          method: 'GET',
          headers,
          signal: controller.signal,
          cache: 'no-store',
        })
        if (!res.ok || !res.body) {
          let detail = `SSE stream failed (${res.status})`
          try {
            const data = await res.json()
            if (typeof data?.detail === 'string') detail = data.detail
          } catch {
            /* ignore */
          }
          onError?.(new EcosystemApiError(res.status, detail))
          return
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // SSE frames are separated by a blank line (\n\n or \r\n\r\n).
          for (;;) {
            let sep = buffer.indexOf('\r\n\r\n')
            let sepLen = 4
            if (sep === -1) {
              sep = buffer.indexOf('\n\n')
              sepLen = 2
            }
            if (sep === -1) break
            const frameText = buffer.slice(0, sep)
            buffer = buffer.slice(sep + sepLen)
            const frame = parseSseFrame(frameText)
            if (frame) onFrame(frame)
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          onError?.(err as Error)
        }
      }
    }
    void run()
    return () => controller.abort()
  },

  /** U4 — POST /api/v1/ecosystem/mcp/call */
  async mcpCall(operation: string, params?: Record<string, unknown>): Promise<McpCallResult> {
    return post<McpCallResult>('/api/v1/ecosystem/mcp/call', {
      operation,
      params: params ?? {},
    })
  },

  // -------------------------------------------------------------------
  // Admin — capabilities (5)
  // -------------------------------------------------------------------

  /** C1 — POST /api/v1/ecosystem/admin/capabilities */
  async adminCreateCapability(req: CapabilityCreateRequest): Promise<Capability> {
    return post<Capability>('/api/v1/ecosystem/admin/capabilities', req)
  },

  /** C2 — POST /api/v1/ecosystem/admin/capabilities/{id}/lifecycle */
  async adminTransitionCapability(id: string, toState: string, actor?: string): Promise<Capability> {
    return post<Capability>(
      `/api/v1/ecosystem/admin/capabilities/${encodeURIComponent(id)}/lifecycle`,
      { to_state: toState, actor: actor || 'admin' },
    )
  },

  /** C3 — POST /api/v1/ecosystem/admin/capabilities/{id}/promote */
  async adminPromoteCapability(id: string, actor?: string): Promise<Capability> {
    return post<Capability>(
      `/api/v1/ecosystem/admin/capabilities/${encodeURIComponent(id)}/promote`,
      undefined,
      { actor: actor || 'admin' },
    )
  },

  /** C4 — POST /api/v1/ecosystem/admin/capabilities/{id}/archive */
  async adminArchiveCapability(id: string, actor?: string): Promise<Capability> {
    return post<Capability>(
      `/api/v1/ecosystem/admin/capabilities/${encodeURIComponent(id)}/archive`,
      undefined,
      { actor: actor || 'admin' },
    )
  },

  /** C5 — DELETE /api/v1/ecosystem/admin/capabilities/{id} */
  async adminDeleteCapability(id: string): Promise<{ ok: boolean; capability_id: string }> {
    return del<{ ok: boolean; capability_id: string }>(
      `/api/v1/ecosystem/admin/capabilities/${encodeURIComponent(id)}`,
    )
  },

  // -------------------------------------------------------------------
  // Admin — proposals & decisions (4)
  // -------------------------------------------------------------------

  /** PR1 — GET /api/v1/ecosystem/admin/proposals */
  async adminListProposals(opts?: ProposalListParams): Promise<Proposal[]> {
    return get<Proposal[]>('/api/v1/ecosystem/admin/proposals', opts as Record<string, unknown>)
  },

  /** PR2 — POST /api/v1/ecosystem/admin/proposals */
  async adminCreateProposal(req: ProposalCreateRequest): Promise<Proposal> {
    return post<Proposal>('/api/v1/ecosystem/admin/proposals', req)
  },

  /** PR3 — POST /api/v1/ecosystem/admin/proposals/{id}/decide */
  async adminDecideProposal(
    id: string,
    decision: ProposalDecision,
    rationale?: string,
    decidedBy?: string,
  ): Promise<Proposal> {
    const body: ProposalDecisionRequest = {
      decision,
      decided_by: decidedBy || 'admin',
      rationale: rationale || '',
    }
    return post<Proposal>(
      `/api/v1/ecosystem/admin/proposals/${encodeURIComponent(id)}/decide`,
      body,
    )
  },

  /** PR4 — GET /api/v1/ecosystem/admin/proposals/{id}/decisions */
  async adminListDecisions(id: string): Promise<ApprovalDecisionRecord[]> {
    return get<ApprovalDecisionRecord[]>(
      `/api/v1/ecosystem/admin/proposals/${encodeURIComponent(id)}/decisions`,
    )
  },

  // -------------------------------------------------------------------
  // Admin — sources (4)
  // -------------------------------------------------------------------

  /** SO1 — GET /api/v1/ecosystem/admin/sources */
  async adminListSources(opts?: SourceListParams): Promise<Source[]> {
    return get<Source[]>('/api/v1/ecosystem/admin/sources', opts as Record<string, unknown>)
  },

  /** SO2 — POST /api/v1/ecosystem/admin/sources/discover */
  async adminDiscoverSource(url: string, category?: string): Promise<Source> {
    const body: SourceDiscoverRequest = { url, category: category || null }
    return post<Source>('/api/v1/ecosystem/admin/sources/discover', body)
  },

  /** SO3 — POST /api/v1/ecosystem/admin/sources/{id}/transition */
  async adminTransitionSource(id: string, toState: string): Promise<Source> {
    const body: SourceTransitionRequest = { to_state: toState }
    return post<Source>(
      `/api/v1/ecosystem/admin/sources/${encodeURIComponent(id)}/transition`,
      body,
    )
  },

  /** SO4 — GET /api/v1/ecosystem/admin/sources/{id} */
  async adminGetSource(id: string): Promise<Source> {
    return get<Source>(`/api/v1/ecosystem/admin/sources/${encodeURIComponent(id)}`)
  },

  // -------------------------------------------------------------------
  // Admin — source policies (4)
  // -------------------------------------------------------------------

  /** SP1 — GET /api/v1/ecosystem/admin/policies */
  async adminListPolicies(limit?: number): Promise<SourcePolicy[]> {
    return get<SourcePolicy[]>('/api/v1/ecosystem/admin/policies', limit ? { limit } : undefined)
  },

  /** SP2 — POST /api/v1/ecosystem/admin/policies */
  async adminCreatePolicy(req: PolicyCreateRequest): Promise<SourcePolicy> {
    return post<SourcePolicy>('/api/v1/ecosystem/admin/policies', {
      url_pattern: req.url_pattern,
      category: req.category || 'UNKNOWN',
      state: req.state || 'UNKNOWN',
      allowed_actions: req.allowed_actions ?? ['read'],
      source_weight: req.source_weight ?? 1.0,
      expires_at: req.expires_at ?? null,
    })
  },

  /** SP3 — DELETE /api/v1/ecosystem/admin/policies/{id} */
  async adminDeletePolicy(id: string): Promise<{ ok: boolean; policy_id: string }> {
    return del<{ ok: boolean; policy_id: string }>(
      `/api/v1/ecosystem/admin/policies/${encodeURIComponent(id)}`,
    )
  },

  /** SP4 — GET /api/v1/ecosystem/admin/policies/match?url=... */
  async adminMatchPolicy(url: string): Promise<PolicyMatchResponse> {
    return get<PolicyMatchResponse>('/api/v1/ecosystem/admin/policies/match', { url })
  },

  // -------------------------------------------------------------------
  // Admin — learned items (3)
  // -------------------------------------------------------------------

  /** LE1 — GET /api/v1/ecosystem/admin/learned */
  async adminListLearned(opts?: LearnedListParams): Promise<LearnedItem[]> {
    return get<LearnedItem[]>('/api/v1/ecosystem/admin/learned', opts as Record<string, unknown>)
  },

  /** LE2 — POST /api/v1/ecosystem/admin/learned/prune */
  async adminPruneLearned(req?: PruneLearnedRequest): Promise<PruneLearnedResponse> {
    return post<PruneLearnedResponse>('/api/v1/ecosystem/admin/learned/prune', {
      threshold: req?.threshold ?? 0.1,
      max_age_days: req?.max_age_days ?? 30,
    })
  },

  /** LE3 — DELETE /api/v1/ecosystem/admin/learned/{id} */
  async adminDeleteLearned(id: string): Promise<{ ok: boolean; item_id: string }> {
    return del<{ ok: boolean; item_id: string }>(
      `/api/v1/ecosystem/admin/learned/${encodeURIComponent(id)}`,
    )
  },

  // -------------------------------------------------------------------
  // Admin — opportunities (3)
  // -------------------------------------------------------------------

  /** OP1 — GET /api/v1/ecosystem/admin/opportunities */
  async adminListOpportunities(opts?: OpportunityListParams): Promise<LearningOpportunity[]> {
    return get<LearningOpportunity[]>(
      '/api/v1/ecosystem/admin/opportunities',
      opts as Record<string, unknown>,
    )
  },

  /** OP2 — POST /api/v1/ecosystem/admin/opportunities */
  async adminSurfaceOpportunity(req: OpportunityCreateRequest): Promise<LearningOpportunity> {
    return post<LearningOpportunity>('/api/v1/ecosystem/admin/opportunities', {
      capability_hint: req.capability_hint,
      gap_description: req.gap_description ?? '',
      signal_id: req.signal_id ?? null,
      predicted_value: req.predicted_value ?? 0,
      predicted_effort: req.predicted_effort ?? 0,
    })
  },

  /** OP3 — POST /api/v1/ecosystem/admin/opportunities/{id}/advance */
  async adminAdvanceOpportunity(
    id: string,
    toStage: string,
    proposalId?: string,
  ): Promise<LearningOpportunity> {
    const body: OpportunityAdvanceRequest = {
      to_stage: toStage,
      proposal_id: proposalId ?? null,
    }
    return post<LearningOpportunity>(
      `/api/v1/ecosystem/admin/opportunities/${encodeURIComponent(id)}/advance`,
      body,
    )
  },

  // -------------------------------------------------------------------
  // Admin — governance (2)
  // -------------------------------------------------------------------

  /** GO1 — GET /api/v1/ecosystem/admin/governance/decisions */
  async adminGovernanceDecisions(opts?: GovDecisionListParams): Promise<GovDecision[]> {
    return get<GovDecision[]>(
      '/api/v1/ecosystem/admin/governance/decisions',
      opts as Record<string, unknown>,
    )
  },

  /** GO2 — GET /api/v1/ecosystem/admin/governance/budgets */
  async adminGovernanceBudgets(): Promise<Budget[]> {
    return get<Budget[]>('/api/v1/ecosystem/admin/governance/budgets')
  },

  // -------------------------------------------------------------------
  // Admin — overview (1)
  // -------------------------------------------------------------------

  /** OV1 — GET /api/v1/ecosystem/admin/overview */
  async adminOverview(): Promise<AdminOverview> {
    return get<AdminOverview>('/api/v1/ecosystem/admin/overview')
  },
}

// ---------------------------------------------------------------------------
// SSE frame parser
// ---------------------------------------------------------------------------

function parseSseFrame(text: string): TaskEventFrame | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(':')) continue // comment / heartbeat
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

