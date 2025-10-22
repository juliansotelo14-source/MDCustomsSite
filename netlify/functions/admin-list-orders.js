export async function handler(event, context) {
  const user = context.clientContext && context.clientContext.user;
  const roles = (user && user.app_metadata && user.app_metadata.roles) || [];
  if (!user || !roles.includes('admin')) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Supabase list error", res.status, txt);
      return { statusCode: 500, body: "Failed to list orders" };
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
}
