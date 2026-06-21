import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Files, CheckSquare, Inbox, LogOut, LayoutDashboard,
  Search, X, MessageSquare, Mail, FileText, CheckCircle2,
  UserCog, IndianRupee, BarChart2, Menu, Settings2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { subscribeMessages, subscribeClients, subscribeTasks, subscribeDocs, type Message, type Client, type Task, type VaultDocument } from '../lib/firestore';
import ThemeToggle from './ThemeToggle';
import DevHelper from './DevHelper';
import { getHealth } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  caName?: string;
  onLogout?: () => void;
}

type SearchResult =
  | { kind: 'message'; item: Message }
  | { kind: 'client'; item: Client }
  | { kind: 'task'; item: Task }
  | { kind: 'document'; item: VaultDocument };

function GlobalSearch({ onClose, onNavigate }: { onClose: () => void; onNavigate: (tab: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [allClients, setAllClients]   = useState<Client[]>([]);
  const [allTasks, setAllTasks]       = useState<Task[]>([]);
  const [allDocs, setAllDocs]         = useState<VaultDocument[]>([]);

  useEffect(() => {
    const u1 = subscribeMessages(setAllMessages, 200);
    const u2 = subscribeClients(setAllClients);
    const u3 = subscribeTasks(setAllTasks);
    const u4 = subscribeDocs(setAllDocs);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const r: SearchResult[] = [];
    allMessages.forEach(m => {
      if (m.sender.toLowerCase().includes(q) || m.snippet.toLowerCase().includes(q) || (m.clientName||'').toLowerCase().includes(q))
        r.push({ kind: 'message', item: m });
    });
    allClients.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.pan.toLowerCase().includes(q))
        r.push({ kind: 'client', item: c });
    });
    allTasks.forEach(t => {
      if (t.title.toLowerCase().includes(q) || t.client.toLowerCase().includes(q))
        r.push({ kind: 'task', item: t });
    });
    allDocs.forEach(d => {
      if (d.name.toLowerCase().includes(q) || d.client.toLowerCase().includes(q))
        r.push({ kind: 'document', item: d });
    });
    setResults(r.slice(0, 12));
  }, [query, allMessages, allClients, allTasks, allDocs]);

  const tabForKind: Record<SearchResult['kind'], string> = { message:'inbox', client:'clients', task:'tasks', document:'documents' };
  const iconForKind = (kind: SearchResult['kind']) => {
    switch (kind) {
      case 'message':  return <MessageSquare size={14} className="text-green-400" />;
      case 'client':   return <Users size={14} className="text-indigo-400" />;
      case 'task':     return <CheckSquare size={14} className="text-amber-400" />;
      case 'document': return <FileText size={14} className="text-blue-400" />;
    }
  };
  const labelForResult = (r: SearchResult) => {
    switch (r.kind) {
      case 'message':  return `${r.item.sender} — ${r.item.snippet.slice(0,60)}`;
      case 'client':   return `${r.item.name} (${r.item.pan})`;
      case 'task':     return `${r.item.title} · ${r.item.client}`;
      case 'document': return `${r.item.name} · ${r.item.client}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl glass rounded-2xl border border-zinc-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search size={16} className="text-zinc-500 shrink-0" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, tasks, messages, documents…"
            className="flex-1 bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-600 min-w-0" />
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors shrink-0"><X size={16} /></button>
        </div>
        {results.length > 0 && (
          <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} onClick={() => { onNavigate(tabForKind[r.kind]); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                {iconForKind(r.kind)}
                <span className="text-sm text-zinc-300 truncate flex-1">{labelForResult(r)}</span>
                <span className="ml-auto text-[9px] uppercase font-bold tracking-widest text-zinc-600 shrink-0">{r.kind}</span>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && <div className="px-4 py-5 text-center text-zinc-600 text-sm">No results for "{query}"</div>}
        {!query && <div className="px-4 py-3 text-xs text-zinc-600">Type to search across all data.</div>}
      </div>
    </div>
  );
}

export default function Layout({ children, activeTab, setActiveTab, caName, onLogout }: LayoutProps) {
  const [unreadCount, setUnreadCount]   = useState(0);
  const [whatsappLive, setWhatsappLive] = useState(false);
  const [emailPolling, setEmailPolling] = useState(false);
  const [showSearch, setShowSearch]     = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  useEffect(() => {
    const unsub = subscribeMessages(msgs => {
      setUnreadCount(msgs.filter(m => !m.processed && m.direction === 'inbound').length);
    }, 50);
    return () => unsub();
  }, []);

  useEffect(() => {
    getHealth().then(data => {
      setWhatsappLive(!!data.whatsapp);
      setEmailPolling(!!data.emailPolling);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(s => !s); }
      if (e.key === 'Escape') { setShowSearch(false); setSidebarOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close sidebar when tab changes on mobile
  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const menuItems = [
    { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
    { id: 'inbox',       label: 'Inbox',       icon: Inbox,      badge: unreadCount },
    { id: 'clients',     label: 'Clients',     icon: Users },
    { id: 'tasks',       label: 'Tasks',       icon: CheckSquare },
    { id: 'documents',   label: 'Vault',       icon: Files },
    { id: 'finance',     label: 'Finance',     icon: IndianRupee },
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'team',        label: 'Team',        icon: UserCog },
    { id: 'settings',    label: 'Comm Setup',  icon: Settings2 },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-5 sm:p-6">
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight italic serif text-indigo-400">FinnCA</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Professional Suite v4.0</p>
          </div>
          {/* Close button — mobile only */}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 rounded-md',
                activeTab === item.id
                  ? 'bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500'
                  : 'text-zinc-400 hover:bg-white/5'
              )}>
              <item.icon size={16} />
              <span className="font-medium">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 sm:mt-8">
          <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 px-4 font-bold">Active Sources</h3>
          <div className="space-y-2 px-4">
            {[
              { label: 'WhatsApp', icon: MessageSquare, live: whatsappLive, liveLabel: 'LIVE',    offLabel: 'OFFLINE', liveClass: 'bg-green-500/10 text-green-400', offClass: 'bg-zinc-800 text-zinc-500' },
              { label: 'Email',    icon: Mail,          live: emailPolling, liveLabel: 'POLLING', offLabel: 'OFFLINE', liveClass: 'bg-blue-500/10 text-blue-400',  offClass: 'bg-zinc-800 text-zinc-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-zinc-400"><s.icon size={12} /> {s.label}</div>
                <span className={cn('px-2 py-0.5 rounded font-bold text-[9px] uppercase', s.live ? s.liveClass : s.offClass)}>
                  {s.live ? s.liveLabel : s.offLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-3 mb-3 p-2">
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold border border-zinc-700">CA</div>
          <div>
            <p className="text-xs font-semibold">{caName ?? 'CA Admin'}</p>
            <p className="text-[10px] text-zinc-500 tracking-tighter">Senior Partner</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogOut size={14} /><span>Terminate Session</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-[#F4F4F5] font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0A0A0B] border-r border-zinc-800 flex flex-col justify-between overflow-y-auto z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-800 flex-col justify-between shrink-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0E0E10] min-w-0">
        <header className="h-14 sm:h-16 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-8 bg-[#0A0A0B]/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Menu size={20} />
            </button>
            <h2 className="text-xs sm:text-sm font-medium text-zinc-300 uppercase tracking-widest truncate">
              {activeTab.replace('-', ' ')}
            </h2>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0" />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search — icon on mobile, full bar on desktop */}
            <button onClick={() => setShowSearch(true)}
              className="sm:hidden w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              <Search size={18} />
            </button>
            <button onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full py-1.5 px-4 text-[11px] w-52 lg:w-64 text-zinc-500 hover:border-zinc-700 transition-colors">
              <Search size={12} />
              <span>Global search…</span>
              <span className="ml-auto text-[10px] font-mono text-zinc-700 hidden lg:block">⌘K</span>
            </button>

            <ThemeToggle variant="inline" />

            <button onClick={() => handleTabChange('tasks')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] sm:text-[11px] px-3 sm:px-4 py-2 rounded-lg font-bold uppercase tracking-tight transition-colors whitespace-nowrap">
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">+ New</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </main>

      {showSearch && (
        <GlobalSearch onClose={() => setShowSearch(false)} onNavigate={tab => { handleTabChange(tab); }} />
      )}

      <DevHelper />
    </div>
  );
}
