export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  const BUCKET = "order-files";

  try {
    const { filename, contentType } = JSON.parse(event.body || "{}");
    if (!filename) return { statusCode: 400, body: "filename required" };

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${safeName}`;

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(
        BUCKET
      )}/${encodeURIComponent(path)}?upload=true`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("createSignedUploadUrl error", res.status, txt);
      return { statusCode: 500, body: "Failed to create signed upload URL" };
    }

    const data = await res.json(); // { signedUrl, path, token }
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl: `${SUPABASE_URL}${data.signedUrl}`,
        publicUrl,
        contentType: contentType || "application/octet-stream",
      }),
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "Server error" };
  }
}
