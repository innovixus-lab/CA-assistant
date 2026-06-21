import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ─── Razorpay ─────────────────────────────────────────────────────────────────
import { createOrder, verifyPaymentSignature, verifyWebhookSignature } from "./src/lib/razorpay";
import { adminDb } from "./src/lib/firebaseAdmin";

// ─── Firebase Admin & message store ─────────────────────────────────────────
import { saveMessage, updateMessage, getMessages } from "./src/lib/messageStore";
import {
  parseTwilioWebhook,
  sendWhatsApp,
  validateTwilioSignature,
} from "./src/lib/whatsapp";

// ─── Email (Nodemailer + IMAP) ───────────────────────────────────────────────
import { sendEmail, startEmailPolling, ParsedIncomingEmail } from "./src/lib/email";

const app = express();
const PORT = 3000;

app.use(express.json());
// Twilio webhooks arrive as URL-encoded form data
app.use(express.urlencoded({ extended: false }));

// ─── Gemini ──────────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

async function enrichWithGemini(body: string, channel: string, sender: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are a CA firm assistant. A message was received via ${channel} from ${sender}.
Message body: "${body}"

Extract the following in JSON format:
1. clientName: (Guess from sender if possible)
2. category: (e.g., TAX, GST, AUDIT, DOCUMENT_UPLOAD, GENERAL_QUERY)
3. actionRequired: (boolean)
4. snippet: (Brief summary, max 120 chars)

JSON:`,
    config: { responseMimeType: "application/json" },
  });
  return JSON.parse(response.text || "{}") as {
    clientName?: string;
    category?: string;
    actionRequired?: boolean;
    snippet?: string;
  };
}

// ─── Existing: process a message with Gemini ─────────────────────────────────
app.post("/api/process-message", async (req, res) => {
  try {
    const { body, channel, sender, messageId } = req.body;
    const result = await enrichWithGemini(body, channel, sender);

    // If a Firestore message ID was provided, update it with enriched data
    if (messageId) {
      await updateMessage(messageId, {
        clientName: result.clientName,
        category: result.category,
        actionRequired: result.actionRequired,
        snippet: result.snippet || body.slice(0, 120),
        processed: true,
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ success: false, error: "Failed to process message" });
  }
});

// ─── Messages: list ──────────────────────────────────────────────────────────
app.get("/api/messages", async (_req, res) => {
  try {
    const messages = await getMessages(100);
    res.json({ success: true, messages });
  } catch (error) {
    console.error("Firestore Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

// ─── WhatsApp: incoming webhook (Twilio) ─────────────────────────────────────
app.post("/api/webhooks/whatsapp", async (req, res) => {
  try {
    // Optional signature validation (enable in production)
    if (process.env.TWILIO_AUTH_TOKEN && process.env.APP_URL) {
      const signature = req.headers["x-twilio-signature"] as string;
      const url = `${process.env.APP_URL}/api/webhooks/whatsapp`;
      const valid = validateTwilioSignature(signature, url, req.body);
      if (!valid) {
        console.warn("[WhatsApp Webhook] Invalid Twilio signature");
        res.status(403).send("Forbidden");
        return;
      }
    }

    const parsed = parseTwilioWebhook(req.body);

    // Save raw message to Firestore
    const msgId = await saveMessage({
      channel: "whatsapp",
      direction: "inbound",
      sender: parsed.sender,
      recipient: parsed.recipient,
      body: parsed.body,
      snippet: parsed.body.slice(0, 120),
      hasAttachment: parsed.hasAttachment,
      attachments: parsed.attachments.map((a) => ({
        url: a.url,
        contentType: a.contentType,
      })),
      externalId: parsed.twilioSid,
      timestamp: parsed.timestamp,
      processed: false,
    });

    // Enrich asynchronously — don't block the Twilio webhook response
    enrichWithGemini(parsed.body, "whatsapp", parsed.sender)
      .then((enriched) =>
        updateMessage(msgId, {
          clientName: enriched.clientName,
          category: enriched.category,
          actionRequired: enriched.actionRequired,
          snippet: enriched.snippet || parsed.body.slice(0, 120),
          processed: true,
        })
      )
      .catch((err) => console.error("[WhatsApp] Gemini enrichment failed:", err));

    // Twilio expects a TwiML response (empty is fine for no auto-reply)
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    res.status(500).send("<Response></Response>");
  }
});

// ─── WhatsApp: send outbound message ─────────────────────────────────────────
app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      res.status(400).json({ success: false, error: "to and body are required" });
      return;
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      res.status(503).json({ success: false, error: "Twilio not configured — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env" });
      return;
    }

    const result = await sendWhatsApp({ to, body });

    // Best-effort — don't let Firebase failure break the response
    saveMessage({
      channel: "whatsapp",
      direction: "outbound",
      sender: process.env.TWILIO_WHATSAPP_FROM || "system",
      recipient: to,
      body,
      snippet: body.slice(0, 120),
      hasAttachment: false,
      externalId: result.sid,
      timestamp: new Date(),
      processed: true,
    }).catch(err => console.warn("[WhatsApp Send] saveMessage failed:", err?.message));

    res.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[WhatsApp Send] Error:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// ─── Email: send outbound ─────────────────────────────────────────────────────
app.post("/api/email/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) {
      res.status(400).json({ success: false, error: "to and subject are required" });
      return;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      res.status(503).json({ success: false, error: "SMTP not configured — set SMTP_USER and SMTP_PASS in .env" });
      return;
    }

    const result = await sendEmail({ to, subject, text, html });

    // Best-effort message store — don't let a Firebase error break the response
    saveMessage({
      channel: "email",
      direction: "outbound",
      sender: process.env.SMTP_USER || "system",
      recipient: to,
      subject,
      body: text || html || "",
      snippet: (text || html || "").slice(0, 120),
      hasAttachment: false,
      externalId: result.messageId,
      timestamp: new Date(),
      processed: true,
    }).catch(err => console.warn("[Email Send] saveMessage failed (Firebase not configured?):", err?.message));

    res.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Email Send] Error:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// ─── Portal: payment confirmed by client ─────────────────────────────────────
app.post("/api/portal/payment-confirmed", async (req, res) => {
  try {
    const { clientId, clientName, amount, note } = req.body;
    const message =
      `✅ Payment Received\n\n` +
      `Client: *${clientName || clientId}*\n` +
      `Amount: ₹${Number(amount).toLocaleString('en-IN')}\n` +
      `For: ${note || 'Portal payment'}\n\n` +
      `The client has confirmed payment via UPI. Their portal has been unlocked automatically.`;

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.CA_WHATSAPP_NUMBER) {
      await sendWhatsApp({ to: process.env.CA_WHATSAPP_NUMBER, body: message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Payment Confirmed] Error:", error);
    res.status(500).json({ success: false });
  }
});

// ─── Razorpay: create order ───────────────────────────────────────────────────
// Called by client portal to create a Razorpay order before showing checkout
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      res.status(503).json({ success: false, error: "Razorpay not configured" });
      return;
    }
    const { amountInRupees, receiptId, clientName, note } = req.body;
    if (!amountInRupees || !receiptId) {
      res.status(400).json({ success: false, error: "amountInRupees and receiptId required" });
      return;
    }

    const order = await createOrder({
      amountInPaise: Math.round(amountInRupees * 100),
      receiptId,
      clientName: clientName || "Client",
      notes: { note: note || "" },
    });

    res.json({
      success: true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("[Razorpay Create Order] Error:", error);
    res.status(500).json({ success: false, error: "Failed to create order" });
  }
});

// ─── Razorpay: verify payment signature ──────────────────────────────────────
// Called by client portal after Razorpay checkout succeeds.
// Cryptographically verifies the payment is genuine before unlocking the portal.
app.post("/api/razorpay/verify", async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      res.status(400).json({ success: false, error: "orderId, paymentId and signature required" });
      return;
    }

    const valid = verifyPaymentSignature({ orderId, paymentId, signature });
    if (!valid) {
      console.warn("[Razorpay Verify] Invalid signature — possible tampering");
      res.status(400).json({ success: false, error: "Payment verification failed" });
      return;
    }

    res.json({ success: true, verified: true, paymentId });
  } catch (error) {
    console.error("[Razorpay Verify] Error:", error);
    res.status(500).json({ success: false, error: "Verification error" });
  }
});

// ─── Razorpay: webhook (server-to-server, most reliable) ─────────────────────
// Configure in Razorpay dashboard → Settings → Webhooks
// URL: {APP_URL}/api/webhooks/razorpay  Events: payment.captured
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const rawBody  = req.body.toString();
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Razorpay Webhook] Invalid signature");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    const event = JSON.parse(rawBody);
    if (event.event === "payment.captured") {
      const payment  = event.payload.payment.entity;
      const orderId  = payment.order_id;
      const paymentId = payment.id;
      const notes    = payment.notes ?? {};

      console.log(`[Razorpay] Payment captured: ${paymentId} for order ${orderId}, client: ${notes.clientName}`);

      // Notify CA via WhatsApp
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.CA_WHATSAPP_NUMBER) {
        const msg =
          `✅ *Payment Captured via Razorpay*\n\n` +
          `Client: *${notes.clientName || "Client"}*\n` +
          `Amount: ₹${(payment.amount / 100).toLocaleString('en-IN')}\n` +
          `Payment ID: ${paymentId}\n` +
          `Order ID: ${orderId}\n\n` +
          `Portal has been unlocked automatically.`;
        await sendWhatsApp({ to: process.env.CA_WHATSAPP_NUMBER, body: msg }).catch(() => {});
      }
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("[Razorpay Webhook] Error:", error);
    res.status(500).json({ error: "Webhook error" });
  }
});
// ─── In-memory settings store (override env vars at runtime) ─────────────────
// These are applied on top of .env so CA can reconfigure without redeploying.
interface RuntimeSettings {
  twilioWhatsappFrom?: string;   // override TWILIO_WHATSAPP_FROM
  caWhatsappNumber?:  string;   // override CA_WHATSAPP_NUMBER
  smtpHost?:          string;
  smtpPort?:          string;
  smtpUser?:          string;
  smtpPass?:          string;
  imapHost?:          string;
  imapPort?:          string;
  imapUser?:          string;
  imapPass?:          string;
  emailPollIntervalMs?: string;
}
let runtimeSettings: RuntimeSettings = {};

// GET current comm settings (redacts passwords)
app.get("/api/settings/comm", (_req, res) => {
  res.json({
    twilioWhatsappFrom: runtimeSettings.twilioWhatsappFrom ?? process.env.TWILIO_WHATSAPP_FROM ?? "",
    caWhatsappNumber:   runtimeSettings.caWhatsappNumber   ?? process.env.CA_WHATSAPP_NUMBER   ?? "",
    smtpHost:  runtimeSettings.smtpHost  ?? process.env.SMTP_HOST  ?? "",
    smtpPort:  runtimeSettings.smtpPort  ?? process.env.SMTP_PORT  ?? "587",
    smtpUser:  runtimeSettings.smtpUser  ?? process.env.SMTP_USER  ?? "",
    smtpPass:  runtimeSettings.smtpPass  ? "••••••••" : (process.env.SMTP_PASS ? "••••••••" : ""),
    imapHost:  runtimeSettings.imapHost  ?? process.env.IMAP_HOST  ?? "",
    imapPort:  runtimeSettings.imapPort  ?? process.env.IMAP_PORT  ?? "993",
    imapUser:  runtimeSettings.imapUser  ?? process.env.IMAP_USER  ?? "",
    imapPass:  runtimeSettings.imapPass  ? "••••••••" : (process.env.IMAP_PASS ? "••••••••" : ""),
    emailPollIntervalMs: runtimeSettings.emailPollIntervalMs ?? process.env.EMAIL_POLL_INTERVAL_MS ?? "60000",
    // status flags
    whatsappConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    emailConfigured:    !!(runtimeSettings.smtpUser || process.env.SMTP_USER),
    imapConfigured:     !!(runtimeSettings.imapUser || process.env.IMAP_USER),
  });
});

// POST update comm settings
app.post("/api/settings/comm", (req, res) => {
  const allowed: (keyof RuntimeSettings)[] = [
    "twilioWhatsappFrom", "caWhatsappNumber",
    "smtpHost", "smtpPort", "smtpUser", "smtpPass",
    "imapHost", "imapPort", "imapUser", "imapPass",
    "emailPollIntervalMs",
  ];
  for (const key of allowed) {
    const val = req.body[key];
    if (val !== undefined && val !== "••••••••") {
      // Apply to process.env so nodemailer/imap picks it up immediately
      const envMap: Record<keyof RuntimeSettings, string> = {
        twilioWhatsappFrom: "TWILIO_WHATSAPP_FROM",
        caWhatsappNumber:   "CA_WHATSAPP_NUMBER",
        smtpHost: "SMTP_HOST", smtpPort: "SMTP_PORT",
        smtpUser: "SMTP_USER", smtpPass: "SMTP_PASS",
        imapHost: "IMAP_HOST", imapPort: "IMAP_PORT",
        imapUser: "IMAP_USER", imapPass: "IMAP_PASS",
        emailPollIntervalMs: "EMAIL_POLL_INTERVAL_MS",
      };
      (runtimeSettings as Record<string, string>)[key] = val;
      process.env[envMap[key]] = val;
    }
  }
  res.json({ success: true });
});

// GET client conversation history (all messages from a phone / email address)
app.get("/api/inbox/history", async (req, res) => {
  try {
    const { phone, email: emailAddr, clientName } = req.query as Record<string, string>;

    // If Firebase isn't configured, return empty gracefully
    let all: Awaited<ReturnType<typeof getMessages>> = [];
    try {
      all = await getMessages(500);
    } catch {
      // Firebase not configured — return empty list, not a 500
      res.json({ success: true, messages: [] });
      return;
    }

    const matches = all.filter(m => {
      if (phone && (m.sender?.includes(phone.replace(/\s/g, "")) ||
          m.recipient?.includes(phone.replace(/\s/g, "")))) return true;
      if (emailAddr && (m.sender?.toLowerCase().includes(emailAddr.toLowerCase()) ||
          m.recipient?.toLowerCase().includes(emailAddr.toLowerCase()))) return true;
      if (clientName && m.clientName?.toLowerCase().includes(clientName.toLowerCase())) return true;
      return false;
    });

    res.json({ success: true, messages: matches });
  } catch (error) {
    console.error("[Inbox History] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

// Called by CA when approving a document for the client portal
// Sends BOTH WhatsApp + Email notifications
app.post("/api/portal/notify", async (req, res) => {
  try {
    const { clientPhone, clientEmail, clientName, clientId, documentName } = req.body;
    if (!clientId) {
      res.status(400).json({ success: false, error: "clientId is required" });
      return;
    }

    const portalUrl = `${process.env.APP_URL || "http://localhost:3000"}/portal/${clientId}`;
    const displayName = clientName || "there";
    const docLabel = documentName || "New Document";

    const whatsappBody =
      `Hello ${displayName} 👋\n\n` +
      `Your CA firm *FinnCA* has approved a document for you:\n` +
      `📄 *${docLabel}*\n\n` +
      `Access your secure client portal here:\n${portalUrl}\n\n` +
      `You will need your portal PIN to log in.\n` +
      `Contact us if you need assistance.`;

    const emailSubject = `FinnCA — Document Ready: ${docLabel}`;
    const emailHtml = `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0A0A0B;color:#F4F4F5;border-radius:16px">
        <h1 style="color:#818CF8;font-style:italic;margin:0 0 8px">FinnCA</h1>
        <p style="color:#71717A;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 24px">Client Portal</p>
        <p style="color:#A1A1AA;font-size:14px">Hello <strong style="color:#F4F4F5">${displayName}</strong>,</p>
        <p style="color:#A1A1AA;font-size:14px">Your CA has approved a document for your portal:</p>
        <div style="background:#18181B;border:1px solid #27272A;border-radius:12px;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:13px;font-weight:600;color:#F4F4F5">📄 ${docLabel}</p>
        </div>
        <a href="${portalUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:8px 0 24px">
          Open Secure Portal →
        </a>
        <p style="color:#52525B;font-size:12px">You will need your portal PIN to log in. Reply to this email or contact us on WhatsApp if you need help.</p>
        <hr style="border:none;border-top:1px solid #27272A;margin:24px 0"/>
        <p style="color:#3F3F46;font-size:11px;margin:0">This is an automated notification from FinnCA. Do not reply to this email if unintended.</p>
      </div>`;

    let whatsappSent = false;
    let emailSent = false;
    const errors: string[] = [];

    // ── WhatsApp ──
    if (clientPhone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        await sendWhatsApp({ to: clientPhone, body: whatsappBody });
        whatsappSent = true;
      } catch (e) {
        errors.push(`WhatsApp: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    // ── Email ──
    if (clientEmail && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendEmail({ to: clientEmail, subject: emailSubject, html: emailHtml, text: whatsappBody });
        emailSent = true;
      } catch (e) {
        errors.push(`Email: ${e instanceof Error ? e.message : "failed"}`);
      }
    }

    res.json({
      success: true,
      portalUrl,
      whatsappSent,
      emailSent,
      notified: whatsappSent || emailSent,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error("[Portal Notify] Error:", error);
    res.status(500).json({ success: false, error: "Failed to send notification" });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    whatsapp: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    email: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    emailPolling: !!(process.env.IMAP_USER && process.env.IMAP_PASS),
  });
});

// ─── Server startup ───────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Start IMAP email polling if credentials are configured
    if (process.env.IMAP_USER && process.env.IMAP_PASS) {
      startEmailPolling(async (email: ParsedIncomingEmail) => {
        const msgId = await saveMessage({
          channel: "email",
          direction: "inbound",
          sender: email.sender,
          subject: email.subject,
          body: email.body,
          snippet: email.body.slice(0, 120),
          hasAttachment: email.hasAttachment,
          attachments: email.attachments,
          externalId: email.messageId,
          timestamp: email.timestamp,
          processed: false,
        });

        // Enrich with Gemini
        enrichWithGemini(email.body, "email", email.sender)
          .then((enriched) =>
            updateMessage(msgId, {
              clientName: enriched.clientName,
              category: enriched.category,
              actionRequired: enriched.actionRequired,
              snippet: enriched.snippet || email.body.slice(0, 120),
              processed: true,
            })
          )
          .catch((err) => console.error("[Email] Gemini enrichment failed:", err));
      });
    } else {
      console.log("[Email Poller] Skipped — IMAP_USER / IMAP_PASS not set");
    }
  });
}

startServer();
