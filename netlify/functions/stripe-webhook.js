import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

function h(v){ return v===undefined||v===null ? "" : String(v); }

export async function handler(event){
  const sig = event.headers["stripe-signature"]; let evt;
  try{ evt = stripe.webhooks.constructEvent(event.body, sig, endpointSecret); }
  catch(err){ console.error("Webhook verify failed:", err.message); return { statusCode:400, body:`Webhook Error: ${err.message}` }; }

  if(evt.type === "checkout.session.completed"){
    const session = evt.data.object;
    const md = session.metadata || {};
    const attachments = h(md.attachments).split("|").filter(Boolean);

    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders`, {
        method: "POST",
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          customer_name: md.name || "",
          customer_email: session.customer_email || "",
          phone: md.phone || "",
          material_id: md.materialId || "",
          material_name: md.materialName || "",
          width_in: Number(md.widthIn || 0),
          height_in: Number(md.heightIn || 0),
          quantity: Number(md.quantity || 1),
          options: md.options || "",
          notes: md.notes || "",
          attachments: attachments.join("|"),
          ship_to_address: md.shipTo || "",
          amount_total_cents: session.amount_total || 0,
          currency: session.currency || "usd",
          stripe_payment_intent: session.payment_intent || "",
          status: session.payment_status || "paid"
        })
      });
      if(!res.ok){
        const txt = await res.text().catch(()=> "");
        console.error("Supabase insert error", res.status, txt);
      }
    } catch (e) {
      console.error("Supabase fetch error", e);
    }
  }
  return { statusCode:200, body:"ok" };
}
