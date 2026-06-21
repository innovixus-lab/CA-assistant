# FinnCA — Professional Suite

A full-stack practice management platform built for Chartered Accountant firms. Manages clients, tasks, documents, and communication channels from a single dashboard — with separate portals for employees and clients.

---

## What's Inside

### CA Dashboard (`/`)
The main control centre for the CA and senior partners.

| Section | What it does |
|---|---|
| **Dashboard** | Live stats — active clients, pending tasks, message volume, real-time stream of recent WhatsApp/email messages |
| **Inbox** | Unified feed of inbound WhatsApp and email messages. Auto-categorises each message (TAX, GST, AUDIT, etc.) and flags action items |
| **Clients** | Full client registry — add/edit/delete clients, set portal PIN, toggle payment lock with amount and note |
| **Tasks** | Kanban board — Pending → In Progress → Completed. Assign tasks to employees and clients, set priority and due date |
| **Vault** | Document archive — upload files, verify them, then approve for the client portal. Sends a WhatsApp notification to the client automatically |
| **Team** | Employee management — add staff, set passwords, assign clients, control admin vs employee access |

---

### Client Portal (`/portal/:clientId`)
A secure, isolated view for each client.

- PIN login (4–6 digits, set by CA)
- Sees only documents the CA has approved for them
- If a payment is outstanding → documents are blurred and locked until the CA clears the payment flag
- Protected document viewer with diagonal watermark, right-click disabled, keyboard save shortcuts blocked
- Download only available when payment is cleared
- Updates in real-time — payment unlock reflects instantly without a page refresh

**Test URLs:**

| Client | URL | PIN | Payment |
|---|---|---|---|
| Acme Corp | `/portal/acme-corp` | `1234` | Unlocked |
| Global Tech Solutions | `/portal/global-tech-solutions` | `5678` | 🔒 ₹12,500 due |
| Indus Dynamics | `/portal/indus-dynamics` | `9999` | Unlocked |
| Zenith Logistics | `/portal/zenith-logistics` | `2468` | Unlocked |

---

### Employee Portal (`/employee`)
A scoped workspace for staff.

- Email + password login
- **Tasks** — kanban view of assigned tasks, move cards between columns
- **Documents** — upload files for assigned clients (goes to Pending Review; CA verifies and approves)
- **Inbox** — read-only view of all incoming messages
- **Clients** — summary of assigned clients with task and document counts
- Admins see everything; employees see only their assigned clients

**Demo credentials:**

| Name | Email | Password | Role |
|---|---|---|---|
| Rajesh K. | `rajesh@finnca.com` | `admin123` | Admin |
| Anita S. | `anita@finnca.com` | `anita123` | Employee (Global Tech, Zenith) |
| Vikram M. | `vikram@finnca.com` | `vikram123` | Employee (Indus Dynamics) |

---

## Communication Channels

**WhatsApp** — powered by Twilio. Incoming messages arrive via webhook, outgoing messages sent via Twilio REST API.

**Email** — outbound via Nodemailer (SMTP), inbound via IMAP polling on a configurable interval.

Both channels feed into the unified Inbox with automatic categorisation and action flagging.

---

## Running Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

The app uses **localStorage as the database** in local mode — no Firebase setup needed. Demo data is seeded automatically on first load. Use the 🐛 **Dev Helper** button (bottom-right corner) to see portal links, credentials, and reset data.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in what you need:

```
# WhatsApp via Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email outbound (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Email inbound (IMAP polling)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=
IMAP_PASS=
EMAIL_POLL_INTERVAL_MS=60000

# App URL (used for portal notification links)
APP_URL=http://localhost:3000
```

WhatsApp webhook URL to configure in Twilio console: `{APP_URL}/api/webhooks/whatsapp`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Express.js, Node.js |
| Database | Firebase Firestore (production) / localStorage (local dev) |
| Storage | Firebase Storage (production) / base64 data URLs (local dev) |
| WhatsApp | Twilio WhatsApp API |
| Email | Nodemailer (SMTP) + IMAP |
| Auth | Firebase Auth (production) / session storage (local dev) |
