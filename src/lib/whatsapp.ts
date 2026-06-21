/**
 * WhatsApp integration via Twilio WhatsApp API.
 *
 * Incoming messages arrive via webhook POST /api/webhooks/whatsapp
 * Outgoing messages are sent via the Twilio REST API.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   e.g. "whatsapp:+14155238886"
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
    }
    client = twilio(accountSid, authToken);
  }
  return client;
}

export interface WhatsAppMessage {
  to: string;   // E.164 phone number, e.g. "+919876543210"
  body: string;
}

/**
 * Send a WhatsApp message via Twilio.
 */
export async function sendWhatsApp({ to, body }: WhatsAppMessage) {
  const c = getClient();
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const message = await c.messages.create({
    from: fromNumber,
    to: toFormatted,
    body,
  });
  return { sid: message.sid, status: message.status };
}

/**
 * Validate that an incoming webhook request is genuinely from Twilio.
 * Call this in the webhook handler before processing.
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Parse a Twilio WhatsApp webhook payload into a normalised message object.
 */
export function parseTwilioWebhook(body: Record<string, string>) {
  const from = (body.From || '').replace('whatsapp:', '');
  const to = (body.To || '').replace('whatsapp:', '');
  const text = body.Body || '';
  const numMedia = parseInt(body.NumMedia || '0', 10);

  const attachments: Array<{ url: string; contentType: string }> = [];
  for (let i = 0; i < numMedia; i++) {
    attachments.push({
      url: body[`MediaUrl${i}`],
      contentType: body[`MediaContentType${i}`],
    });
  }

  return {
    channel: 'whatsapp' as const,
    sender: from,
    recipient: to,
    body: text,
    hasAttachment: numMedia > 0,
    attachments,
    twilioSid: body.MessageSid,
    timestamp: new Date(),
  };
}


