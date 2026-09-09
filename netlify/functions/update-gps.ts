import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Ove promenljive se podešavaju u Netlify (Site settings -> Environment variables),
// NIKAD sa "VITE_" prefiksom da ne bi završile u kodu koji se šalje browseru.
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const ROUTEMATE_API_KEY = process.env.ROUTEMATE_API_KEY as string;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// GPS koordinate jardova (za računanje vazdušne udaljenosti).
const YARDS: Record<"SOHO" | "MEPA", { lat: number; lng: number }> = {
  SOHO: { lat: 41.58489983658645, lng: -87.6156613968543 },
  MEPA: { lat: 41.67798925122315, lng: -87.70979782220562 },
};

const EARTH_RADIUS_MILES = 3958.8;

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

interface RouteMateLocation {
  latitude: number;
  longitude: number;
}

async function fetchLocation(gpsId: string): Promise<RouteMateLocation | null> {
  const res = await fetch(
    `https://cloud.routemate.ai/api/v0/vehicle/location/${encodeURIComponent(gpsId)}`,
    { headers: { "X-Api-Key": ROUTEMATE_API_KEY } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
    return null;
  }
  return { latitude: data.latitude, longitude: data.longitude };
}

export default async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ROUTEMATE_API_KEY) {
    console.error(
      "update-gps: nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ROUTEMATE_API_KEY"
    );
    return;
  }

  // Udaljenost nam treba samo za vozila koja još nisu stigla.
  const { data: vehicles, error } = await adminClient
    .from("vehicles")
    .select("id, plate, destination")
    .is("archived_at", null)
    .in("status", ["ARRIVING", "ARRIVED"]);

  if (error || !vehicles) {
    console.error("update-gps: greška pri čitanju vozila", error);
    return;
  }

  for (const v of vehicles) {
    const gpsId = String(v.plate || "").split("/")[0]?.trim();
    if (!gpsId) continue;

    try {
      const loc = await fetchLocation(gpsId);
      if (!loc) continue;

      const yard = YARDS[v.destination as "SOHO" | "MEPA"];
      if (!yard) continue;

      const distance = haversineMiles(
        loc.latitude,
        loc.longitude,
        yard.lat,
        yard.lng
      );

      await adminClient
        .from("vehicles")
        .update({
          gps_distance_miles: Math.round(distance * 10) / 10,
          gps_updated_at: new Date().toISOString(),
        })
        .eq("id", v.id);
    } catch (e) {
      console.error(`update-gps: greška za vozilo ${v.id} (${gpsId})`, e);
    }
  }
};

// Netlify Scheduled Function - sama se budi na svakih 15 minuta.
export const config: Config = {
  schedule: "*/15 * * * *",
};
