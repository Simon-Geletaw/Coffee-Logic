"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import { cafes } from "@/lib/cafes";

type Props = { selectedId: string; onSelect: (id: string) => void };

const icons = cafes.map((_, index) => ({
  normal: divIcon({ className: "cafe-pin", html: `<span>0${index + 1}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
  active: divIcon({ className: "cafe-pin is-selected", html: `<span>0${index + 1}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
}));

function MapView({ selectedId, panEnabled }: { selectedId: string; panEnabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    const cafe = cafes.find((entry) => entry.id === selectedId);
    if (!cafe) return;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo(cafe.position, 13, { animate, duration: 0.8 });
  }, [map, selectedId]);
  useEffect(() => {
    if (panEnabled) map.dragging.enable();
    else map.dragging.disable();
  }, [map, panEnabled]);
  return null;
}

export default function CafeMap({ selectedId, onSelect }: Props) {
  const [panEnabled, setPanEnabled] = useState(false);
  const [tileError, setTileError] = useState(false);
  return (
    <>
      <MapContainer center={[9.01, 38.76]} zoom={12} minZoom={10} maxZoom={17} scrollWheelZoom={false} dragging={false} touchZoom={false} doubleClickZoom={false} className="cafe-leaflet" attributionControl>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={{ tileerror: () => setTileError(true), tileload: () => setTileError(false) }} />
        <MapView selectedId={selectedId} panEnabled={panEnabled} />
        {cafes.map((cafe, index) => (
          <Marker key={cafe.id} position={cafe.position} icon={selectedId === cafe.id ? icons[index].active : icons[index].normal} title={`${cafe.name} — approximate neighborhood`} alt={`Select ${cafe.name}`} eventHandlers={{ click: () => onSelect(cafe.id) }}>
            <Tooltip direction="top" offset={[0, -18]}>{cafe.neighborhood}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <button type="button" className="map-pan-toggle" aria-pressed={panEnabled} onClick={() => setPanEnabled(!panEnabled)}>{panEnabled ? "Lock map · scroll page" : "Enable map dragging"}</button>
      {tileError && <p className="map-error" role="status">Map tiles could not load. Location details and neighborhood links are still available.</p>}
    </>
  );
}
