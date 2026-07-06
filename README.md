# Brokerage

A bilingual (Arabic + English) workspace for real estate brokers. Keep your
listings and clients in one place, search in plain language, qualify leads,
summarize calls, handle WhatsApp enquiries, and see simple reports.

## Features

- Property database with Arabic + English fields
- Plain-language search, in Arabic or English
- Client management with smart lead qualification
- Assistant that answers questions about your own listings
- Reserve a property for a specific client
- WhatsApp: turn incoming messages into clients and reply automatically
- Automatic follow-up reminders
- Call and chat summaries
- Reports: pipeline, clients, inventory, win rate
- Bulk import from a spreadsheet (CSV)

## Built with

- Next.js (App Router, TypeScript) and Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage)
- Groq (free, default) or OpenAI for the assistant
- Deploys on Vercel

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

### 1. Database

Open your Supabase project, go to the **SQL Editor**, and run the files in
`supabase/migrations/` in order (0001 through 0010).

### 2. Keys

At a minimum you need your Supabase URL and keys. For the assistant, set
`AI_LLM_PROVIDER=groq` and `GROQ_API_KEY` (free tier). Everything you can
configure is listed in `.env.example`. Without an assistant key the app still
runs and search falls back to keywords.

## Deploy

Push the project to a **private** GitHub repository, import it on Vercel, add
the same environment variables from your `.env.local`, and deploy. After the
first deploy, set `NEXT_PUBLIC_SITE_URL` to your Vercel URL and redeploy.

## WhatsApp (optional)

Create a WhatsApp Cloud API app in Meta. Then open the in-app **Settings**
page, add your phone number ID, and set the webhook to
`https://<your-domain>/api/webhooks/whatsapp`. Incoming messages become clients
and get automatic replies based on your listings.

## Follow-up reminders (optional)

Once deployed on Vercel, a daily job sends due follow-up reminders. Set
`CRON_SECRET` to protect it.

## Importing listings

Open the **Import data** page, upload or paste a CSV (Arabic and English
headers both work), and pick a source label. Re-importing the same file updates
existing rows instead of creating duplicates.
