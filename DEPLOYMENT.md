# FinnCA — Deployment Guide

This app is a **single Node.js process** (Express + Vite) that serves both
the frontend and backend from one URL. There is no separate frontend/backend
deployment — one command builds and starts everything.

---

## Architecture at a glance

```
Browser → https://your-app.com
              │
              ▼
         Express (Node.js)
          ├── /api/*        → backend routes (WhatsApp, Email, Firestore)
          ├── /portal/*     → client portal (SPA)
          ├── /employee     → employee portal (SPA)
          └── /*            → React frontend (built static files)
```

---

## Option A — Railway (Recommended, free tier)

Railway runs your Node.js server as-is. No Docker needed.

### Step 1 — Push to GitHub

If you haven't already:
```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ca-manager.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to https://railway.app → sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `ca-manager` repo
4. Railway detects Node.js automatically

### Step 3 — Set build & start commands

In Railway → your service → **Settings** tab:

| Field | Value |
|---|---|
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

### Step 4 — Add environment variables

Railway → your service → **Variables** tab. Add each one:

```
# Required — App URL (Railway gives you this after first deploy)
APP_URL=https://ca-manager-production.up.railway.app

# Gemini AI
GEMINI_API_KEY=your_gemini_key

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
CA_WHATSAPP_NUMBER=+919876543210

# Email — SMTP outbound (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_16_char_app_password

# Email — IMAP inbound polling
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=you@gmail.com
IMAP_PASS=your_16_char_app_password
EMAIL_POLL_INTERVAL_MS=60000

# Razorpay (optional, for payment features)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

> **Gmail App Password**: Go to myaccount.google.com → Security → 2-Step Verification
> → App passwords → Generate. Use that 16-character password for both SMTP_PASS and IMAP_PASS.

### Step 5 — Deploy

Click **Deploy**. Railway builds and starts the server. You get a URL like:
`https://ca-manager-production.up.railway.app`

Update `APP_URL` in Variables to this exact URL, then redeploy.

### Step 6 — Set Twilio webhook

In Twilio Console → Messaging → your WhatsApp number → Webhook:
```
https://ca-manager-production.up.railway.app/api/webhooks/whatsapp
```

---

## Option B — Google Cloud Run (this project was built for it)

Cloud Run is serverless — you only pay per request, free tier is generous.

### Step 1 — Install Google Cloud CLI

Download from: https://cloud.google.com/sdk/docs/install

```bash
gcloud auth login
gcloud config set project gen-lang-client-0807863315
```

### Step 2 — Enable required APIs

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Step 3 — Create a .env file for production

Copy `.env.example` to `.env.production` and fill in all values.

### Step 4 — Deploy directly (no Docker needed)

```bash
gcloud run deploy ca-manager \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="APP_URL=https://ca-manager-HASH-el.a.run.app"
```

Cloud Run builds automatically using Google's buildpacks (detects Node.js,
runs `npm run build` then `npm start`).

After first deploy, get your URL from the output, then redeploy with the
correct `APP_URL`.

### Step 5 — Firebase Admin credentials

Cloud Run on the same GCP project gets Firebase Admin credentials
automatically (Application Default Credentials). No service account key needed.

---

## Option C — ngrok (local testing, 5 minutes)

Best for testing WhatsApp webhooks without any cloud account.

### Step 1 — Start the local server
```bash
npm run dev
```
Server starts at http://localhost:3000

### Step 2 — Expose it publicly
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```
You get a URL like: `https://abc123.ngrok-free.app`

### Step 3 — Set your .env
```
APP_URL=https://abc123.ngrok-free.app
```
Restart `npm run dev`.

### Step 4 — Point Twilio to ngrok
Twilio Console → WhatsApp Sandbox → Webhook URL:
```
https://abc123.ngrok-free.app/api/webhooks/whatsapp
```

> Note: ngrok URL changes every restart on the free plan.
> Use `ngrok http --domain=your-static-domain.ngrok-free.app 3000`
> for a persistent domain (requires free ngrok account).

---

## Setting up Gmail for SMTP + IMAP

1. Go to https://myaccount.google.com
2. Security → **2-Step Verification** → turn ON
3. Security → **App passwords** → select "Mail" + "Windows Computer"
4. Copy the 16-character password generated
5. Use it for both `SMTP_PASS` and `IMAP_PASS`
6. Use `smtp.gmail.com:587` for outbound
7. Use `imap.gmail.com:993` for inbound polling

---

## Verifying everything works

Once deployed, open your app URL and go to **Comm Setup** tab:

1. All three status badges (WhatsApp, SMTP, IMAP) should show green
2. Click **Send Test Email** — you should receive an email at your SMTP_USER address
3. Click **Send Test Message** — you should receive a WhatsApp on your CA_WHATSAPP_NUMBER
4. Check **IMAP status** — should show "IMAP polling is active"

Then test the full approval flow:
1. Go to **Security Archive** (Documents)
2. Upload a document, verify it, click **Approve**
3. The client should receive both a WhatsApp message and an email with the portal link

---

## Summary — which option to pick

| Use case | Best option |
|---|---|
| Testing right now, no cloud account | ngrok (Option C) |
| Free permanent URL, easy setup | Railway (Option A) |
| Already on GCP / need Firebase Admin | Cloud Run (Option B) |
| Just demo the frontend | Vercel (static, no backend features) |
