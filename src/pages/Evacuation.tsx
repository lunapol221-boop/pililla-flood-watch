import { useEffect, useMemo, useState } from "react";
import { Locate, Navigation, Clock, Route as RouteIcon, Building2, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Panel, PageHeader } from "@/components/mission/Panel";
import { EmptyState } from "@/components/mission/EmptyState";
import GISMap from "@/components/map/GISMap";
import { PILILLA_CENTER, distanceKm } from "@/data/pililla";
import { useEvacuationCenters, useBarangays, useSensorStations } from "@/hooks/useData";
import { cn } from "@/lib/utils";

type LngLat = [number, number];

export default function Evacuation() {
  const [user, setUser] = useState<LngLat | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: centers, loading: centersLoading } = useEvacuationCenters();
  const { data: barangays } = useBarangays();
  const { data: sensors } = useSensorStations();

  const candidates = useMemo(() => {
    if (!user) return [];
    return centers
      .filter(c => c.lat != null && c.lng != null)
      .map(c => ({
        ...c,
        coords: [Number(c.lng), Number(c.lat)] as LngLat,
        distance_km: distanceKm(user, [Number(c.lng), Number(c.lat)]),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [user, centers]);

  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (candidates.length && !selected) setSelected(candidates[0].id);
  }, [candidates, selected]);

  function locate() {
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation unavailable. Pin will use Pililla town center.");
      setUser(PILILLA_CENTER);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUser([pos.coords.longitude, pos.coords.latitude]); setLocating(false); },
      () => { setError("Location denied. Using Pililla town center as origin."); setUser(PILILLA_CENTER); setLocating(false); },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }

  const target = candidates.find(c => c.id === selected);

  const routes = useMemo(() => {
    if (!user || !target) return [];
    return [
      { coords: makeRoute(user, target.coords, 0.0006), color: "#00ffd4" },
      { coords: makeRoute(user, target.coords, -0.0014, true), color: "#ffcc33", dashed: true },
    ];
  }, [user, target]);

  const mapBarangays = barangays.filter(b => b.lat && b.lng).map(b => ({
    id: b.id, name: b.name, lat: Number(b.lat), lng: Number(b.lng),
  }));
  const mapSensors = sensors.filter(s => s.lat && s.lng).map(s => ({
    id: s.id, name: s.name, lat: Number(s.lat), lng: Number(s.lng), status: s.status,
  }));
  const mapCenters = centers.filter(c => c.lat && c.lng).map(c => ({
    id: c.id, name: c.name, lat: Number(c.lat), lng: Number(c.lng), capacity: c.capacity, occupancy: c.occupancy,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        code="03"
        title="Evacuation Route Optimization"
        subtitle="Detect your location, find the nearest evacuation center, and generate primary + alternative routes."
        action={
          <button
            onClick={locate}
            disabled={locating || centers.length === 0}
            className="inline-flex items-center gap-2 px-5 py-3 rounded bg-gradient-primary text-primary-foreground font-bold text-sm shadow-glow hover:scale-105 transition-transform disabled:opacity-60"
          >
            <Locate className={cn("h-4 w-4", locating && "animate-spin")} />
            {locating ? "ACQUIRING GPS..." : user ? "RECALCULATE ROUTE" : "FIND SAFEST ROUTE NOW"}
          </button>
        }
      />

      {error && <div className="glass-panel border-risk-moderate/40 px-4 py-2.5 text-sm text-risk-moderate">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <GISMap
            className="h-[560px]"
            userLocation={user}
            routes={routes}
            barangays={mapBarangays}
            sensors={mapSensors}
            centers={mapCenters}
            defaultLayers={{ heatmap: true, barangays: true, centers: true, sensors: false }}
          />
        </div>

        <div className="space-y-4">
          <Panel label="ROUTE BRIEFING" title={target ? target.name : "Awaiting GPS Lock"}>
            {centers.length === 0 && !centersLoading ? (
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title="No evacuation centers"
                description="Admins must register evacuation centers before routes can be calculated."
                action={<Link to="/admin" className="text-primary text-xs hover:underline">Open Mission Control →</Link>}
              />
            ) : !user ? (
              <EmptyState
                icon={<Compass className="h-5 w-5" />}
                title="No origin set"
                description='Tap "Find Safest Route Now" to detect your position via GPS or use Pililla town center as fallback.'
              />
            ) : !target ? (
              <EmptyState icon={<Building2 className="h-5 w-5" />} title="No center selected" description="Pick an evacuation center below." />
            ) : (
              <RouteBriefing target={target} routesCount={routes.length} />
            )}
          </Panel>

          <Panel label="SHELTER CANDIDATES" title="Nearest Centers">
            {!user ? (
              <p className="text-sm text-muted-foreground">Acquire GPS to rank shelters by distance.</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No centers available.</p>
            ) : (
              <ul className="space-y-2">
                {candidates.slice(0, 5).map(c => {
                  const isFull = (c.occupancy ?? 0) >= (c.capacity ?? 0) && (c.capacity ?? 0) > 0;
                  const isSel = c.id === selected;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelected(c.id)}
                        disabled={isFull}
                        className={cn(
                          "w-full text-left p-3 rounded border transition",
                          isSel ? "border-primary bg-primary/15 shadow-glow" : "border-primary/15 bg-surface-2/40 hover:border-primary/40",
                          isFull && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">{c.name}</span>
                          <span className="mono-font text-xs text-primary">{c.distance_km.toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="mono-label">{c.status ?? "available"}</span>
                          <span className={cn("mono-font text-[10px]", isFull ? "text-risk-critical" : "text-success")}>
                            {isFull ? "FULL" : `${(c.capacity ?? 0) - (c.occupancy ?? 0)} OPEN`}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RouteBriefing({ target, routesCount }: { target: { coords: LngLat; distance_km: number; capacity: number | null; occupancy: number | null }; routesCount: number }) {
  const eta = Math.max(1, Math.round(target.distance_km * 4));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<RouteIcon className="h-4 w-4" />} label="Distance" value={`${target.distance_km.toFixed(2)} km`} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Est. Time" value={`${eta} min`} />
        <Stat icon={<Navigation className="h-4 w-4" />} label="Routes" value={`${routesCount} avail.`} />
        <Stat icon={<Building2 className="h-4 w-4" />} label="Capacity" value={`${target.occupancy ?? 0}/${target.capacity ?? "—"}`} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-6 rounded" style={{ background: "#00ffd4", boxShadow: "0 0 8px #00ffd4" }} />
          <span className="font-semibold">PRIMARY</span>
          <span className="mono-label ml-auto">SAFEST</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-1.5 w-6 rounded border-dashed border-2" style={{ borderColor: "#ffcc33" }} />
          <span className="font-semibold">ALTERNATIVE</span>
          <span className="mono-label ml-auto">SHORTER</span>
        </div>
      </div>

      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${target.coords[1]},${target.coords[0]}&travelmode=driving`}
        target="_blank" rel="noreferrer"
        className="block text-center w-full px-4 py-2.5 rounded bg-primary text-primary-foreground font-bold text-sm hover:bg-primary-glow transition"
      >
        OPEN TURN-BY-TURN NAVIGATION ↗
      </a>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded bg-surface-2/60 border border-primary/15">
      <div className="flex items-center gap-2 mono-label">{icon}{label}</div>
      <div className="mono-font font-bold text-base mt-1">{value}</div>
    </div>
  );
}

function makeRoute(a: LngLat, b: LngLat, offset: number, detour = false): LngLat[] {
  const mid: LngLat = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len * offset * 50;
  const py = dx / len * offset * 50;
  const m1: LngLat = [a[0] + dx * 0.3 + px, a[1] + dy * 0.3 + py];
  const m2: LngLat = [a[0] + dx * 0.7 + px, a[1] + dy * 0.7 + py];
  if (detour) {
    return [a, m1, [mid[0] + px * 1.6, mid[1] + py * 1.6], m2, b];
  }
  return [a, m1, mid, m2, b];
}
