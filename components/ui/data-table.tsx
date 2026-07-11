import { cn } from "@/lib/utils";

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground/80">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-border/60 align-top transition-colors hover:bg-secondary/50", className)}>{children}</tr>;
}

export function DataTableCell({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={cn("py-3 pr-4", className)} title={title}>
      {children}
    </td>
  );
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("py-2 pr-4 font-semibold", className)}>{children}</th>;
}
