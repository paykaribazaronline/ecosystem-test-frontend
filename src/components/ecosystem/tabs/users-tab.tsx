'use client'

/** Admin — Users: directory + role management. */

import * as React from 'react'
import { ShieldCheck, UserCog } from 'lucide-react'

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
import type { Role, User } from '@/lib/ecosystem/types'
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  RefreshButton,
  formatDate,
  useAsyncData,
} from '../shared'

export function UsersTab({ currentUser }: { currentUser: User }) {
  const { toast } = useToast()
  const users = useAsyncData<User[]>(() => ecosystemApi.listUsers())

  async function changeRole(user: User, role: string) {
    try {
      const updated = await ecosystemApi.changeRole(user.user_id, role as Role)
      toast({
        title: 'Role updated',
        description: `${updated.email} is now ${updated.role}`,
      })
      users.reload()
    } catch (err) {
      toast({
        title: 'Role change failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Accounts with access to the ecosystem — promote trusted users to admin.
        </p>
        <RefreshButton onClick={users.reload} pending={users.loading} />
      </div>

      {users.error ? <ErrorBlock message={users.error} /> : null}
      {users.loading ? <LoadingBlock label="Loading users…" /> : null}

      {!users.loading && (users.data ?? []).length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState title="No users found" />
          </CardContent>
        </Card>
      ) : null}

      {(users.data ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4" /> Directory ({users.data?.length ?? 0})
            </CardTitle>
            <CardDescription>
              Role changes take effect immediately for new sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Last login</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Change role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users.data ?? []).map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {u.name || u.email}
                          {u.user_id === currentUser.user_id ? (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              you
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {u.user_id}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.role === 'admin'
                              ? 'border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                              : ''
                          }
                        >
                          {u.role === 'admin' ? <ShieldCheck className="size-3" /> : null}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(u.last_login_at)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={u.role}
                          onValueChange={(role) => void changeRole(u, role)}
                          disabled={u.user_id === currentUser.user_id}
                        >
                          <SelectTrigger className="ml-auto h-8 w-32 text-xs" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
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
