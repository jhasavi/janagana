'use client';

import React, { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { PlusCircle, DownloadCloud, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { TemplateType, ImportResult } from '@/lib/types/reports';

interface ImportModalProps {
  downloadTemplate: (type: TemplateType) => Promise<Blob>;
  importRows: <T extends ImportResult>(type: 'members' | 'events', rows: unknown[], options?: Record<string, unknown>) => Promise<T>;
}

const templateTypes: Array<{ value: TemplateType; label: string }> = [
  { value: 'members', label: 'Members' },
  { value: 'events', label: 'Events' },
];

export function ImportModal({ downloadTemplate, importRows }: ImportModalProps) {
  const [selectedType, setSelectedType] = useState<TemplateType>('members');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<unknown[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const previewRows = useMemo(() => parsedRows.slice(0, 4), [parsedRows]);
  const selectedPreviewFields = headers.slice(0, 6);

  const handleDownloadTemplate = async () => {
    setLoading(true);
    try {
      const blob = await downloadTemplate(selectedType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedType}-template.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded.');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to download template.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const parsedData = parsed.data as unknown[];
    setParsedRows(parsedData);
    setHeaders(parsed.meta.fields?.filter(Boolean) as string[] ?? []);
    setErrors([]);
    setStep(2);
    if (parsed.errors.length) {
      setErrors(parsed.errors.map((error) => `Row ${error.row}: ${error.message}`));
    }
  };

  const validateRows = () => {
    const nextErrors: string[] = [];
    parsedRows.forEach((row, index) => {
      const record = row as Record<string, string>;
      if (selectedType === 'members' && !record.email) {
        nextErrors.push(`Row ${index + 2}: email is required.`);
      }
      if (selectedType === 'events' && (!record.title || !record.slug)) {
        nextErrors.push(`Row ${index + 2}: title and slug are required.`);
      }
    });
    setErrors(nextErrors);
    if (nextErrors.length === 0) setStep(3);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const importType = selectedType === 'members' ? 'members' : 'events';
      const importResult = await importRows(importType, parsedRows);
      setResult(importResult as ImportResult);
      setStep(4);
      toast.success('Import completed.');
    } catch (error) {
      toast.error((error as Error).message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>Upload your data file, validate it, and import records into the tenant.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Step {step}: {step === 1 ? 'Download template' : step === 2 ? 'Upload CSV' : step === 3 ? 'Validate rows' : 'Import results'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-type">Template type</Label>
                    <select
                      id="template-type"
                      className="mt-2 block w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      value={selectedType}
                      onChange={(event) => setSelectedType(event.target.value as TemplateType)}
                    >
                      {templateTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleDownloadTemplate} disabled={loading} className="w-full sm:w-auto">
                    <DownloadCloud className="mr-2 h-4 w-4" /> Download template
                  </Button>
                </div>
              )}

              {step >= 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">CSV file</Label>
                    <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                    {fileName && <p className="mt-2 text-sm text-muted-foreground">Selected file: {fileName}</p>}
                  </div>
                  {parsedRows.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Preview rows:</p>
                      <div className="overflow-x-auto rounded-md border bg-background p-2 text-sm">
                        <table className="min-w-full border-collapse text-left text-sm">
                          <thead>
                            <tr>
                              {selectedPreviewFields.map((header) => (
                                <th key={header} className="border-b px-2 py-1 font-medium">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, index) => {
                              const record = row as Record<string, string>;
                              return (
                                <tr key={index}>
                                  {selectedPreviewFields.map((header) => (
                                    <td key={header} className="border-b px-2 py-1">{record[header]}</td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {errors.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Validation issues</div>
                      <ul className="mt-2 list-disc pl-5">
                        {errors.map((error) => <li key={error}>{error}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                  <div className="flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4" /> Ready to import</div>
                  <p>Rows ready: {parsedRows.length}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            {step === 1 && (
              <Button onClick={() => setStep(2)} variant="secondary">Next: Upload file</Button>
            )}
            {step === 2 && (
              <Button onClick={validateRows} disabled={!parsedRows.length || loading}>Validate file</Button>
            )}
            {step === 3 && (
              <Button onClick={handleImport} disabled={loading || errors.length > 0}>
                <UploadCloud className="mr-2 h-4 w-4" /> Import now
              </Button>
            )}
            {step === 4 && result && (
              <div className="space-y-2">
                <p className="text-sm">Imported: {result.imported}</p>
                <p className="text-sm">Skipped: {result.skipped}</p>
                {result.errors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    <p className="font-semibold">Errors:</p>
                    <ul className="list-disc pl-5">
                      {result.errors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => { setStep(1); setParsedRows([]); setErrors([]); setResult(null); setFileName(''); }}>
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
