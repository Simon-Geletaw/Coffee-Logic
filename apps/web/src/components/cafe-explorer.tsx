"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { appleMapsUrl, cafes, directionsUrl, googleMapsUrl } from "@/lib/cafes";
import { ErrorBoundary } from "@/components/error-boundary";

const CafeMap = dynamic(() => import("./cafe-map"), {
  ssr: false,
  loading: () => <div className="map-placeholder" role="status">Preparing the neighborhood map…</div>,
});

export default function CafeExplorer() {
  const [selectedId, setSelectedId] = useState(cafes[0].id);
  const [loadMap, setLoadMap] = useState(false);
  const mapHost = useRef<HTMLDivElement>(null);
  const selected = cafes.find((cafe) => cafe.id === selectedId) ?? cafes[0];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setLoadMap(true); observer.disconnect(); }
    }, { rootMargin: "240px" });
    if (mapHost.current) observer.observe(mapHost.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <p className="cafe-demo-note">Location preview · Addresses and hours are sample information. Pins show approximate neighborhoods, not confirmed café entrances.</p>
      <div className="cafe-explorer">
        <div className="cafe-list-panel">
          <div className="cafe-selector" aria-label="Choose a café">
            {cafes.map((cafe, index) => (
              <button type="button" key={cafe.id} aria-pressed={selectedId === cafe.id} aria-controls="cafe-details" onClick={() => setSelectedId(cafe.id)}>
                <span className="cafe-number">0{index + 1}</span>
                <span><strong>{cafe.name}</strong><small>{cafe.neighborhood}</small></span>
                <ArrowUpRight size={20} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div id="cafe-details" className="cafe-details" aria-live="polite" aria-atomic="true">
            <span className="storefront-eyebrow">{selected.name} · PREVIEW</span>
            <p className="cafe-notes">{selected.notes}</p>
            <div className="cafe-detail-row"><MapPin size={16} aria-hidden="true" /><p>{selected.address}</p></div>
            <div className="cafe-detail-row"><Clock3 size={16} aria-hidden="true" /><div>{selected.hours.map((hours) => <p key={hours.days}><span>{hours.days}</span><span>{hours.time}</span></p>)}</div></div>
            <div className="cafe-app-links">
              <a href={directionsUrl(selected)} target="_blank" rel="noopener noreferrer" className="cafe-map-link">Get directions <ArrowUpRight size={16} /></a>
              <a href={googleMapsUrl(selected)} target="_blank" rel="noopener noreferrer" className="cafe-map-link">Google Maps <ArrowUpRight size={16} /></a>
              <a href={appleMapsUrl(selected)} target="_blank" rel="noopener noreferrer" className="cafe-map-link">Apple Maps <ArrowUpRight size={16} /></a>
            </div>
          </div>
        </div>
        <div ref={mapHost} className="cafe-map-host" aria-label="Map of Addis Ababa neighborhoods">
          <ErrorBoundary fallback={<div className="map-placeholder">The map is unavailable. You can still explore each neighborhood using the links beside it.</div>}>
            {loadMap ? <CafeMap selectedId={selectedId} onSelect={setSelectedId} /> : <div className="map-placeholder"><MapPin size={28} /><span>Addis Ababa, Ethiopia</span><small>Neighborhood map</small></div>}
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
