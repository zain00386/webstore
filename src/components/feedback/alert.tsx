import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { icon: Info, className: "bg-muted text-foreground" },
  success: { icon: CheckCircle2, className: "bg-success-soft text-success" },
  warning: { icon: AlertTriangle, className: "bg-warning-soft text-warning" },
  error: { icon: XCircle, className: "bg-brand-soft text-brand" },
} as const;

type AlertProps = {
  tone?: keyof typeof styles;
  title?: string;
  children?: ReactNode;
  className?: string;
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { icon: Icon, className: toneClass } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-2xl p-4 text-sm", toneClass, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
