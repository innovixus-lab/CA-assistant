/**
 * CALogin — Chartered Accountant login gate.
 *
 * Shown when the user visits the root "/" path and has no active CA session.
 * On successful login the parent (App.tsx) receives the authenticated Employee
 * and renders the full CA dashboard.
 */

import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, BriefcaseBusiness } from 'lucide-react';
import { authenticateCA, type Employee } from '../lib/firestore';
import ThemeToggle from '../components/ThemeToggle';
import { cn } from '../lib/utils';

interface CALoginProps {
  onLogin: (ca: Employee) => void;
}

export default function CALogin({ onLogin }: CALoginProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    const ca = await authenticateCA(email.trim(), password);
    if (ca) {
      onLogin(ca);
    } else {
      setError('Invalid credentials or insufficient privileges.');
    }
    setLoading(false);
  };

  const fillDemo = () => {
    setEmail('rajesh@finnca.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <ThemeToggle variant="float" />

      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-4xl font-bold italic serif text-indigo-400 mb-1">FinnCA</h1>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Chartered Accountant Portal
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 border border-[var(--border-default)] flex flex-col gap-6">
          {/* Icon + heading */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <BriefcaseBusiness size={26} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-[var(--text-primary)] serif italic">CA Sign In</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Access restricted to authorised CAs only
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ca@finnca.com"
                autoFocus
                autoComplete="username"
                className={cn(
                  'h-11 px-4 bg-[var(--bg-elevated)] border rounded-xl text-sm text-[var(--text-primary)]',
                  'outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-faint)]',
                  error ? 'border-red-500/60' : 'border-[var(--border-default)]'
                )}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'h-11 px-4 bg-[var(--bg-elevated)] border rounded-xl text-sm text-[var(--text-primary)]',
                  'outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-faint)]',
                  error ? 'border-red-500/60' : 'border-[var(--border-default)]'
                )}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-[11px] tracking-widest transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] flex flex-col gap-2">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-faint)]">
              Demo Credentials
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="flex items-center justify-between text-left hover:bg-white/5 rounded-lg px-2 py-1.5 transition-colors group"
            >
              <span className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                Rajesh K. (CA Admin)
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors">
                rajesh@finnca.com
              </span>
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-[var(--text-faint)]">
          <button
            onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
          >
            ← Back to home
          </button>
        </p>
        <p className="text-center text-[10px] text-[var(--text-faint)]">
          Employee? Visit{' '}
          <a
            href="/employee"
            className="text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
          >
            /employee
          </a>
        </p>
      </div>
    </div>
  );
}
