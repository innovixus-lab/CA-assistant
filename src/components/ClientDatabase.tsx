import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  FileText,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  Loader2,
  Lock,
  IndianRupee,
  ExternalLink,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribeClients,
  addClient,
  updateClient,
  deleteClient,
  type Client,
} from '../lib/firestore';

// ─── Portal link copy helper ──────────────────────────────────────────────────

function PortalLinkCopy({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/portal/${clientId}`;
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
      <span className="text-xs text-zinc-500 font-mono flex-1 truncate">{url}</span>
      <button onClick={copy} className="text-zinc-500 hover:text-indigo-400 transition-colors shrink-0">
        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors shrink-0">
        <ExternalLink size={14} />
      </a>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

const EMPTY: Omit<Client, 'id' | 'createdAt'> = {
  name: '',
  email: '',
  phone: '',
  pan: '',
  gst: '',
  status: 'Active',
  portalPin: '',
  pendingPayment: false,
  paymentAmount: 0,
  paymentNote: '',
};

interface ClientModalProps {
  initial?: Client;
  onClose: () => void;
  onSaved: () => void;
}

function ClientModal({ initial, onClose, onSaved }: ClientModalProps) {
  const [form, setForm] = useState<Omit<Client, 'id' | 'createdAt'>>(
    initial
      ? {
          name: initial.name, email: initial.email, phone: initial.phone ?? '',
          pan: initial.pan, gst: initial.gst, status: initial.status,
          portalPin: initial.portalPin ?? '',
          pendingPayment: initial.pendingPayment ?? false,
          paymentAmount: initial.paymentAmount ?? 0,
          paymentNote: initial.paymentNote ?? '',
        }
      : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'portal'>('info');

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.pan.trim()) {
      setError('Name and PAN are required.');
      return;
    }
    if (form.portalPin && (form.portalPin.length < 4 || form.portalPin.length > 6)) {
      setError('Portal PIN must be 4–6 digits.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (initial?.id) {
        await updateClient(initial.id, form);
      } else {
        await addClient(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
            {initial ? 'Edit Entity' : 'New Entity'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {(['info', 'portal'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                'flex-1 h-8 rounded-md text-[11px] font-bold uppercase tracking-widest transition-colors',
                activeTab === t ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {t === 'info' ? 'Client Info' : 'Portal & Payment'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {activeTab === 'info' && (
            <>
              {[
                { label: 'Company / Client Name *', key: 'name', placeholder: 'Acme Corp' },
                { label: 'Email', key: 'email', placeholder: 'contact@acme.com' },
                { label: 'Phone (for WhatsApp)', key: 'phone', placeholder: '+91 98765 43210' },
                { label: 'PAN *', key: 'pan', placeholder: 'AAAAA1111A' },
                { label: 'GSTIN', key: 'gst', placeholder: '27AAAAA1111A1Z5' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{label}</label>
                  <input
                    value={(form as unknown as Record<string, string>)[key] ?? ''}
                    onChange={e => set(key as keyof typeof form, e.target.value)}
                    placeholder={placeholder}
                    className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Status</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'portal' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                  Portal PIN (4–6 digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.portalPin ?? ''}
                  onChange={e => set('portalPin', e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors font-mono tracking-widest"
                />
                <p className="text-[10px] text-zinc-600">Client uses this PIN to log into their portal.</p>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-300">Payment Required</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Lock documents until payment is cleared</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('pendingPayment', !form.pendingPayment)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      form.pendingPayment ? 'bg-amber-500' : 'bg-zinc-700'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                      form.pendingPayment ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>

                {form.pendingPayment && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Amount Due (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.paymentAmount ?? 0}
                        onChange={e => set('paymentAmount', parseFloat(e.target.value) || 0)}
                        placeholder="5000"
                        className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Payment Note</label>
                      <input
                        value={form.paymentNote ?? ''}
                        onChange={e => set('paymentNote', e.target.value)}
                        placeholder="GST Filing Fee - May 2026"
                        className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>

              {initial?.id && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Portal Link</p>
                  <PortalLinkCopy clientId={initial.id} />
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Delete Entity</h3>
        <p className="text-sm text-zinc-400">
          Remove <span className="text-white font-semibold">{name}</span> from the registry? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClientDatabase() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Client | undefined>();

  useEffect(() => {
    const unsub = subscribeClients(data => {
      setClients(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.pan.toLowerCase().includes(q) ||
      c.gst.toLowerCase().includes(q)
    );
  });

  const activeCount = clients.filter(c => c.status === 'Active').length;
  const healthRate = clients.length ? Math.round((activeCount / clients.length) * 100) : 0;

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteClient(deleteTarget.id);
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Client Registry</h2>
          <p className="text-sm text-zinc-400">Master database for all associated legal entities and tax residents.</p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus size={16} /> New Entity
        </button>
      </div>

      <div className="flex gap-4 glass p-2 rounded-2xl items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH REGISTRY BY NAME, PAN, OR GSTIN..."
            className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-xs font-mono uppercase tracking-tight text-zinc-300"
          />
        </div>
        <div className="flex items-center gap-6 px-4 border-l border-zinc-800">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest leading-none mb-1">Total Registry</span>
            <span className="text-lg font-bold text-white leading-none">{clients.length}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest leading-none mb-1">Health Rate</span>
            <span className="text-lg font-bold text-green-400 leading-none">{healthRate}%</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-zinc-600">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-indigo-500/50" />
          Loading registry…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-600 text-sm">
          {search ? 'No clients match your search.' : 'No clients yet. Add your first entity.'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(client => (
          <div
            key={client.id}
            className="glass p-6 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group flex flex-col gap-6 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-indigo-400">
                  <Users size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-zinc-100 italic serif tracking-tight group-hover:text-indigo-400 transition-colors">
                    {client.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{client.email}</p>
                  {client.phone && <p className="text-xs text-zinc-600">{client.phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border',
                    client.status === 'Active'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  )}
                >
                  {client.status}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">PAN ID</span>
                <span className="text-xs font-mono text-zinc-300">{client.pan || '—'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">GSTIN</span>
                <span className="text-xs font-mono text-zinc-300">{client.gst || '—'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={`/portal/${client.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:text-indigo-300 transition-colors"
                >
                  <FileText size={12} /> Open Client Portal
                </a>
                {/* Portal badges */}
                {client.portalPin ? (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    <Lock size={9} /> Portal Active
                  </span>
                ) : (
                  <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-zinc-800 text-zinc-600 border-zinc-700">
                    No PIN
                  </span>
                )}
                {client.pendingPayment && (
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                    <IndianRupee size={9} /> ₹{(client.paymentAmount || 0).toLocaleString('en-IN')} Due
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); setEditTarget(client); setShowModal(true); }}
                  className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(client); }}
                  className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <div className="h-8 w-8 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-indigo-400 group-hover:bg-indigo-400 group-hover:text-white transition-all ml-1">
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ClientModal
          initial={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
          onSaved={() => {}}
        />
      )}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      )}
    </div>
  );
}
