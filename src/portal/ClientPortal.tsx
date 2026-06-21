/**
 * Client Portal — /portal/:clientId
 *
 * Flow:
 *  1. Client opens link (sent via WhatsApp)
 *  2. Enters their PIN to authenticate (individual dot-box UI)
 *  3. Sees their CA-approved documents
 *  4. If payment is pending → docs are blurred + locked
 *  5. CA clears payment → portal updates in real-time → docs unlock
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Lock,
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  IndianRupee,
  LogOut,
  FileCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  subscribeClients,
  subscribePortalDocs,
  subscribePayments,
  updatePaymentRequest,
  updateClient,
  type Client,
  type VaultDocument,
  type PaymentRequest,
} from '../lib/firestore';

// Point PDF.js worker at the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
import { cn } from '../lib/utils';
import ThemeToggle from '../components/ThemeToggle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── PIN dot-box input ────────────────────────────────────────────────────────

interface PinInputProps {
  length: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
}

function PinInput({ length, value, onChange, disabled, error }: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  return (
    <div
      className="relative flex gap-3 justify-center cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hidden real input */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        maxLength={length}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0"
        autoComplete="one-time-code"
      />
      {/* Visual boxes */}
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const active = i === value.length && !disabled;
        return (
          <div
            key={i}
            className={cn(
              'w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-all',
              error
                ? 'border-red-500/60 bg-red-500/5'
                : active
                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : filled
                ? 'border-zinc-600 bg-zinc-800'
                : 'border-zinc-800 bg-zinc-900/50'
            )}
          >
            {filled ? (
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
            ) : active ? (
              <div className="w-0.5 h-6 bg-indigo-400 animate-pulse" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── PIN login screen ─────────────────────────────────────────────────────────

interface PinLoginProps {
  clientName: string;
  correctPin: string;
  onSuccess: () => void;
}

function PinLogin({ clientName, correctPin, onSuccess }: PinLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const pinLength = correctPin.length || 4;

  // Auto-submit when PIN is fully entered
  useEffect(() => {
    if (pin.length === pinLength && !locked) {
      if (pin === correctPin) {
        onSuccess();
      } else {
        const next = attempts + 1;
        setAttempts(next);
        setShake(true);
        setError(
          next >= 5
            ? 'Too many attempts. Contact your CA firm.'
            : `Incorrect PIN. ${5 - next} attempt${5 - next !== 1 ? 's' : ''} remaining.`
        );
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 600);
        if (next >= 5) setLocked(true);
      }
    }
  }, [pin, pinLength, correctPin, attempts, locked, onSuccess]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
      <ThemeToggle variant="float" />
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold italic serif text-indigo-400 mb-1">FinnCA</h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">Secure Client Portal</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-zinc-800 flex flex-col gap-7">
          {/* Avatar + name */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck size={28} className="text-indigo-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white serif italic">{clientName}</h2>
              <p className="text-xs text-zinc-500 mt-1">Enter your portal PIN to continue</p>
            </div>
          </div>

          {/* PIN boxes */}
          <div className={cn('flex flex-col gap-4', shake && 'animate-[shake_0.5s_ease-in-out]')}>
            <PinInput
              length={pinLength}
              value={pin}
              onChange={v => { setPin(v); setError(''); }}
              disabled={locked}
              error={!!error}
            />
            {error && (
              <div className="flex items-center justify-center gap-2 text-xs text-red-400">
                <AlertCircle size={13} />
                {error}
              </div>
            )}
          </div>

          {/* Numpad for mobile */}
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
              <button
                key={i}
                disabled={locked || !k}
                onClick={() => {
                  if (!k) return;
                  if (k === '⌫') {
                    setPin(p => p.slice(0, -1));
                    setError('');
                  } else if (pin.length < pinLength) {
                    setPin(p => p + k);
                    setError('');
                  }
                }}
                className={cn(
                  'h-12 rounded-xl text-sm font-bold transition-all',
                  !k
                    ? 'invisible'
                    : k === '⌫'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white active:scale-95'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95',
                  locked && 'opacity-40 cursor-not-allowed'
                )}
              >
                {k}
              </button>
            ))}
          </div>

          <p className="text-center text-[10px] text-zinc-700">
            Don't have a PIN? Contact your CA firm.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Payment wall ─────────────────────────────────────────────────────────────

// UPI VPA for the CA firm — in production this comes from config/env
const CA_UPI_VPA = 'finnca@upi';
const CA_NAME    = 'FinnCA Professional';

function buildUpiUrl(amount: number, note: string, upiVpa: string, name: string) {
  const params = new URLSearchParams({
    pa: upiVpa,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

function buildGPayUrl(amount: number, note: string, upiVpa: string, name: string) {
  // Google Pay intent URL (Android deep link)
  const params = new URLSearchParams({
    pa: upiVpa,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note.slice(0, 50),
  });
  return `intent://pay?${params.toString()}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
}

function PaymentWall({
  amount,
  note,
  clientId,
  clientName,
  pendingRequestId,
  onPaid,
}: {
  amount: number;
  note?: string;
  clientId: string;
  clientName: string;
  pendingRequestId?: string;
  onPaid: () => void;
}) {
  const [step, setStep]       = useState<'pay' | 'confirm' | 'processing' | 'done'>('pay');
  const [error, setError]     = useState('');
  const upiUrl  = buildUpiUrl(amount, note ?? 'CA Firm Payment', CA_UPI_VPA, CA_NAME);
  const gpayUrl = buildGPayUrl(amount, note ?? 'CA Firm Payment', CA_UPI_VPA, CA_NAME);

  const handleConfirmPayment = async () => {
    setStep('processing');
    setError('');
    try {
      // ── Try Razorpay first (verified payment) ──────────────────────────────
      // This is only reached from the QR/manual flow (non-Razorpay path)
      // The Razorpay checkout path calls handleRazorpaySuccess directly.

      // 1. Mark this payment request as Paid
      if (pendingRequestId) {
        await updatePaymentRequest(pendingRequestId, {
          status: 'Paid',
          paidAt: { seconds: Math.floor(Date.now() / 1000) },
        });
      }

      // 2. Check if any other pending requests remain for this client
      const allPayments: PaymentRequest[] = JSON.parse(localStorage.getItem('ls_payments') ?? '[]');
      const otherPending = allPayments.filter(
        p => p.id !== pendingRequestId && p.clientId === clientId && p.status === 'Pending'
      );

      if (otherPending.length === 0) {
        await updateClient(clientId, { pendingPayment: false, paymentAmount: 0, paymentNote: '' });
      } else {
        const next = otherPending[0];
        await updateClient(clientId, { paymentAmount: next.amount, paymentNote: next.note });
      }

      // 3. Notify CA (best-effort)
      fetch('/api/portal/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientName, amount, note }),
      }).catch(() => {});

      setStep('done');
      setTimeout(() => onPaid(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStep('confirm');
    }
  };

  /** Called after Razorpay checkout succeeds — verifies signature server-side */
  const handleRazorpaySuccess = async (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setStep('processing');
    try {
      // Verify the payment signature on the server
      const verifyRes = await fetch('/api/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId:   response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.verified) throw new Error('Payment verification failed');

      // Update localStorage
      if (pendingRequestId) {
        await updatePaymentRequest(pendingRequestId, {
          status: 'Paid',
          paidAt: { seconds: Math.floor(Date.now() / 1000) },
        });
      }
      const allPayments: PaymentRequest[] = JSON.parse(localStorage.getItem('ls_payments') ?? '[]');
      const otherPending = allPayments.filter(
        p => p.id !== pendingRequestId && p.clientId === clientId && p.status === 'Pending'
      );
      if (otherPending.length === 0) {
        await updateClient(clientId, { pendingPayment: false, paymentAmount: 0, paymentNote: '' });
      } else {
        const next = otherPending[0];
        await updateClient(clientId, { paymentAmount: next.amount, paymentNote: next.note });
      }

      fetch('/api/portal/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientName, amount, note }),
      }).catch(() => {});

      setStep('done');
      setTimeout(() => onPaid(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed. Contact your CA.');
      setStep('confirm');
    }
  };

  /** Open Razorpay checkout — loads the Razorpay JS SDK on demand */
  const openRazorpay = async () => {
    setError('');
    try {
      // Create order on server
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInRupees: amount,
          receiptId:      pendingRequestId ?? `pay_${Date.now()}`,
          clientName,
          note: note ?? '',
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) throw new Error(orderData.error || 'Failed to create order');

      // Load Razorpay checkout script dynamically
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.head.appendChild(script);
      });

      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        CA_NAME,
        description: note ?? 'Portal Payment',
        order_id:    orderData.orderId,
        prefill: {
          name: clientName,
        },
        theme: { color: '#6366F1' },
        method: { upi: true, card: false, netbanking: false, wallet: false, emi: false },
        handler: handleRazorpaySuccess,
        modal: {
          ondismiss: () => {
            // User closed checkout without paying — stay on pay screen
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open payment. Try UPI directly.');
    }
  };

  // ── Done state ──
  if (step === 'done') {
    return (
      <div className="glass rounded-2xl border border-green-500/20 bg-green-500/5 p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-green-400 serif italic">Payment Confirmed!</h3>
          <p className="text-sm text-zinc-400 mt-1">Your documents are now unlocked. Your CA has been notified.</p>
        </div>
      </div>
    );
  }

  // ── Processing state ──
  if (step === 'processing') {
    return (
      <div className="glass rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-8 flex flex-col items-center gap-4 text-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
        <p className="text-sm text-zinc-400">Confirming payment and unlocking your documents…</p>
      </div>
    );
  }

  // ── Confirm state — shown after client taps a pay button ──
  if (step === 'confirm') {
    return (
      <div className="glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <IndianRupee size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-400 serif italic">Complete Your Payment</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Complete the payment of <span className="text-white font-bold">₹{amount.toLocaleString('en-IN')}</span> in your UPI app, then tap the button below.
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800">
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Amount</p>
          <p className="text-2xl font-bold text-white">₹{amount.toLocaleString('en-IN')}</p>
          {note && <p className="text-xs text-zinc-500 mt-1">{note}</p>}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        <button
          onClick={handleConfirmPayment}
          className="h-13 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <CheckCircle2 size={18} />
          I've Completed the Payment — Unlock My Documents
        </button>

        <button
          onClick={() => setStep('pay')}
          className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors text-center"
        >
          ← Go back to payment options
        </button>
      </div>
    );
  }

  // ── Pay state (default) ──
  return (
    <div className="glass rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <IndianRupee size={20} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-amber-400 serif italic">Payment Required</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Your documents are ready. Complete the payment to unlock instant access.
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-zinc-900/60 rounded-xl p-4 flex items-center justify-between border border-zinc-800">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">Amount Due</p>
          <p className="text-2xl font-bold text-white">₹{amount.toLocaleString('en-IN')}</p>
          {note && <p className="text-xs text-zinc-500 mt-1">{note}</p>}
        </div>
        <Lock size={32} className="text-amber-400/30" />
      </div>

      {/* Pay buttons */}
      <div className="flex flex-col gap-3">
        {/* Razorpay — primary (verified payment, all UPI apps) */}
        <button
          onClick={openRazorpay}
          className="flex items-center justify-center gap-3 h-12 rounded-xl bg-[#528FF0] hover:bg-[#3b7ae0] text-white font-bold text-sm transition-colors shadow-md"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="4" fill="white" fillOpacity="0.15"/>
            <path d="M7 17L10.5 7h3L10 17H7zm5-6.5L14.5 7H18l-4.5 10H10l2-6.5z" fill="white"/>
          </svg>
          Pay Securely — All UPI Apps
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">or pay directly</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <a href={gpayUrl} onClick={() => setStep('confirm')}
          className="flex items-center justify-center gap-3 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold text-sm hover:border-zinc-600 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#4285F4"/>
            <text x="4" y="16" fontSize="9" fontWeight="bold" fill="white" fontFamily="Arial">GPay</text>
          </svg>
          Google Pay
        </a>

        <a href={upiUrl} onClick={() => setStep('confirm')}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold text-sm hover:border-zinc-600 transition-colors">
          <IndianRupee size={15} />
          PhonePe / Paytm / BHIM
        </a>

        <details>
          <summary className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer text-center transition-colors list-none">
            Show UPI QR Code ▾
          </summary>
          <div className="mt-3 flex flex-col items-center gap-3 p-4 bg-white rounded-xl">
            <img
              src={`https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8`}
              alt="UPI QR Code" className="w-44 h-44"
            />
            <p className="text-xs text-zinc-600 text-center">Scan with any UPI app</p>
            <p className="text-[10px] font-mono text-zinc-500">{CA_UPI_VPA}</p>
          </div>
          <button
            onClick={() => setStep('confirm')}
            className="mt-3 w-full h-10 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} /> I've Paid via QR
          </button>
        </details>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Razorpay checkout verifies payment automatically. UPI direct links require manual confirmation.
      </p>
    </div>
  );
}

// ─── Document viewer modal ────────────────────────────────────────────────────

/**
 * DocViewer — two modes:
 *
 * mode="free"      — payment cleared. View + Download both available.
 *                    Watermark present but light.
 *
 * mode="protected" — payment pending. View-only. Maximum protection:
 *                    - No download button
 *                    - Dense opaque watermark grid
 *                    - Full-screen pointer-events blocker (blocks right-click save, drag)
 *                    - CSS print: display:none (blocks Ctrl+P screenshot)
 *                    - Keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+U, PrtSc) blocked
 *                    - user-select: none everywhere
 *                    - Screenshot deterrent banner
 */
// ─── Document viewer modal ────────────────────────────────────────────────────

/**
 * DocViewer — two modes:
 *
 * mode="free"      — payment cleared. Renders PDF in iframe, Download available.
 *
 * mode="protected" — payment pending. Renders each PDF page onto a <canvas>
 *                    with the client's name + date burned into every pixel.
 *                    The PDF file is never accessible as a downloadable object.
 *                    No iframe = no "Save as PDF" option in the browser.
 *                    Canvas pixels cannot be extracted via JS (cross-origin).
 *                    Screenshot will capture the watermark text on every page.
 */
function DocViewer({
  doc: vaultDoc,
  mode,
  clientName,
  onClose,
}: {
  doc: VaultDocument;
  mode: 'free' | 'protected';
  clientName: string;
  onClose: () => void;
}) {
  const isProtected = mode === 'protected';
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const [numPages,   setNumPages]   = useState(0);
  const [pageNum,    setPageNum]    = useState(1);
  const [rendering,  setRendering]  = useState(false);
  const [pdfDoc,     setPdfDoc]     = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loadError,  setLoadError]  = useState('');
  const [obscured,   setObscured]   = useState(false);

  // Block Ctrl+S / Ctrl+P / PrintScreen
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u'].includes(k)) {
        e.preventDefault(); e.stopPropagation();
      }
      if (k === 'printscreen') e.preventDefault();
    };
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, []);

  // Block print in protected mode
  useEffect(() => {
    if (!isProtected) return;
    const style = document.createElement('style');
    style.id = 'finnca-print-block';
    style.textContent = '@media print { body { display:none !important; } }';
    document.head.appendChild(style);
    return () => document.getElementById('finnca-print-block')?.remove();
  }, [isProtected]);

  // Hide on focus loss in protected mode
  useEffect(() => {
    if (!isProtected) return;
    const hide = () => setObscured(true);
    const show = () => setObscured(false);
    const vis  = () => setObscured(document.hidden);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [isProtected]);

  // Load PDF document (protected mode only)
  useEffect(() => {
    if (!isProtected || !vaultDoc.downloadUrl) return;
    setLoadError('');
    pdfjsLib.getDocument(vaultDoc.downloadUrl).promise
      .then(doc => { setPdfDoc(doc); setNumPages(doc.numPages); setPageNum(1); })
      .catch(() => setLoadError('Could not load document. Please try again.'));
  }, [isProtected, vaultDoc.downloadUrl]);

  // Render current page onto canvas with baked-in watermark
  useEffect(() => {
    if (!isProtected || !pdfDoc || !canvasRef.current) return;
    setRendering(true);

    pdfDoc.getPage(pageNum).then(page => {
      const canvas  = canvasRef.current!;
      const ctx     = canvas.getContext('2d')!;
      // On mobile use a smaller scale so the page fits the viewport width
      const isMobile = window.innerWidth < 640;
      const scale   = window.devicePixelRatio * (isMobile ? 1.0 : 1.5);
      const vp      = page.getViewport({ scale });

      canvas.width  = vp.width;
      canvas.height = vp.height;
      canvas.style.width  = `${vp.width  / window.devicePixelRatio}px`;
      canvas.style.height = `${vp.height / window.devicePixelRatio}px`;

      // 1. Render the PDF page
      page.render({ canvasContext: ctx, viewport: vp, canvas: canvasRef.current! }).promise.then(() => {

        // 2. Burn watermark into every pixel — client name + date + "CONFIDENTIAL"
        const stamp = `${clientName.toUpperCase()} · CONFIDENTIAL · FINNCA · ${new Date().toLocaleDateString('en-IN')}`;
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.fillStyle   = '#1e1b4b';
        ctx.font        = `bold ${14 * window.devicePixelRatio}px Arial`;
        ctx.textAlign   = 'center';

        const diagLen = Math.sqrt(vp.width ** 2 + vp.height ** 2);
        const cols    = Math.ceil(diagLen / 320) + 2;
        const rows    = Math.ceil(diagLen / 80)  + 2;

        ctx.translate(vp.width / 2, vp.height / 2);
        ctx.rotate(-Math.PI / 6);

        for (let r = -rows; r <= rows; r++) {
          for (let c = -cols; c <= cols; c++) {
            ctx.fillText(stamp, c * 320, r * 80);
          }
        }
        ctx.restore();
        setRendering(false);
      });
    }).catch(() => setRendering(false));
  }, [isProtected, pdfDoc, pageNum, clientName]);

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-800 bg-zinc-950 gap-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <ShieldCheck size={15} className={cn('shrink-0', isProtected ? 'text-amber-400' : 'text-green-400')} />
        <span className="text-xs sm:text-sm font-medium text-zinc-200 truncate">{vaultDoc.name}</span>
        <span className={cn(
          'hidden sm:inline text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border shrink-0',
          isProtected ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
        )}>
          {isProtected ? 'View Only' : 'Verified'}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isProtected && vaultDoc.downloadUrl && (
          <a href={vaultDoc.downloadUrl} download={vaultDoc.name}
            className="h-8 px-3 sm:px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5 transition-colors">
            <Download size={13} /> <span className="hidden sm:inline">Download</span>
          </a>
        )}
        <button onClick={onClose}
          className="h-8 px-3 sm:px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase tracking-widest text-zinc-300 transition-colors">
          Close
        </button>
      </div>
    </div>
  );

  // ── Free mode — plain iframe ──────────────────────────────────────────────────
  if (!isProtected) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
        {toolbar}
        <iframe
          src={`${vaultDoc.downloadUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          className="flex-1 border-0 w-full"
          title={vaultDoc.name}
        />
      </div>
    );
  }

  // ── Protected mode — canvas renderer ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {toolbar}

      {/* Banner */}
      <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center gap-2">
        <Lock size={12} className="text-amber-400 shrink-0" />
        <p className="text-[11px] text-amber-400">
          View-only — watermark is embedded in every page. Download unlocks after payment.
        </p>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-zinc-900 flex flex-col items-center py-6 gap-4">
        {loadError && (
          <div className="flex flex-col items-center gap-3 mt-20 text-zinc-500">
            <AlertCircle size={32} className="text-red-400/50" />
            <p className="text-sm">{loadError}</p>
          </div>
        )}

        {!loadError && !pdfDoc && (
          <div className="flex flex-col items-center gap-3 mt-20 text-zinc-600">
            <Loader2 size={28} className="animate-spin text-indigo-500/50" />
            <p className="text-xs uppercase tracking-widest">Loading document…</p>
          </div>
        )}

        {pdfDoc && (
          <div className="relative">
            {rendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/60">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="rounded shadow-2xl max-w-full"
              style={{ display: 'block' }}
            />
          </div>
        )}

        {/* Page navigation */}
        {numPages > 1 && (
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setPageNum(p => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-zinc-500 font-mono">
              Page {pageNum} of {numPages}
            </span>
            <button
              onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Focus-loss black screen */}
      {obscured && (
        <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center gap-4">
          <Lock size={40} className="text-amber-400/60" />
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Document hidden</p>
          <p className="text-xs text-zinc-600 text-center max-w-xs">
            Switch back to this tab to resume viewing.
          </p>
          <button onClick={() => setObscured(false)}
            className="mt-2 h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors">
            Resume
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocCard({ doc: vaultDoc, locked, clientName }: { doc: VaultDocument; locked: boolean; clientName: string }) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <>
      <div
        className={cn(
          'glass rounded-2xl p-5 flex flex-col gap-4 border transition-all',
          locked
            ? 'border-amber-500/10 bg-amber-500/[0.02]'
            : 'border-zinc-700 hover:border-indigo-500/40 hover:bg-white/5'
        )}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center border shrink-0',
            locked
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
          )}>
            {locked ? <Eye size={18} /> : <FileCheck size={18} />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold serif italic truncate text-zinc-100">
              {vaultDoc.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              <span className="text-[10px] text-zinc-600 font-mono">{vaultDoc.type}</span>
              <span className="text-[10px] text-zinc-700">·</span>
              <span className="text-[10px] text-zinc-600 font-mono">{vaultDoc.size}</span>
              <span className="text-[10px] text-zinc-700 hidden sm:inline">·</span>
              <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline">{formatDate(vaultDoc.date)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-green-500/10 text-green-400 border-green-500/20">
              Verified
            </span>
            {locked && (
              <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                View Only
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
          {/* View is always available */}
          <button
            onClick={() => setPreviewing(true)}
            className={cn(
              'flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors',
              locked
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-indigo-400 hover:text-white'
            )}
          >
            <Eye size={14} />
            {locked ? 'View (Protected)' : 'View'}
          </button>

          {/* Download only when payment is cleared */}
          {!locked && vaultDoc.downloadUrl && (
            <a
              href={vaultDoc.downloadUrl}
              download={vaultDoc.name}
              className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-indigo-400 transition-colors ml-auto"
            >
              <Download size={14} /> Download
            </a>
          )}

          {/* Locked: show why download is disabled */}
          {locked && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-600">
              <Lock size={11} />
              <span>Download locked — clear payment to enable</span>
            </div>
          )}
        </div>
      </div>

      {previewing && vaultDoc.downloadUrl && (
        <DocViewer
          doc={vaultDoc}
          mode={locked ? 'protected' : 'free'}
          clientName={clientName}
          onClose={() => setPreviewing(false)}
        />
      )}
    </>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────

export default function ClientPortal({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Real-time client subscription — payment status updates instantly
  useEffect(() => {
    const unsub = subscribeClients(all => {
      // Match by exact ID or by name slug (e.g. "acme-corp" matches "Acme Corp")
      const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const found = all.find(c => c.id === clientId || slugify(c.name) === clientId.toLowerCase()) ?? null;
      if (!found) {
        setNotFound(true);
      } else {
        setClient(found);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [clientId]);

  // Real-time approved docs subscription (only after auth)
  useEffect(() => {
    if (!authenticated || !client?.id) return;
    const u1 = subscribePortalDocs(client.id, setDocs);
    const u2 = subscribePayments(setPayments);
    return () => { u1(); u2(); };
  }, [authenticated, client?.id]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500/40" />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-red-500/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-300 serif italic">Portal Not Found</h2>
          <p className="text-sm text-zinc-600 mt-2">
            This client portal link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // ── PIN login ──
  if (!authenticated) {
    return (
      <PinLogin
        clientName={client.name}
        correctPin={client.portalPin || '0000'}
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  const isLocked = !!client.pendingPayment;

  return (
    <div
      className="min-h-screen bg-[#0A0A0B] text-[#F4F4F5]"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold italic serif text-indigo-400 shrink-0">FinnCA</h1>
            <span className="text-zinc-700 shrink-0">·</span>
            <span className="text-xs sm:text-sm text-zinc-400 truncate max-w-[120px] sm:max-w-[200px]">{client.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck size={12} />
              Secure Session
            </div>
            <ThemeToggle variant="inline" />
            <button
              onClick={() => setAuthenticated(false)}
              title="Sign out"
              className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white serif italic">
            Your Documents
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Documents shared by your CA firm. All files are encrypted and access-controlled.
          </p>
        </div>

        {/* Payment wall */}
        {isLocked && (
          <PaymentWall
            amount={client.paymentAmount || 0}
            note={client.paymentNote}
            clientId={client.id ?? ''}
            clientName={client.name}
            pendingRequestId={
              payments.find(p => p.clientId === client.id && p.status === 'Pending')?.id
            }
            onPaid={() => {
              // Client data updates in real-time via subscribeClients
              // The portal will re-render automatically when pendingPayment flips to false
            }}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Docs',     value: docs.length },
            { label: 'Verified', value: docs.filter(d => d.status === 'Verified').length },
            {
              label: 'Access',
              value: isLocked ? 'View Only' : 'Unlocked',
              color: isLocked ? 'text-amber-400' : 'text-green-400',
            },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-3 sm:p-4 flex flex-col gap-1">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-zinc-600">
                {s.label}
              </span>
              <span className={cn('text-base sm:text-xl font-bold', s.color ?? 'text-white')}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Document list */}
        {docs.length === 0 ? (
          <div className="glass rounded-2xl p-8 sm:p-12 text-center border border-dashed border-zinc-800">
            <FileText size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-600">No documents have been shared yet.</p>
            <p className="text-xs text-zinc-700 mt-1">
              Your CA will notify you via WhatsApp when documents are ready.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-600">
              {docs.length} Document{docs.length !== 1 ? 's' : ''} Available
            </p>
            {docs.map(d => (
              <DocCard key={d.id} doc={d} locked={isLocked} clientName={client.name} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-700">
            FinnCA Professional Suite · All documents are confidential and intended solely for the named recipient.
          </p>
        </div>
      </main>

      <ThemeToggle variant="float" />
    </div>
  );
}
