import React, { useEffect, useState } from 'react';
import {
  IndianRupee, TrendingUp, CheckCircle2, Clock, X,
  Plus, Loader2, ChevronDown, Users, BarChart3,
  Pencil, Trash2, Ban, BadgeCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribePayments, subscribeEmployees, subscribeClients,
  addPaymentRequest, updatePaymentRequest, deletePaymentRequest,
  updateClient,
  type PaymentRequest, type Employee, type Client,
} from '../lib/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// ─── New Payment Request Modal ────────────────────────────────────────────────

interface NewRequestModalProps {
  clients: Client[];
  employees: Employee[];
  onClose: () => void;
}

function NewRequestModal({ clients, employees, onClose }: NewRequestModalProps) {
  const [clientId, setClientId]   = useState('');
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth]         = useState(currentMonth());
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const selectedClient   = clients.find(c => c.id === clientId);
  const selectedEmployee = employees.find(e => e.id === employeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId)        { setError('Select a client.'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (!note.trim())     { setError('Enter a description.'); return; }
    if (!employeeId)      { setError('Select the employee raising this request.'); return; }
    setSaving(true); setError('');
    try {
      await addPaymentRequest({
        clientId,
        clientName: selectedClient?.name ?? '',
        amount: Number(amount),
        note: note.trim(),
        status: 'Pending',
        raisedBy: selectedEmployee?.name ?? '',
        raisedById: employeeId,
        month,
      });
      // Also set the client's pendingPayment flag
      await updateClient(clientId, {
        pendingPayment: true,
        paymentAmount: Number(amount),
        paymentNote: note.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">New Payment Request</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors">
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Amount (₹) *</label>
            <input
              type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 12500"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Description *</label>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="GST Filing Fee - May 2026"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Raised By *</label>
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors">
                <option value="">— Employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Month</label>
              <input
                type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Creating…' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmDelete({ note, onConfirm, onCancel }: { note: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Delete Request</h3>
        <p className="text-sm text-zinc-400">Delete <span className="text-white font-semibold">"{note}"</span>? This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bar chart (pure CSS) ─────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue: number;
}

function BarChart({ data, maxValue }: BarChartProps) {
  if (data.length === 0) return null;
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {data.map((d, i) => {
        const pct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] font-mono text-zinc-500 truncate w-full text-center">
              {fmt(d.value)}
            </span>
            <div className="w-full rounded-t-md transition-all duration-500 relative group"
              style={{ height: `${Math.max(pct, 2)}%`, backgroundColor: d.color ?? '#6366F1' }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-zinc-200 text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {d.label}: {fmt(d.value)}
              </div>
            </div>
            <span className="text-[9px] text-zinc-600 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FinanceManager() {
  const [payments, setPayments]   = useState<PaymentRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PaymentRequest | undefined>();
  const [filterMonth, setFilterMonth]   = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Paid' | 'Cancelled'>('all');
  const [filterEmployee, setFilterEmployee] = useState('all');

  useEffect(() => {
    const u1 = subscribePayments(data => { setPayments(data); setLoading(false); });
    const u2 = subscribeEmployees(setEmployees);
    const u3 = subscribeClients(setClients);
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const paidPayments = payments.filter(p => p.status === 'Paid');
  const totalRevenue = paidPayments.reduce((s, p) => s + p.amount, 0);
  const pendingRevenue = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  // Monthly revenue (last 6 months)
  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthlyRevenue = last6Months.map(m => ({
    label: monthLabel(m),
    value: paidPayments.filter(p => p.month === m).reduce((s, p) => s + p.amount, 0),
    month: m,
  }));
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.value), 1);

  // Per-employee revenue
  const employeeRevenue = employees.map(emp => ({
    name: emp.name,
    id: emp.id ?? '',
    paid: paidPayments.filter(p => p.raisedById === emp.id).reduce((s, p) => s + p.amount, 0),
    pending: payments.filter(p => p.raisedById === emp.id && p.status === 'Pending').reduce((s, p) => s + p.amount, 0),
    count: payments.filter(p => p.raisedById === emp.id).length,
  })).sort((a, b) => b.paid - a.paid);

  const maxEmpRevenue = Math.max(...employeeRevenue.map(e => e.paid), 1);

  // Filtered table
  const allMonths = [...new Set(payments.map(p => p.month))].sort().reverse();
  const filtered = payments.filter(p => {
    if (filterMonth !== 'all' && p.month !== filterMonth) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterEmployee !== 'all' && p.raisedById !== filterEmployee) return false;
    return true;
  });

  // ── Actions ────────────────────────────────────────────────────────────────

  const markPaid = async (p: PaymentRequest) => {
    if (!p.id) return;
    await updatePaymentRequest(p.id, { status: 'Paid', paidAt: { seconds: Math.floor(Date.now() / 1000) } });

    // Only clear the client's payment lock if there are NO other pending
    // requests for this client. A client may have multiple open invoices.
    const otherPending = payments.filter(
      r => r.id !== p.id && r.clientId === p.clientId && r.status === 'Pending'
    );
    if (otherPending.length === 0) {
      await updateClient(p.clientId, { pendingPayment: false, paymentAmount: 0, paymentNote: '' });
    } else {
      // Keep the lock but update the amount to the next pending invoice
      const next = otherPending[0];
      await updateClient(p.clientId, { paymentAmount: next.amount, paymentNote: next.note });
    }
  };

  const markCancelled = async (p: PaymentRequest) => {
    if (!p.id) return;
    await updatePaymentRequest(p.id, { status: 'Cancelled' });

    // Same logic — only unlock if no other pending requests remain
    const otherPending = payments.filter(
      r => r.id !== p.id && r.clientId === p.clientId && r.status === 'Pending'
    );
    if (otherPending.length === 0) {
      await updateClient(p.clientId, { pendingPayment: false, paymentAmount: 0, paymentNote: '' });
    } else {
      const next = otherPending[0];
      await updateClient(p.clientId, { paymentAmount: next.amount, paymentNote: next.note });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deletePaymentRequest(deleteTarget.id);
    setDeleteTarget(undefined);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Finance</h2>
          <p className="text-sm text-zinc-400">Revenue tracking, payment requests, and per-employee billing.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue',    value: fmt(totalRevenue),   sub: 'all time paid',       color: 'text-green-400',  icon: TrendingUp },
          { label: 'Pending',          value: fmt(pendingRevenue), sub: `${payments.filter(p=>p.status==='Pending').length} requests`, color: 'text-amber-400', icon: Clock },
          { label: 'This Month',       value: fmt(monthlyRevenue.at(-1)?.value ?? 0), sub: monthLabel(currentMonth()), color: 'text-indigo-400', icon: IndianRupee },
          { label: 'Total Requests',   value: payments.length,     sub: `${paidPayments.length} paid`, color: 'text-zinc-300', icon: BarChart3 },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{s.label}</span>
              <s.icon size={14} className={s.color} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold tracking-tight', s.color)}>{s.value}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly revenue bar chart */}
        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Monthly Revenue</h3>
            <span className="text-[10px] text-zinc-600 font-mono">Last 6 months</span>
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-zinc-700 text-xs">Loading…</div>
          ) : (
            <BarChart data={monthlyRevenue} maxValue={maxMonthly} />
          )}
        </div>

        {/* Per-employee revenue */}
        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Revenue by Employee</h3>
            <Users size={14} className="text-zinc-600" />
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-zinc-700 text-xs">Loading…</div>
          ) : employeeRevenue.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-700 text-xs">No data yet</div>
          ) : (
            <div className="flex flex-col gap-3">
              {employeeRevenue.map((emp, i) => (
                <div key={emp.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="text-zinc-300 font-medium">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-400 font-bold text-[11px]">{fmt(emp.paid)}</span>
                      {emp.pending > 0 && (
                        <span className="text-amber-400 text-[10px]">+{fmt(emp.pending)} pending</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${maxEmpRevenue > 0 ? (emp.paid / maxEmpRevenue) * 100 : 0}%`,
                        backgroundColor: ['#6366F1','#10B981','#F59E0B','#EC4899'][i % 4],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 outline-none focus:border-indigo-500 transition-colors">
          <option value="all">All Months</option>
          {allMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        <div className="flex gap-1">
          {(['all', 'Pending', 'Paid', 'Cancelled'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn('h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors',
                filterStatus === s
                  ? s === 'Paid' ? 'bg-green-600 text-white'
                    : s === 'Pending' ? 'bg-amber-600 text-white'
                    : s === 'Cancelled' ? 'bg-red-600/60 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700')}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
          className="h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 outline-none focus:border-indigo-500 transition-colors">
          <option value="all">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <span className="ml-auto text-[10px] text-zinc-600 font-mono">
          {filtered.length} request{filtered.length !== 1 ? 's' : ''} · {fmt(filtered.filter(p=>p.status==='Paid').reduce((s,p)=>s+p.amount,0))} collected
        </span>
      </div>

      {/* Requests table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] bg-white/5 text-zinc-500 text-[10px] uppercase font-bold tracking-widest p-4 border-b border-white/5">
          <div>Client · Description</div>
          <div>Amount</div>
          <div>Month</div>
          <div>Raised By</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {loading && (
          <div className="p-8 text-center text-zinc-600">
            <Loader2 size={20} className="animate-spin mx-auto mb-2 text-indigo-500/40" />
            Loading…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-600 text-sm">No payment requests match your filters.</div>
        )}

        <div className="divide-y divide-white/5">
          {filtered.map(req => (
            <div key={req.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center p-4 hover:bg-white/5 transition-colors group">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-zinc-100 serif italic truncate group-hover:text-indigo-400 transition-colors">
                  {req.clientName}
                </span>
                <span className="text-[10px] text-zinc-500 truncate">{req.note}</span>
              </div>

              <span className="text-sm font-bold text-zinc-200 font-mono">{fmt(req.amount)}</span>

              <span className="text-[10px] text-zinc-400 font-mono">{monthLabel(req.month)}</span>

              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-400 shrink-0">
                  {req.raisedBy.charAt(0)}
                </div>
                <span className="text-[11px] text-zinc-400 truncate">{req.raisedBy}</span>
              </div>

              <div>
                <span className={cn(
                  'text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
                  req.status === 'Paid'      ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  req.status === 'Pending'   ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                               'bg-zinc-800 text-zinc-500 border-zinc-700'
                )}>
                  {req.status}
                </span>
              </div>

              <div className="flex items-center gap-1 justify-end">
                {req.status === 'Pending' && (
                  <>
                    <button onClick={() => markPaid(req)}
                      className="p-1.5 text-zinc-600 hover:text-green-400 transition-colors" title="Mark as Paid">
                      <BadgeCheck size={15} />
                    </button>
                    <button onClick={() => markCancelled(req)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors" title="Cancel">
                      <Ban size={14} />
                    </button>
                  </>
                )}
                <button onClick={() => setDeleteTarget(req)}
                  className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNew && (
        <NewRequestModal
          clients={clients}
          employees={employees}
          onClose={() => setShowNew(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDelete
          note={deleteTarget.note}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      )}
    </div>
  );
}
