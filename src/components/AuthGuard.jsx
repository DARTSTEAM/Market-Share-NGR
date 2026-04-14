import React, { useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

// ── Email allowlist ───────────────────────────────────────────────────────────
// Any @ngr.com.pe email is automatically authorized.
// Add individual addresses below for external collaborators.
const ALLOWED_DOMAINS  = ['ngr.com.pe', 'dartsteam.com', 'abndigital.com.ar'];
const ALLOWED_EMAILS   = new Set([
  'dartsteam@ngr.com.pe',
  'franco.victorio@ngr.com.pe',
  // add more here
]);

function isAuthorized(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (ALLOWED_EMAILS.has(e)) return true;
  return ALLOWED_DOMAINS.some(d => e.endsWith(`@${d}`));
}

// Email-link action settings
const ACTION_CODE_SETTINGS = {
  url: window.location.origin + window.location.pathname,
  handleCodeInApp: true,
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLoginGoogle, loading, error, setError }) {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) return;

    if (!isAuthorized(trimmed)) {
      setError(`El email ${trimmed} no está autorizado para acceder.`);
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendSignInLinkToEmail(auth, trimmed, ACTION_CODE_SETTINGS);
      // Save email so we can complete sign-in when they click the link
      localStorage.setItem('ngr_signin_email', trimmed);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-10 space-y-8 shadow-2xl shadow-black/50">

          {/* Logo / Brand */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 mb-2">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">NGR Dashboard</h1>
            <p className="text-sm text-white/40 font-medium">Mesa de Estimaciones</p>
          </div>

          <div className="border-t border-white/[0.08]" />

          <AnimatePresence mode="wait">
            {sent ? (
              /* Sent confirmation */
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 text-center"
              >
                <div className="flex justify-center">
                  <CheckCircle2 size={40} className="text-emerald-400" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-white">¡Revisá tu correo!</p>
                  <p className="text-xs text-white/40 font-medium">
                    Enviamos un link de acceso a<br />
                    <span className="text-orange-400 font-black">{email}</span>
                  </p>
                </div>
                <p className="text-[10px] text-white/20">
                  El link expira en 1 hora. Si no llega, revisá spam.
                </p>
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  className="text-[11px] text-white/30 underline underline-offset-2 hover:text-white/50 transition-colors"
                >
                  Usar otro email
                </button>
              </motion.div>
            ) : (
              /* Email form */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-xs text-white/30 text-center font-medium uppercase tracking-widest">
                  Acceso restringido
                </p>

                {/* Email link form */}
                <form onSubmit={handleSendLink} className="space-y-3">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      placeholder="tu@ngr.com.pe"
                      autoComplete="email"
                      required
                      className="w-full pl-9 pr-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !email}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] rounded-2xl transition-all duration-150 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending
                      ? <Loader2 size={16} className="animate-spin text-white" />
                      : <ArrowRight size={16} className="text-white" />
                    }
                    <span className="text-sm font-black text-white">
                      {sending ? 'Enviando link…' : 'Enviar link de acceso'}
                    </span>
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[10px] text-white/20 font-medium uppercase tracking-widest">o</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                {/* Google */}
                <button
                  onClick={onLoginGoogle}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-white/90 active:scale-[0.98] rounded-2xl transition-all duration-150 shadow-md shadow-black/20 disabled:opacity-60"
                >
                  {loading === 'google' ? (
                    <Loader2 size={16} className="animate-spin text-slate-500" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span className="text-sm font-bold text-slate-700">
                    {loading === 'google' ? 'Iniciando…' : 'Google'}
                  </span>
                </button>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-[11px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-[10px] text-white/15 font-medium">
            Solo usuarios autorizados de NGR
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── AuthGuard ─────────────────────────────────────────────────────────────────
export default function AuthGuard({ children }) {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Complete email-link sign-in if URL contains the magic link
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem('ngr_signin_email');
      if (!email) {
        email = window.prompt('Por favor ingresá tu email para confirmar el acceso:');
      }
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem('ngr_signin_email');
            // Clean URL so the link token is not reused
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch(e => setError(e.message));
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && !isAuthorized(u.email)) {
        await signOut(auth);
        setUser(null);
        setError(`Acceso denegado: ${u.email} no tiene permiso.`);
        return;
      }
      setUser(u ?? null);
    });
    return unsub;
  }, []);

  const handleLoginGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <LoginScreen
          onLoginGoogle={handleLoginGoogle}
          loading={loading}
          error={error}
          setError={setError}
        />
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        {typeof children === 'function' ? children({ user, signOut: () => signOut(auth) }) : children}
      </motion.div>
    </AnimatePresence>
  );
}
