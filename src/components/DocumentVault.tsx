import React, { useEffect, useRef, useState } from 'react';
import {
  Files,
  Search,
  Download,
  Eye,
  Trash2,
  FileCheck,
  FileSearch,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Bell,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  subscribeDocs,
  addVaultDoc,
  updateVaultDoc,
  deleteVaultDoc,
  subscribeClients,
  type VaultDocument,
  type Client,
} from '../lib/firestore';
import { cn } from '../lib/utils';
import { STATIC_HOST } from '../lib/api';

// ─── Upload modal ─────────────────────────────────────────────────────────────

const DOC_TYPES = ['Identification', 'Taxation', 'Financial', 'Income Tax', 'Audit', 'Other'];

interface UploadModalProps {
  clients: Client[];
  onClose: () => void;
}

function UploadModal({ clients, onClose }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientId, setClientId] = useState('');
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const clientName = clients.find(c => c.id === clientId)?.name ?? '';

  const handleUpload = async () => {
    if (!file) { setError('Please select a file.'); return; }
    if (!clientId) { setError('Please select a client.'); return; }
    setUploading(true);
    setError('');

    try {
      // Read file as base64 data URL (works entirely in-browser, no server needed)
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        // Simulate upload progress
        let prog = 0;
        const interval = setInterval(() => {
          prog = Math.min(prog + 20, 90);
          setProgress(prog);
        }, 80);
        reader.onload = () => {
          clearInterval(interval);
          setProgress(100);
          resolve(reader.result as string);
        };
        reader.onerror = () => { clearInterval(interval); reject(reader.error); };
        reader.readAsDataURL(file);
      });

      const sizeKB = file.size / 1024;
      const sizeStr = sizeKB > 1024
        ? `${(sizeKB / 1024).toFixed(1)} MB`
        : `${sizeKB.toFixed(0)} KB`;

      await addVaultDoc({
        name: file.name,
        client: clientName,
        clientId,
        type: docType,
        size: sizeStr,
        date: new Date().toISOString().slice(0, 10),
        status: 'Pending Review',
        downloadUrl,
        storagePath: `documents/${clientId}/${file.name}`,
      });

      setDone(true);
      setUploading(false);
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Upload Document</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-600'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 size={24} className="text-indigo-400" />
              <p className="text-sm text-zinc-200 font-medium">{file.name}</p>
              <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <Upload size={24} />
              <p className="text-sm">Click to select a file</p>
              <p className="text-xs">PDF, XLSX, ZIP, images…</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client *</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Document Type</label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
          >
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {uploading && (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 text-right font-mono">{progress}%</p>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || done}
            className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {done ? (
              <><CheckCircle2 size={14} /> Uploaded</>
            ) : uploading ? (
              <><Loader2 size={14} className="animate-spin" /> Uploading…</>
            ) : (
              <><Upload size={14} /> Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Portal approval modal ────────────────────────────────────────────────────

interface ApproveModalProps {
  doc: VaultDocument;
  client: Client | undefined;
  onClose: () => void;
}

function ApproveModal({ doc, client, onClose }: ApproveModalProps) {
  const [sending, setSending]   = useState(false);
  const [done, setDone]         = useState(false);
  const [portalUrl, setPortalUrl] = useState('');
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<{
    whatsappSent: boolean;
    emailSent: boolean;
    errors?: string[];
  } | null>(null);

  const hasPhone = !!(client?.phone);
  const hasEmail = !!(client?.email);

  const handleApprove = async () => {
    if (!doc.id) return;
    setSending(true);
    setError('');
    try {
      await updateVaultDoc(doc.id, { approvedForPortal: true, portalNotified: false });

      // On static hosts (Vercel) there's no backend — mark as approved locally
      // and generate the portal URL without sending notifications.
      if (STATIC_HOST) {
        const localUrl = `${window.location.origin}/portal/${doc.clientId}`;
        setPortalUrl(localUrl);
        setResult({ whatsappSent: false, emailSent: false });
        setDone(true);
        setSending(false);
        return;
      }

      const res = await fetch('/api/portal/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientPhone:   client?.phone,
          clientEmail:   client?.email,
          clientName:    client?.name,
          clientId:      doc.clientId,
          documentName:  doc.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPortalUrl(data.portalUrl);
        setResult({ whatsappSent: data.whatsappSent, emailSent: data.emailSent, errors: data.errors });
        await updateVaultDoc(doc.id, { portalNotified: data.notified });
        setDone(true);
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSending(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
            Approve for Client Portal
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {!done ? (
          <>
            {/* Document info */}
            <div className="glass rounded-xl p-4 flex flex-col gap-2 border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Document</p>
              <p className="text-sm text-zinc-200 font-medium">{doc.name}</p>
              <p className="text-xs text-zinc-600">{doc.type} · {doc.size}</p>
            </div>

            {/* Client info */}
            {client && (
              <div className="glass rounded-xl p-4 flex flex-col gap-2 border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Client</p>
                <p className="text-sm text-zinc-200 font-medium">{client.name}</p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-zinc-600">📱 WhatsApp</span>
                    {hasPhone
                      ? <span className="text-zinc-400 font-mono">{client.phone}</span>
                      : <span className="text-amber-400">No phone — won't be sent</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-zinc-600">✉️ Email</span>
                    {hasEmail
                      ? <span className="text-zinc-400 font-mono">{client.email}</span>
                      : <span className="text-amber-400">No email — won't be sent</span>}
                  </div>
                </div>
                {!client.portalPin && (
                  <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                    <Bell size={11} /> No portal PIN set — client won't be able to log in.
                  </p>
                )}
              </div>
            )}

            {/* What will happen */}
            <div className="text-xs text-zinc-500 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
              <p className="font-bold uppercase tracking-widest text-zinc-600 mb-2">This will:</p>
              <ul className="space-y-1 list-disc list-inside text-zinc-600">
                <li>Mark document as approved for client portal</li>
                <li>Send a <strong className="text-green-400">WhatsApp</strong> message with the portal link {!hasPhone && <span className="text-amber-500">(skipped — no phone)</span>}</li>
                <li>Send an <strong className="text-blue-400">Email</strong> notification {!hasEmail && <span className="text-amber-500">(skipped — no email)</span>}</li>
              </ul>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={sending}
                className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {sending ? 'Approving…' : 'Approve & Notify'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-400" />
              </div>
              <p className="text-base font-bold text-white serif italic">Document Approved</p>
            </div>

            {/* Notification status */}
            <div className="glass rounded-xl p-4 border border-zinc-800 flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Notifications Sent</p>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-zinc-400">📱 WhatsApp</span>
                {result?.whatsappSent
                  ? <span className="text-green-400 font-bold">✓ Sent</span>
                  : <span className="text-zinc-600">Not sent</span>}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-zinc-400">✉️ Email</span>
                {result?.emailSent
                  ? <span className="text-green-400 font-bold">✓ Sent</span>
                  : <span className="text-zinc-600">Not sent</span>}
              </div>
              {result?.errors && result.errors.length > 0 && (
                <div className="mt-1 text-[10px] text-amber-400">
                  {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              {STATIC_HOST && (
                <p className="text-[10px] text-amber-400 mt-1">
                  Running on static host — WhatsApp &amp; Email require the local server (<code className="bg-amber-500/10 px-1 rounded">npm run dev</code>).
                </p>
              )}
            </div>

            {/* Portal link */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Portal Link</p>
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
                <span className="text-xs text-zinc-400 font-mono flex-1 truncate">{portalUrl}</span>
                <button onClick={copyUrl} className="text-zinc-500 hover:text-indigo-400 transition-colors shrink-0">
                  {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 transition-colors shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <button onClick={onClose} className="h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-300 transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Delete Document</h3>
        <p className="text-sm text-zinc-400">
          Permanently delete <span className="text-white font-semibold">{name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DocumentVault() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VaultDocument | undefined>();
  const [approveTarget, setApproveTarget] = useState<VaultDocument | undefined>();

  useEffect(() => {
    const unsubDocs = subscribeDocs(data => { setDocuments(data); setLoading(false); });
    const unsubClients = subscribeClients(setClients);
    return () => { unsubDocs(); unsubClients(); };
  }, []);

  const allTypes = ['All', ...Array.from(new Set(documents.map(d => d.type)))];

  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.client.toLowerCase().includes(q);
    const matchesType = typeFilter === 'All' || d.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalSizeGB = documents.reduce((acc, d) => {
    const match = d.size.match(/([\d.]+)\s*(MB|KB|GB)/i);
    if (!match) return acc;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return acc + (unit === 'GB' ? val : unit === 'MB' ? val / 1024 : val / (1024 * 1024));
  }, 0);

  const verifiedCount = documents.filter(d => d.status === 'Verified').length;

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteVaultDoc(deleteTarget.id);
    setDeleteTarget(undefined);
  };

  const handleVerify = async (doc: VaultDocument) => {
    if (!doc.id) return;
    await updateVaultDoc(doc.id, { status: 'Verified' });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Security Archive</h2>
          <p className="text-sm text-zinc-400">Immutable document storage with end-to-end encrypted protocol.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2">
            {allTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors',
                  typeFilter === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 text-[11px] uppercase font-bold tracking-widest rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 glass p-2 rounded-2xl items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH BY FILENAME OR CLIENT..."
            className="w-full h-12 pl-12 pr-4 bg-transparent outline-none text-xs font-mono uppercase tracking-tight text-zinc-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest p-5 border-b border-white/5">
          <div>Document Name // Entity</div>
          <div>Category</div>
          <div>Payload Size // Date</div>
          <div>Trust Status</div>
          <div>Portal</div>
          <div className="text-right">Operations</div>
        </div>

        {loading && (
          <div className="p-8 text-center text-zinc-600">
            <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-500/40" />
            Loading archive…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-600 text-sm">
            {search || typeFilter !== 'All' ? 'No documents match your filter.' : 'No documents yet. Upload your first file.'}
          </div>
        )}

        <div className="divide-y divide-white/5">
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors italic serif">
                  {doc.name}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase leading-none mt-1">
                  LIT: {doc.client}
                </span>
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">{doc.type}</div>
              <div className="flex flex-col">
                <span className="text-xs font-mono text-zinc-300">{doc.size}</span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-tighter italic">{doc.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                    doc.status === 'Verified'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  )}
                >
                  {doc.status}
                </span>
                {doc.status === 'Pending Review' && (
                  <button
                    onClick={() => handleVerify(doc)}
                    className="text-[9px] text-zinc-600 hover:text-green-400 transition-colors font-bold uppercase tracking-widest"
                    title="Mark as Verified"
                  >
                    Verify
                  </button>
                )}
              </div>

              {/* Portal status */}
              <div className="flex items-center gap-2">
                {doc.approvedForPortal ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                      Approved
                    </span>
                    {doc.portalNotified && (
                      <span className="text-[9px] text-green-500 font-mono">✓ Notified</span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => doc.status === 'Verified' && setApproveTarget(doc)}
                    disabled={doc.status !== 'Verified'}
                    className={cn(
                      'text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border transition-colors',
                      doc.status === 'Verified'
                        ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-indigo-500/50 hover:text-indigo-400 cursor-pointer'
                        : 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed'
                    )}
                    title={doc.status !== 'Verified' ? 'Verify document first' : 'Approve for client portal'}
                  >
                    Approve
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                    title="View"
                  >
                    <Eye size={16} />
                  </a>
                )}
                {doc.downloadUrl && (
                  <a
                    href={doc.downloadUrl}
                    download={doc.name}
                    className="p-2 text-zinc-500 hover:text-indigo-400 transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        {[
          { label: 'Cloud Storage', value: `${totalSizeGB.toFixed(2)} GB`, icon: Files },
          { label: 'Verified Docs', value: `${documents.length ? Math.round((verifiedCount / documents.length) * 100) : 0}%`, icon: FileCheck },
          { label: 'Total Documents', value: documents.length, icon: FileSearch },
        ].map((stat, i) => (
          <div key={i} className="glass p-5 rounded-2xl flex flex-col gap-1 border-dashed">
            <stat.icon size={16} className="text-indigo-400 mb-2" />
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-widest">{stat.label}</span>
            <span className="text-2xl font-bold tracking-tight text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {showUpload && (
        <UploadModal clients={clients} onClose={() => setShowUpload(false)} />
      )}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      )}

      {approveTarget && (
        <ApproveModal
          doc={approveTarget}
          client={clients.find(c => c.id === approveTarget.clientId)}
          onClose={() => setApproveTarget(undefined)}
        />
      )}
    </div>
  );
}
