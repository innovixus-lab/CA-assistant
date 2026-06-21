import React, { useEffect, useState } from 'react';
import {
  UserPlus, Pencil, Trash2, X, Loader2, Copy,
  CheckCircle2, ExternalLink, ShieldCheck, User,
  KeyRound, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribeEmployees, subscribeClients,
  addEmployee, updateEmployee, deleteEmployee,
  type Employee, type Client,
} from '../lib/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-zinc-600 hover:text-indigo-400 transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

const EMPTY: Omit<Employee, 'id' | 'createdAt'> = {
  name: '', email: '', role: 'employee', password: '', assignedClientIds: [],
};

interface ModalProps {
  initial?: Employee;
  clients: Client[];
  onClose: () => void;
}

function EmployeeModal({ initial, clients, onClose }: ModalProps) {
  const [form, setForm] = useState<Omit<Employee, 'id' | 'createdAt'>>(
    initial
      ? { name: initial.name, email: initial.email, role: initial.role, password: initial.password, assignedClientIds: initial.assignedClientIds ?? [] }
      : { ...EMPTY }
  );
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const toggleClient = (id: string) => {
    const ids = form.assignedClientIds ?? [];
    set('assignedClientIds', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())     { setError('Name is required.'); return; }
    if (!form.email.trim())    { setError('Email is required.'); return; }
    if (!form.password.trim()) { setError('Password is required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSaving(true); setError('');
    try {
      if (initial?.id) await updateEmployee(initial.id, form);
      else             await addEmployee(form);
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
            {initial ? 'Edit Employee' : 'Add Employee'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Full Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Anita Sharma"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="anita@finnca.com"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Password * {initial && <span className="text-zinc-600 normal-case font-normal">(leave unchanged to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-10 pl-4 pr-10 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Role</label>
            <div className="flex gap-2">
              {(['employee', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={cn(
                    'flex-1 h-10 rounded-lg border text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2',
                    form.role === r
                      ? r === 'admin'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-zinc-700 border-zinc-600 text-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  {r === 'admin' ? <ShieldCheck size={13} /> : <User size={13} />}
                  {r === 'admin' ? 'Admin' : 'Employee'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600">
              {form.role === 'admin' ? 'Admin sees all clients, tasks, and documents.' : 'Employee sees only their assigned clients.'}
            </p>
          </div>

          {/* Assigned clients */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Assigned Clients
              {form.role === 'admin' && <span className="text-zinc-600 normal-case font-normal ml-1">(admin sees all — selection ignored)</span>}
            </label>
            <div className={cn('flex flex-col gap-1 max-h-40 overflow-y-auto rounded-xl border border-zinc-800 p-2', form.role === 'admin' && 'opacity-40 pointer-events-none')}>
              {clients.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-2">No clients yet.</p>
              )}
              {clients.map(c => {
                const checked = (form.assignedClientIds ?? []).includes(c.id ?? '');
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClient(c.id ?? '')}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      checked ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-indigo-600 border-indigo-500' : 'border-zinc-600'
                    )}>
                      {checked && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className="text-sm text-zinc-300">{c.name}</span>
                    <span className={cn(
                      'ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border',
                      c.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-800 text-zinc-600 border-zinc-700'
                    )}>
                      {c.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? 'Saving…' : initial ? 'Update' : 'Add Employee'}
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
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Remove Employee</h3>
        <p className="text-sm text-zinc-400">
          Remove <span className="text-white font-semibold">{name}</span> from the team? They will lose portal access immediately.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget]     = useState<Employee | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Employee | undefined>();
  const [showPassFor, setShowPassFor]   = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeEmployees(data => { setEmployees(data); setLoading(false); });
    const u2 = subscribeClients(setClients);
    return () => { u1(); u2(); };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteEmployee(deleteTarget.id);
    setDeleteTarget(undefined);
  };

  const portalUrl = `${window.location.origin}/employee`;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Team</h2>
          <p className="text-sm text-zinc-400">Manage staff accounts and client assignments.</p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
        >
          <UserPlus size={15} /> Add Employee
        </button>
      </div>

      {/* Portal link banner */}
      <div className="glass rounded-2xl p-4 border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound size={16} className="text-indigo-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-zinc-200">Employee Portal URL</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Share this link with your team. They log in with their email and password.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shrink-0">
          <span className="text-xs font-mono text-zinc-400">{portalUrl}</span>
          <CopyBtn text={portalUrl} />
          <a href="/employee" target="_blank" rel="noopener noreferrer"
            className="text-zinc-600 hover:text-indigo-400 transition-colors">
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Staff',  value: employees.length },
          { label: 'Admins',       value: employees.filter(e => e.role === 'admin').length },
          { label: 'Employees',    value: employees.filter(e => e.role === 'employee').length },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">{s.label}</span>
            <span className="text-2xl font-bold text-white">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-zinc-600">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-indigo-500/50" />
          Loading team…
        </div>
      )}

      {/* Empty */}
      {!loading && employees.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center border border-dashed border-zinc-800">
          <UserPlus size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No employees yet. Add your first team member.</p>
        </div>
      )}

      {/* Employee cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {employees.map(emp => {
          const assignedClients = clients.filter(c => (emp.assignedClientIds ?? []).includes(c.id ?? ''));
          const isAdmin = emp.role === 'admin';
          const passVisible = showPassFor === emp.id;

          return (
            <div key={emp.id} className="glass rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/5 transition-all group">
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold border',
                    isAdmin
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  )}>
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-100 serif italic">{emp.name}</p>
                    <p className="text-xs text-zinc-500">{emp.email}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-[9px] px-2 py-1 rounded font-bold uppercase tracking-widest border flex items-center gap-1',
                  isAdmin
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                )}>
                  {isAdmin ? <ShieldCheck size={9} /> : <User size={9} />}
                  {isAdmin ? 'Admin' : 'Employee'}
                </span>
              </div>

              {/* Password row */}
              <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2 border border-zinc-800">
                <KeyRound size={12} className="text-zinc-600 shrink-0" />
                <span className="text-xs font-mono text-zinc-400 flex-1">
                  {passVisible ? emp.password : '•'.repeat(Math.min(emp.password.length, 10))}
                </span>
                <button
                  onClick={() => setShowPassFor(passVisible ? null : (emp.id ?? null))}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  title={passVisible ? 'Hide password' : 'Show password'}
                >
                  {passVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <CopyBtn text={emp.password} />
              </div>

              {/* Assigned clients */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                  {isAdmin ? 'Access: All Clients' : `Assigned Clients (${assignedClients.length})`}
                </span>
                {!isAdmin && assignedClients.length === 0 && (
                  <p className="text-xs text-zinc-700 italic">No clients assigned yet.</p>
                )}
                {!isAdmin && (
                  <div className="flex flex-wrap gap-1.5">
                    {assignedClients.map(c => (
                      <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex flex-wrap gap-1.5">
                    {clients.slice(0, 3).map(c => (
                      <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                        {c.name}
                      </span>
                    ))}
                    {clients.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-500">
                        +{clients.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <a
                  href="/employee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors"
                >
                  <ExternalLink size={12} /> Open Portal
                </a>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => { setEditTarget(emp); setShowModal(true); }}
                    className="p-2 text-zinc-600 hover:text-indigo-400 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(emp)}
                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <EmployeeModal
          initial={editTarget}
          clients={clients}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
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
