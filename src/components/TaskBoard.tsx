import React, { useEffect, useRef, useState } from 'react';
import { Plus, Calendar, Trash2, Pencil, X, Loader2, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  subscribeTasks,
  subscribeClients,
  subscribeEmployees,
  addTask,
  updateTask,
  deleteTask,
  type Task,
  type Client,
  type Employee,
} from '../lib/firestore';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUSES: Task['status'][] = ['Pending', 'In Progress', 'Completed'];

const STATUS_META: Record<
  Task['status'],
  { label: string; dot: string; dropRing: string; emptyText: string }
> = {
  Pending: {
    label: 'Backlog',
    dot: 'bg-indigo-400',
    dropRing: 'ring-2 ring-indigo-500/50 bg-indigo-500/5',
    emptyText: 'Drop tasks here',
  },
  'In Progress': {
    label: 'In Operations',
    dot: 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    dropRing: 'ring-2 ring-green-500/50 bg-green-500/5',
    emptyText: 'Drop tasks here',
  },
  Completed: {
    label: 'Committed',
    dot: 'bg-zinc-500',
    dropRing: 'ring-2 ring-zinc-500/50 bg-zinc-500/5',
    emptyText: 'Drop tasks here',
  },
};

// ─── Task modal ───────────────────────────────────────────────────────────────

interface TaskModalProps {
  initial?: Task;
  clients: Client[];
  employees: Employee[];
  onClose: () => void;
}

function TaskModal({ initial, clients, employees, onClose }: TaskModalProps) {
  const defaultDue = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    title:    initial?.title      ?? '',
    clientId: initial?.clientId   ?? '',
    client:   initial?.client     ?? '',
    assignee: initial?.assignee   ?? '',
    status:   initial?.status     ?? ('Pending' as Task['status']),
    priority: initial?.priority   ?? ('Medium'  as Task['priority']),
    due:      initial?.due        ?? defaultDue(),
    notes:    initial?.notes      ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleClientChange = (id: string) => {
    const c = clients.find(c => c.id === id);
    setForm(p => ({ ...p, clientId: id, client: c?.name ?? '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      if (initial?.id) {
        await updateTask(initial.id, form);
      } else {
        await addTask(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">
            {initial ? 'Edit Workflow' : 'New Workflow'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Title *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="GST Return Filing - April"
              autoFocus
              className="h-10 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Client + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Client</label>
              <select
                value={form.clientId}
                onChange={e => handleClientChange(e.target.value)}
                className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">— Select client —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Assignee</label>
              <select
                value={form.assignee}
                onChange={e => set('assignee', e.target.value)}
                className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">— Select employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Priority + Due */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as Task['status'])}
                className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value as Task['priority'])}
                className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              >
                {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Due Date</label>
              <input
                type="date"
                value={form.due}
                onChange={e => set('due', e.target.value)}
                className="h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Additional context…"
              className="px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Task card (draggable) ────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onEdit:   (t: Task) => void;
  onDelete: (t: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}

function TaskCard({ task, onEdit, onDelete, onDragStart }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      className="glass p-5 rounded-2xl transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.98] group border border-transparent hover:border-zinc-700"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          'text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border',
          task.priority === 'High'   ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                       'bg-zinc-800 text-zinc-500 border-zinc-700'
        )}>
          {task.priority}
        </span>

        {/* Drag handle + actions */}
        <div className="flex items-center gap-1">
          <GripVertical size={13} className="text-zinc-700 group-hover:text-zinc-500 transition-colors cursor-grab" />
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(task); }}
              className="p-1 text-zinc-500 hover:text-indigo-400 transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(task); }}
              className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-zinc-100 italic serif mb-1 leading-tight group-hover:text-indigo-300 transition-colors">
        {task.title}
      </h4>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">{task.client}</p>

      {task.notes && (
        <p className="text-[11px] text-zinc-600 mb-3 line-clamp-2">{task.notes}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
          <Calendar size={11} /> {task.due}
        </div>
        {task.assignee && (
          <div
            className="flex items-center gap-1.5"
            title={task.assignee}
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] text-zinc-500 hidden sm:block max-w-[80px] truncate">
              {task.assignee.split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Drop column ──────────────────────────────────────────────────────────────

interface DropColumnProps {
  status: Task['status'];
  tasks: Task[];
  onEdit:      (t: Task) => void;
  onDelete:    (t: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDrop:      (status: Task['status']) => void;
}

function DropColumn({ status, tasks, onEdit, onDelete, onDragStart, onDrop }: DropColumnProps) {
  const meta = STATUS_META[status];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(status);
  };

  return (
    <div className={cn('flex flex-col gap-3', status === 'Completed' && 'opacity-80')}>
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', meta.dot)} />
          <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-widest">{meta.label}</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
          {String(tasks.length).padStart(2, '0')}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex flex-col gap-3 min-h-[120px] rounded-2xl p-2 transition-all duration-150',
          isDragOver ? meta.dropRing : 'ring-0'
        )}
      >
        {tasks.length === 0 && (
          <div className={cn(
            'rounded-xl p-6 text-center text-[11px] border border-dashed transition-colors',
            isDragOver
              ? 'border-zinc-500 text-zinc-500'
              : 'border-zinc-800 text-zinc-700'
          )}>
            {isDragOver ? '↓ Release to drop' : meta.emptyText}
          </div>
        )}
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmDelete({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 flex flex-col gap-5 border border-zinc-700">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200">Delete Workflow</h3>
        <p className="text-sm text-zinc-400">
          Remove <span className="text-white font-semibold">"{title}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}  className="flex-1 h-10 rounded-lg border border-zinc-700 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TaskBoard() {
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget,   setEditTarget]   = useState<Task | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Task | undefined>();

  // Track which task is being dragged
  const dragTaskRef = useRef<Task | null>(null);

  useEffect(() => {
    const u1 = subscribeTasks(data => { setTasks(data); setLoading(false); });
    const u2 = subscribeClients(setClients);
    const u3 = subscribeEmployees(setEmployees);
    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (_e: React.DragEvent, task: Task) => {
    dragTaskRef.current = task;
  };

  const handleDrop = async (targetStatus: Task['status']) => {
    const task = dragTaskRef.current;
    dragTaskRef.current = null;
    if (!task?.id || task.status === targetStatus) return;
    await updateTask(task.id, { status: targetStatus });
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteTask(deleteTarget.id);
    setDeleteTarget(undefined);
  };

  const byStatus = (s: Task['status']) => tasks.filter(t => t.status === s);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Workflow Streams</h2>
          <p className="text-sm text-zinc-400">
            Drag cards between columns to update status. Reflects instantly on Performance tab.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 rounded-lg transition-all"
        >
          <Plus size={16} /> New Workflow
        </button>
      </div>

      {/* Hint bar */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-600 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5">
        <GripVertical size={13} className="text-zinc-700" />
        Drag a card into any column to change its status — updates employee performance automatically.
      </div>

      {loading ? (
        <div className="text-center py-16 text-zinc-600">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-indigo-500/50" />
          Loading workflows…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUSES.map(status => (
            <DropColumn
              key={status}
              status={status}
              tasks={byStatus(status)}
              onEdit={t => { setEditTarget(t); setShowModal(true); }}
              onDelete={setDeleteTarget}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {showModal && (
        <TaskModal
          initial={editTarget}
          clients={clients}
          employees={employees}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDelete
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      )}
    </div>
  );
}
