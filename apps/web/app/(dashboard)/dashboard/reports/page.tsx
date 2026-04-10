'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock4, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ImportModal } from '@/components/reports/ImportModal';
import { useReports } from '@/hooks/useReports';
import type { ReportType, ReportFormat, ReportFilterParams } from '@/lib/types/reports';

const schedules = [
  { name: 'Member summary', cadence: 'Monthly', targets: 'team@org.com' },
  { name: 'Financial overview', cadence: 'Weekly', targets: 'finance@org.com' },
];

export default function ReportsPage() {
  const { sendReport, downloadTemplate, importRows } = useReports();
  const [recentDownloads, setRecentDownloads] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem('orgflow.reports.recent');
    if (stored) {
      setRecentDownloads(JSON.parse(stored));
    }
  }, []);

  const handleExport = async (type: ReportType, format: ReportFormat, filters: ReportFilterParams) => {
    const blob = await sendReport(type, format, filters);
    const entry = `${new Date().toLocaleString()} — ${type} (${format.toUpperCase()})`;
    setRecentDownloads((current) => {
      const next = [entry, ...current].slice(0, 10);
      window.localStorage.setItem('orgflow.reports.recent', JSON.stringify(next));
      return next;
    });
    return blob;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Build exports, download templates, and keep scheduled reports flowing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportModal downloadTemplate={downloadTemplate} importRows={importRows} />
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" /> Scheduled reports
          </Button>
        </div>
      </div>

      <ReportBuilder onExport={handleExport} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled reports</CardTitle>
            <CardDescription>Automate recurring exports to your team inbox.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedules.map((item) => (
              <div key={item.name} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.cadence}</p>
                  </div>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Delivering to {item.targets}</p>
              </div>
            ))}
            <Button variant="secondary" className="w-full">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Create scheduled report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent downloads</CardTitle>
            <CardDescription>Track your latest exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDownloads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent downloads yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentDownloads.map((item) => (
                  <li key={item} className="rounded-md border px-3 py-2">{item}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
