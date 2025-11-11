// netlify/functions/admin-artworks.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

function unauthorized() {
  return { statusCode: 401, body: "Not authorized" };
}

export async function handler(event, context) {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
    return { statusCode: 500, body: "Server not configured" };
  }

  // Require logged-in Netlify Identity user
  const user = context.clientContext && context.clientContext.user;
  if (!user) return unauthorized();

  const base = SUPABASE_URL.replace(/\/+$/, "");
  const headers = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    if (event.httpMethod === "GET") {
      // Admin view: show all (or only active if you want)
      const url = `${base}/rest/v1/artworks?select=*&order=created_at.desc`;
      const res = await fetch(url, { headers });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        console.error("admin-artworks GET error", res.status, data);
        return { statusCode: 500, body: "Failed to load artworks" };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const {
        title,
        price,
        size,
        materials,
        image_url,
        buy_url,
        is_active = true,
      } = body;

      if (!title || !image_url) {
        return { statusCode: 400, body: "Missing title or image_url" };
      }

      const row = {
        title,
        price: price || "",
        size: size || "",
        materials: Array.isArray(materials) ? materials : [],
        image_url,
        buy_url: buy_url || null,
        is_active,
      };

      const url = `${base}/rest/v1/artworks`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(row),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("admin-artworks POST error", res.status, data);
        return { statusCode: 500, body: "Failed to create artwork" };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data[0] || row),
      };
    }

    if (event.httpMethod === "DELETE") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return { statusCode: 400, body: "Missing id" };

      // Soft delete: set is_active = false
      const url = `${base}/rest/v1/artworks?id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        console.error("admin-artworks DELETE error", res.status, data);
        return { statusCode: 500, body: "Failed to delete artwork" };
      }

      return { statusCode: 200, body: "ok" };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("admin-artworks server error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
