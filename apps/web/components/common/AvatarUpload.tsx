'use client';

import * as React from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface AvatarUploadProps {
  currentUrl?: string;
  fallbackText?: string;
  onUpload: (file: File) => Promise<string>;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarUpload({
  currentUrl,
  fallbackText = '?',
  onUpload,
  onRemove,
  className,
  size = 'md',
}: AvatarUploadProps) {
  const [preview, setPreview] = React.useState<string | undefined>(currentUrl);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sizeClasses = { sm: 'h-12 w-12', md: 'h-20 w-20', lg: 'h-28 w-28' };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) return;
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) return;

    setLoading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      const uploadedUrl = await onUpload(file);
      setPreview(uploadedUrl);
    } catch {
      setPreview(currentUrl);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onRemove?.();
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={preview} alt="Avatar" />
        <AvatarFallback className="text-lg">{fallbackText}</AvatarFallback>
      </Avatar>
      <div className="absolute bottom-0 right-0 flex gap-1">
        <Button
          type="button"
          size="icon"
          className="h-7 w-7 rounded-full shadow-md"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          aria-label="Upload photo"
        >
          <Camera className="h-3 w-3" />
        </Button>
        {preview && onRemove && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-7 w-7 rounded-full shadow-md"
            onClick={handleRemove}
            disabled={loading}
            aria-label="Remove photo"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload avatar"
      />
    </div>
  );
}
