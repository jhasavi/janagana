'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { ReportType, ReportFormat } from '@/lib/types/reports';

interface ExportButtonProps {
  reportType: ReportType;
  onExport: (format: ReportFormat) => Promise<Blob>;
}

export function ExportButton({ reportType, onExport }: ExportButtonProps) {
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const blob = await onExport(format);
      const href = URL.createObjectURL(blob);
      const filename = `${reportType}-report.${format}`;
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      toast.success('Report generated successfully.');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to generate report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
      <div>
        <Select value={format} onValueChange={(value) => setFormat(value as ReportFormat)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleExport} disabled={isLoading} className="w-full sm:w-auto">
        <Download className="mr-2 h-4 w-4" />
        {isLoading ? 'Generating...' : 'Download'}
      </Button>
    </div>
  );
}
