'use client'

/**
 * Admin dashboard — 10-tab control center over the full ecosystem surface.
 */

import * as React from 'react'
import {
  Boxes,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  ListChecks,
  Puzzle,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { User } from '@/lib/ecosystem/types'
import { ApprovalsTab } from './tabs/approvals-tab'
import { CapabilitiesTab } from './tabs/capabilities-tab'
import { McpTab } from './tabs/mcp-tab'
import { OpportunitiesTab } from './tabs/opportunities-tab'
import { OverviewTab } from './tabs/overview-tab'
import { PoliciesTab } from './tabs/policies-tab'
import { ResourcesTab } from './tabs/resources-tab'
import { SourcesTab } from './tabs/sources-tab'
import { TasksTab } from './tabs/tasks-tab'
import { UsersTab } from './tabs/users-tab'

export function AdminDashboard({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = React.useState('overview')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Admin control center</h2>
        <p className="text-sm text-muted-foreground">
          Full-governance view across capabilities, tasks, approvals, sources, policies,
          opportunities, MCP and users.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto w-max max-w-full flex-nowrap gap-1 bg-muted/60 p-1">
            <AdminTabTrigger value="overview" icon={LayoutDashboard} label="Overview" />
            <AdminTabTrigger value="capabilities" icon={Boxes} label="Capabilities" />
            <AdminTabTrigger value="tasks" icon={ListChecks} label="Tasks" />
            <AdminTabTrigger value="resources" icon={Server} label="Resources" />
            <AdminTabTrigger value="approvals" icon={ClipboardCheck} label="Approvals" />
            <AdminTabTrigger value="sources" icon={Globe} label="Sources" />
            <AdminTabTrigger value="policies" icon={ShieldCheck} label="Policies" />
            <AdminTabTrigger value="opportunities" icon={Sparkles} label="Opportunities" />
            <AdminTabTrigger value="mcp" icon={Puzzle} label="MCP" />
            <AdminTabTrigger value="users" icon={Users} label="Users" />
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="capabilities" className="mt-4">
          <CapabilitiesTab />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
          <ResourcesTab />
        </TabsContent>
        <TabsContent value="approvals" className="mt-4">
          <ApprovalsTab />
        </TabsContent>
        <TabsContent value="sources" className="mt-4">
          <SourcesTab />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="opportunities" className="mt-4">
          <OpportunitiesTab />
        </TabsContent>
        <TabsContent value="mcp" className="mt-4">
          <McpTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AdminTabTrigger({
  value,
  icon: Icon,
  label,
}: {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <TabsTrigger
      value={value}
      className="gap-1.5 px-3 py-1.5 text-xs data-[state=active]:bg-background sm:text-sm"
    >
      <Icon className="size-3.5 sm:size-4" />
      {label}
    </TabsTrigger>
  )
}
