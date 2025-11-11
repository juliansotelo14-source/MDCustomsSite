// netlify/functions/list-artworks.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
    return { statusCode: 500, body: "Server not configured" };
  }

  const base = SUPABASE_URL.replace(/\/+$/, "");
  const url = `${base}/rest/v1/artworks?select=*&is_active=eq.true&order=created_at.desc`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => []);

    if (!res.ok) {
      console.error("list-artworks error", res.status, data);
      return { statusCode: 500, body: "Failed to load artworks" };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("list-artworks server error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
