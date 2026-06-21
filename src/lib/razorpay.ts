/**
 * Razorpay integration — server-side only.
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID      — from Razorpay dashboard (test: rzp_test_...)
 *   RAZORPAY_KEY_SECRET  — from Razorpay dashboard
 *   RAZORPAY_WEBHOOK_SECRET — set in Razorpay dashboard → Webhooks
 *
 * Test cards / UPI:
 *   UPI: success@razorpay
 *   UPI: failure@razorpay
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';

let instance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!instance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
    }
    instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
}

/** Create a Razorpay order for a payment request */
export async function createOrder(params: {
  amountInPaise: number;   // Razorpay uses paise (1 INR = 100 paise)
  receiptId: string;       // your internal payment request ID
  clientName: string;
  notes?: Record<string, string>;
}) {
  const rp = getRazorpay();
  const order = await rp.orders.create({
    amount:   params.amountInPaise,
    currency: 'INR',
    receipt:  params.receiptId.slice(0, 40), // max 40 chars
    notes:    {
      clientName: params.clientName,
      ...params.notes,
    },
  });
  return order;
}

/** Verify Razorpay payment signature (called after checkout success) */
export function verifyPaymentSignature(params: {
  orderId:   string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const body   = `${params.orderId}|${params.paymentId}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === params.signature;
}

/** Verify Razorpay webhook signature */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  if (!secret) return true; // skip in dev if not configured
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
