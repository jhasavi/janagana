"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrgSwitcherTenant = {
  id: string;
  name: string;
  slug: string;
  label: string;
};

export function OrgSwitcher({
  tenants,
  currentTenantId,
  currentLabel,
  canCreateNew,
  compact = false,
}: {
  tenants: OrgSwitcherTenant[];
  currentTenantId: string;
  currentLabel: string;
  canCreateNew: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-secondary",
          compact ? "px-2 py-1.5" : "px-2 py-1.5",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-primary font-extrabold text-primary-foreground shadow-sm",
            compact ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs",
          )}
        >
          JG
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-bold text-foreground", compact ? "text-sm" : "text-[13.5px]")}>
            {currentLabel}
          </span>
          {!compact && <span className="block truncate text-[11px] font-semibold text-muted-foreground">Operator workspace</span>}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-card p-1.5 shadow-lg">
            <p className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/70">
              Your organizations
            </p>
            {tenants.map((tenant) => {
              const isCurrent = tenant.id === currentTenantId;
              return (
                <form key={tenant.id} action="/api/select-tenant" method="POST">
                  <input type="hidden" name="tenantId" value={tenant.id} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      isCurrent ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{tenant.label}</span>
                    </span>
                    {isCurrent && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </form>
              );
            })}
            {canCreateNew && (
              <>
                <div className="my-1 border-t border-border/70" />
                <Link
                  href="/onboarding/create-organization"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/40">
                    <Plus className="h-4 w-4" />
                  </span>
                  Create new organization
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
