// Geographic constants for Pililla, Rizal — used as map defaults and helpers.
// All telemetry, sensors, centers, and barangays are fetched from Lovable Cloud.

export const PILILLA_CENTER: [number, number] = [121.3094, 14.4869];

export type RiskLevel = "low" | "moderate" | "high" | "critical";

// Distance in km (haversine, lng/lat)
export function distanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
