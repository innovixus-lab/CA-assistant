import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  FileText,
  Users,
  MessageSquare,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { getDashboardStats, subscribeMessages, type Message } from '../lib/firestore';
import { cn } from '../lib/utils';

interface Stats {
  totalClients: number;
  activeClients: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalMessages: number;
  unprocessedMessages: number;
  recentMessages: Message[];
}

const StatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
}) => (
  <div className="glass p-6 flex flex-col gap-4 rounded-xl relative overflow-hidden group">
    <div className="flex justify-between items-start relative z-10">
      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800" style={{ color }}>
        <Icon size={18} />
      </div>
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live</span>
    </div>
    <div className="relative z-10">
      <h3 className="text-[10px] uppercase text-zinc-500 mb-1 font-bold tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
        <span className="text-[10px] font-bold text-green-400 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
          {sub}
        </span>
      </div>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

function formatTime(ts: Message['timestamp']): string {
  let date: Date;
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    date = new Date((ts as { seconds: number }).seconds * 1000);
  } else {
    date = new Date(ts as string | Date);
  }
  if (isNaN(date.getTime())) return '--';
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial stats
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Subscribe to live message updates for the stream panel
    const unsub = subscribeMessages((msgs) => {
      setStats(prev =>
        prev
          ? {
              ...prev,
              totalMessages: msgs.length,
              unprocessedMessages: msgs.filter(m => !m.processed).length,
              recentMessages: msgs.slice(0, 5),
            }
          : prev
      );
    }, 5);

    return () => unsub();
  }, []);

  const refresh = () => {
    setLoading(true);
    getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold tracking-tight text-white serif italic">Command Center</h2>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Operational summary for FinnCA Cloud. System health nominal across all active client partitions.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="h-10 px-5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-2 text-[11px] uppercase font-bold tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn('text-indigo-400', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Active Clients"
          value={loading ? '—' : stats?.activeClients ?? 0}
          sub={`${stats?.totalClients ?? 0} total`}
          icon={Users}
          color="#818CF8"
        />
        <StatCard
          title="Pending Tasks"
          value={loading ? '—' : stats?.pendingTasks ?? 0}
          sub={`${stats?.inProgressTasks ?? 0} in progress`}
          icon={Clock}
          color="#F59E0B"
        />
        <StatCard
          title="Messages"
          value={loading ? '—' : stats?.totalMessages ?? 0}
          sub={`${stats?.unprocessedMessages ?? 0} unread`}
          icon={FileText}
          color="#10B981"
        />
        <StatCard
          title="Channels"
          value="2"
          sub="WA + Email"
          icon={MessageSquare}
          color="#6366F1"
        />
      </div>

      <div className="grid grid-cols-12 gap-8 mt-4">
        {/* Recent messages stream */}
        <div className="col-span-8 glass rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Stream Detection Intelligence
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono italic">REAL-TIME MONITOR</span>
          </div>
          <div className="divide-y divide-white/5">
            {loading && (
              <div className="p-8 text-center text-zinc-600 text-sm">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-500/40" />
                Loading stream…
              </div>
            )}
            {!loading && (!stats?.recentMessages || stats.recentMessages.length === 0) && (
              <div className="p-8 text-center text-zinc-600 text-sm">
                No messages yet. Configure WhatsApp &amp; Email to start receiving.
              </div>
            )}
            {stats?.recentMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold border',
                      msg.channel === 'whatsapp'
                        ? 'bg-green-950/30 border-green-500/20 text-green-400'
                        : 'bg-blue-950/30 border-blue-500/20 text-blue-400'
                    )}
                  >
                    {msg.channel === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-zinc-100 italic serif">
                      {msg.clientName || msg.sender}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono line-clamp-1 max-w-xs">
                      {msg.snippet}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {msg.category && (
                    <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] uppercase font-bold text-indigo-400">
                      {msg.category}
                    </span>
                  )}
                  {!msg.processed && (
                    <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] uppercase font-bold text-amber-400">
                      Unanalyzed
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600 font-mono">{formatTime(msg.timestamp)}</span>
                  <ArrowUpRight
                    size={14}
                    className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Task progress */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 italic">
              Queue Priority
            </h3>
            {loading ? (
              <div className="text-zinc-600 text-xs text-center py-4">Loading…</div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Active Clients</span>
                    <span className="text-indigo-400 font-bold">
                      {stats?.totalClients
                        ? Math.round(((stats.activeClients) / stats.totalClients) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      style={{
                        width: `${
                          stats?.totalClients
                            ? Math.round((stats.activeClients / stats.totalClients) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Tasks In Progress</span>
                    <span className="text-indigo-400 font-bold">
                      {stats && (stats.pendingTasks + stats.inProgressTasks) > 0
                        ? Math.round(
                            (stats.inProgressTasks /
                              (stats.pendingTasks + stats.inProgressTasks)) *
                              100
                          )
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                      style={{
                        width: `${
                          stats && (stats.pendingTasks + stats.inProgressTasks) > 0
                            ? Math.round(
                                (stats.inProgressTasks /
                                  (stats.pendingTasks + stats.inProgressTasks)) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Messages Processed</span>
                    <span className="text-indigo-400 font-bold">
                      {stats?.totalMessages
                        ? Math.round(
                            ((stats.totalMessages - stats.unprocessedMessages) /
                              stats.totalMessages) *
                              100
                          )
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${
                          stats?.totalMessages
                            ? Math.round(
                                ((stats.totalMessages - stats.unprocessedMessages) /
                                  stats.totalMessages) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Protocol status */}
          <div className="glass rounded-2xl p-6 bg-indigo-500/5 border-indigo-500/20">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
              Protocol Status
            </h3>
            <p className="text-[11px] text-zinc-500 mb-4">
              Encryption layer active. Multi-factor handshake required for sensitive exports.
            </p>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 text-center">
              <span className="text-[10px] font-mono text-green-500 uppercase">
                {loading ? 'Connecting...' : 'System Nominal ✓'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
