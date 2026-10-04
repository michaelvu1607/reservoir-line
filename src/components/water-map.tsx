"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { LakePoint } from "@/lib/types";

function statusColor(status: number): string {
  if (status <= 0) return "#6b7c85";
  if (status === 1) return "#ff4d3a";
  if (status === 2) return "#ff8a3d";
  if (status === 3) return "#ffb020";
  if (status === 4) return "#d6f25c";
  if (status >= 7) return "#3ec6ff";
  return "#3ecf8e";
}

export function WaterMap({
  lakes,
  selectedId,
  onSelect,
}: {
  lakes: LakePoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    let removed = false;
    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (removed || !nodeRef.current) return;
      const selected = lakes.find((lake) => lake.id === selectedId);
      map = L.map(nodeRef.current, { preferCanvas: true, zoomControl: true }).setView(
        selected ? [selected.lat, selected.lon] : [20, 10],
        selected ? 4 : 2,
      );
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles &copy; Esri, HERE, Garmin, NOAA", maxZoom: 16 },
      ).addTo(map);
      L.tileLayer(
        "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 16 },
      ).addTo(map);

      for (const lake of lakes) {
        const selectedLake = lake.id === selectedId;
        const marker = L.circleMarker([lake.lat, lake.lon], {
          radius: selectedLake ? 8 : lake.status === 1 || lake.status === 2 ? 5 : 3,
          stroke: selectedLake,
          color: "#f4f7f8",
          weight: 2,
          fillColor: statusColor(lake.status),
          fillOpacity: 0.9,
        });
        marker.bindTooltip(lake.name, { direction: "top" });
        marker.on("click", () => onSelectRef.current(lake.id));
        marker.addTo(map);
      }
    })();

    return () => {
      removed = true;
      map?.remove();
    };
  }, [lakes, selectedId]);

  return <div ref={nodeRef} className="h-full min-h-[420px] w-full" />;
}
