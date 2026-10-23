import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/invoice";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-secondary text-secondary-foreground",
  issued: "bg-secondary text-secondary-foreground",
  accepted: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  refused: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  overdue: "bg-warning/25 text-warning-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusStyle[status])}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card", className)}>{children}</div>;
}
