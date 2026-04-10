'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PermissionGate, AccessDenied } from '@/components/permission-gate';
import { PERMISSIONS } from '@orgflow/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useImportMembers } from '@/hooks/useMembers';
import type { ImportSummary } from '@/lib/types/member';
import { cn } from '@/lib/utils';

interface MemberImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

// Parse CSV text into rows
function parseCSVPreview(text: string, maxRows = 5): string[][] {
  const lines = text.trim().split('\n').slice(0, maxRows + 1);
  return lines.map((line) =>
    // Simple CSV split (no quoted commas handling for preview)
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')),
  );
}

export function MemberImportModal({ open, onClose }: MemberImportModalProps) {
  return (
    <PermissionGate permission={PERMISSIONS.MEMBERS.IMPORT} fallback={<AccessDenied />}>
      <MemberImportModalContent open={open} onClose={onClose} />
    </PermissionGate>
  );
}

function MemberImportModalContent({ open, onClose }: MemberImportModalProps) {
  const [step, setStep] = React.useState<Step>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string[][]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<'SKIP' | 'UPDATE'>('SKIP');
  const [importProgress, setImportProgress] = React.useState(0);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);

  const { mutateAsync } = useImportMembers();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: (accepted) => {
      const f = accepted[0];
      if (!f) return;
      setFile(f);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setPreview(parseCSVPreview(text));
      };
      reader.readAsText(f);
      setStep('preview');
    },
  });

  const handleImport = async () => {
    if (!file) return;
    setStep('importing');
    // Simulate progress
    const interval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 10, 90));
    }, 200);
    try {
      const result = await mutateAsync({ file, duplicateStrategy });
      clearInterval(interval);
      setImportProgress(100);
      setSummary(result);
      setStep('done');
      toast.success('Import complete!', {
        description: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
      });
    } catch (err) {
      clearInterval(interval);
      toast.error('Import failed', { description: err instanceof Error ? err.message : 'Unknown error' });
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview([]);
    setImportProgress(0);
    setSummary(null);
    onClose();
  };

  const headers = preview[0] ?? [];
  const dataRows = preview.slice(1);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: firstName, lastName, email, phone, status
          </DialogDescription>
        </DialogHeader>

        {/* ─── Upload step ─── */}
        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors',
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Drop your CSV file here</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Required columns: <code>firstName, lastName, email</code>
            </p>
          </div>
        )}

        {/* ─── Preview step ─── */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{file?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6"
                onClick={() => { setFile(null); setPreview([]); setStep('upload'); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Preview table */}
            {headers.length > 0 && (
              <div className="overflow-auto rounded-md border max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataRows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Showing first {dataRows.length} row(s) of data</p>

            {/* Options */}
            <div className="flex items-center gap-3">
              <Label htmlFor="dup-strategy" className="shrink-0 text-sm">Duplicate handling:</Label>
              <Select
                value={duplicateStrategy}
                onValueChange={(v) => setDuplicateStrategy(v as 'SKIP' | 'UPDATE')}
              >
                <SelectTrigger id="dup-strategy" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SKIP">Skip duplicates</SelectItem>
                  <SelectItem value="UPDATE">Update duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport}>Import</Button>
            </div>
          </div>
        )}

        {/* ─── Progress step ─── */}
        {step === 'importing' && (
          <div className="space-y-4 py-4 text-center">
            <p className="font-medium">Importing members…</p>
            <Progress value={importProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
          </div>
        )}

        {/* ─── Done step ─── */}
        {step === 'done' && summary && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <span className="font-semibold text-lg">Import complete</span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{summary.created}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-700">{summary.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-2xl font-bold text-gray-600">{summary.skipped}</p>
                <p className="text-xs text-gray-500">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{summary.errors.length}</p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
            </div>

            {summary.errors.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.errors.map((e) => (
                      <TableRow key={`${e.row}-${e.email}`}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell>{e.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            <span className="text-xs">{e.reason}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
