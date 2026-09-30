/** Google Maps links built from the stored address (SPEC §5): search and turn-by-turn directions. */
function query(name: string | null, address: string): string {
  return encodeURIComponent([name, address].filter(Boolean).join(", "));
}

export function mapUrl(name: string | null, address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${query(name, address)}`;
}

export function directionsUrl(name: string | null, address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${query(name, address)}`;
}
