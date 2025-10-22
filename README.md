# Hollywood MD Customs — v1.7 (Stripe + Supabase + Admin, no MailerSend)

Includes:
- Polished homepage + materials grid + sidebar
- Multi-line "Ship To Address" in the sidebar
- Stripe Checkout (customer receipts handled by Stripe)
- Webhook that inserts orders into Supabase (no outgoing email)
- /admin dashboard with Netlify Identity (role 'admin') to list orders
- Success/Cancel pages
- No secrets included

## Setup (high-level; see chat for detailed steps)
1) Push this folder to a new GitHub repo.
2) Import to Netlify (build: none, publish: .).
3) Add env vars in Netlify: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUCCESS_URL, CANCEL_URL.
4) Create 'orders' table in Supabase (see SQL in chat or earlier README).
5) Enable Netlify Identity, invite your admin user, assign role 'admin'.
6) Create Stripe webhook -> point to /.netlify/functions/stripe-webhook -> add secret.
7) Test checkout; verify orders show in /admin.
