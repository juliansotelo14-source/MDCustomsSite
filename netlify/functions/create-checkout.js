// netlify/functions/create-checkout.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Fallback if env vars not set (but you should set them in Netlify)
const SUCCESS_URL = process.env.SUCCESS_URL || "https://hmdcustoms.com/";
const CANCEL_URL = process.env.CANCEL_URL || "https://hmdcustoms.com/";

// Mirror of your pricing on the server
const MATERIALS = [
  {
    id: "vinyl",
    name: "Vinyl",
    pricing: { unit: "sqft", rate: 9.99 },
  },
  {
    id: "aluminum-040",
    name: "Aluminum .040",
    pricing: { unit: "sqin", rate: 0.14 },
  },
  {
    id: "aluminum-080",
    name: "Aluminum .080",
    pricing: { unit: "sqin", rate: 0.22 },
  },
  {
    id: "jbond-3mm",
    name: "ACM (JBond) 3mm",
    pricing: { unit: "sqin", rate: 0.12 },
  },
  {
    id: "jbond-6mm",
    name: "ACM (JBond) 6mm",
    pricing: { unit: "sqin", rate: 0.18 },
  },
  {
    id: "acrylic",
    name: "Acrylic",
    pricing: { unit: "sqin", rate: 0.2 },
  },
  {
    id: "magnets",
    name: "Magnets",
    pricing: { unit: "sqin", rate: 0.14 },
  },
  {
    id: "banners",
    name: "Banners",
    pricing: { unit: "sqft", rate: 7.0 },
  },
  {
    id: "business-cards-regular",
    name: "Business Cards — Regular",
    pricing: { unit: "per_sheet", rate: 4.0, items_per_sheet: 72 },
  },
  {
    id: "business-cards-metal",
    name: "Business Cards — Metal (with case)",
    pricing: { unit: "per_pack", rate: 11.0, items_per_pack: 55 },
  },
  {
    id: "yard-signs",
    name: "Yard Signs",
    pricing: { unit: "sqft", rate: 9.0 },
  },
];

// If you want server-side option charges later, you can mirror mat.options here as well.

function calcPrice(material, widthIn, heightIn, quantity) {
  const unit = material.pricing?.unit;
  const rate = Number(material.pricing?.rate || 0);
  const q = Math.max(1, Number(quantity) || 1);

  const areaSqIn =
    Math.max(0, Number(widthIn) || 0) * Math.max(0, Number(heightIn) || 0);
  const areaSqFt = areaSqIn / 144;

  let base = 0;
  switch (unit) {
    case "sqin":
      base = rate * areaSqIn * q;
      break;
    case "sqft":
      base = rate * areaSqFt * q;
      break;
    case "per_sheet":
    case "per_pack":
      base = rate * q;
      break;
    default:
      base = 0;
  }

  return {
    areaSqIn,
    areaSqFt,
    quantity: q,
    total: base,
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("Missing STRIPE_SECRET_KEY env var");
    return { statusCode: 500, body: "Stripe not configured" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    console.error("Invalid JSON body:", e);
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const {
    materialId,
    materialName,
    widthIn,
    heightIn,
    quantity,
    options,
    customer,
    shipTo,
    notes,
    attachments,
  } = body;

  if (!materialId || !customer?.email || !customer?.name) {
    console.error("Missing required fields", { materialId, customer });
    return { statusCode: 400, body: "Missing required fields" };
  }

  const mat =
    MATERIALS.find((m) => m.id === materialId) ||
    MATERIALS.find((m) => m.name === materialName);

  if (!mat) {
    console.error("Unknown material", materialId, materialName);
    return { statusCode: 400, body: "Unknown material" };
  }

  const { total, quantity: qty } = calcPrice(mat, widthIn, heightIn, quantity);

  if (!total || total <= 0) {
    console.error("Calculated total is zero/negative", {
      materialId,
      widthIn,
      heightIn,
      quantity,
      total,
    });
    return { statusCode: 400, body: "Invalid amount" };
  }

  const amountCents = Math.round(total * 100);

  const metaAttachments = Array.isArray(attachments)
    ? attachments.join("|")
    : attachments || "";

  let metadata = {
    materialId: materialId,
    materialName: materialName || mat.name,
    widthIn: widthIn != null ? String(widthIn) : "",
    heightIn: heightIn != null ? String(heightIn) : "",
    quantity: String(qty),
    options: Array.isArray(options) ? options.join(",") : String(options || ""),
    name: customer.name || "",
    phone: customer.phone || "",
    shipTo: shipTo || "",
    notes: notes || "",
    attachments: metaAttachments,
  };

  // Stripe metadata must be strings and not too large
  Object.keys(metadata).forEach((k) => {
    if (metadata[k] == null) metadata[k] = "";
    metadata[k] = String(metadata[k]).slice(0, 500);
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      customer_email: customer.email,
      line_items: [
        {
          quantity: 1, // we bake total quantity into metadata; amount is for the whole order
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: metadata.materialName || "Custom order",
              description: `Qty: ${metadata.quantity}${
                metadata.widthIn && metadata.heightIn
                  ? ` — ${metadata.widthIn}" x ${metadata.heightIn}"`
                  : ""
              }`,
            },
          },
        },
      ],
      metadata,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return {
      statusCode: 500,
      body: "Failed to create checkout session",
    };
  }
}
