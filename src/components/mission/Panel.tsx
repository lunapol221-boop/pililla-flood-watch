import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
  label?: string;
  title?: ReactNode;
  action?: ReactNode;
  glow?: boolean;
  brackets?: boolean;
}

export function Panel({ children, className, label, title, action, glow, brackets }: PanelProps) {
  return (
    <section
      className={cn(
        "glass-panel relative",
        glow && "shadow-glow",
        brackets && "hud-brackets",
        className,
      )}
    >
      {(label || title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-primary/15">
          <div className="min-w-0">
            {label && <div className="mono-label">{label}</div>}
            {title && <h3 className="display-font text-sm font-semibold text-foreground mt-1">{title}</h3>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  tone?: "default" | "low" | "moderate" | "high" | "critical";
  sub?: ReactNode;
}

const TONE_CLASS = {
  default: "text-primary",
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  critical: "text-risk-critical",
};

export function MissionCard({ label, value, unit, delta, icon, tone = "default", sub }: MetricProps) {
  return (
    <div className={cn(
      "glass-panel glass-panel-hover hud-brackets p-5 relative overflow-hidden",
      tone === "critical" && "border-risk-critical/40",
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="mono-label">{label}</span>
        {icon && <span className={cn("opacity-60", TONE_CLASS[tone])}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("display-font text-3xl sm:text-4xl font-bold tabular-nums", TONE_CLASS[tone], tone !== "default" && "text-glow")}>
          {value}
        </span>
        {unit && <span className="mono-font text-xs text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <div className={cn("mono-font text-[11px] mt-1", delta.positive ? "text-success" : "text-risk-high")}>
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      )}
      {sub && <div className="mt-3 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RiskBadge({ level, className }: { level: "low" | "moderate" | "high" | "critical"; className?: string }) {
  const cls = {
    low:      "border-risk-low text-risk-low bg-risk-low/10",
    moderate: "border-risk-moderate text-risk-moderate bg-risk-moderate/10",
    high:     "border-risk-high text-risk-high bg-risk-high/10",
    critical: "border-risk-critical text-risk-critical bg-risk-critical/15 animate-flicker",
  }[level];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border mono-font text-[10px] font-bold uppercase tracking-wider",
      cls, className,
    )}>
      <span className={cn("status-dot", `dot-${level}`)} />
      {level}
    </span>
  );
}

export function PageHeader({ code, title, subtitle, action }: { code: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="mono-font text-xs px-2 py-0.5 rounded border border-primary/40 text-primary bg-primary/10">MODULE {code}</span>
          <span className="mono-label">PILILLA · RIZAL · PHILIPPINES</span>
        </div>
        <h1 className="display-font text-2xl sm:text-3xl font-bold text-foreground text-glow">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
