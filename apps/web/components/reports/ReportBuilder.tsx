'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Users, Users2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { ReportType, ReportFormat, ReportFilterParams } from '@/lib/types/reports';
import { ExportButton } from './ExportButton';

const reportOptions: Array<{label:string; value:ReportType; icon: React.ElementType}> = [
  { label: 'Members', value: 'members', icon: Users },
  { label: 'Events', value: 'events', icon: CalendarDays },
  { label: 'Volunteers', value: 'volunteers', icon: Users2 },
  { label: 'Financial', value: 'financial', icon: DollarSign },
  { label: 'Clubs', value: 'clubs', icon: ClipboardList },
];

interface ReportBuilderProps {
  onExport: (type: ReportType, format: ReportFormat, filters: ReportFilterParams) => Promise<Blob>;
}

export function ReportBuilder({ onExport }: ReportBuilderProps) {
  const [reportType, setReportType] = useState<ReportType>('members');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [tierId, setTierId] = useState('');

  const availableFields = useMemo(() => {
    switch (reportType) {
      case 'members':
        return [
          { label: 'Status', value: 'status' },
          { label: 'Membership Tier', value: 'tierId' },
        ];
      case 'events':
        return [
          { label: 'Status', value: 'status' },
        ];
      case 'volunteers':
        return [
          { label: 'Status', value: 'status' },
        ];
      default:
        return [];
    }
  }, [reportType]);

  const filters: ReportFilterParams = {
    status: status || undefined,
    tierId: tierId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="report-type">Report type</Label>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Choose report" />
              </SelectTrigger>
              <SelectContent>
                {reportOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Filter status</Label>
            <Input id="status" value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Optional" />
          </div>
        </div>

        {availableFields.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {availableFields.map((field) => (
              <div key={field.value}>
                <Label htmlFor={field.value}>{field.label}</Label>
                <Input
                  id={field.value}
                  value={field.value === 'tierId' ? tierId : status}
                  onChange={(event) => field.value === 'tierId' ? setTierId(event.target.value) : setStatus(event.target.value)}
                  placeholder={`Filter by ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="from-date">From date</Label>
            <Input id="from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="to-date">To date</Label>
            <Input id="to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ExportButton
            reportType={reportType}
            onExport={(format) => onExport(reportType, format, filters)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
