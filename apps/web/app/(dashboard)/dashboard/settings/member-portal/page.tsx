'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { useSettings, useUpdatePortalSettings } from '@/hooks/useSettings';
import type { UpdatePortalInput } from '@/lib/types/settings';

const TOGGLES: { key: keyof UpdatePortalInput; label: string; description: string }[] = [
  {
    key: 'enableMemberships',
    label: 'Memberships',
    description: 'Allow members to sign up for and manage membership tiers.',
  },
  {
    key: 'enableEvents',
    label: 'Events',
    description: 'Enable the events module on the member portal.',
  },
  {
    key: 'enableVolunteers',
    label: 'Volunteers',
    description: 'Show the volunteer sign-up section.',
  },
  {
    key: 'enableClubs',
    label: 'Clubs & Groups',
    description: 'Let members browse and join internal clubs.',
  },
  {
    key: 'enablePayments',
    label: 'Online Payments',
    description: 'Accept membership fees and event ticket payments online.',
  },
  {
    key: 'requireEmailVerification',
    label: 'Require Email Verification',
    description: "Members must verify their email before accessing the portal.",
  },
  {
    key: 'allowPublicMemberDirectory',
    label: 'Public Member Directory',
    description: 'Allow anyone to view the member directory without logging in.',
  },
];

export default function MemberPortalPage() {
  const { data: settings, isLoading } = useSettings();
  const { mutateAsync, isPending } = useUpdatePortalSettings();
  const [values, setValues] = useState<UpdatePortalInput>({});

  useEffect(() => {
    if (settings?.settings) {
      const s = settings.settings;
      setValues({
        enableMemberships: s.enableMemberships,
        enableEvents: s.enableEvents,
        enableVolunteers: s.enableVolunteers,
        enableClubs: s.enableClubs,
        enablePayments: s.enablePayments,
        requireEmailVerification: s.requireEmailVerification,
        allowPublicMemberDirectory: s.allowPublicMemberDirectory,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await mutateAsync(values);
      toast.success('Portal settings saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Member Portal Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control which features are visible and accessible to your members.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        {TOGGLES.map((toggle, index) => (
          <React.Fragment key={toggle.key}>
            {index > 0 && <Separator className="my-1" />}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <Label className="text-sm font-medium leading-none">{toggle.label}</Label>
                <p className="text-xs text-muted-foreground pt-0.5">{toggle.description}</p>
              </div>
              <Switch
                checked={values[toggle.key] ?? false}
                onCheckedChange={checked =>
                  setValues(prev => ({ ...prev, [toggle.key]: checked }))
                }
              />
            </div>
          </React.Fragment>
        ))}
      </div>

      <Separator />

      <div className="pt-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
