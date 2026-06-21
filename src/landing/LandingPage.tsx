import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText, CheckCircle, IndianRupee, Bell, Shield, Zap, Clock,
  Users, Inbox, BarChart2, Building2, ArrowRight, Star, Check,
  ChevronRight, MessageSquare, Phone, FolderOpen, Menu, X,
  Lock, Upload, Smartphone, Download, AlertCircle, TrendingUp,
  Calendar, User, Tag, Send, Paperclip, Eye, Globe
} from 'lucide-react';

/* ─── Animation keyframes injected as a <style> tag ─────────────────────── */
const KEYFRAMES = `
@keyframes aurora-shift {
  0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.4; }
  33%       { transform: translate(8%, -12%) scale(1.15); opacity: 0.6; }
  66%       { transform: translate(-6%, 10%) scale(0.9); opacity: 0.35; }
}
@keyframes beam-fall {
  0%   { transform: translateY(-100%); opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.3; }
  100% { transform: translateY(100vh); opacity: 0; }
}
@keyframes sparkle-twinkle {
  0%, 100% { opacity: 0.1; transform: scale(0.8); }
  50%       { opacity: 0.9; transform: scale(1.2); }
}
@keyframes blob-drift {
  0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0,0) rotate(0deg); }
  25%       { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(20px,-15px) rotate(5deg); }
  50%       { border-radius: 50% 60% 30% 60% / 40% 70% 60% 30%; transform: translate(-10px, 20px) rotate(-3deg); }
  75%       { border-radius: 70% 30% 60% 40% / 60% 40% 50% 70%; transform: translate(15px, -5px) rotate(7deg); }
}
@keyframes float-y {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
}
@keyframes pulse-ring {
  0%   { transform: scale(0.9); opacity: 0.8; }
  70%  { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(0.9); opacity: 0; }
}
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.08 }
  }),
};

/* ─── Beam component ───────────────────────────────────────────────────────── */
function Beam({ left, delay, opacity = 0.4 }: { left: string; delay: string; opacity?: number }) {
  return (
    <div
      className="absolute top-0 w-px pointer-events-none"
      style={{
        left,
        height: '100%',
        background: 'linear-gradient(to bottom, transparent, #6366F1, transparent)',
        animation: `beam-fall 4s linear ${delay} infinite`,
        opacity,
      }}
    />
  );
}

/* ─── Sparkle dot ──────────────────────────────────────────────────────────── */
function Sparkle({ top, left, delay }: { top: string; left: string; delay: string }) {
  return (
    <div
      className="absolute w-1 h-1 rounded-full bg-indigo-400 pointer-events-none"
      style={{
        top, left,
        animation: `sparkle-twinkle ${2 + Math.random() * 2}s ease-in-out ${delay} infinite`,
      }}
    />
  );
}

/* ─── Section wrapper ──────────────────────────────────────────────────────── */
function Section({
  id, className, children
}: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn('relative overflow-hidden', className)}>
      {children}
    </section>
  );
}

/* ─── Glass card ───────────────────────────────────────────────────────────── */
function GlassCard({
  className, children, hover = true
}: { className?: string; children: React.ReactNode; hover?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-sm',
        hover && 'hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ─── Badge ────────────────────────────────────────────────────────────────── */
function Badge({ children, color = 'indigo' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    green:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    amber:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
    red:    'bg-red-500/15 text-red-400 border-red-500/25',
    blue:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', colors[color] ?? colors.indigo)}>
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   SPA navigation helper — uses pushState so App.tsx route detection fires
   without a full page reload.
────────────────────────────────────────────────────────────────────────────── */
function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* ══════════════════════════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════════════════════════ */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { label: 'Features',     href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing',      href: '#pricing' },
    { label: 'Customers',    href: '#testimonials' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="serif italic text-xl font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
              FinnCA
            </span>
          </button>

          {/* Desktop anchor links (smooth-scroll within the page) */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-zinc-300 hover:text-white px-4 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-1.5 rounded-lg transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Start free trial
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-zinc-400 hover:text-white p-2 rounded-lg"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-[#0E0E10]/95 backdrop-blur-xl border-b border-white/8 px-4 pb-4">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm text-zinc-300 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="flex-1 text-center text-sm text-zinc-300 border border-white/10 rounded-lg py-2"
            >
              Log in
            </button>
            <button
              onClick={() => { setOpen(false); navigate('/login'); }}
              className="flex-1 text-center text-sm font-medium bg-indigo-500 text-white rounded-lg py-2"
            >
              Start free trial
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HERO
══════════════════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <Section className="min-h-screen flex flex-col justify-center pt-16 bg-[#0A0A0B]">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            animation: 'aurora-shift 10s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 -right-32 w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
            animation: 'aurora-shift 14s ease-in-out 2s infinite',
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
            animation: 'blob-drift 18s ease-in-out infinite',
          }}
        />
        {/* Grid lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Falling beams */}
        <Beam left="10%" delay="0s" opacity={0.3} />
        <Beam left="25%" delay="1.2s" opacity={0.2} />
        <Beam left="50%" delay="0.6s" opacity={0.35} />
        <Beam left="72%" delay="2.1s" opacity={0.2} />
        <Beam left="88%" delay="1.5s" opacity={0.3} />
        {/* Sparkles */}
        <Sparkle top="20%" left="15%" delay="0s" />
        <Sparkle top="35%" left="80%" delay="0.8s" />
        <Sparkle top="60%" left="25%" delay="1.6s" />
        <Sparkle top="75%" left="65%" delay="0.4s" />
        <Sparkle top="15%" left="55%" delay="2s" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Eyebrow */}
        <motion.div
          variants={fadeIn} initial="hidden" animate="visible"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: 'sparkle-twinkle 1.5s ease-in-out infinite' }} />
          Trusted by 500+ CA firms across India
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp} initial="hidden" animate="visible" custom={1}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-zinc-50 leading-tight tracking-tight max-w-5xl mx-auto"
        >
          Run your entire{' '}
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #4F46E5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CA practice
          </span>
          <br />from one command center
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={fadeUp} initial="hidden" animate="visible" custom={2}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Manage client records, tasks, GST invoices, and team workflows — all from
          one dashboard. Upgrade to unlock WhatsApp document delivery to every client.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={3}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/login')}
            className="group flex items-center gap-2 px-7 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200"
          >
            Start free trial
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#pricing"
            className="flex items-center gap-2 px-7 py-3.5 text-zinc-200 font-semibold rounded-xl border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200"
          >
            View pricing
            <ChevronRight size={16} />
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={4}
          className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8"
        >
          {[
            { icon: <Zap size={14} />,       label: 'Free trial on Starter plan' },
            { icon: <Building2 size={14} />, label: 'Built for Indian CAs' },
            { icon: <Clock size={14} />,     label: 'Setup in under an hour' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-2 text-zinc-400 text-sm">
              <span className="text-indigo-400">{b.icon}</span>
              {b.label}
            </div>
          ))}
        </motion.div>

        {/* Hero dashboard mockup */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible" custom={5}
          className="mt-20 relative"
        >
          {/* Glow under card */}
          <div
            className="absolute inset-x-1/4 top-4 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)' }}
          />
          <GlassCard className="max-w-5xl mx-auto overflow-hidden" hover={false}>
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex-1 mx-4 bg-white/5 rounded-md h-5 flex items-center px-3">
                <span className="text-zinc-500 text-xs">app.finnca.in/dashboard</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-4 bg-[#0A0A0B]">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Clients', value: '247', icon: <Users size={16} />, color: 'text-indigo-400' },
                  { label: 'Docs Sent Today', value: '38', icon: <FileText size={16} />, color: 'text-emerald-400' },
                  { label: 'Open Tasks', value: '14', icon: <CheckCircle size={16} />, color: 'text-amber-400' },
                  { label: 'Revenue (Nov)', value: '₹1.4L', icon: <IndianRupee size={16} />, color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 border border-white/8">
                    <div className={cn('mb-1', s.color)}>{s.icon}</div>
                    <div className="text-lg font-bold text-zinc-100">{s.value}</div>
                    <div className="text-xs text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>
              {/* Activity + recent docs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 bg-white/[0.03] rounded-xl border border-white/8 p-3">
                  <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Recent Activity</div>
                  {[
                    { msg: 'ITR FY24 sent to Rakesh Gupta via WhatsApp', time: '2 min ago', dot: '#10B981' },
                    { msg: 'Invoice #INV-0142 raised for ₹12,000', time: '18 min ago', dot: '#6366F1' },
                    { msg: 'GST filing task marked complete by Ananya', time: '1 hr ago', dot: '#F59E0B' },
                    { msg: 'New document uploaded: Balance Sheet FY24', time: '3 hr ago', dot: '#818CF8' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.dot }} />
                      <span className="text-xs text-zinc-300 flex-1">{a.msg}</span>
                      <span className="text-xs text-zinc-600 flex-shrink-0">{a.time}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.03] rounded-xl border border-white/8 p-3">
                  <div className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Team Tasks</div>
                  {[
                    { task: 'File GSTR-1 for October', assignee: 'Ananya', priority: 'High', color: 'text-red-400' },
                    { task: 'Send ITR to 12 clients', assignee: 'Rahul', priority: 'Med', color: 'text-amber-400' },
                    { task: 'Reconcile TDS entries', assignee: 'Priti', priority: 'Low', color: 'text-emerald-400' },
                  ].map((t, i) => (
                    <div key={i} className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
                      <span className="text-xs text-zinc-200">{t.task}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">{t.assignee}</span>
                        <span className={cn('text-xs font-medium', t.color)}>{t.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BEFORE / AFTER
══════════════════════════════════════════════════════════════════════════════ */
function BeforeAfter() {
  return (
    <Section className="py-24 bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">The difference is instant</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">
            The same client request, two outcomes
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
            See exactly how FinnCA transforms how you respond to clients — from chaos to a five-second WhatsApp delivery.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" custom={1} viewport={{ once: true }}
          >
            <GlassCard className="h-full p-6 border-red-500/20 bg-red-500/[0.03]" hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                  <X size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-semibold text-sm">Before FinnCA</p>
                  <p className="text-zinc-500 text-xs">Manual, stressful, slow</p>
                </div>
              </div>

              {/* Chat-like flow */}
              <div className="space-y-3">
                {[
                  { from: 'client', msg: 'Rajesh ji, please send my ITR copy from last year 🙏', time: '9:14 AM' },
                  { from: 'ca', msg: 'Sure, let me check with my team…', time: '9:45 AM' },
                  { from: 'ca', msg: 'Ananya, where is Sharma ji\'s ITR file? Check the drive.', time: '9:46 AM', internal: true },
                  { from: 'ananya', msg: 'Not sure which folder. Checking now…', time: '10:03 AM', internal: true },
                  { from: 'client', msg: 'Any update?', time: '10:35 AM' },
                  { from: 'ca', msg: 'Found it! Sending on WhatsApp...', time: '11:12 AM' },
                ].map((m, i) => (
                  <div key={i} className={cn('flex flex-col', m.from !== 'client' && 'items-end')}>
                    {m.internal && (
                      <span className="text-xs text-zinc-600 mb-0.5 italic">(Internal team chat)</span>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3 py-2 text-xs max-w-[85%]',
                        m.from === 'client'
                          ? 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                          : m.internal
                          ? 'bg-amber-900/30 text-amber-300 border border-amber-500/20 rounded-tr-sm'
                          : 'bg-zinc-700 text-zinc-100 rounded-tr-sm'
                      )}
                    >
                      {m.from !== 'client' && !m.internal && (
                        <span className="text-indigo-400 text-xs font-medium block mb-0.5">CA</span>
                      )}
                      {m.msg}
                    </div>
                    <span className="text-zinc-600 text-xs mt-0.5">{m.time}</span>
                  </div>
                ))}

                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 text-red-400" />
                  2 hours wasted. Client frustrated. Files scattered across WhatsApp, Drive, email.
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* After */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" custom={2} viewport={{ once: true }}
          >
            <GlassCard className="h-full p-6 border-emerald-500/20 bg-emerald-500/[0.03]" hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 font-semibold text-sm">After FinnCA</p>
                  <p className="text-zinc-500 text-xs">Automated, instant, professional</p>
                </div>
              </div>

              {/* WhatsApp mockup */}
              <div className="rounded-2xl bg-[#0D1117] border border-white/8 overflow-hidden">
                {/* WA header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#1B1F23] border-b border-white/8">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold">R</div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">Rajesh Sharma</p>
                    <p className="text-xs text-emerald-400">online</p>
                  </div>
                  <div className="ml-auto text-emerald-500">
                    <Smartphone size={14} />
                  </div>
                </div>
                {/* Messages */}
                <div className="p-3 space-y-2.5">
                  {[
                    {
                      from: 'client',
                      msg: 'Please send my ITR copy for last year 🙏',
                      time: '9:14 AM'
                    },
                    {
                      from: 'bot',
                      msg: '✅ Found 3 documents for you, Rajesh ji!\n\nPlease enter your 4-digit PIN to download:',
                      time: '9:14 AM'
                    },
                    {
                      from: 'client',
                      msg: '****',
                      time: '9:14 AM'
                    },
                    {
                      from: 'bot',
                      msg: '📄 ITR_AY2024-25_RajeshSharma.pdf\n📄 Computation_AY2024-25.pdf\n\nSending now...',
                      time: '9:14 AM'
                    },
                    {
                      from: 'bot',
                      msg: '✅ 2 files delivered successfully! Have a great day 🙏\n\n— FinnCA | Mehta & Associates',
                      time: '9:14 AM'
                    },
                  ].map((m, i) => (
                    <div key={i} className={cn('flex', m.from === 'client' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'rounded-2xl px-3 py-2 text-xs max-w-[85%] whitespace-pre-line',
                          m.from === 'client'
                            ? 'bg-emerald-600 text-white rounded-br-sm'
                            : 'bg-[#1B2030] text-zinc-200 rounded-bl-sm border border-white/8'
                        )}
                      >
                        {m.from === 'bot' && (
                          <span className="text-emerald-400 text-xs font-semibold block mb-0.5">FinnCA Bot</span>
                        )}
                        {m.msg}
                        <div className="text-right">
                          <span className="text-xs opacity-50 mt-1 inline-block">{m.time} {m.from === 'client' && '✓✓'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <Zap size={14} className="flex-shrink-0 text-emerald-400" />
                Total time: 8 seconds. Client happy. Zero CA involvement required.
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════════════════════════════════════════ */
function StatsBar() {
  const stats = [
    { icon: <Zap size={22} />, title: 'Instant delivery', desc: 'Documents in seconds, not hours', value: '<8s' },
    { icon: <Shield size={22} />, title: 'Bank-grade encryption', desc: 'Every file encrypted at rest & in transit', value: '256-bit' },
    { icon: <TrendingUp size={22} />, title: '10+ hours/week saved', desc: 'Cut repetitive client follow-ups', value: '10h+' },
  ];

  return (
    <Section className="py-16 bg-[#0E0E10] border-y border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/8">
          {stats.map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeUp} initial="hidden" whileInView="visible" custom={i} viewport={{ once: true }}
              className="flex items-start gap-4 px-6 sm:px-8 py-8 first:pl-0 last:pr-0"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0 text-indigo-400">
                {s.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-zinc-50 mb-0.5">{s.value}</div>
                <div className="text-sm font-semibold text-zinc-200">{s.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PROBLEMS
══════════════════════════════════════════════════════════════════════════════ */
function Problems() {
  const problems = [
    {
      icon: <Phone size={20} />,
      title: 'Endless phone calls',
      desc: '"Can you send my ITR?" — 40 times a day, for the same 10 documents.',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      icon: <Paperclip size={20} />,
      title: 'Manual file sharing',
      desc: 'Hunting through WhatsApp threads, Google Drive folders, and email for one PDF.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      icon: <Eye size={20} className="opacity-50" />,
      title: 'No structured records',
      desc: 'No client history, no GSTIN log, no payment trail. Everything in someone\'s head.',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  return (
    <Section id="features" className="py-24 bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">Pain points</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">Sound familiar?</h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Every CA firm we spoke to described the same daily struggles. FinnCA was built to solve all of them.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              variants={fadeUp} initial="hidden" whileInView="visible" custom={i + 1} viewport={{ once: true }}
            >
              <GlassCard className={cn('p-6 h-full', p.border, p.bg.replace('10', '[0.04]'))}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', p.bg, p.color, 'border', p.border)}>
                  {p.icon}
                </div>
                <h3 className="text-base font-semibold text-zinc-100 mb-2">{p.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   FEATURES
══════════════════════════════════════════════════════════════════════════════ */

/* — Widget: Document Vault — */
function VaultWidget() {
  const files = [
    { name: 'ITR_AY2024-25_Sharma.pdf', type: 'ITR', size: '240 KB', badge: 'indigo', date: '12 Nov 2024' },
    { name: 'GSTR1_Oct_2024_Patel.pdf', type: 'GST', size: '180 KB', badge: 'emerald', date: '8 Nov 2024' },
    { name: 'BalanceSheet_FY24_Mehta.xlsx', type: 'Balance Sheet', size: '420 KB', badge: 'blue', date: '5 Nov 2024' },
    { name: 'Computation_AY24_Gupta.pdf', type: 'ITR', size: '156 KB', badge: 'indigo', date: '1 Nov 2024' },
    { name: 'Form26AS_FY24_Shah.pdf', type: '26AS', size: '95 KB', badge: 'purple', date: '28 Oct 2024' },
  ];
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <FolderOpen size={14} className="text-indigo-400" />
          Document Vault
        </div>
        <Badge>247 files</Badge>
      </div>
      <div className="divide-y divide-white/5">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
              <FileText size={12} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200 truncate">{f.name}</p>
              <p className="text-xs text-zinc-500">{f.size} · {f.date}</p>
            </div>
            <Badge color={f.badge as any}>{f.type}</Badge>
            <Send size={12} className="text-zinc-600 hover:text-emerald-400 transition-colors flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8 bg-white/[0.01]">
        <button className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
          <Upload size={12} /> Upload documents
        </button>
        <span className="text-zinc-700">·</span>
        <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <Globe size={12} /> Share portal link
        </button>
      </div>
    </GlassCard>
  );
}

/* — Widget: Task Board — */
function TaskWidget() {
  const tasks = [
    { title: 'File GSTR-1 Oct 2024', assignee: 'Ananya S.', due: 'Nov 20', priority: 'High', color: 'red', done: false },
    { title: 'Send ITR pack to 8 clients', assignee: 'Rahul M.', due: 'Nov 22', priority: 'Med', color: 'amber', done: false },
    { title: 'TDS reconciliation Q2', assignee: 'Priti K.', due: 'Nov 25', priority: 'Low', color: 'blue', done: true },
    { title: 'Raise Nov invoices batch', assignee: 'Ananya S.', due: 'Nov 30', priority: 'Med', color: 'amber', done: false },
  ];
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <CheckCircle size={14} className="text-emerald-400" />
          Task Board
        </div>
        <div className="flex items-center gap-2">
          <Badge color="red">3 open</Badge>
          <Badge color="green">1 done</Badge>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {tasks.map((t, i) => (
          <div key={i} className={cn('flex items-center gap-3 px-4 py-2.5', t.done && 'opacity-50')}>
            <div className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              t.done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
            )}>
              {t.done && <Check size={10} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs text-zinc-200', t.done && 'line-through text-zinc-500')}>{t.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <User size={10} className="text-zinc-600" />
                <span className="text-xs text-zinc-500">{t.assignee}</span>
                <Calendar size={10} className="text-zinc-600" />
                <span className="text-xs text-zinc-500">{t.due}</span>
              </div>
            </div>
            <Badge color={t.color as any}>{t.priority}</Badge>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* — Widget: GST Invoice — */
function InvoiceWidget() {
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <IndianRupee size={14} className="text-indigo-400" />
          Invoice #INV-0147
        </div>
        <Badge color="amber">Draft</Badge>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-between text-xs">
          <div>
            <p className="text-zinc-500">Billed to</p>
            <p className="text-zinc-200 font-medium mt-0.5">Rajesh Sharma & Associates</p>
            <p className="text-zinc-500">GSTIN: 27AABCS1429B1Z5</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500">Invoice date</p>
            <p className="text-zinc-200 font-medium mt-0.5">Nov 15, 2024</p>
            <p className="text-zinc-500">Due: Nov 30, 2024</p>
          </div>
        </div>
        {/* Line items */}
        <div className="rounded-lg bg-white/[0.03] border border-white/8 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-white/[0.02] border-b border-white/5 text-xs text-zinc-500">
            <span className="col-span-6">Description</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-2 text-right">Rate</span>
            <span className="col-span-2 text-right">Amount</span>
          </div>
          {[
            { desc: 'ITR Filing AY 2024-25', qty: 1, rate: 5000, amt: 5000 },
            { desc: 'GSTR-1 (Monthly)', qty: 2, rate: 1500, amt: 3000 },
            { desc: 'Balance Sheet Prep', qty: 1, rate: 4000, amt: 4000 },
          ].map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-1.5 border-b border-white/5 last:border-0 text-xs text-zinc-300">
              <span className="col-span-6">{l.desc}</span>
              <span className="col-span-2 text-right text-zinc-400">{l.qty}</span>
              <span className="col-span-2 text-right text-zinc-400">₹{l.rate.toLocaleString()}</span>
              <span className="col-span-2 text-right">₹{l.amt.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {/* Totals */}
        <div className="flex flex-col gap-1 items-end text-xs">
          <div className="flex justify-between w-40">
            <span className="text-zinc-500">Subtotal</span>
            <span className="text-zinc-300">₹12,000</span>
          </div>
          <div className="flex justify-between w-40">
            <span className="text-zinc-500">GST 18%</span>
            <span className="text-zinc-300">₹2,160</span>
          </div>
          <div className="flex justify-between w-40 pt-1 border-t border-white/10">
            <span className="text-zinc-100 font-semibold">Total</span>
            <span className="text-indigo-400 font-bold">₹14,160</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* — Widget: Notifications — */
function NotifWidget() {
  const notifs = [
    { icon: <MessageSquare size={13} />, color: 'text-emerald-400 bg-emerald-500/15', title: 'ITR sent to Patel via WhatsApp', time: '2m ago' },
    { icon: <IndianRupee size={13} />, color: 'text-indigo-400 bg-indigo-500/15', title: 'Invoice #INV-0146 paid — ₹18,000', time: '28m ago' },
    { icon: <CheckCircle size={13} />, color: 'text-amber-400 bg-amber-500/15', title: 'Task "GSTR-3B filing" completed by Ananya', time: '1h ago' },
    { icon: <Upload size={13} />, color: 'text-blue-400 bg-blue-500/15', title: 'New doc uploaded: Audit Report FY24', time: '3h ago' },
    { icon: <User size={13} />, color: 'text-purple-400 bg-purple-500/15', title: 'New client added: Vikram Mehta', time: '5h ago' },
  ];
  return (
    <GlassCard className="overflow-hidden" hover={false}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Bell size={14} className="text-indigo-400" />
          Notifications
        </div>
        <span className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">5</span>
      </div>
      <div className="divide-y divide-white/5">
        {notifs.map((n, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', n.color)}>
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200">{n.title}</p>
            </div>
            <span className="text-xs text-zinc-600 flex-shrink-0">{n.time}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/* — Feature row — */
function FeatureRow({
  reverse, icon, accent, badge, title, desc, bullets, widget, delay = 0
}: {
  reverse?: boolean;
  icon: React.ReactNode;
  accent: string;
  badge: string;
  title: string;
  desc: string;
  bullets: string[];
  widget: React.ReactNode;
  delay?: number;
}) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 border-b border-white/5 last:border-0', reverse && 'lg:[&>*:first-child]:order-2')}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" custom={delay} viewport={{ once: true }}>
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold mb-5 border', accent)}>
          {icon}
          {badge}
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-zinc-50 leading-tight mb-4">{title}</h3>
        <p className="text-zinc-400 leading-relaxed mb-6">{desc}</p>
        <ul className="space-y-2.5">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-zinc-300">
              <Check size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" custom={delay + 1} viewport={{ once: true }}>
        <div
          className="rounded-2xl p-1"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.05), rgba(79,70,229,0.1))' }}
        >
          {widget}
        </div>
      </motion.div>
    </div>
  );
}

function Features() {
  return (
    <Section className="py-8 bg-[#0E0E10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-4 pt-16"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">
            Built for the way Indian CAs work
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
            Every feature was designed around how CA firms actually operate — GST-ready, WhatsApp-first, and India-centric.
          </p>
        </motion.div>

        <FeatureRow
          icon={<FolderOpen size={14} />}
          accent="bg-indigo-500/15 text-indigo-400 border-indigo-500/25"
          badge="Document Vault"
          title="Every client document, in one organised home"
          desc="Upload ITRs, GST filings, balance sheets, and more. Approve files to appear in each client's portal, then deliver them via WhatsApp or email in one click."
          bullets={[
            'Organised by client, year, and document type',
            'One-click WhatsApp / email delivery with read receipts',
            'Client portal with PIN-protected access',
            'Audit trail on every document view and download',
          ]}
          widget={<VaultWidget />}
          delay={1}
        />

        <FeatureRow
          reverse
          icon={<CheckCircle size={14} />}
          accent="bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
          badge="Task Board"
          title="Nothing slips through the cracks"
          desc="Assign tasks to team members with priorities, due dates, and client context. Every deadline visible at a glance — for you and your team."
          bullets={[
            'Kanban-style board with drag-and-drop',
            'Assign to any team member with due dates',
            'Priority flags: High, Medium, Low',
            'Email / WhatsApp reminders before due dates',
          ]}
          widget={<TaskWidget />}
          delay={1}
        />

        <FeatureRow
          icon={<IndianRupee size={14} />}
          accent="bg-blue-500/15 text-blue-400 border-blue-500/25"
          badge="GST Invoicing"
          title="Bill clients in under sixty seconds"
          desc="Raise fully GST-compliant invoices with automatic CGST/SGST/IGST calculation. Track paid and unpaid status. Send invoice PDFs directly to clients."
          bullets={[
            'GSTIN-validated, HSN-code ready invoices',
            'Auto-calculate 18% GST with breakdown',
            'Track paid / unpaid / overdue status',
            'Send invoice PDFs via WhatsApp or email',
          ]}
          widget={<InvoiceWidget />}
          delay={1}
        />

        <FeatureRow
          reverse
          icon={<Bell size={14} />}
          accent="bg-amber-500/15 text-amber-400 border-amber-500/25"
          badge="Real-time Notifications"
          title="Stay on top without checking ten places"
          desc="One unified feed for every event that matters — document deliveries, invoice payments, task completions, and new client activity."
          bullets={[
            'Unified inbox: WhatsApp + email + app',
            'Real-time push notifications',
            'Filter by client, type, or team member',
            'Mark read, snooze, or action directly from the feed',
          ]}
          widget={<NotifWidget />}
          delay={1}
        />
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    {
      num: '01',
      icon: <Upload size={22} />,
      title: 'Upload records',
      desc: 'Import your existing client database and upload their documents. FinnCA organises everything by client, year, and document type automatically.',
      color: 'from-indigo-500/20 to-indigo-600/5',
      iconColor: 'text-indigo-400 bg-indigo-500/15',
    },
    {
      num: '02',
      icon: <Smartphone size={22} />,
      title: 'Connect WhatsApp',
      desc: 'Link your official WhatsApp Business number via the Meta API in under 5 minutes. Your firm\'s number, your brand, your clients.',
      color: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-400 bg-emerald-500/15',
    },
    {
      num: '03',
      icon: <Download size={22} />,
      title: 'Clients self-serve',
      desc: 'Each client gets a personal portal link and PIN. They request or download their documents 24/7 without calling you. Zero CA intervention.',
      color: 'from-purple-500/20 to-purple-600/5',
      iconColor: 'text-purple-400 bg-purple-500/15',
    },
  ];

  return (
    <Section id="how-it-works" className="py-24 bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">Get started fast</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">Up and running in three steps</h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Most CA firms complete their setup in under an hour. No coding, no IT team needed.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent pointer-events-none" />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              variants={fadeUp} initial="hidden" whileInView="visible" custom={i + 1} viewport={{ once: true }}
            >
              <GlassCard className={cn('p-6 h-full bg-gradient-to-br', s.color)}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', s.iconColor)}>
                      {s.icon}
                    </div>
                    <span
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-400"
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="text-5xl font-black text-white/[0.05] leading-none select-none">{s.num}</div>
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRICING
══════════════════════════════════════════════════════════════════════════════ */
function Pricing() {
  // Starter has NO WhatsApp — it gets the free trial CTA
  // Growth + Pro include WhatsApp — they go straight to login/contact
  const plans = [
    {
      name: 'Starter',
      price: '₹5,000',
      period: '/year',
      desc: 'For solo CAs starting to go digital. Includes a 14-day free trial.',
      clients: '100 clients',
      storage: '1 GB storage',
      users: '2 team members',
      highlight: false,
      trialBadge: true,   // only Starter gets free trial
      cta: 'Start free trial',
      features: [
        { text: 'Records Vault (all doc types)', included: true },
        { text: 'Tasks & team management',       included: true },
        { text: 'GST-ready invoicing',           included: true },
        { text: 'Client portal with PIN',        included: true },
        { text: 'Email support',                 included: true },
        { text: 'WhatsApp delivery',             included: false, note: 'Not included' },
      ],
      extra: [],
    },
    {
      name: 'Growth',
      price: '₹9,000',
      period: '/year',
      desc: 'For growing firms with multiple staff and a larger client base.',
      clients: '300 clients',
      storage: '5 GB storage',
      users: '10 team members',
      highlight: true,
      trialBadge: false,
      cta: 'Get started',
      features: [
        { text: 'Records Vault (all doc types)', included: true },
        { text: 'WhatsApp delivery (official API)', included: true },
        { text: 'Tasks & team management',       included: true },
        { text: 'GST-ready invoicing',           included: true },
        { text: 'Client portal with PIN',        included: true },
        { text: 'Performance analytics',         included: true },
        { text: 'Priority support',              included: true },
      ],
      extra: [],
    },
    {
      name: 'Pro',
      price: '₹15,000',
      period: '/year',
      desc: 'For large firms managing complex practices at scale.',
      clients: 'Unlimited clients',
      storage: '10 GB storage',
      users: 'Unlimited members',
      highlight: false,
      trialBadge: false,
      cta: 'Get started',
      features: [
        { text: 'Records Vault (all doc types)', included: true },
        { text: 'WhatsApp delivery (official API)', included: true },
        { text: 'Tasks & team management',       included: true },
        { text: 'GST-ready invoicing',           included: true },
        { text: 'Client portal with PIN',        included: true },
        { text: 'Performance analytics',         included: true },
        { text: 'Custom branding',               included: true },
        { text: 'Dedicated support',             included: true },
      ],
      extra: [],
    },
  ];

  return (
    <Section id="pricing" className="py-24 bg-[#0E0E10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">Transparent pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">Simple annual pricing, no surprises</h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            Start free on the Starter plan — no credit card needed. Upgrade when you're ready for WhatsApp delivery.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              variants={fadeUp} initial="hidden" whileInView="visible" custom={i + 1} viewport={{ once: true }}
              className="flex"
            >
              <div
                className={cn(
                  'flex flex-col w-full rounded-2xl border p-7 transition-all duration-300',
                  p.highlight
                    ? 'border-indigo-500/50 bg-indigo-500/[0.08] shadow-2xl shadow-indigo-500/20 relative'
                    : 'border-white/8 bg-white/[0.04] hover:border-indigo-500/25 hover:bg-white/[0.06]'
                )}
              >
                {/* Most popular badge */}
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/40">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-zinc-100">{p.name}</h3>
                    {p.trialBadge && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                        14-day free trial
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-4">{p.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-zinc-50">{p.price}</span>
                    <span className="text-zinc-400 mb-1">{p.period}</span>
                  </div>
                </div>

                {/* Limits */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {[p.clients, p.storage, p.users].map(l => (
                    <span key={l} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-zinc-300">
                      {l}
                    </span>
                  ))}
                </div>

                {/* Per-plan feature list */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.features.map(f => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X size={14} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={f.included ? 'text-zinc-300' : 'text-zinc-600 line-through'}>
                        {f.text}
                      </span>
                      {!f.included && f.note && (
                        <span className="text-xs text-zinc-600 italic ml-0.5">— {f.note}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => navigate('/login')}
                  className={cn(
                    'block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer',
                    p.trialBadge
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                      : p.highlight
                      ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-white/8 hover:bg-white/12 text-zinc-100 border border-white/10'
                  )}
                >
                  {p.cta}
                </button>

                {/* Trial note only on Starter */}
                {p.trialBadge && (
                  <p className="text-center text-xs text-zinc-600 mt-2">No credit card required</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* WhatsApp callout note */}
        <motion.div
          variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="mt-8 mx-auto max-w-xl rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-5 py-4 flex items-start gap-3"
        >
          <MessageSquare size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-400">
            <span className="text-emerald-400 font-semibold">WhatsApp delivery</span> is available on{' '}
            <span className="text-zinc-200 font-medium">Growth</span> and{' '}
            <span className="text-zinc-200 font-medium">Pro</span> plans only.
            Try the Starter plan free — upgrade any time to unlock WhatsApp.
          </p>
        </motion.div>

        <motion.p
          variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mt-5 text-xs text-zinc-600"
        >
          All prices in INR · GST extra · Annual billing · Starter plan includes 14-day free trial
        </motion.p>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
══════════════════════════════════════════════════════════════════════════════ */
function Testimonials() {
  const testimonials = [
    {
      quote: "FinnCA has completely changed how we serve clients. What used to take us 2 hours of back-and-forth on WhatsApp now happens in seconds. Our clients love the self-serve portal.",
      name: 'CA Rajesh Sharma',
      title: 'Senior Partner',
      firm: 'Sharma & Associates, Mumbai',
      initials: 'RS',
      color: 'from-indigo-500/30 to-indigo-600/10',
    },
    {
      quote: "The GST invoicing and task board alone justified the cost. We no longer use 3 different apps. Everything our team needs is in one place, beautifully designed.",
      name: 'CA Priya Mehta',
      title: 'Founder',
      firm: 'Mehta Tax Consultants, Ahmedabad',
      initials: 'PM',
      color: 'from-emerald-500/25 to-emerald-600/5',
    },
    {
      quote: "I was sceptical at first, but setup took less than an hour. Within a week, my team's productivity went up noticeably. The WhatsApp bot is a game changer for my 200+ clients.",
      name: 'CA Vikram Patel',
      title: 'Managing Partner',
      firm: 'Patel & Co., Bengaluru',
      initials: 'VP',
      color: 'from-purple-500/25 to-purple-600/5',
    },
  ];

  return (
    <Section id="testimonials" className="py-24 bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-sm font-medium uppercase tracking-widest mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50">CA firms love FinnCA</h2>
          <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
            From solo practitioners to 20-person firms, here's what they say after switching to FinnCA.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              variants={fadeUp} initial="hidden" whileInView="visible" custom={i + 1} viewport={{ once: true }}
            >
              <GlassCard className={cn('p-6 h-full bg-gradient-to-br', t.color)}>
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-zinc-300 leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/8">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br',
                      t.color
                    )}
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.title} · {t.firm}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   CTA BANNER
══════════════════════════════════════════════════════════════════════════════ */
function CtaBanner() {
  return (
    <Section className="py-20 bg-[#0E0E10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
          style={{
            background: 'linear-gradient(135deg, #0F2027 0%, #1a1040 40%, #0D3B3B 70%, #0A2525 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          {/* Background decoration */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              animation: 'aurora-shift 12s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
              animation: 'blob-drift 15s ease-in-out 3s infinite',
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs mb-6">
              <Zap size={12} className="text-indigo-400" />
              No credit card required · 14-day free trial
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
              Ready to take your CA practice from{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #F87171, #FB923C)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                chaos
              </span>
              {' '}to{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #34D399, #10B981)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                calm
              </span>
              ?
            </h2>
            <p className="mt-5 text-zinc-400 text-lg max-w-xl mx-auto">
              Join 500+ CA firms across India who have transformed their practice with FinnCA.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="group flex items-center gap-2 px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200"
              >
                Start free trial
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 px-8 py-3.5 text-zinc-300 font-medium rounded-xl border border-white/15 hover:border-white/25 hover:text-white transition-all duration-200"
              >
                See how it works
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════════════════ */
function Footer() {
  const productLinks = [
    { label: 'Document Vault', href: '#features' },
    { label: 'Task Board', href: '#features' },
    { label: 'GST Invoicing', href: '#features' },
    { label: 'Client Portal', href: '#features' },
    { label: 'Team Management', href: '#features' },
    { label: 'WhatsApp Inbox', href: '#features' },
  ];

  const companyLinks = [
    { label: 'About us', href: '#' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Blog', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Privacy policy', href: '#' },
    { label: 'Terms of service', href: '#' },
  ];

  return (
    <footer className="bg-[#0A0A0B] border-t border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="serif italic text-xl font-bold text-indigo-400">FinnCA</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              The all-in-one practice management platform for Chartered Accountants in India.
              WhatsApp-first, GST-ready, built for Indian CA firms.
            </p>
            <div className="text-xs text-zinc-500 space-y-1">
              <div className="flex items-start gap-2">
                <Building2 size={12} className="text-zinc-600 mt-0.5 flex-shrink-0" />
                <span>Ahmedabad, Gujarat, India — 380 015</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare size={12} className="text-zinc-600 flex-shrink-0" />
                <span>support@finnca.in</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-2.5">
              {productLinks.map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-2.5">
              {companyLinks.map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Get started */}
          <div>
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-widest mb-4">Get started</p>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Try FinnCA free for 14 days. No credit card. Cancel any time.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25"
            >
              Start free trial
              <ArrowRight size={14} />
            </button>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Lock size={11} />
                256-bit SSL
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Shield size={11} />
                SOC 2 Ready
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} FinnCA. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span>Made with</span>
            <span className="text-red-500">♥</span>
            <span>in India</span>
            <span className="text-orange-500">🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT EXPORT
══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <>
      {/* Inject keyframe animations */}
      <style>{KEYFRAMES}</style>

      <div className="min-h-screen text-[#F4F4F5] overflow-x-hidden" style={{ background: '#0A0A0B' }}>
        <Nav />
        <Hero />
        <BeforeAfter />
        <StatsBar />
        <Problems />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CtaBanner />
        <Footer />
      </div>
    </>
  );
}
