import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Ove promenljive se podešavaju u Netlify (Site settings -> Environment variables),
// NIKAD sa "VITE_" prefiksom da ne bi završile u kodu koji se šalje browseru.
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function requireAdmin(authHeader?: string) {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Nema autorizacionog tokena", status: 401 };

  const { data: userData, error: userError } = await adminClient.auth.getUser(
    token
  );
  if (userError || !userData?.user) {
    return { error: "Nevažeća sesija", status: 401 };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "ADMIN") {
    return { error: "Samo administrator ima pristup", status: 403 };
  }

  return { userId: userData.user.id };
}

export const handler: Handler = async (event) => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Server nije podešen (nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      }),
    };
  }

  const auth = await requireAdmin(event.headers.authorization);
  if ("error" in auth) {
    return { statusCode: auth.status, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { email, password, full_name, username, role } = body;

      if (!email || !password || !full_name || !username || !role) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Nedostaju obavezna polja" }),
        };
      }
      if (!["ADMIN", "MAINTENANCE", "FLEET"].includes(role)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Neispravna uloga" }),
        };
      }
      if (String(password).length < 6) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Lozinka mora imati bar 6 karaktera" }),
        };
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          username: String(username).trim().toLowerCase(),
          role,
        },
      });

      if (error) {
        return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 201, body: JSON.stringify({ id: data.user?.id }) };
    }

    if (event.httpMethod === "DELETE") {
      const body = JSON.parse(event.body || "{}");
      const { user_id } = body;

      if (!user_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Nedostaje user_id" }),
        };
      }
      if (user_id === auth.userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Ne možeš obrisati sopstveni nalog" }),
        };
      }

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) {
        return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
      }

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: "Metoda nije podržana" }) };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e instanceof Error ? e.message : "Greška" }),
    };
  }
};
