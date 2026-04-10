'use client';

import * as React from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  multiple?: boolean;
}

export function FileUpload({
  onFilesSelected,
  accept,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  multiple = false,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<File[]>([]);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple,
  });

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {Math.round(maxSize / 1024 / 1024)}MB per file
        </p>
      </div>

      {fileRejections.length > 0 && (
        <p className="text-xs text-destructive">
          {fileRejections[0]?.errors[0]?.message}
        </p>
      )}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({Math.round(file.size / 1024)}KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
