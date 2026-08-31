/**
 * SupremeAI Ecosystem — TypeScript type mirror of the backend models.
 *
 * Mirrors `/home/z/supremeai-check/backend/ecosystem/standalone_app.py` (48 endpoints)
 * and the Pydantic models in the underlying ecosystem modules.
 * All enums serialize as plain UPPER_SNAKE strings on the wire.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type Role = 'admin' | 'user'

export interface User {
  user_id: string
  email: string
  name: string
  role: Role
  tenant_id: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface AuthResponse {
  user: User
  token: string
  session_id: string
}

export interface RefreshResponse {
  token: string
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  status: string
  service: string
  version: string
  uptime: number
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export type CapabilityLifecycleState =
  | 'IDEA'
  | 'DISCOVERED'
  | 'PROPOSED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'BUILDING'
  | 'VALIDATING'
  | 'ACTIVE'
  | 'MEASURED'
  | 'DEPRECATED'
  | 'ARCHIVED'
  | 'BLOCKED'

export type CapabilityRuntimeTier = 'HOT' | 'WARM' | 'COLD'

export interface Capability {
  capability_id: string
  name: string
  purpose: string
  version: string
  signature: string
  category: string
  inputs: Array<Record<string, unknown>>
  outputs: Array<Record<string, unknown>>
  dependencies: string[]
  permissions: string[]
  execution_method: string
  resource_requirements: Record<string, unknown>
  verification_strategy: Record<string, unknown>
  security_level: string
  quality_score: number
  usage_count: number
  success_rate: number
  lifecycle_state: CapabilityLifecycleState
  runtime_tier: CapabilityRuntimeTier
  source: string
  provenance: Record<string, unknown>
  owner: string
  tenant_id: string | null
  activation_metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  promoted_at: string | null
  archived_at: string | null
}

export interface CapabilitySearchRequest {
  requirement: string
  signature_hint?: string | null
  limit?: number
}

export interface CapabilitySearchResponse {
  requirement: string
  candidates: Capability[]
  rule: string
  gap_detected: boolean
}

export interface CapabilityCreateRequest {
  name: string
  purpose: string
  signature: string
  category?: string
  version?: string
  execution_method?: string
  security_level?: string
  runtime_tier?: CapabilityRuntimeTier | string
  inputs?: Array<Record<string, unknown>>
  outputs?: Array<Record<string, unknown>>
  dependencies?: string[]
  permissions?: string[]
  owner?: string
  tenant_id?: string | null
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type TaskState =
  | 'RECEIVED'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'CAPABILITY_CHECK'
  | 'RESOURCE_CHECK'
  | 'PREPARING'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'REPAIRING'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ESCALATED'
  | 'CANCELLED'

export interface Task {
  task_id: string
  goal: string
  owner: string
  scope: Record<string, unknown>
  state: TaskState
  plan: Record<string, unknown>
  capability_requirements: Array<Record<string, unknown>>
  resource_id: string | null
  capability_id: string | null
  artifacts: Array<Record<string, unknown>>
  result: Record<string, unknown>
  success_criteria: Record<string, unknown>
  verification_result: Record<string, unknown>
  retry_count: number
  retry_limit: number
  time_limit_seconds: number | null
  risk_level: string
  correlation: Record<string, unknown>
  created_by: string
  tenant_id: string | null
  audit_id: string | null
  error: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  user_id: string | null
  user_email: string | null
}

export interface TaskSubmitRequest {
  goal: string
  success_criteria?: Record<string, unknown>
  capability_requirements?: Array<Record<string, unknown>>
  risk_level?: string
  tenant_id?: string | null
  scope?: Record<string, unknown>
}

export interface TaskListParams {
  state?: string
  owner?: string
  user_id?: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type ProviderKind =
  | 'RENDER'
  | 'GITHUB'
  | 'KAGGLE'
  | 'SUPABASE'
  | 'FIREBASE'
  | 'REDIS'
  | 'CI'
  | 'CUSTOM'

export type ResourceState =
  | 'REGISTERED'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'UNKNOWN'
  | 'MAINTENANCE'
  | 'OFFLINE'

export interface ResourceRecord {
  resource_id: string
  provider: ProviderKind | string
  external_id: string
  name: string
  state: ResourceState | string
  endpoint: string | null
  metadata: Record<string, unknown>
  deployment_id: string | null
  owner: string
  tenant_id: string | null
  last_health: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ResourceListParams {
  provider?: string
  environment?: string
  state?: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Ecosystem health
// ---------------------------------------------------------------------------

export type EcosystemHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'WARNING'
  | 'CRITICAL'
  | 'UNKNOWN'
  | 'MAINTENANCE'

export interface MemoryInfo {
  current_mb: number
  peak_mb: number
  limit_mb: number
  percent: number
  trend: string
}

export interface UnifiedHealth {
  record_id: string
  source: string
  status: EcosystemHealthStatus | string
  memory: MemoryInfo
  cpu_percent: number
  disk_percent: number
  latency_ms: number
  error_rate: number
  custom_metrics: Record<string, unknown>
  timestamp: string
  created_at: string
}

export interface EcosystemHealthResponse {
  composite: string
  resources: UnifiedHealth[]
  top_memory: UnifiedHealth[]
}

// ---------------------------------------------------------------------------
// Deployments
// ---------------------------------------------------------------------------

export type DeploymentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ROLLED_BACK'
  | 'SUPERSEDED'

export interface DeploymentRecord {
  deployment_id: string
  resource_id: string
  commit_sha: string | null
  branch: string
  version: string
  status: DeploymentStatus | string
  started_by: string
  correlation: Record<string, unknown>
  started_at: string
  finished_at: string | null
  log_url: string | null
  rollback_of: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface DeploymentListParams {
  resource_id?: string
  commit_sha?: string
  limit?: number
}

export interface DeploymentTraceResponse {
  commit_sha: string
  deployments: DeploymentRecord[]
  count: number
}

// ---------------------------------------------------------------------------
// MCP
// ---------------------------------------------------------------------------

export type MCPOperationCategory = 'OBSERVE' | 'ANALYZE' | 'ACT'

export interface McpOperationInfo {
  operation: string
  category: string
}

export interface McpManifest {
  operations: McpOperationInfo[]
  categories: string[]
  count: number
}

export interface McpCallRequest {
  operation: string
  params?: Record<string, unknown>
}

export interface McpCallResult {
  operation: string
  category: string
  allowed: boolean
  result: unknown
}

// ---------------------------------------------------------------------------
// Proposals (approvals)
// ---------------------------------------------------------------------------

export type ProposalKind =
  | 'NEW_SOURCE'
  | 'NEW_CAPABILITY'
  | 'CAPABILITY_PROMOTION'
  | 'CAPABILITY_ARCHIVE'
  | 'DEPLOYMENT'
  | 'DB_MIGRATION'
  | 'SECRET_ROTATION'
  | 'HIGH_RISK_ACTION'
  | 'LEARNING_PROPOSAL'

export type ProposalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type ProposalState =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'EXECUTED'
  | 'SUPERSEDED'
  | 'EXPIRED'

export interface Proposal {
  proposal_id: string
  kind: ProposalKind | string
  priority: ProposalPriority | string
  title: string
  summary: string
  payload: Record<string, unknown>
  dedup_key: string
  state: ProposalState | string
  risk_level: string
  requested_by: string
  tenant_id: string | null
  correlation: Record<string, unknown>
  created_at: string
  updated_at: string
  decided_at: string | null
  executed_at: string | null
  expires_at: string | null
}

export interface ProposalCreateRequest {
  kind: string
  title: string
  summary?: string
  priority?: string
  risk_level?: string
  payload?: Record<string, unknown>
  tenant_id?: string | null
  requested_by?: string | null
}

export type ProposalDecision = 'APPROVED' | 'REJECTED' | 'DEFERRED'

export interface ProposalDecisionRequest {
  decision: ProposalDecision
  decided_by?: string
  rationale?: string
}

export interface ApprovalDecisionRecord {
  decision_id: string
  proposal_id: string
  decision: ProposalState | string
  decided_by: string
  rationale: string
  correlation: Record<string, unknown>
  decided_at: string
}

export interface ProposalListParams {
  kind?: string
  priority?: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export type SourceState =
  | 'UNKNOWN'
  | 'DISCOVERED'
  | 'APPROVAL_PENDING'
  | 'ALLOWLISTED'
  | 'BLOCKED'
  | 'DEFERRED'

export type SourceCategory =
  | 'AI_DOCS'
  | 'OSS_REPO'
  | 'TECH_DOCS'
  | 'RESEARCH'
  | 'STANDARDS'
  | 'PUBLIC_API'
  | 'TECH_BLOG'
  | 'MODEL_PROVIDER_DOCS'
  | 'APPROVED_SITE'
  | 'APPROVED_DATASET'
  | 'UNKNOWN'

export interface Source {
  source_id: string
  url: string
  category: SourceCategory | string
  state: SourceState | string
  first_seen_at: string
  last_seen_at: string
  metadata: Record<string, unknown>
}

export interface SourceListParams {
  state?: string
  category?: string
  limit?: number
}

export interface SourceDiscoverRequest {
  url: string
  category?: string | null
}

export interface SourceTransitionRequest {
  to_state: string
}

// ---------------------------------------------------------------------------
// Source policies
// ---------------------------------------------------------------------------

export interface SourcePolicy {
  policy_id: string
  url_pattern: string
  category: SourceCategory | string
  state: SourceState | string
  allowed_actions: string[]
  source_weight: number
  expires_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface PolicyCreateRequest {
  url_pattern: string
  category?: string
  state?: string
  allowed_actions?: string[]
  source_weight?: number
  expires_at?: string | null
}

export interface PolicyMatchResponse {
  url: string
  matched: boolean
  policy: SourcePolicy | null
}

// ---------------------------------------------------------------------------
// Learned items
// ---------------------------------------------------------------------------

export interface LearnedItem {
  item_id: string
  source_url: string
  source_id: string | null
  category: SourceCategory | string
  title: string
  content: string
  summary: string
  embedding: number[]
  value_score: number
  reused_count: number
  created_at: string
  updated_at: string
  pruned_at: string | null
}

export interface LearnedListParams {
  category?: string
  min_value?: number
  limit?: number
}

export interface PruneLearnedRequest {
  threshold?: number
  max_age_days?: number
}

export interface PruneLearnedResponse {
  pruned_count: number
}

// ---------------------------------------------------------------------------
// Learning opportunities
// ---------------------------------------------------------------------------

export type LearningStage =
  | 'DISCOVERY'
  | 'SOURCE_CHECK'
  | 'POLICY_GATE'
  | 'RESEARCH'
  | 'KNOWLEDGE_RECORDED'
  | 'GAP_SIGNAL'
  | 'CAPABILITY_OPPORTUNITY'
  | 'PRACTICALITY_ANALYSIS'
  | 'PROPOSAL'
  | 'AWAITING_APPROVAL'
  | 'BUILDING'
  | 'VALIDATING'
  | 'REGISTERED'
  | 'REUSED'
  | 'REJECTED'
  | 'ARCHIVED'

export interface LearningOpportunity {
  opportunity_id: string
  signal_id: string | null
  capability_hint: string
  gap_description: string
  predicted_value: number
  predicted_effort: number
  stage: LearningStage | string
  proposal_id: string | null
  correlation: Record<string, unknown>
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface OpportunityListParams {
  stage?: string
  include_archived?: boolean
  limit?: number
}

export interface OpportunityCreateRequest {
  capability_hint: string
  gap_description?: string
  signal_id?: string | null
  predicted_value?: number
  predicted_effort?: number
}

export interface OpportunityAdvanceRequest {
  to_stage: string
  proposal_id?: string | null
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export interface GovDecision {
  decision_id: string
  action: string
  risk_level: string
  allowed: boolean
  budget_check_passed: boolean
  requires_approval: boolean
  reason: string
  budget_used: Record<string, unknown>
  remaining_budget: Record<string, unknown>
  correlation: Record<string, unknown>
  created_at: string
}

export interface Budget {
  kind: string
  limit: number
  used: number
  remaining: number
}

export interface GovDecisionListParams {
  actor?: string
  operation?: string
  limit?: number
}

// ---------------------------------------------------------------------------
// Admin overview
// ---------------------------------------------------------------------------

export interface AdminOverview {
  capabilities: {
    total: number
    active: number
    archived: number
  }
  approvals_pending: number
  learning_opportunities: {
    total: number
    awaiting_approval: number
  }
  escalated_tasks: number
}

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

/** An SSE event frame emitted by the task-events stream. */
export interface TaskEventFrame {
  event: string
  data: string
}

// ---------------------------------------------------------------------------
// Lifecycle transition (shared request shape)
// ---------------------------------------------------------------------------

export interface LifecycleTransitionRequest {
  to_state: string
  actor?: string
}
