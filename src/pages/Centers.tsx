import { Building2, Users, MapPin } from "lucide-react";
import { Panel, PageHeader } from "@/components/mission/Panel";
import { EmptyState } from "@/components/mission/EmptyState";
import { useEvacuationCenters } from "@/hooks/useData";
import { cn } from "@/lib/utils";

export default function Centers() {
  const { data: centers, loading } = useEvacuationCenters();
  const total = centers.reduce((a, c) => a + (c.capacity ?? 0), 0);
  const occ = centers.reduce((a, c) => a + (c.occupancy ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        code="06"
        title="Evacuation Centers · Pililla"
        subtitle={
          centers.length
            ? `${centers.length} registered shelters · ${(total - occ).toLocaleString()} of ${total.toLocaleString()} seats currently available.`
            : "Registered shelters will appear here once admins add them."
        }
      />

      {loading ? null : centers.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No evacuation centers registered"
            description="Mission Control administrators can add evacuation centers from the Admin panel."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map(c => {
            const cap = c.capacity ?? 0;
            const occu = c.occupancy ?? 0;
            const pct = cap > 0 ? (occu / cap) * 100 : 0;
            const status = pct >= 100 ? "FULL" : pct >= 80 ? "NEAR CAPACITY" : "AVAILABLE";
            const tone = pct >= 100 ? "critical" : pct >= 80 ? "moderate" : "low";
            return (
              <div key={c.id} className="glass-panel glass-panel-hover hud-brackets p-5">
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded grid place-items-center shrink-0",
                    tone === "low" && "bg-success/15 text-success border border-success/40",
                    tone === "moderate" && "bg-risk-moderate/15 text-risk-moderate border border-risk-moderate/40",
                    tone === "critical" && "bg-risk-critical/15 text-risk-critical border border-risk-critical/40",
                  )}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm leading-tight">{c.name}</h3>
                    <div className="mono-label mt-0.5">{c.status ?? "available"}</div>
                  </div>
                  <span className={cn("mono-font text-[10px] font-bold px-2 py-0.5 rounded border",
                    tone === "low" && "text-success border-success/40 bg-success/10",
                    tone === "moderate" && "text-risk-moderate border-risk-moderate/40 bg-risk-moderate/10",
                    tone === "critical" && "text-risk-critical border-risk-critical/40 bg-risk-critical/15",
                  )}>{status}</span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between mono-font">
                    <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-3 w-3" /> Occupancy</span>
                    <span className="text-foreground">{occu.toLocaleString()} / {cap.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div className={cn("h-full",
                      tone === "low" && "bg-success",
                      tone === "moderate" && "bg-risk-moderate",
                      tone === "critical" && "bg-risk-critical",
                    )} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  {c.lat != null && c.lng != null && (
                    <div className="flex items-center gap-2 text-muted-foreground mono-font">
                      <MapPin className="h-3 w-3" /> {Number(c.lat).toFixed(4)}°N · {Number(c.lng).toFixed(4)}°E
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
