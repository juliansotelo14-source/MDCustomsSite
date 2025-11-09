// netlify/functions/create-upload-url.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  const BUCKET = "order-files"; // must match your bucket name in Supabase

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
    return { statusCode: 500, body: "Server not configured" };
  }

  try {
    const { filename, contentType } = JSON.parse(event.body || "{}");
    if (!filename) {
      return { statusCode: 400, body: "filename required" };
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path =
      Date.now() + "-" + Math.random().toString(36).slice(2) + "-" + safeName;

    // Base Storage API: https://<project>.supabase.co/storage/v1
    const base = SUPABASE_URL.replace(/\/+$/, "") + "/storage/v1";

    // Create signed upload URL via REST:
    // POST /storage/v1/object/upload/sign/{bucket}/{path}
    const signRes = await fetch(
      `${base}/object/upload/sign/${encodeURIComponent(
        BUCKET
      )}/${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiresIn: 60 * 60, // 1 hour
        }),
      }
    );

    const data = await signRes.json().catch(() => ({}));

    if (!signRes.ok || !data.url) {
      console.error("create-upload-url error", signRes.status, data);
      return {
        statusCode: 500,
        body: "Failed to create signed upload URL",
      };
    }

    // Full upload URL (where the browser will PUT the file)
    const uploadUrl = `${base}${data.url}`;

    // Public URL (because bucket is public)
    const publicUrl = `${base}/object/public/${encodeURIComponent(
      BUCKET
    )}/${encodeURIComponent(path)}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl,
        publicUrl,
        contentType: contentType || "application/octet-stream",
      }),
    };
  } catch (e) {
    console.error("create-upload-url server error:", e);
    return { statusCode: 500, body: "Server error" };
  }
}
