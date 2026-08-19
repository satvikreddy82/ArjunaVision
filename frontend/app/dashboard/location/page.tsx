"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "../../../lib/store";
import { locationAPI } from "../../../lib/api";
import dynamic from "next/dynamic";

// Leaflet must be loaded client-side only
const MapWithNoSSR = dynamic(() => import("../../../components/location/LeafletMap"), { ssr: false, loading: () => (
  <div className="h-64 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant text-sm">
    Loading map…
  </div>
) });

interface LocationPoint {
  id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
  timestamp: string;
  is_last_known?: boolean;
}

export default function LocationPage() {
  const { currentLocation, locationHistory, addLocationHistory, isDemoMode } = useStore();
  const [historyData, setHistoryData] = useState<LocationPoint[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await locationAPI.history(hours);
      setHistoryData(res.data);
      res.data.forEach((l: LocationPoint) => addLocationHistory(l));
    } catch {
      setHistoryData(locationHistory.slice(0, 100));
    } finally {
      setLoading(false);
    }
  }, [hours, locationHistory, addLocationHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const requestGPS = () => {
    setRequesting(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const loc: LocationPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
          is_last_known: true,
        };
        addLocationHistory(loc);
        setGpsError(false);
        setRequesting(false);
        try { await locationAPI.update(loc.latitude, loc.longitude); } catch { /* offline */ }
        loadHistory();
      },
      () => { setGpsError(true); setRequesting(false); },
      { timeout: 8000 }
    );
  };

  const mapPoints = historyData.slice(0, 100).map((l) => ({
    lat: l.latitude,
    lng: l.longitude,
    isLastKnown: l.is_last_known,
    timestamp: l.timestamp,
  }));

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Location Trail</h1>
          <p className="text-on-surface-variant text-sm">GPS history and last-known location</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}
            className="input-field py-2 w-36">
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={48}>Last 48h</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button onClick={requestGPS} disabled={requesting} className="btn-primary py-2 px-4 text-sm">
            {requesting ? "Getting GPS…" : "📍 Update GPS"}
          </button>
        </div>
      </div>

      {/* GPS status */}
      {gpsError && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <span>⚠️</span>
            <h3 className="font-semibold text-warning text-sm">GPS Unavailable</h3>
            <span className="badge-warning text-xs ml-auto">LAST KNOWN</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            Current location unavailable. Showing last known location.
            In emergencies, this will be used as your reported location.
          </p>
        </div>
      )}

      {/* Current location card */}
      {(currentLocation || gpsError) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📍</span>
            <h3 className="font-display font-semibold text-sm">
              {gpsError ? "⚠ Last Known Location" : "Current Location"}
            </h3>
            {gpsError ? <span className="badge-warning text-xs">LAST KNOWN</span> : <span className="badge-safe text-xs">LIVE</span>}
          </div>
          {currentLocation ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-on-surface-variant mb-1">Latitude</p><p className="font-mono text-primary">{currentLocation.latitude.toFixed(6)}</p></div>
              <div><p className="text-xs text-on-surface-variant mb-1">Longitude</p><p className="font-mono text-primary">{currentLocation.longitude.toFixed(6)}</p></div>
              <div><p className="text-xs text-on-surface-variant mb-1">Accuracy</p><p className="text-secondary">±{currentLocation.accuracy?.toFixed(0) || "?"} m</p></div>
              <div><p className="text-xs text-on-surface-variant mb-1">Updated</p><p>{new Date(currentLocation.timestamp).toLocaleTimeString()}</p></div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No location data. Enable GPS and press Update.</p>
          )}
        </motion.div>
      )}

      {/* Map */}
      <div className="dashboard-card rounded-xl overflow-hidden border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">Location Trail Map</h3>
          <span className="text-xs text-on-surface-variant">{mapPoints.length} points</span>
        </div>
        <div className="h-80">
          <MapWithNoSSR points={mapPoints} center={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : undefined} />
        </div>
        <div className="p-3 flex items-center gap-4 text-xs text-on-surface-variant border-t border-white/5">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-secondary inline-block" /> Location points</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-warning inline-block" /> Last known</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-tertiary-container inline-block" /> Emergency</span>
        </div>
      </div>

      {/* History timeline */}
      <div className="dashboard-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm">Location History</h3>
          {loading && <span className="text-xs text-on-surface-variant animate-pulse">Loading…</span>}
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
          {historyData.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No location history. Press Update GPS or seed demo data.
            </p>
          ) : historyData.slice(0, 50).map((loc, i) => (
            <div key={loc.id || i} className="flex items-center gap-3 p-3 bg-surface-container rounded-lg">
              <div className="flex flex-col items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${loc.is_last_known ? "bg-warning" : "bg-secondary"}`} />
                {i < historyData.length - 1 && <span className="w-px h-4 bg-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-on-surface">
                  {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                </p>
                {loc.address && <p className="text-xs text-on-surface-variant truncate">{loc.address}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-on-surface-variant">{new Date(loc.timestamp).toLocaleTimeString()}</p>
                {loc.is_last_known && <span className="text-xs text-warning">Last known</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-on-surface-variant/40 text-center">
        Location data retention: 30 days by default. Configurable in Privacy Settings.
      </p>
    </div>
  );
}
