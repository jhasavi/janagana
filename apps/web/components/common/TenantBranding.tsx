'use client';

import * as React from 'react';

interface TenantBrandingProps {
  primaryColor?: string;
}

export function TenantBranding({ primaryColor }: TenantBrandingProps) {
  React.useEffect(() => {
    if (!primaryColor) return;
    document.documentElement.style.setProperty('--tenant-primary', primaryColor);
    return () => {
      document.documentElement.style.removeProperty('--tenant-primary');
    };
  }, [primaryColor]);

  return null;
}
