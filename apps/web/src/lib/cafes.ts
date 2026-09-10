import content from "@/lib/content.json";

export type Cafe = (typeof content.cafes.locations)[number] & {
  position: [number, number];
};

// Approximate neighborhood centers for the demo, not verified shop entrances.
const neighborhoodCenters: Record<string, [number, number]> = {
  bole: [8.99, 38.79],
  sarbet: [8.985, 38.735],
  piassa: [9.035, 38.755],
};

export const cafes: Cafe[] = content.cafes.locations.map((cafe) => ({
  ...cafe,
  position: neighborhoodCenters[cafe.id],
}));

export function googleMapsUrl(cafe: Cafe) {
  const [lat, lng] = cafe.position;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function appleMapsUrl(cafe: Cafe) {
  const [lat, lng] = cafe.position;
  return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(cafe.name)}`;
}

export function directionsUrl(cafe: Cafe) {
  const [lat, lng] = cafe.position;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
