/**
 * Email integration — send via Nodemailer (SMTP) + receive via IMAP polling.
 *
 * Required env vars:
 *   SMTP_HOST          e.g. "smtp.gmail.com"
 *   SMTP_PORT          e.g. "587"
 *   SMTP_USER          your email address
 *   SMTP_PASS          app password / OAuth token
 *   IMAP_HOST          e.g. "imap.gmail.com"
 *   IMAP_PORT          e.g. "993"
 *   IMAP_USER          your email address
 *   IMAP_PASS          app password / OAuth token
 *   EMAIL_POLL_INTERVAL_MS  (optional, default 60000)
 */

import nodemailer from 'nodemailer';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';

// ─── SMTP / Send ────────────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId, accepted: info.accepted };
}

// ─── IMAP / Receive ──────────────────────────────────────────────────────────

export interface ParsedIncomingEmail {
  channel: 'email';
  sender: string;
  subject: string;
  body: string;
  hasAttachment: boolean;
  attachments: Array<{ filename: string; contentType: string; size: number }>;
  messageId: string;
  timestamp: Date;
}

/**
 * Fetch unseen emails from the INBOX via IMAP.
 * Returns an array of parsed email objects.
 */
export function fetchUnseenEmails(): Promise<ParsedIncomingEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASS || '',
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 10000,
      authTimeout: 5000,
    });

    const results: ParsedIncomingEmail[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, _box) => {
        if (err) { imap.end(); return reject(err); }

        imap.search(['UNSEEN'], (searchErr, uids) => {
          if (searchErr) { imap.end(); return reject(searchErr); }
          if (!uids || uids.length === 0) { imap.end(); return resolve([]); }

          const fetch = imap.fetch(uids, { bodies: '', markSeen: true });
          const parsePromises: Promise<void>[] = [];

          fetch.on('message', (msg) => {
            const p = new Promise<void>((res) => {
              const chunks: Buffer[] = [];
              msg.on('body', (stream) => {
                stream.on('data', (chunk: Buffer) => chunks.push(chunk));
                stream.once('end', async () => {
                  try {
                    const raw = Buffer.concat(chunks);
                    const parsed: ParsedMail = await simpleParser(raw);
                    results.push(normaliseParsedMail(parsed));
                  } catch {
                    // skip malformed messages
                  }
                  res();
                });
              });
            });
            parsePromises.push(p);
          });

          fetch.once('error', (fetchErr) => {
            imap.end();
            reject(fetchErr);
          });

          fetch.once('end', async () => {
            await Promise.all(parsePromises);
            imap.end();
          });
        });
      });
    });

    imap.once('end', () => resolve(results));
    imap.once('error', (err: Error) => reject(err));
    imap.connect();
  });
}

function normaliseParsedMail(parsed: ParsedMail): ParsedIncomingEmail {
  const fromAddr = parsed.from?.value?.[0];
  const sender = fromAddr
    ? `${fromAddr.name ? fromAddr.name + ' <' : ''}${fromAddr.address}${fromAddr.name ? '>' : ''}`
    : 'unknown';

  const bodyText =
    parsed.text ||
    (parsed.html ? parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');

  const attachments = (parsed.attachments || []).map((a) => ({
    filename: a.filename || 'attachment',
    contentType: a.contentType,
    size: a.size,
  }));

  return {
    channel: 'email',
    sender,
    subject: parsed.subject || '(no subject)',
    body: bodyText.slice(0, 2000), // cap at 2 KB for Firestore
    hasAttachment: attachments.length > 0,
    attachments,
    messageId: parsed.messageId || `${Date.now()}`,
    timestamp: parsed.date || new Date(),
  };
}

// ─── Polling loop ────────────────────────────────────────────────────────────

type EmailHandler = (email: ParsedIncomingEmail) => Promise<void>;
let pollingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start polling IMAP for new emails on a fixed interval.
 * The handler is called for each new email found.
 */
export function startEmailPolling(handler: EmailHandler) {
  if (pollingTimer) return; // already running

  const interval = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '60000', 10);

  const poll = async () => {
    if (!process.env.IMAP_USER || !process.env.IMAP_PASS) return; // not configured
    try {
      const emails = await fetchUnseenEmails();
      for (const email of emails) {
        await handler(email);
      }
    } catch (err) {
      console.error('[Email Poller] Error:', err);
    }
  };

  // Run immediately, then on interval
  poll();
  pollingTimer = setInterval(poll, interval);
  console.log(`[Email Poller] Started — polling every ${interval / 1000}s`);
}

export function stopEmailPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}
