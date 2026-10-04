// Heuristic flood-risk model.
// 10 feature inputs, weighted score → risk level + confidence + action.
// Designed to be drop-in replaced by a FastAPI/LSTM call later (same I/O shape).

import type { RiskLevel } from "@/data/pililla";

export interface FloodFeatures {
  rainfall_mm: number;            // last hour
  water_level_m: number;          // current
  wind_speed: number;
  soil_moisture_percent: number;  // 0-100
  elevation_m: number;            // meters
  river_distance_m: number;       // distance to nearest river
  drainage_capacity_percent: number; // 0-100, higher = better
  slope_degree: number;
  satellite_ndwi: number;         // -1..1
  road_condition_score: number;   // 0-100
  population_density_per_km2: number;
}

export interface FloodPrediction {
  risk_level: RiskLevel;
  risk_score: number;       // 0..100
  confidence: number;       // 0..100
  recommended_action: "Safe" | "Prepare" | "Evacuate";
  contributing_factors: { name: string; impact: number }[]; // 0..1
}

// Normalize then weight. Tunable weights.
export function predictFlood(f: FloodFeatures): FloodPrediction {
  const norm = {
    rain: clamp01(f.rainfall_mm / 50),                          // 50mm/h = saturated
    water: clamp01(f.water_level_m / 5),                        // 5m = saturated
    soil: clamp01(f.soil_moisture_percent / 100),
    elev: 1 - clamp01(f.elevation_m / 30),                      // lower = riskier
    river: 1 - clamp01(f.river_distance_m / 1000),              // closer = riskier
    drain: 1 - clamp01(f.drainage_capacity_percent / 100),      // worse = riskier
    slope: 1 - clamp01(f.slope_degree / 25),                    // flatter = riskier
    ndwi: clamp01((f.satellite_ndwi + 0.2) / 0.8),              // wetter satellite = riskier
    road: 1 - clamp01(f.road_condition_score / 100),
    pop: clamp01(f.population_density_per_km2 / 10000),
  };

  const weights = {
    rain: 0.20, water: 0.22, soil: 0.10, elev: 0.10, river: 0.08,
    drain: 0.08, slope: 0.05, ndwi: 0.10, road: 0.04, pop: 0.03,
  };

  const score = Object.keys(weights).reduce((acc, k) => {
    return acc + (norm as any)[k] * (weights as any)[k];
  }, 0) * 100;

  let risk_level: RiskLevel = "low";
  let recommended_action: FloodPrediction["recommended_action"] = "Safe";
  if (score >= 75) { risk_level = "critical"; recommended_action = "Evacuate"; }
  else if (score >= 55) { risk_level = "high"; recommended_action = "Evacuate"; }
  else if (score >= 35) { risk_level = "moderate"; recommended_action = "Prepare"; }

  // Confidence: high when signals agree (low variance), low when conflicting
  const values = Object.values(norm);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const confidence = Math.round(clamp01(1 - variance * 2) * 35 + 60); // 60..95

  const factors = [
    { name: "Rainfall (1h)", impact: norm.rain * weights.rain },
    { name: "Water level", impact: norm.water * weights.water },
    { name: "Soil saturation", impact: norm.soil * weights.soil },
    { name: "Low elevation", impact: norm.elev * weights.elev },
    { name: "River proximity", impact: norm.river * weights.river },
    { name: "Drainage stress", impact: norm.drain * weights.drain },
    { name: "Satellite NDWI", impact: norm.ndwi * weights.ndwi },
  ].sort((a, b) => b.impact - a.impact);

  return {
    risk_level,
    risk_score: Math.round(score),
    confidence,
    recommended_action,
    contributing_factors: factors,
  };
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// Generate a future risk timeline given forecast rainfall + current state.
export function forecastTimeline(
  base: FloodFeatures,
  forecastRainfallByHour: { hour: number; rain_mm: number }[],
): { hour: number; risk_score: number; level: RiskLevel; rain_mm: number }[] {
  let cumulativeWater = base.water_level_m;
  let soil = base.soil_moisture_percent;
  return forecastRainfallByHour.map(({ hour, rain_mm }) => {
    // simple accumulation model
    cumulativeWater = Math.min(6, cumulativeWater + rain_mm * 0.04);
    soil = Math.min(100, soil + rain_mm * 0.6);
    const p = predictFlood({ ...base, rainfall_mm: rain_mm, water_level_m: cumulativeWater, soil_moisture_percent: soil });
    return { hour, risk_score: p.risk_score, level: p.risk_level, rain_mm };
  });
}
