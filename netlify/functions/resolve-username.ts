import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Ove promenljive se podešavaju u Netlify (Site settings -> Environment variables),
// NIKAD sa "VITE_" prefiksom da ne bi završile u kodu koji se šalje browseru.
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Javna funkcija (bez logina) koja pretvara username u email, da bi Login
// stranica mogla da pozove supabase.auth.signInWithPassword({ email, password }).
// Ne otkriva ništa osim email adrese, i samo ako username tačno postoji.
export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Metoda nije podržana" }) };
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server nije podešen (nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const username = String(body.username || "").trim().toLowerCase();

    if (!username) {
      return { statusCode: 400, body: JSON.stringify({ error: "Nedostaje username" }) };
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }

    const { data: userData, error: userError } =
      await adminClient.auth.admin.getUserById(profile.id);

    if (userError || !userData?.user?.email) {
      return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ email: userData.user.email }) };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e instanceof Error ? e.message : "Greška" }),
    };
  }
};
