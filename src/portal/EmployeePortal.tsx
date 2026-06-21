import React, { useEffect, useRef, useState } from 'react';
import {
  LogOut, CheckSquare, FileText, MessageSquare, Mail,
  Users, ChevronRight, ChevronLeft, Upload, X, CheckCircle2,
  Loader2, Clock, AlertTriangle, Eye, Download, ShieldCheck,
  Pencil, Plus, FileIcon, IndianRupee, BadgeCheck, Ban,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  authenticateEmployee, subscribeClients, subscribeTasks,
  subscribeDocs, subscribeMessages, addVaultDoc, updateTask,
  subscribePayments, addPaymentRequest, updateClient,
  type Employee, type Client, type Task, type VaultDocument, type Message, type PaymentRequest,
} from '../lib/firestore';
import ThemeToggle from '../components/ThemeToggle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToDate(ts: { seconds: number } | Date | undefined): Date {
  if (!ts) return new Date(0);
  if (ts instanceof Date) return ts;
  return new Date((ts as { seconds: number }).seconds * 1000);
}

function relTime(ts: { seconds: number } | Date | undefined): string {
  const d = tsToDate(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

const STATUSES: Task['status'][] = ['Pending', 'In Progress', 'Completed'];
function nextStatus(s: Task['status']): Task['status'] | null {
  const i = STATUSES.indexOf(s); return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}
function prevStatus(s: Task['status']): Task['status'] | null {
  const i = STATUSES.indexOf(s); return i > 0 ? STATUSES[i - 1] : null;
}

// ─── Login screen ─────────────────────────────────────────────────────────────

interface LoginProps { onLogin: (emp: Employee) => void; }

function LoginScreen({ onLogin }: LoginProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const emp = await authenticateEmployee(email.trim(), password);
    if (emp) { onLogin(emp); }
    else { setError('Invalid email or password.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <ThemeToggle variant="float" />
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold italic serif text-indigo-400 mb-1">FinnCA</h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Employee Portal</p>
        </div>
        <div className="glass rounded-2xl p-8 border border-zinc-800 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Users size={26} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-white serif italic">Staff Login</h2>
              <p className="text-xs text-zinc-500 mt-1">Sign in with your employee credentials</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@finnca.com" autoFocus
                className="h-11 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            <button
              type="submit" disabled={loading || !email || !password}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[11px] tracking-widest transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 flex flex-col gap-2">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Demo Credentials</p>
            {[
              { name: 'Rajesh K. (Admin)',  email: 'rajesh@finnca.com',  pass: 'admin123'  },
              { name: 'Anita S.',           email: 'anita@finnca.com',   pass: 'anita123'  },
              { name: 'Vikram M.',          email: 'vikram@finnca.com',  pass: 'vikram123' },
            ].map(c => (
              <button
                key={c.email}
                onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                className="flex items-center justify-between text-left hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors group"
              >
                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{c.name}</span>
                <span className="text-[10px] font-mono text-zinc-600 group-hover:text-indigo-400 transition-colors">{c.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload doc modal ─────────────────────────────────────────────────────────

const DOC_TYPES = ['Identification', 'Taxation', 'Financial', 'Income Tax', 'Audit', 'Other'];

function UploadModal({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [clientId, setClientId] = useState('');
  const [docType, setDocType]   = useState(DOC_TYPES[0]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const clientName = clients.find(c => c.id === clientId)?.name ?? '';

  const handleUpload = async () => {
    if (!file) { setError('Select a file.'); return; }
    if (!clientId) { setError('Select a client.'); return; }
    setUploading(true); setError('');
    try {
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        let prog = 0;
        const iv = setInterval(() => { prog = Math.min(prog + 20, 90); setProgress(prog); }, 80);
        reader.onload = () => { clearInterval(iv); setProgress(100); resolve(reader.result as string); };
        reader.onerror = () => { clearInterval(iv); reject(reader.error); };
        reader.readAsDataURL(file);
      });
      const sizeKB = file.size / 1024;
      await addVaultDoc({
        name: file.name, client: clientName, clientId, type: docType,
        size: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`,
        date: new Date().toISOString().slice(0, 10),
        status: 'Pending Review', downloadUrl,
        storagePath: `documents/${clientId}/${file.name}`,
        approvedForPortal: false, portalNotified: false,
      });
      setDone(true); setUploading(false);
      setTimeout(onClose, 900);
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
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div
          onClick={() => fileRef.current?.click()}
          className={cn('border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-600')}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
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
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client *</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500">
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Document Type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)}
            className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500">
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {uploading && (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500 text-right font-mono">{progress}%</p>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleUpload} disabled={uploading || done}
            className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            {done ? <><CheckCircle2 size={14} /> Uploaded</> : uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main employee portal ─────────────────────────────────────────────────────

type Tab = 'tasks' | 'documents' | 'inbox' | 'clients' | 'finance';

export default function EmployeePortal() {
  const [employee, setEmployee] = useState<Employee | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('emp_session') ?? 'null'); }
    catch { return null; }
  });
  const [tab, setTab]           = useState<Tab>('tasks');
  const [clients, setClients]   = useState<Client[]>([]);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [docs, setDocs]         = useState<VaultDocument[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  // Payment request form state
  const [prClientId, setPrClientId]   = useState('');
  const [prAmount, setPrAmount]       = useState('');
  const [prNote, setPrNote]           = useState('');
  const [prMonth, setPrMonth]         = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [prSaving, setPrSaving]       = useState(false);
  const [prError, setPrError]         = useState('');
  const [prSuccess, setPrSuccess]     = useState(false);

  // Persist session
  useEffect(() => {
    if (employee) sessionStorage.setItem('emp_session', JSON.stringify(employee));
    else sessionStorage.removeItem('emp_session');
  }, [employee]);

  useEffect(() => {
    if (!employee) return;
    const u1 = subscribeClients(setClients);
    const u2 = subscribeTasks(setTasks);
    const u3 = subscribeDocs(setDocs);
    const u4 = subscribeMessages(setMessages, 50);
    const u5 = subscribePayments(setPayments);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [employee]);

  if (!employee) return <LoginScreen onLogin={emp => setEmployee(emp)} />;

  const isAdmin = employee.role === 'admin';

  // Filter to assigned clients (admin sees all)
  const myClients = isAdmin
    ? clients
    : clients.filter(c => employee.assignedClientIds?.includes(c.id ?? ''));

  const myClientIds = new Set(myClients.map(c => c.id));

  // Filter tasks: admin sees all, employee sees only their assigned tasks
  const myTasks = isAdmin
    ? tasks
    : tasks.filter(t => t.assignee === employee.name || myClientIds.has(t.clientId ?? ''));

  // Filter docs to assigned clients
  const myDocs = docs.filter(d => isAdmin || myClientIds.has(d.clientId ?? ''));

  // My payment requests (raised by this employee)
  const myPayments = payments.filter(p => p.raisedById === employee.id);
  const myPendingPayments = myPayments.filter(p => p.status === 'Pending');

  const handleMoveTask = async (task: Task, dir: 'forward' | 'back') => {
    if (!task.id) return;
    const ns = dir === 'forward' ? nextStatus(task.status) : prevStatus(task.status);
    if (ns) await updateTask(task.id, { status: ns });
  };

  const handlePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prClientId)  { setPrError('Select a client.'); return; }
    if (!prAmount || isNaN(Number(prAmount)) || Number(prAmount) <= 0) { setPrError('Enter a valid amount.'); return; }
    if (!prNote.trim()) { setPrError('Enter a description.'); return; }
    setPrSaving(true); setPrError(''); setPrSuccess(false);
    try {
      await addPaymentRequest({
        clientId: prClientId,
        clientName: myClients.find(c => c.id === prClientId)?.name ?? '',
        amount: Number(prAmount),
        note: prNote.trim(),
        status: 'Pending',
        raisedBy: employee.name,
        raisedById: employee.id ?? '',
        month: prMonth,
      });
      // Lock the client's portal until CA marks paid
      await updateClient(prClientId, {
        pendingPayment: true,
        paymentAmount: Number(prAmount),
        paymentNote: prNote.trim(),
      });
      setPrAmount(''); setPrNote(''); setPrClientId('');
      setPrSuccess(true);
      setTimeout(() => setPrSuccess(false), 3000);
    } catch (err) {
      setPrError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setPrSaving(false);
    }
  };

  const navItems: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'tasks',     label: 'My Tasks',   icon: CheckSquare,  count: myTasks.filter(t => t.status !== 'Completed').length },
    { id: 'documents', label: 'Documents',  icon: FileText,     count: myDocs.filter(d => d.status === 'Pending Review').length },
    { id: 'inbox',     label: 'Inbox',      icon: MessageSquare, count: messages.filter(m => !m.processed && m.direction === 'inbound').length },
    { id: 'clients',   label: 'My Clients', icon: Users,        count: myClients.length },
    { id: 'finance',   label: 'Finance',    icon: IndianRupee,  count: myPendingPayments.length },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F4F4F5] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-lg font-bold italic serif text-indigo-400 shrink-0">FinnCA</h1>
          <span className="text-zinc-700 shrink-0">·</span>
          <span className="text-xs sm:text-sm text-zinc-400 truncate">Employee Portal</span>
          {isAdmin && (
            <span className="hidden sm:inline text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shrink-0">Admin</span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-bold text-zinc-300 shrink-0">
              {employee.name.charAt(0)}
            </div>
            <span className="text-sm text-zinc-300 hidden md:block">{employee.name}</span>
          </div>
          <ThemeToggle variant="inline" />
          <button onClick={() => setEmployee(null)}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors"
            title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Nav tabs — horizontally scrollable on mobile */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto">
        <div className="flex min-w-max sm:max-w-4xl sm:mx-auto px-4 sm:px-6">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap',
                tab === item.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}>
              <item.icon size={14} />
              <span className="hidden xs:inline sm:inline">{item.label}</span>
              {item.count != null && item.count > 0 && (
                <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">

        {/* ── Tasks ── */}
        {tab === 'tasks' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold serif italic text-white">My Tasks</h2>
                <p className="text-sm text-zinc-500 mt-1">{myTasks.filter(t => t.status !== 'Completed').length} active · {myTasks.filter(t => t.status === 'Completed').length} completed</p>
              </div>
            </div>

            {myTasks.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center border border-dashed border-zinc-800">
                <CheckSquare size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No tasks assigned to you yet.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['Pending', 'In Progress', 'Completed'] as Task['status'][]).map(status => {
                const col = myTasks.filter(t => t.status === status);
                return (
                  <div key={status} className={cn('flex flex-col gap-3', status === 'Completed' && 'opacity-60')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full',
                          status === 'Pending' ? 'bg-indigo-400' :
                          status === 'In Progress' ? 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-zinc-600')} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          {status === 'Pending' ? 'Backlog' : status === 'In Progress' ? 'In Progress' : 'Done'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600">{String(col.length).padStart(2,'0')}</span>
                    </div>
                    {col.length === 0 && (
                      <div className="glass rounded-xl p-4 text-center text-zinc-700 text-xs border-dashed">Empty</div>
                    )}
                    {col.map(task => (
                      <div key={task.id} className="glass rounded-xl p-4 flex flex-col gap-3 hover:bg-white/5 transition-all group border-t-2 border-t-transparent hover:border-t-indigo-500">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                            task.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-100 serif italic leading-tight group-hover:text-indigo-400 transition-colors">{task.title}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{task.client}</p>
                        {task.notes && <p className="text-[11px] text-zinc-600 line-clamp-2">{task.notes}</p>}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[10px] font-mono text-zinc-600">{task.due}</span>
                          <div className="flex gap-1">
                            {prevStatus(task.status) && (
                              <button onClick={() => handleMoveTask(task, 'back')}
                                className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title={`Move to ${prevStatus(task.status)}`}>
                                <ChevronLeft size={14} />
                              </button>
                            )}
                            {nextStatus(task.status) && (
                              <button onClick={() => handleMoveTask(task, 'forward')}
                                className="p-1 text-zinc-600 hover:text-indigo-400 transition-colors" title={`Move to ${nextStatus(task.status)}`}>
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Documents ── */}
        {tab === 'documents' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold serif italic text-white">Documents</h2>
                <p className="text-sm text-zinc-500 mt-1">{myDocs.length} total · {myDocs.filter(d => d.status === 'Pending Review').length} pending review</p>
              </div>
              <button onClick={() => setShowUpload(true)}
                className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 text-[11px] uppercase font-bold tracking-widest rounded-lg transition-colors">
                <Upload size={13} /> Upload
              </button>
            </div>

            {myDocs.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center border border-dashed border-zinc-800">
                <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No documents yet.</p>
              </div>
            )}

            <div className="glass rounded-2xl overflow-hidden">
              {myDocs.length > 0 && (
                <>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest p-4 border-b border-white/5">
                    <div>Document</div><div>Type</div><div>Date</div><div>Status</div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {myDocs.map(doc => (
                      <div key={doc.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center p-4 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-200 serif italic group-hover:text-indigo-400 transition-colors truncate">{doc.name}</span>
                          <span className="text-[10px] text-zinc-600 font-mono">{doc.client}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500">{doc.type}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{doc.date}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                            doc.status === 'Verified' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                            {doc.status}
                          </span>
                          {doc.approvedForPortal && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Portal</span>
                          )}
                          {doc.downloadUrl && (
                            <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1 text-zinc-600 hover:text-white transition-colors" title="View">
                              <Eye size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Inbox ── */}
        {tab === 'inbox' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold serif italic text-white">Inbox</h2>
              <p className="text-sm text-zinc-500 mt-1">Read-only view of all incoming messages</p>
            </div>
            {messages.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center border border-dashed border-zinc-800">
                <MessageSquare size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No messages yet.</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn('glass rounded-xl p-4 flex items-start gap-4 border-l-4',
                  msg.channel === 'whatsapp' ? 'border-l-green-500' : 'border-l-blue-500')}>
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border shrink-0',
                    msg.channel === 'whatsapp' ? 'bg-green-950/30 border-green-500/20 text-green-400' : 'bg-blue-950/30 border-blue-500/20 text-blue-400')}>
                    {msg.channel === 'whatsapp' ? <MessageSquare size={15} /> : <Mail size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-200 serif italic">{msg.clientName || msg.sender}</span>
                      {msg.category && (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest bg-zinc-800 text-indigo-400 border border-indigo-500/20">{msg.category}</span>
                      )}
                      {!msg.processed && (
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">Unanalyzed</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{msg.snippet}</p>
                    {msg.hasAttachment && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        <FileIcon size={11} /> attachment
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono shrink-0">{relTime(msg.timestamp as { seconds: number })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Clients ── */}
        {tab === 'clients' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold serif italic text-white">My Clients</h2>
              <p className="text-sm text-zinc-500 mt-1">{myClients.length} client{myClients.length !== 1 ? 's' : ''} assigned to you</p>
            </div>
            {myClients.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center border border-dashed border-zinc-800">
                <Users size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No clients assigned yet.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myClients.map(client => {
                const clientTasks = myTasks.filter(t => t.clientId === client.id);
                const clientDocs  = myDocs.filter(d => d.clientId === client.id);
                return (
                  <div key={client.id} className="glass rounded-xl p-5 flex flex-col gap-4 hover:bg-white/5 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-indigo-400">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100 serif italic">{client.name}</p>
                          <p className="text-xs text-zinc-500">{client.email}</p>
                        </div>
                      </div>
                      <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                        client.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                        {client.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">Tasks</span>
                        <span className="text-lg font-bold text-white">{clientTasks.length}</span>
                        <span className="text-[10px] text-zinc-600">{clientTasks.filter(t => t.status === 'In Progress').length} in progress</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">Documents</span>
                        <span className="text-lg font-bold text-white">{clientDocs.length}</span>
                        <span className="text-[10px] text-zinc-600">{clientDocs.filter(d => d.status === 'Pending Review').length} pending review</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">PAN</span>
                        <span className="text-xs font-mono text-zinc-400">{client.pan}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">GSTIN</span>
                        <span className="text-xs font-mono text-zinc-400">{client.gst}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Finance ── */}
        {tab === 'finance' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold serif italic text-white">Finance</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Raise payment requests for your clients. CA will review and mark as paid.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Total Raised',
                  value: '₹' + myPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN'),
                  color: 'text-indigo-400',
                },
                {
                  label: 'Collected',
                  value: '₹' + myPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN'),
                  color: 'text-green-400',
                },
                {
                  label: 'Pending',
                  value: '₹' + myPendingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN'),
                  color: 'text-amber-400',
                },
              ].map((s, i) => (
                <div key={i} className="glass rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">{s.label}</span>
                  <span className={cn('text-xl font-bold', s.color)}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* New request form */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-5 border border-indigo-500/10">
              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                New Payment Request
              </h3>
              <form onSubmit={handlePaymentRequest} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client *</label>
                    <select
                      value={prClientId} onChange={e => setPrClientId(e.target.value)}
                      className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">— Select client —</option>
                      {myClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Amount (₹) *</label>
                    <input
                      type="number" min="1" value={prAmount}
                      onChange={e => setPrAmount(e.target.value)}
                      placeholder="e.g. 12500"
                      className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 col-span-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Description *</label>
                    <input
                      value={prNote} onChange={e => setPrNote(e.target.value)}
                      placeholder="GST Filing Fee - May 2026"
                      className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Month</label>
                    <input
                      type="month" value={prMonth} onChange={e => setPrMonth(e.target.value)}
                      className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {prError && <p className="text-xs text-red-400">{prError}</p>}
                {prSuccess && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <CheckCircle2 size={13} /> Payment request sent. Client portal is now locked until CA marks it paid.
                  </div>
                )}

                <button
                  type="submit" disabled={prSaving}
                  className="h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {prSaving
                    ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                    : <><IndianRupee size={14} /> Send Payment Request</>
                  }
                </button>
              </form>
            </div>

            {/* My requests history */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                My Requests ({myPayments.length})
              </h3>

              {myPayments.length === 0 && (
                <div className="glass rounded-2xl p-10 text-center border border-dashed border-zinc-800">
                  <IndianRupee size={28} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600">No payment requests yet.</p>
                </div>
              )}

              {myPayments.map(req => (
                <div key={req.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  {/* Status icon */}
                  <div className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center border shrink-0',
                    req.status === 'Paid'      ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    req.status === 'Pending'   ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                                 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  )}>
                    {req.status === 'Paid'    ? <BadgeCheck size={16} /> :
                     req.status === 'Pending' ? <Clock size={16} /> :
                                                <Ban size={16} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-200 serif italic">{req.clientName}</span>
                      <span className={cn(
                        'text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                        req.status === 'Paid'    ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        req.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                   'bg-zinc-800 text-zinc-500 border-zinc-700'
                      )}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{req.note}</p>
                  </div>

                  {/* Amount + month */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-200 font-mono">
                      ₹{req.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      {(() => {
                        const [y, mo] = req.month.split('-');
                        return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1] + ' ' + y;
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showUpload && (
        <UploadModal clients={myClients} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}
