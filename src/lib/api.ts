/**
 * Thin API client with graceful fallbacks for static/Vercel deployments.
 *
 * The Express backend only exists when running `npm run dev` locally.
 * On Vercel (or any static host) all /api/* calls would 404.
 *
 * Strategy:
 *  - Detect static hosting immediately by checking the hostname.
 *  - If static → skip ALL network calls, return offline stubs instantly.
 *  - If local  → probe /api/health once (cached 10 s), then proceed normally.
 */

// ─── Static-host detection ────────────────────────────────────────────────────

/**
 * Returns true when the app is deployed on a static host (Vercel, Netlify,
 * GitHub Pages, etc.) where the Express server does not exist.
 *
 * We detect this by checking:
 *   1. Known static-hosting hostnames (.vercel.app, .netlify.app, .github.io)
 *   2. Any non-localhost hostname when not in development mode
 */
function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;

  // Always local
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;

  // Known static platforms
  if (
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') // Cloudflare Pages
  ) return true;

  // Any other non-localhost host is assumed static
  // (custom domain on Vercel, etc.)
  return true;
}

// Compute once at module load — never changes during a session
const STATIC_HOST = isStaticHost();

// ─── Health probe ─────────────────────────────────────────────────────────────

interface HealthData {
  status: string;
  whatsapp: boolean;
  email: boolean;
  emailPolling: boolean;
}

const OFFLINE_HEALTH: HealthData & { serverOnline: boolean } = {
  status: 'offline',
  whatsapp: false,
  email: false,
  emailPolling: false,
  serverOnline: false,
};

let healthCache: { data: HealthData; ts: number } | null = null;
const HEALTH_TTL_MS = 10_000;

export async function getHealth(): Promise<HealthData & { serverOnline: boolean }> {
  if (STATIC_HOST) return OFFLINE_HEALTH;

  const now = Date.now();
  if (healthCache && now - healthCache.ts < HEALTH_TTL_MS) {
    return { ...healthCache.data, serverOnline: true };
  }

  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('not ok');
    const data: HealthData = await res.json();
    healthCache = { data, ts: now };
    return { ...data, serverOnline: true };
  } catch {
    return OFFLINE_HEALTH;
  }
}

// ─── Comm settings ────────────────────────────────────────────────────────────

export interface CommConfig {
  twilioWhatsappFrom: string;
  caWhatsappNumber:   string;
  smtpHost:  string;
  smtpPort:  string;
  smtpUser:  string;
  smtpPass:  string;
  imapHost:  string;
  imapPort:  string;
  imapUser:  string;
  imapPass:  string;
  emailPollIntervalMs: string;
  whatsappConfigured?: boolean;
  emailConfigured?:    boolean;
  imapConfigured?:     boolean;
  serverOnline: boolean;
}

const COMM_DEFAULTS: CommConfig = {
  twilioWhatsappFrom: '',
  caWhatsappNumber:   '',
  smtpHost: 'smtp.gmail.com', smtpPort: '587', smtpUser: '', smtpPass: '',
  imapHost: 'imap.gmail.com', imapPort: '993', imapUser: '', imapPass: '',
  emailPollIntervalMs: '60000',
  whatsappConfigured: false,
  emailConfigured:    false,
  imapConfigured:     false,
  serverOnline: false,
};

/** Load comm settings — returns defaults immediately on static hosts. */
export async function getCommSettings(): Promise<CommConfig> {
  if (STATIC_HOST) return { ...COMM_DEFAULTS, serverOnline: false };

  try {
    const res = await fetch('/api/settings/comm', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    return { ...COMM_DEFAULTS, ...data, serverOnline: true };
  } catch {
    return { ...COMM_DEFAULTS, serverOnline: false };
  }
}

/** Save comm settings — no-op on static hosts. */
export async function saveCommSettings(
  cfg: Partial<CommConfig>,
): Promise<{ success: boolean; offline?: boolean; error?: string }> {
  if (STATIC_HOST) return { success: false, offline: true };

  try {
    const res = await fetch('/api/settings/comm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
      signal: AbortSignal.timeout(5000),
    });
    return await res.json();
  } catch {
    return { success: false, offline: true };
  }
}

// ─── Inbox history ────────────────────────────────────────────────────────────

export interface HistoryMessage {
  id?: string;
  channel: 'whatsapp' | 'email';
  direction: 'inbound' | 'outbound';
  sender: string;
  recipient?: string;
  subject?: string;
  body: string;
  snippet: string;
  hasAttachment: boolean;
  clientName?: string;
  category?: string;
  timestamp: { seconds: number } | Date | string;
}

export async function getInboxHistory(params: {
  phone?: string;
  email?: string;
  clientName?: string;
}): Promise<{ messages: HistoryMessage[]; serverOnline: boolean }> {
  if (STATIC_HOST) return { messages: [], serverOnline: false };

  try {
    const qs = new URLSearchParams();
    if (params.phone)      qs.set('phone',      params.phone);
    if (params.email)      qs.set('email',       params.email);
    if (params.clientName) qs.set('clientName',  params.clientName);

    const res = await fetch(`/api/inbox/history?${qs.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('not ok');
    const data = await res.json();
    return { messages: data.messages ?? [], serverOnline: true };
  } catch {
    return { messages: [], serverOnline: false };
  }
}

// ─── Send WhatsApp test ───────────────────────────────────────────────────────

export async function sendWhatsAppTest(
  to: string,
): Promise<{ success: boolean; sid?: string; error?: string; offline?: boolean }> {
  if (STATIC_HOST) return { success: false, offline: true, error: 'Server not available on static host' };

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        body: '✅ FinnCA test message — WhatsApp is configured correctly.',
      }),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch {
    return { success: false, offline: true, error: 'Server not reachable' };
  }
}

// ─── Send email test ──────────────────────────────────────────────────────────

export async function sendEmailTest(
  to: string,
): Promise<{ success: boolean; messageId?: string; error?: string; offline?: boolean }> {
  if (STATIC_HOST) return { success: false, offline: true, error: 'Server not available on static host' };

  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: 'FinnCA — Email config test',
        text:    '✅ Your SMTP settings are working correctly.',
      }),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch {
    return { success: false, offline: true, error: 'Server not reachable' };
  }
}

// ─── Export flag so components can check without calling getHealth() ──────────
export { STATIC_HOST };
