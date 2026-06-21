import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageSquare,
  Mail,
  FileIcon,
  RefreshCw,
  CheckCircle2,
  Send,
  X,
  Plus,
  History,
  Loader2,
  ServerOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribeMessages,
  addMessage,
  updateMessage,
  type Message,
} from '../lib/firestore';
import { getInboxHistory } from '../lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: Message['timestamp']): string {
  let date: Date;
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    date = new Date((ts as { seconds: number }).seconds * 1000);
  } else {
    date = new Date(ts as string | Date);
  }
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Conversation history drawer ─────────────────────────────────────────────

interface HistoryDrawerProps {
  message: Message;
  onClose: () => void;
}

function HistoryDrawer({ message, onClose }: HistoryDrawerProps) {
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const params: { phone?: string; email?: string; clientName?: string } = {};
    if (message.channel === 'whatsapp' && message.sender) params.phone      = message.sender;
    if (message.channel === 'email'    && message.sender) params.email      = message.sender;
    if (message.clientName)                               params.clientName = message.clientName;

    getInboxHistory(params).then(({ messages, serverOnline }) => {
      if (!serverOnline) {
        setError('offline');
      } else {
        setHistory(messages as unknown as Message[]);
      }
      setLoading(false);
    });
  }, [message]);

  const formatTs = (ts: Message['timestamp']) => {
    let d: Date;
    if (ts && typeof ts === 'object' && 'seconds' in ts) d = new Date((ts as { seconds: number }).seconds * 1000);
    else d = new Date(ts as string | Date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] serif italic">Conversation History</h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {message.clientName || message.sender} · {message.channel}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
              <Loader2 size={20} className="animate-spin mr-2 text-indigo-500/50" /> Loading…
            </div>
          )}
          {error && error !== 'offline' && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
          )}
          {error === 'offline' && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <ServerOff size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold text-amber-300">Server not running</p>
                <p className="text-[11px] text-amber-400/80">
                  Conversation history requires the Express backend.
                  Run <code className="bg-amber-500/10 px-1 rounded font-mono">npm run dev</code> to enable it.
                </p>
              </div>
            </div>
          )}
          {!loading && !error && history.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)] text-sm">
              No past messages found for this contact.
              <p className="text-[10px] mt-2 text-[var(--text-faint)]">
                WhatsApp messages arrive via Twilio webhook.<br />
                Emails are pulled from IMAP on each poll cycle.
              </p>
            </div>
          )}
          {history.map((m, i) => (
            <div
              key={m.id ?? i}
              className={cn(
                'flex flex-col gap-1.5 rounded-xl px-4 py-3 text-sm border max-w-[88%]',
                m.direction === 'outbound'
                  ? 'self-end bg-indigo-500/10 border-indigo-500/20'
                  : 'self-start bg-[var(--bg-elevated)] border-[var(--border-subtle)]'
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border',
                  m.channel === 'whatsapp' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                )}>
                  {m.channel === 'whatsapp' ? '📱 WA' : '✉️ Email'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{m.direction === 'outbound' ? 'Sent' : 'Received'}</span>
                {m.subject && (
                  <span className="text-[10px] text-[var(--text-muted)] italic truncate max-w-[140px]">{m.subject}</span>
                )}
              </div>
              <p className="text-[var(--text-primary)] text-xs leading-relaxed whitespace-pre-line">{m.body || m.snippet}</p>
              {m.hasAttachment && (
                <span className="text-[10px] text-indigo-400 flex items-center gap-1"><FileIcon size={10} /> Attachment</span>
              )}
              <span className="text-[10px] text-[var(--text-faint)] self-end">{formatTs(m.timestamp)}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] text-[10px] text-[var(--text-faint)]">
          {history.length > 0
            ? `${history.length} message${history.length !== 1 ? 's' : ''} · `
            : ''}
          WA messages via Twilio webhook · Emails via IMAP polling
        </div>
      </div>
    </div>
  );
}

// ─── Compose / Reply modal ────────────────────────────────────────────────────

interface ComposeModalProps {
  replyTo?: Message;
  onClose: () => void;
}

function ComposeModal({ replyTo, onClose }: ComposeModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(replyTo?.channel ?? 'whatsapp');
  const [to, setTo]           = useState(replyTo?.sender ?? '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody]       = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSend = async () => {
    if (!body.trim() || !to.trim()) return;
    setSending(true);
    setError('');
    try {
      await addMessage({
        channel,
        direction: 'outbound',
        sender: 'CA Firm',
        recipient: to,
        subject: channel === 'email' ? subject : undefined,
        body,
        snippet: body.slice(0, 120),
        hasAttachment: false,
        processed: true,
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
      });
      setSent(true);
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg glass rounded-2xl p-6 flex flex-col gap-4 border border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
            {replyTo ? `Reply via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}` : 'New Message'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Channel toggle (only for new messages) */}
        {!replyTo && (
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            {(['whatsapp', 'email'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={cn(
                  'flex-1 h-8 rounded-md text-[11px] font-bold uppercase tracking-widest transition-colors',
                  channel === ch ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {ch === 'whatsapp' ? '💬 WhatsApp' : '✉️ Email'}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">To</label>
          <input
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder={channel === 'whatsapp' ? '+91 98765 43210' : 'client@example.com'}
            className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500"
          />
        </div>

        {channel === 'email' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type your message..."
          rows={5}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 resize-none"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSend}
          disabled={sending || sent || !body.trim() || !to.trim()}
          className={cn(
            'h-10 px-6 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
            sent
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40'
          )}
        >
          {sent ? (
            <><CheckCircle2 size={14} /> Sent (saved locally)</>
          ) : sending ? (
            <><RefreshCw size={14} className="animate-spin" /> Sending…</>
          ) : (
            <><Send size={14} /> Send</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const CATEGORIES = ['TAX', 'GST', 'AUDIT', 'DOCUMENT_UPLOAD', 'GENERAL_QUERY'];

export default function InboxPanel() {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loading, setLoading]             = useState(true);
  const [processing, setProcessing]       = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [replyTarget, setReplyTarget]     = useState<Message | null>(null);
  const [showCompose, setShowCompose]     = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Message | null>(null);

  useEffect(() => {
    const unsub = subscribeMessages(msgs => {
      setMessages(msgs);
      setLoading(false);
    }, 100);
    return () => unsub();
  }, []);

  // "Analyze" — in local mode we pick a random category instead of calling Gemini
  const handleProcess = async (msg: Message) => {
    if (!msg.id) return;
    setProcessing(msg.id);
    // Simulate a short processing delay
    await new Promise(r => setTimeout(r, 800));
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    await updateMessage(msg.id, {
      category,
      actionRequired: Math.random() > 0.5,
      processed: true,
    });
    setProcessing(null);
  };

  const filtered = messages.filter(m => {
    const matchesChannel = channelFilter === 'all' || m.channel === channelFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      m.sender.toLowerCase().includes(q) ||
      m.snippet.toLowerCase().includes(q) ||
      (m.clientName || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q);
    return matchesChannel && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">
            Incoming Stream
          </h2>
          <p className="text-sm text-zinc-400">
            Real-time sync active for WhatsApp &amp; Email intelligence channels.
            <span className="ml-2 text-[10px] text-amber-400 font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
              Local Mode
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-[11px] uppercase font-bold tracking-widest transition-colors"
        >
          <Plus size={14} /> New Message
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-4 glass p-2 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="FILTER BY SENDER, CHANNEL OR PAYLOAD..."
            className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-xs font-mono uppercase tracking-tight text-zinc-300"
          />
        </div>
        <div className="flex gap-2 items-center pr-2">
          {(['all', 'whatsapp', 'email'] as const).map(ch => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                'h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors',
                channelFilter === ch
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-indigo-500/50'
              )}
            >
              {ch === 'all' ? 'All' : ch === 'whatsapp' ? '💬 WA' : '✉️ Email'}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Recent Detections
          </h3>
          <span className="text-[10px] text-zinc-600 italic">
            {filtered.length} message{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500/50" />
            Loading messages…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            No messages found.
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'p-5 glass rounded-2xl flex items-center justify-between border-l-4 transition-all hover:bg-white/5 cursor-pointer group',
                msg.channel === 'whatsapp' ? 'border-l-green-500' : 'border-l-blue-500',
                msg.actionRequired && 'shadow-[0_0_20px_rgba(99,102,241,0.1)]'
              )}
            >
              <div className="flex items-center space-x-5">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border',
                  msg.channel === 'whatsapp'
                    ? 'bg-green-950/30 border-green-500/20 text-green-400'
                    : 'bg-blue-950/30 border-blue-500/20 text-blue-400'
                )}>
                  {msg.channel === 'whatsapp' ? <MessageSquare size={20} /> : <Mail size={20} />}
                </div>

                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2 italic serif">
                    {msg.clientName || msg.sender}
                    {msg.actionRequired && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                    )}
                  </p>
                  {msg.subject && (
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{msg.subject}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-0.5 max-w-md line-clamp-1">{msg.snippet}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {msg.category && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-indigo-400 border border-indigo-500/20">
                        {msg.category}
                      </span>
                    )}
                    {msg.hasAttachment && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        <FileIcon size={11} /> attachment
                      </div>
                    )}
                    <span className={cn(
                      'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
                      msg.direction === 'outbound'
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        : 'bg-transparent text-zinc-700 border-transparent'
                    )}>
                      {msg.direction === 'outbound' ? 'Sent' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="text-right flex flex-col items-end gap-3 shrink-0 ml-4">
                <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">
                  {formatTime(msg.timestamp)} IST
                </p>
                <div className="flex items-center gap-3">
                  {msg.direction === 'inbound' && (
                    <button
                      onClick={e => { e.stopPropagation(); setReplyTarget(msg); }}
                      className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <Send size={12} /> Reply
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setHistoryTarget(msg); }}
                    className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest hover:text-indigo-400 flex items-center gap-1 transition-colors"
                  >
                    <History size={12} /> History
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleProcess(msg); }}
                    disabled={processing === msg.id || msg.processed}
                    className={cn(
                      'text-indigo-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors',
                      processing === msg.id ? 'animate-pulse opacity-50' : 'hover:text-white group-hover:text-white',
                      msg.processed && 'text-green-400 cursor-default'
                    )}
                  >
                    {processing === msg.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {processing === msg.id ? 'Analyzing' : msg.processed ? 'Analyzed' : 'Analyze'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(replyTarget || showCompose) && (
        <ComposeModal
          replyTo={replyTarget ?? undefined}
          onClose={() => { setReplyTarget(null); setShowCompose(false); }}
        />
      )}

      {historyTarget && (
        <HistoryDrawer
          message={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}