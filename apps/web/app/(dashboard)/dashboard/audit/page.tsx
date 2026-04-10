'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuditLogs } from '@/hooks/useAudit';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAuditLogs({
    query: query || undefined,
    action: actionFilter || undefined,
    userId: userFilter || undefined,
    entityType: entityFilter || undefined,
    page,
    limit: 20,
  });

  const entries = data?.data ?? [];
  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 20))), [data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin Audit Log</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review tenant activity, filter by action, user, entity, or date.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <Input
            placeholder="Search text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Input
            placeholder="Action"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          />
          <Input
            placeholder="User ID"
            value={userFilter}
            onChange={(event) => setUserFilter(event.target.value)}
          />
          <Input
            placeholder="Entity type"
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                      Loading audit log entries...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                      No audit entries matched your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.createdAt), 'PPpp')}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.description ?? '-'}</TableCell>
                      <TableCell>{entry.userId ?? 'system'}</TableCell>
                      <TableCell>{entry.entityType ? `${entry.entityType}${entry.entityId ? ` (${entry.entityId})` : ''}` : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data ? `${data.total} entries found` : 'Ready to search'}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <span className="text-sm">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
