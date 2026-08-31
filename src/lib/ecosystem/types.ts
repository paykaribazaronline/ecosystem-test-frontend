// Ecosystem API client — talks to the standalone test harness backend.
// All endpoints are documented in docs/ECOSYSTEM_ROUTE_CONTRACT.md.

export interface Capability {
  capability_id: string
  name: string
  purpose: string
  signature: string
  category: string
  version: string
  execution_method: string
  security_level: string
  quality_score: number
  usage_count: number
  success_rate: number
  lifecycle_state: string
  runtime_tier: string
  source: string
  owner: string
  created_at: string
  updated_at: string
}

export interface TaskRecord {
  task_id: string
  goal: string
  owner: string
  scope: string
  state: string
  plan: unknown[]
  capability_requirements: unknown[]
  resource_id: string | null
  capability_id: string | null
  artifacts: unknown[]
  result: Record<string, unknown>
  success_criteria: Record<string, unknown>
  verification_result: Record<string, unknown>
  retry_count: number
  retry_limit: number
  time_limit_seconds: number
  risk_level: string
  correlation: Record<string, string>
  created_by: string
  tenant_id: string | null
  error: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export interface ResourceRecord {
  resource_id: string
  name: string
  provider: string
  type: string
  environment: string
  repository: string | null
  deployment_id: string | null
  region: string | null
  state: string
  dependencies: string[]
  capabilities: string[]
  metadata: Record<string, unknown>
  owner: string
  created_at: string
  updated_at: string
}

export interface UnifiedHealth {
  resource_id: string
  status: string
  availability?: number
  latency_ms?: number | null
  error_rate?: number | null
  cpu_percent?: number | null
  memory_current_mb?: number | null
  memory_peak_mb?: number | null
  memory_limit_mb?: number | null
  memory_percent?: number | null
  memory_trend?: string
  version?: string | null
  captured_at: string
  metadata?: Record<string, unknown>
  error?: string
}

export interface Proposal {
  proposal_id: string
  kind: string
  title: string
  description: string
  priority: string
  state: string
  risk_level: string
  dedup_key: string | null
  payload: Record<string, unknown>
  evidence: unknown[]
  cost_estimate: Record<string, unknown>
  proposed_by: string
  tenant_id: string | null
  correlation_id: string | null
  created_at: string
  expires_at: string
  resolved_by: string | null
  resolved_at: string | null
  decision_reason: string | null
  policy_generated: Record<string, unknown>
}

export interface DecisionMemory {
  memory_id: string
  proposal_id: string
  kind: string
  dedup_key: string | null
  decision: string
  reason: string | null
  scope: string | null
  time: string
  policy_generated: Record<string, unknown>
}

export interface DeploymentRecord {
  deployment_id: string
  resource_id: string
  repository: string
  commit_sha: string | null
  image_digest: string | null
  environment: string
  status: string
  health_after_deploy: string | null
  rollback_status: string | null
  triggered_by: string
  correlation: Record<string, unknown>
  artifacts: unknown[]
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface LearningOpportunity {
  opportunity_id: string
  requirement: string
  signal_id: string | null
  source_url: string | null
  usefulness: string
  feasibility: string
  risk: string
  cost: string
  maintenance: string
  reuse_existing_id: string | null
  proposal_id: string | null
  stage: string
  created_at: string
  updated_at: string
}

export interface AdminOverview {
  capabilities: { total: number; active: number; archived: number }
  approvals_pending: number
  learning_opportunities: { total: number; awaiting_approval: number }
  escalated_tasks: number
}

export interface MCPManifest {
  observe: string[]
  analyze: string[]
  act: string[]
  note: string
}

export interface MCPCallResult {
  ok: boolean
  operation?: string
  category?: string
  result?: unknown
  error?: string
  risk?: string
  requires_approval?: boolean
  reason?: string
  hint?: string
}
