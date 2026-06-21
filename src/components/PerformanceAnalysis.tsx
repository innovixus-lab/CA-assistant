/**
 * PerformanceAnalysis — per-employee performance dashboard.
 * Shows task completion rate, revenue, client count, and a composite score.
 */
import React, { useEffect, useState } from 'react';
import {
  TrendingUp, CheckSquare, IndianRupee, Users,
  Star, Award, Target, Clock, ChevronDown, ChevronUp,
  Plus, X, Loader2, Calendar,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribeEmployees, subscribeTasks, subscribePayments, subscribeClients,
  addTask, updateTask,
  type Employee, type Task, type PaymentRequest, type Client,
} from '../lib/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-400';
  if (s >= 60) return 'text-indigo-400';
  if (s >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-500';
  if (s >= 60) return 'bg-indigo-500';
  if (s >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Average';
  return 'Needs Improvement';
}

// ─── Assign Task Modal ────────────────────────────────────────────────────────

interface AssignTaskModalProps {
  employee: Employee;
  clients: Client[];
  onClose: () => void;
}

function AssignTaskModal({ employee, clients, onClose }: AssignTaskModalProps) {
  const assignedClients = employee.role === 'admin'
    ? clients
    : clients.filter(c => (employee.assignedClientIds ?? []).includes(c.id ?? ''));

  const [title, setTitle]       = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [due, setDue]           = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!clientId)     { setError('Select a client.'); return; }
    setSaving(true); setError('');
    try {
      await addTask({
        title: title.trim(),
        client: selectedClient?.name ?? '',
        clientId,
        assignee: employee.name,
        status: 'Pending',
        priority,
        due,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Assign Task</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">To: <span className="text-indigo-400 font-semibold">{employee.name}</span></p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Task Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="GST Return Filing - May 2026"
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client *</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors">
                <option value="">— Select —</option>
                {assignedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Task['priority'])}
                className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Due Date</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)}
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Additional context…"
              className="px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
              {saving ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee performance card ────────────────────────────────────────────────

interface EmpStats {
  employee: Employee;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  revenueRaised: number;
  revenueCollected: number;
  clientCount: number;
  score: number;
  tasks: Task[];
}

interface EmpCardProps {
  stats: EmpStats;
  clients: Client[];
  onAssignTask: (emp: Employee) => void;
}

function EmployeePerformanceCard({ stats, clients, onAssignTask }: EmpCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { employee: emp, score } = stats;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all">
      {/* Header */}
      <div className="p-5 flex items-start gap-4">
        {/* Avatar + score ring */}
        <div className="relative shrink-0">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold border-2',
            emp.role === 'admin'
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
          )}>
            {emp.name.charAt(0)}
          </div>
          <div className={cn(
            'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#0A0A0B]',
            score >= 80 ? 'bg-green-500 text-white' :
            score >= 60 ? 'bg-indigo-500 text-white' :
            score >= 40 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
          )}>
            {score}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-zinc-100 serif italic">{emp.name}</p>
            <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
              emp.role === 'admin'
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700')}>
              {emp.role}
            </span>
            <span className={cn('text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border ml-auto',
              score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              score >= 60 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
              score >= 40 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20')}>
              {scoreLabel(score)}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{emp.email}</p>

          {/* Score bar */}
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-600 uppercase font-bold tracking-widest">Performance Score</span>
              <span className={cn('font-bold', scoreColor(score))}>{score}/100</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', scoreBg(score))}
                style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 border-t border-white/5">
        {[
          { label: 'Tasks',      value: stats.totalTasks,                  sub: `${stats.completedTasks} done` },
          { label: 'Completion', value: `${stats.completionRate}%`,         sub: 'rate' },
          { label: 'Revenue',    value: fmt(stats.revenueCollected),        sub: 'collected' },
          { label: 'Clients',    value: stats.clientCount,                  sub: 'assigned' },
        ].map((s, i) => (
          <div key={i} className={cn('p-4 flex flex-col gap-0.5', i < 3 && 'border-r border-white/5')}>
            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">{s.label}</span>
            <span className="text-base font-bold text-zinc-200">{s.value}</span>
            <span className="text-[10px] text-zinc-600">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Task breakdown bar */}
      {stats.totalTasks > 0 && (
        <div className="px-5 pb-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">Task Breakdown</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {stats.completedTasks > 0 && (
              <div className="bg-green-500 rounded-l-full transition-all duration-500"
                style={{ width: `${(stats.completedTasks / stats.totalTasks) * 100}%` }} />
            )}
            {stats.inProgressTasks > 0 && (
              <div className="bg-indigo-500 transition-all duration-500"
                style={{ width: `${(stats.inProgressTasks / stats.totalTasks) * 100}%` }} />
            )}
            {stats.pendingTasks > 0 && (
              <div className="bg-zinc-600 rounded-r-full transition-all duration-500"
                style={{ width: `${(stats.pendingTasks / stats.totalTasks) * 100}%` }} />
            )}
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Done',        count: stats.completedTasks,  color: 'bg-green-500' },
              { label: 'In Progress', count: stats.inProgressTasks, color: 'bg-indigo-500' },
              { label: 'Pending',     count: stats.pendingTasks,    color: 'bg-zinc-600' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', l.color)} />
                <span className="text-[10px] text-zinc-500">{l.label} ({l.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions + expand */}
      <div className="px-5 pb-4 flex items-center gap-3 border-t border-white/5 pt-3">
        <button
          onClick={() => onAssignTask(emp)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-white transition-colors"
        >
          <Plus size={12} /> Assign Task
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {expanded ? <><ChevronUp size={13} /> Hide Tasks</> : <><ChevronDown size={13} /> View Tasks ({stats.totalTasks})</>}
        </button>
      </div>

      {/* Expanded task list */}
      {expanded && stats.tasks.length > 0 && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {stats.tasks.map(task => (
            <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                task.status === 'Completed' ? 'bg-green-400' :
                task.status === 'In Progress' ? 'bg-indigo-400' : 'bg-zinc-600')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-300 truncate">{task.title}</p>
                <p className="text-[10px] text-zinc-600">{task.client}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border',
                  task.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-zinc-800 text-zinc-500 border-zinc-700')}>
                  {task.priority}
                </span>
                <span className="text-[10px] font-mono text-zinc-600">{task.due}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded && stats.tasks.length === 0 && (
        <div className="border-t border-white/5 px-5 py-4 text-center text-zinc-700 text-xs">
          No tasks assigned yet.
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PerformanceAnalysis() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [payments, setPayments]   = useState<PaymentRequest[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [assignTarget, setAssignTarget] = useState<Employee | undefined>();
  const [sortBy, setSortBy]       = useState<'score' | 'revenue' | 'tasks'>('score');

  useEffect(() => {
    const u1 = subscribeEmployees(data => { setEmployees(data); setLoading(false); });
    const u2 = subscribeTasks(setTasks);
    const u3 = subscribePayments(setPayments);
    const u4 = subscribeClients(setClients);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Compute per-employee stats ─────────────────────────────────────────────

  const empStats: EmpStats[] = employees.map(emp => {
    const empTasks = tasks.filter(t => t.assignee === emp.name);
    const completed   = empTasks.filter(t => t.status === 'Completed').length;
    const inProgress  = empTasks.filter(t => t.status === 'In Progress').length;
    const pending     = empTasks.filter(t => t.status === 'Pending').length;
    const total       = empTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const empPayments = payments.filter(p => p.raisedById === emp.id);
    const revenueRaised    = empPayments.reduce((s, p) => s + p.amount, 0);
    const revenueCollected = empPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);

    const assignedClients = emp.role === 'admin'
      ? clients.length
      : (emp.assignedClientIds ?? []).length;

    // Composite score (0–100):
    // 40% task completion rate
    // 30% revenue collected (relative to max)
    // 20% task volume (relative to max)
    // 10% client count (relative to max)
    const score = 0; // computed after all stats are gathered

    return {
      employee: emp,
      totalTasks: total,
      completedTasks: completed,
      inProgressTasks: inProgress,
      pendingTasks: pending,
      completionRate,
      revenueRaised,
      revenueCollected,
      clientCount: assignedClients,
      score,
      tasks: empTasks,
    };
  });

  // Normalise and compute final scores
  const maxRevenue = Math.max(...empStats.map(e => e.revenueCollected), 1);
  const maxTasks   = Math.max(...empStats.map(e => e.totalTasks), 1);
  const maxClients = Math.max(...empStats.map(e => e.clientCount), 1);

  const statsWithScore: EmpStats[] = empStats.map(s => ({
    ...s,
    score: Math.round(
      s.completionRate * 0.40 +
      (s.revenueCollected / maxRevenue) * 100 * 0.30 +
      (s.totalTasks / maxTasks) * 100 * 0.20 +
      (s.clientCount / maxClients) * 100 * 0.10
    ),
  }));

  const sorted = [...statsWithScore].sort((a, b) => {
    if (sortBy === 'score')   return b.score - a.score;
    if (sortBy === 'revenue') return b.revenueCollected - a.revenueCollected;
    return b.totalTasks - a.totalTasks;
  });

  // Team-level stats
  const teamRevenue    = statsWithScore.reduce((s, e) => s + e.revenueCollected, 0);
  const teamTasks      = statsWithScore.reduce((s, e) => s + e.totalTasks, 0);
  const teamCompleted  = statsWithScore.reduce((s, e) => s + e.completedTasks, 0);
  const avgScore       = statsWithScore.length > 0
    ? Math.round(statsWithScore.reduce((s, e) => s + e.score, 0) / statsWithScore.length)
    : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Performance</h2>
          <p className="text-sm text-zinc-400">Team analytics, task completion rates, and revenue attribution.</p>
        </div>
        <div className="flex gap-2">
          {(['score', 'revenue', 'tasks'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={cn('h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors',
                sortBy === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700')}>
              Sort: {s}
            </button>
          ))}
        </div>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team Revenue',     value: fmt(teamRevenue),  color: 'text-green-400',  icon: IndianRupee },
          { label: 'Tasks Completed',  value: teamCompleted,     color: 'text-indigo-400', icon: CheckSquare },
          { label: 'Total Tasks',      value: teamTasks,         color: 'text-zinc-300',   icon: Target },
          { label: 'Avg Score',        value: `${avgScore}/100`, color: scoreColor(avgScore), icon: Star },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">{s.label}</span>
              <s.icon size={14} className={s.color} />
            </div>
            <p className={cn('text-2xl font-bold tracking-tight', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee cards */}
      {loading ? (
        <div className="text-center py-16 text-zinc-600">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-indigo-500/50" />
          Loading performance data…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sorted.map(stats => (
            <EmployeePerformanceCard
              key={stats.employee.id}
              stats={stats}
              clients={clients}
              onAssignTask={setAssignTarget}
            />
          ))}
        </div>
      )}

      {assignTarget && (
        <AssignTaskModal
          employee={assignTarget}
          clients={clients}
          onClose={() => setAssignTarget(undefined)}
        />
      )}
    </div>
  );
}
