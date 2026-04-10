'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';

interface TaxReceiptButtonProps {
  donationId: string;
  onGenerate?: () => void;
  generated?: boolean;
}

export function TaxReceiptButton({ donationId, onGenerate, generated = false }: TaxReceiptButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/donations/${donationId}/tax-receipt`, {
        method: 'POST',
      });
      const data = await response.json();
      setReceiptUrl(data.receiptUrl);
      if (onGenerate) onGenerate();
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    }
  };

  if (generated || receiptUrl) {
    return (
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        Download Receipt
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Generating...' : 'Receipt'}
    </Button>
  );
}
