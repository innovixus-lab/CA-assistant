/**
 * CommSettings — CA-facing panel to configure inbound/outbound
 * WhatsApp (Twilio) and Email (SMTP + IMAP) without touching .env files.
 *
 * All API calls go through src/lib/api.ts which handles the server-offline
 * case gracefully so the UI never shows a raw 404.
 */

import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Mail, Save, RefreshCw, CheckCircle2,
  AlertTriangle, Eye, EyeOff, Settings2, Wifi, WifiOff,
  Phone, AtSign, Server, Clock, Send, Info, ServerOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getCommSettings, saveCommSettings, sendWhatsAppTest,
  sendEmailTest, getHealth, STATIC_HOST, type CommConfig,
} from '../lib/api';

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text',
  icon: Icon, hint, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; icon?: React.ElementType;
  hint?: string; readOnly?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-1.5">
        {Icon && <Icon size={10} />}{label}
      </label>
      <div className="relative">
        <input
          type={isPw && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            'w-full h-10 px-3 bg-[var(--bg-elevated)] border rounded-lg text-sm',
            'text-[var(--text-primary)] outline-none transition-colors',
            'placeholder:text-[var(--text-faint)]',
            readOnly
              ? 'border-[var(--border-subtle)] opacity-60 cursor-not-allowed'
              : 'border-[var(--border-default)] focus:border-indigo-500',
            isPw ? 'pr-10' : '',
          )}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
      ok ? 'bg-green-500/10 text-green-400 border-green-500/20'
         : 'bg-zinc-800 text-zinc-600 border-zinc-700',
    )}>
      {ok ? <Wifi size={9} /> : <WifiOff size={9} />}{label}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, status }: {
  icon: React.ElementType; title: string; status?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Icon size={15} className="text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] serif italic">{title}</h3>
      </div>
      {status}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-3.5">
      <Info size={13} className="text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function TestBanner({ result }: { result: { ok: boolean; msg: string } | null }) {
  if (!result) return null;
  return (
    <div className={cn(
      'flex items-center gap-2 text-xs rounded-lg px-3 py-2 border',
      result.ok
        ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    )}>
      {result.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {result.msg}
    </div>
  );
}

// ─── Offline banner ───────────────────────────────────────────────────────────

function OfflineBanner() {
  const isVercel = STATIC_HOST;
  return (
    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
      <ServerOff size={16} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-amber-300">
          {isVercel ? 'Backend not available on this deployment' : 'Express server not running'}
        </p>
        <p className="text-xs text-amber-400/80">
          {isVercel
            ? <>
                This app is deployed as a static site on Vercel — the Express backend
                (needed for WhatsApp, Email, and IMAP) is not running here.
                Clone the repo and run{' '}
                <code className="bg-amber-500/10 px-1 rounded font-mono">npm run dev</code>{' '}
                locally to use these features.
              </>
            : <>
                API routes require the backend server.
                Run <code className="bg-amber-500/10 px-1 rounded font-mono">npm run dev</code>{' '}
                in your terminal. Settings shown below are defaults.
              </>
          }
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const DEFAULTS: CommConfig = {
  twilioWhatsappFrom: '', caWhatsappNumber: '',
  smtpHost: 'smtp.gmail.com', smtpPort: '587', smtpUser: '', smtpPass: '',
  imapHost: 'imap.gmail.com', imapPort: '993', imapUser: '', imapPass: '',
  emailPollIntervalMs: '60000',
  whatsappConfigured: false, emailConfigured: false, imapConfigured: false,
  serverOnline: false,
};

export default function CommSettings() {
  const [cfg, setCfg]         = useState<CommConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const [waTest,   setWaTest]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [mailTest, setMailTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [imapTest, setImapTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testingWa,   setTestingWa]   = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [testingImap, setTestingImap] = useState(false);

  // Load on mount
  useEffect(() => {
    getCommSettings().then(data => { setCfg(data); setLoading(false); });
  }, []);

  const set = (k: keyof CommConfig, v: string) => setCfg(p => ({ ...p, [k]: v }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cfg.serverOnline) { setSaveErr('Server is offline — start it with npm run dev'); return; }
    setSaving(true); setSaveErr(''); setSaved(false);
    const res = await saveCommSettings(cfg);
    if (res.offline) {
      setSaveErr('Server went offline. Run npm run dev and try again.');
    } else if (res.success) {
      setSaved(true);
      // Refresh flags from server
      const fresh = await getCommSettings();
      setCfg(fresh);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveErr((res as { error?: string }).error ?? 'Save failed');
    }
    setSaving(false);
  };

  // ── Test WhatsApp ─────────────────────────────────────────────────────────
  const testWhatsApp = async () => {
    setTestingWa(true); setWaTest(null);
    const r = await sendWhatsAppTest(cfg.caWhatsappNumber);
    setWaTest(
      r.offline  ? { ok: false, msg: 'Server offline — run npm run dev' } :
      r.success  ? { ok: true,  msg: `Sent! SID: ${r.sid}` } :
                   { ok: false, msg: r.error ?? 'Failed' }
    );
    setTestingWa(false);
  };

  // ── Test SMTP ─────────────────────────────────────────────────────────────
  const testEmail = async () => {
    setTestingMail(true); setMailTest(null);
    const r = await sendEmailTest(cfg.smtpUser);
    const notConfigured = !cfg.smtpUser || r.error?.includes('not configured');
    setMailTest(
      r.offline       ? { ok: false, msg: 'Server offline — run npm run dev' } :
      notConfigured   ? { ok: false, msg: 'SMTP not configured — fill in credentials above and click Save first' } :
      r.success       ? { ok: true,  msg: `Sent to ${cfg.smtpUser}` } :
                        { ok: false, msg: r.error ?? 'Failed' }
    );
    setTestingMail(false);
  };
  const checkImap = async () => {
    setTestingImap(true); setImapTest(null);
    const h = await getHealth();
    setImapTest(
      !h.serverOnline ? { ok: false, msg: 'Server offline — run npm run dev' } :
      h.emailPolling  ? { ok: true,  msg: 'IMAP polling is active.' } :
                        { ok: false, msg: 'IMAP not active — check credentials and save.' }
    );
    setTestingImap(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
        <RefreshCw size={20} className="animate-spin mr-3 text-indigo-500/50" />
        Loading settings…
      </div>
    );
  }

  const pollSecs = Math.round(Number(cfg.emailPollIntervalMs) / 1000);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-bold tracking-tight text-[var(--text-primary)] serif italic">
          Comm Settings
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure inbound &amp; outbound channels. Changes apply instantly — no redeploy needed.
        </p>
      </div>

      {/* Server offline warning */}
      {!cfg.serverOnline && <OfflineBanner />}

      {/* Status badges */}
      {cfg.serverOnline && (
        <div className="flex items-center gap-2">
          <StatusBadge ok={!!cfg.whatsappConfigured} label="WhatsApp" />
          <StatusBadge ok={!!cfg.emailConfigured}    label="SMTP" />
          <StatusBadge ok={!!cfg.imapConfigured}     label="IMAP" />
        </div>
      )}

      {/* How inbound works */}
      <InfoBox>
        <p className="font-semibold text-[var(--text-secondary)]">How inbound messages are captured</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong className="text-green-400">WhatsApp</strong> — Twilio forwards every inbound message to{' '}
            <code className="bg-zinc-800 px-1 rounded text-[10px]">/api/webhooks/whatsapp</code>.
            Point your Twilio Sandbox / number webhook to{' '}
            <code className="bg-zinc-800 px-1 rounded text-[10px]">{'{APP_URL}'}/api/webhooks/whatsapp</code>.
          </li>
          <li>
            <strong className="text-blue-400">Email</strong> — The server polls your IMAP inbox every{' '}
            <strong className="text-[var(--text-secondary)]">{pollSecs}s</strong> and imports unseen
            messages into the Inbox. All past unseen emails are fetched on first run.
          </li>
          <li>
            <strong className="text-amber-400">Past conversations</strong> — Mark old emails as unread
            in Gmail/Outlook → they are picked up on the next poll cycle.
          </li>
        </ul>
      </InfoBox>

      {/* ── WhatsApp ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 border border-[var(--border-default)] flex flex-col gap-5">
        <SectionHeader
          icon={MessageSquare}
          title="WhatsApp via Twilio"
          status={<StatusBadge ok={!!cfg.whatsappConfigured} label={cfg.whatsappConfigured ? 'Connected' : 'Not configured'} />}
        />

        <InfoBox>
          <p>
            <code className="bg-zinc-800 px-1 rounded text-[10px]">TWILIO_ACCOUNT_SID</code> and{' '}
            <code className="bg-zinc-800 px-1 rounded text-[10px]">TWILIO_AUTH_TOKEN</code> must stay
            in <code className="bg-zinc-800 px-1 rounded text-[10px]">.env</code> for security. The
            fields below control which numbers are used at runtime.
          </p>
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Outbound number (FROM)"
            icon={Phone}
            value={cfg.twilioWhatsappFrom}
            onChange={v => set('twilioWhatsappFrom', v)}
            placeholder="whatsapp:+14155238886"
            hint="Include the whatsapp: prefix"
            readOnly={!cfg.serverOnline}
          />
          <Field
            label="CA inbound number (notify me)"
            icon={Phone}
            value={cfg.caWhatsappNumber}
            onChange={v => set('caWhatsappNumber', v)}
            placeholder="+919876543210"
            hint="Receive payment & approval alerts here"
            readOnly={!cfg.serverOnline}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={testWhatsApp}
            disabled={testingWa || !cfg.caWhatsappNumber || !cfg.serverOnline}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-green-600/10 border border-green-500/20 text-green-400 text-[11px] font-bold uppercase tracking-widest hover:bg-green-600/20 transition-colors disabled:opacity-40"
          >
            {testingWa ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            Send Test Message
          </button>
          <TestBanner result={waTest} />
        </div>
      </div>

      {/* ── SMTP ──────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 border border-[var(--border-default)] flex flex-col gap-5">
        <SectionHeader
          icon={Mail}
          title="Outbound Email (SMTP)"
          status={<StatusBadge ok={!!cfg.emailConfigured} label={cfg.emailConfigured ? 'Connected' : 'Not configured'} />}
        />

        <InfoBox>
          <p>
            For Gmail, create an{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
              className="text-indigo-400 underline underline-offset-2">App Password</a>{' '}
            (requires 2FA). Use <code className="bg-zinc-800 px-1 rounded text-[10px]">smtp.gmail.com:587</code>.
            Approval notifications and portal links are sent from this address.
          </p>
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SMTP host"     icon={Server}   value={cfg.smtpHost} onChange={v => set('smtpHost', v)} placeholder="smtp.gmail.com" readOnly={!cfg.serverOnline} />
          <Field label="SMTP port"     icon={Server}   value={cfg.smtpPort} onChange={v => set('smtpPort', v)} placeholder="587"            readOnly={!cfg.serverOnline} />
          <Field label="SMTP email"    icon={AtSign}   value={cfg.smtpUser} onChange={v => set('smtpUser', v)} placeholder="you@gmail.com"  readOnly={!cfg.serverOnline} />
          <Field label="SMTP password" icon={Settings2} type="password"
            value={cfg.smtpPass} onChange={v => set('smtpPass', v)}
            placeholder="Enter new password to change"
            hint="Leave as ●●●●●●●● to keep existing"
            readOnly={!cfg.serverOnline}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={testEmail}
            disabled={testingMail || !cfg.smtpUser || !cfg.serverOnline}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase tracking-widest hover:bg-blue-600/20 transition-colors disabled:opacity-40"
          >
            {testingMail ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            Send Test Email
          </button>
          <TestBanner result={mailTest} />
        </div>
      </div>

      {/* ── IMAP ──────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 border border-[var(--border-default)] flex flex-col gap-5">
        <SectionHeader
          icon={Mail}
          title="Inbound Email (IMAP polling)"
          status={<StatusBadge ok={!!cfg.imapConfigured} label={cfg.imapConfigured ? 'Polling' : 'Not configured'} />}
        />

        <InfoBox>
          <p>
            Polls this mailbox every <strong className="text-[var(--text-secondary)]">{pollSecs}s</strong>.
            All unseen emails are imported into the Inbox and enriched by Gemini AI.
          </p>
          <p>
            <strong className="text-amber-400">To pull past conversations:</strong> mark old emails as
            unread in Gmail/Outlook — they are picked up on the next poll cycle.
          </p>
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="IMAP host"     icon={Server}   value={cfg.imapHost} onChange={v => set('imapHost', v)} placeholder="imap.gmail.com" readOnly={!cfg.serverOnline} />
          <Field label="IMAP port"     icon={Server}   value={cfg.imapPort} onChange={v => set('imapPort', v)} placeholder="993"             readOnly={!cfg.serverOnline} />
          <Field label="IMAP email"    icon={AtSign}   value={cfg.imapUser} onChange={v => set('imapUser', v)} placeholder="you@gmail.com"   readOnly={!cfg.serverOnline} />
          <Field label="IMAP password" icon={Settings2} type="password"
            value={cfg.imapPass} onChange={v => set('imapPass', v)}
            placeholder="Enter new password to change"
            hint="Leave as ●●●●●●●● to keep existing"
            readOnly={!cfg.serverOnline}
          />

          {/* Poll interval slider */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Clock size={10} /> Poll interval
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={15000} max={300000} step={5000}
                value={Number(cfg.emailPollIntervalMs)}
                onChange={e => set('emailPollIntervalMs', e.target.value)}
                disabled={!cfg.serverOnline}
                className="flex-1 accent-indigo-500 disabled:opacity-40"
              />
              <span className="text-sm font-mono text-[var(--text-secondary)] w-16 text-right">
                {pollSecs}s
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={checkImap}
            disabled={testingImap}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-widest hover:bg-indigo-600/20 transition-colors disabled:opacity-40"
          >
            {testingImap ? <RefreshCw size={12} className="animate-spin" /> : <Wifi size={12} />}
            Check Status
          </button>
          <TestBanner result={imapTest} />
        </div>
      </div>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 border border-[var(--border-default)] flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--text-muted)]">
          {cfg.serverOnline
            ? 'Changes are applied to the running server immediately.'
            : 'Start the server with npm run dev to save changes.'}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {saveErr && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle size={12} /> {saveErr}
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 size={12} /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !cfg.serverOnline}
            className="h-10 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
