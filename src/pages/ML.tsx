import { useMemo, useState } from "react";
import { Play, Code2 } from "lucide-react";
import { Panel, PageHeader, RiskBadge } from "@/components/mission/Panel";
import { predictFlood, type FloodFeatures } from "@/lib/floodModel";
import { useFloodReadings, useBarangays } from "@/hooks/useData";
import { cn } from "@/lib/utils";

const FIELDS: { key: keyof FloodFeatures; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "rainfall_mm", label: "Rainfall (1h)", min: 0, max: 80, step: 0.1, unit: "mm" },
  { key: "water_level_m", label: "Water level", min: 0, max: 6, step: 0.1, unit: "m" },
  { key: "soil_moisture_percent", label: "Soil moisture", min: 0, max: 100, step: 1, unit: "%" },
  { key: "elevation_m", label: "Elevation", min: 0, max: 50, step: 1, unit: "m" },
  { key: "river_distance_m", label: "River distance", min: 0, max: 2000, step: 10, unit: "m" },
  { key: "drainage_capacity_percent", label: "Drainage capacity", min: 0, max: 100, step: 1, unit: "%" },
  { key: "slope_degree", label: "Slope", min: 0, max: 30, step: 0.5, unit: "°" },
  { key: "satellite_ndwi", label: "Satellite NDWI", min: -0.5, max: 1, step: 0.01, unit: "" },
  { key: "road_condition_score", label: "Road condition", min: 0, max: 100, step: 1, unit: "/100" },
  { key: "population_density_per_km2", label: "Pop. density", min: 0, max: 15000, step: 50, unit: "/km²" },
];

const DEFAULT_FEATURES: FloodFeatures = {
  rainfall_mm: 10, water_level_m: 1.5, soil_moisture_percent: 60, elevation_m: 12,
  river_distance_m: 500, drainage_capacity_percent: 60, slope_degree: 5, satellite_ndwi: 0.3,
  road_condition_score: 75, population_density_per_km2: 3000,
};

export default function ML() {
  const { data: readings } = useFloodReadings();
  const { data: barangays } = useBarangays();

  function deriveLiveFeatures(): FloodFeatures {
    const recent = readings.slice(0, 24);
    const avg = (arr: (number | null | undefined)[]) => {
      const v = arr.filter((x): x is number => typeof x === "number");
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    };
    const elev = barangays.map(b => b.elevation_m).filter((x): x is number => typeof x === "number");
    return {
      ...DEFAULT_FEATURES,
      rainfall_mm: avg(recent.map(r => r.rainfall_mm)) || DEFAULT_FEATURES.rainfall_mm,
      water_level_m: avg(recent.map(r => r.water_level_m)) || DEFAULT_FEATURES.water_level_m,
      soil_moisture_percent: avg(recent.map(r => r.soil_moisture_percent)) || DEFAULT_FEATURES.soil_moisture_percent,
      elevation_m: elev.length ? elev.reduce((a, b) => a + b, 0) / elev.length : DEFAULT_FEATURES.elevation_m,
    };
  }

  const [features, setFeatures] = useState<FloodFeatures>(DEFAULT_FEATURES);
  const result = useMemo(() => predictFlood(features), [features]);

  function update(k: keyof FloodFeatures, v: number) {
    setFeatures(f => ({ ...f, [k]: v }));
  }

  const payload = JSON.stringify({ features, model: "lstm-v1", timestamp: new Date().toISOString() }, null, 2);
  const response = JSON.stringify({
    risk_level: result.risk_level,
    risk_score: result.risk_score,
    confidence: result.confidence,
    recommended_action: result.recommended_action,
  }, null, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        code="05"
        title="Machine Learning Prediction Engine"
        subtitle="10-feature flood-risk model. Tune inputs to simulate scenarios. Production target: Python LSTM via FastAPI."
        action={
          <button onClick={() => setFeatures(deriveLiveFeatures())} className="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-primary/40 text-primary hover:bg-primary/10 text-sm">
            <Play className="h-4 w-4" /> Load live sensor values
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel label="MODEL INPUTS" title="Feature Vector (10)" className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <label className="text-foreground/80">{f.label}</label>
                  <span className="mono-font text-primary tabular-nums">{features[f.key].toFixed(f.step < 1 ? 2 : 0)}{f.unit && ` ${f.unit}`}</span>
                </div>
                <input
                  type="range"
                  min={f.min} max={f.max} step={f.step}
                  value={features[f.key]}
                  onChange={(e) => update(f.key, parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-3 rounded appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel label="INFERENCE OUTPUT" title="Risk Assessment">
            <div className="text-center py-2">
              <div className="mono-label">RISK SCORE</div>
              <div className={cn("display-font text-6xl font-black tabular-nums my-2",
                result.risk_level === "critical" ? "text-risk-critical text-glow-critical" :
                result.risk_level === "high" ? "text-risk-high" :
                result.risk_level === "moderate" ? "text-risk-moderate" : "text-risk-low",
              )}>
                {result.risk_score}
              </div>
              <RiskBadge level={result.risk_level} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded bg-surface-2/60 border border-primary/15">
                <div className="mono-label">CONFIDENCE</div>
                <div className="mono-font font-bold text-lg">{result.confidence}%</div>
              </div>
              <div className="p-3 rounded bg-surface-2/60 border border-primary/15">
                <div className="mono-label">ACTION</div>
                <div className={cn("mono-font font-bold text-lg",
                  result.recommended_action === "Evacuate" ? "text-risk-critical" :
                  result.recommended_action === "Prepare" ? "text-risk-moderate" : "text-success")}>
                  {result.recommended_action.toUpperCase()}
                </div>
              </div>
            </div>
          </Panel>

          <Panel label="API CONTRACT" title={<span className="flex items-center gap-2"><Code2 className="h-4 w-4" /> /predict</span>}>
            <div className="space-y-3 text-[11px]">
              <div>
                <div className="mono-label mb-1">REQUEST →</div>
                <pre className="mono-font p-3 rounded bg-surface-0 border border-primary/15 overflow-x-auto text-foreground/80">{payload}</pre>
              </div>
              <div>
                <div className="mono-label mb-1">RESPONSE ←</div>
                <pre className="mono-font p-3 rounded bg-surface-0 border border-primary/15 overflow-x-auto text-primary/90">{response}</pre>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
