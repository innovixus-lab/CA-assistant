/**
 * DevHelper — floating panel (bottom-right) that shows portal links and
 * localStorage state for quick testing. Only renders in development.
 *
 * Remove this component (or the import in Layout.tsx) before going to production.
 */

import React, { useEffect, useState } from 'react';
import { subscribeClients, type Client } from '../lib/firestore';
import { cn } from '../lib/utils';
import {
  Bug,
  X,
  ExternalLink,
  Copy,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-zinc-600 hover:text-indigo-400 transition-colors shrink-0"
    >
      {copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function DevHelper() {
  const [open, setOpen]       = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [tab, setTab]         = useState<'portal' | 'storage'>('portal');
  const [storageData, setStorageData] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = subscribeClients(setClients);
    return () => unsub();
  }, []);

  const refreshStorage = () => {
    const keys = ['ls_clients', 'ls_tasks', 'ls_documents', 'ls_messages', 'ls_employees', 'ls_payments'];
    const counts: Record<string, number> = {};
    keys.forEach(k => {
      try { counts[k] = JSON.parse(localStorage.getItem(k) ?? '[]').length; }
      catch { counts[k] = 0; }
    });
    setStorageData(counts);
  };

  useEffect(() => { if (open) refreshStorage(); }, [open]);

  const clearAll = () => {
    ['ls_clients','ls_tasks','ls_documents','ls_messages','ls_employees','ls_payments','ls_seed_version'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all',
          open
            ? 'bg-zinc-800 border border-zinc-700 text-zinc-300'
            : 'bg-indigo-600 text-white hover:bg-indigo-500'
        )}
        title="Dev Helper"
      >
        {open ? <X size={16} /> : <Bug size={16} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="w-80 glass rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Bug size={13} className="text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">Dev Helper</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase tracking-widest border border-amber-500/30">
                Local Mode
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            {(['portal', 'storage'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); if (t === 'storage') refreshStorage(); }}
                className={cn(
                  'flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                  tab === t ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                {t === 'portal' ? 'Portal Links' : 'Storage'}
              </button>
            ))}
          </div>

          {/* Portal links tab */}
          {tab === 'portal' && (
            <div className="p-3 flex flex-col gap-2 max-h-72 overflow-y-auto">
              {/* Employee portal link */}
              <div className="bg-indigo-500/10 rounded-xl p-3 border border-indigo-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 serif italic">Employee Portal</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold uppercase border border-indigo-500/30">Staff</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 rounded-lg px-2 py-1.5 border border-zinc-800">
                  <span className="text-[9px] text-zinc-500 font-mono flex-1">/employee</span>
                  <CopyBtn text={`${window.location.origin}/employee`} />
                  <a href="/employee" target="_blank" rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-indigo-400 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="text-[9px] text-zinc-600">Logins: rajesh / anita / vikram (see passwords below)</p>
              </div>

              <p className="text-[10px] text-zinc-600 px-1 mt-1">
                Client portals — click ↗ to open in a new tab.
              </p>
              {clients.length === 0 && (
                <p className="text-[11px] text-zinc-600 text-center py-4">No clients in localStorage yet.</p>
              )}
              {clients.map(c => {
                const url = `${window.location.origin}/portal/${c.id}`;
                return (
                  <div key={c.id} className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800 flex flex-col gap-2">
                    {/* Client name + status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 serif italic">{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        {c.pendingPayment && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase border border-amber-500/30">
                            Payment Due
                          </span>
                        )}
                        <span className={cn(
                          'text-[8px] px-1.5 py-0.5 rounded font-bold uppercase border',
                          c.status === 'Active'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-zinc-800 text-zinc-600 border-zinc-700'
                        )}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    {/* PIN */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">PIN:</span>
                      <span className="text-[11px] font-mono text-indigo-300 tracking-widest">
                        {c.portalPin || <span className="text-zinc-600 italic">not set</span>}
                      </span>
                    </div>

                    {/* URL row */}
                    <div className="flex items-center gap-2 bg-zinc-950 rounded-lg px-2 py-1.5 border border-zinc-800">
                      <span className="text-[9px] text-zinc-500 font-mono flex-1 truncate">/portal/{c.id}</span>
                      <CopyBtn text={url} />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-indigo-400 transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Storage tab */}
          {tab === 'storage' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                {Object.entries(storageData).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between bg-zinc-900/60 rounded-lg px-3 py-2 border border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-400">{key}</span>
                    <span className="text-[11px] font-bold text-indigo-400">{count} records</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={refreshStorage}
                  className="flex-1 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold uppercase tracking-widest text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 h-8 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 size={11} /> Reset All
                </button>
              </div>
              <p className="text-[9px] text-zinc-700 text-center">
                Reset clears all localStorage and reloads with fresh seed data.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
