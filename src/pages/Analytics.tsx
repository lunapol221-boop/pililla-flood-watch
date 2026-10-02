import { Panel, PageHeader, RiskBadge } from "@/components/mission/Panel";
import { EmptyState } from "@/components/mission/EmptyState";
import { useFloodReadings, useBarangays } from "@/hooks/useData";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

const tt = {
  contentStyle: { background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--primary) / 0.4)", borderRadius: 4, fontFamily: "JetBrains Mono", fontSize: 11 },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
};

export default function Analytics() {
  const { data: readings } = useFloodReadings();
  const { data: barangays } = useBarangays();

  const trend = [...readings].slice(0, 24).reverse().map(r => ({
    time: new Date(r.recorded_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: false }),
    rainfall: r.rainfall_mm ?? 0,
    water_level: r.water_level_m ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        code="09"
        title="Data Visualization"
        subtitle="Cross-cutting analytics on real sensor data: rainfall vs water level, barangay distributions, and recent readings."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel label="CORRELATION" title="Rainfall vs Water Level (24h)">
          {trend.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="No readings yet" description="Charts populate as flood readings stream in." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--primary) / 0.15)" />
                  <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--primary) / 0.3)" />
                  <YAxis yAxisId="l" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--primary) / 0.3)" />
                  <YAxis yAxisId="r" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--risk-high) / 0.3)" />
                  <Tooltip {...tt} />
                  <Bar yAxisId="l" dataKey="rainfall" fill="hsl(var(--primary) / 0.6)" name="Rainfall (mm)" />
                  <Line yAxisId="r" type="monotone" dataKey="water_level" stroke="hsl(var(--risk-high))" strokeWidth={2} dot={false} name="Water (m)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel label="GEOSPATIAL" title="Barangay Elevation Distribution">
          {barangays.length === 0 ? (
            <EmptyState title="No barangays registered" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={barangays.map(b => ({ name: b.name, elev: b.elevation_m ?? 0, pop: b.population ?? 0 }))}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--primary) / 0.15)" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--primary) / 0.3)" />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--primary) / 0.3)" />
                  <Tooltip {...tt} />
                  <Bar dataKey="elev" name="Elevation (m)" fill="hsl(var(--primary) / 0.6)" />
                  <Line type="monotone" dataKey="pop" stroke="hsl(var(--risk-moderate))" strokeWidth={2} name="Population" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel label="EVENT LOG" title="Recent Sensor Readings">
        {trend.length === 0 ? (
          <EmptyState title="No readings logged" description="Once sensor stations begin reporting, recent readings will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left mono-label border-b border-primary/15">
                  <th className="py-2 pr-3">TIME</th>
                  <th className="py-2 pr-3">RAINFALL</th>
                  <th className="py-2 pr-3">WATER LEVEL</th>
                  <th className="py-2 pr-3">DELTA</th>
                </tr>
              </thead>
              <tbody className="mono-font">
                {trend.slice(-10).reverse().map((t, i) => (
                  <tr key={i} className="border-b border-primary/5 hover:bg-primary/5">
                    <td className="py-2 pr-3">{t.time}</td>
                    <td className="py-2 pr-3 tabular-nums">{t.rainfall.toFixed(1)} mm</td>
                    <td className="py-2 pr-3 tabular-nums">{t.water_level.toFixed(2)} m</td>
                    <td className="py-2 pr-3">
                      {t.water_level > 2.0 ? <RiskBadge level="high" /> : t.water_level > 1.5 ? <RiskBadge level="moderate" /> : <RiskBadge level="low" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
