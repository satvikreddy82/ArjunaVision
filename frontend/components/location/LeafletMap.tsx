"use client";
import { useEffect, useState, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface MapPoint {
  lat: number;
  lng: number;
  isLastKnown?: boolean;
  timestamp?: string;
}

interface LeafletMapProps {
  points?: MapPoint[];
  center?: [number, number];
}

export default function LeafletMap({ points = [], center }: LeafletMapProps) {
  const mapRef = useRef<LeafletMapProps | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current || isInitializingRef.current) return;
    
    // Check if DOM element already has a Leaflet map attached
    if ((containerRef.current as any)._leaflet_id) return;

    isInitializingRef.current = true;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Double check in async callback
      if (mapInstanceRef.current || !containerRef.current) {
        isInitializingRef.current = false;
        return;
      }

      // Fix default marker icons
      delete (L.Icon.Default.prototype as { _getIconUrl?: () => void })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const defaultCenter: [number, number] = center || (points.length > 0 ? [points[0].lat, points[0].lng] : [12.9716, 77.5946]);

      try {
        const map = L.map(containerRef.current!, {
          center: defaultCenter,
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });

        mapInstanceRef.current = map;

        // Dark tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(map);

        // Draw location trail
        if (points.length > 1) {
          const latlngs = points.map((p) => [p.lat, p.lng] as [number, number]);
          L.polyline(latlngs, { color: "#c0c1ff", weight: 2, opacity: 0.6, dashArray: "4 4" }).addTo(map);
        }

        // Add markers
        points.forEach((p, i) => {
          const isLast = p.isLastKnown || i === 0;
          const marker = L.circleMarker([p.lat, p.lng], {
            radius: isLast ? 8 : 5,
            fillColor: isLast ? "#F59E0B" : "#4fdbc8",
            color: isLast ? "#D97706" : "#0EA5A4",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(map);
          if (p.timestamp) {
            marker.bindPopup(`<div style="font-family:Inter;font-size:12px;color:#dee1f9;background:#1a1f30;padding:8px;border-radius:6px">
              ${isLast ? "<strong style='color:#F59E0B'>Last Known</strong><br>" : ""}
              ${new Date(p.timestamp).toLocaleString()}
            </div>`);
          }
        });

        if (center) map.setView(center, 14);
      } catch (err) {
        console.error("Leaflet init error:", err);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, 14, { animate: true });
    }
  }, [center]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
}
