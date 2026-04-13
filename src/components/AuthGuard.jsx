import React, { useEffect, useState } from 'react';
import { auth, provider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, loading }) {
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
        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-10 space-y-8 shadow-2xl shadow-black/50">

          {/* Logo / Brand */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 mb-2">
              <span className="text-white font-black text-xl">N</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">NGR Dashboard</h1>
            <p className="text-sm text-white/40 font-medium">Mesa de Estimaciones</p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.08]" />

          {/* Sign in */}
          <div className="space-y-4">
            <p className="text-xs text-white/30 text-center font-medium uppercase tracking-widest">
              Acceso restringido
            </p>
            <button
              onClick={onLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-white/90 active:scale-[0.98] rounded-2xl transition-all duration-150 shadow-lg shadow-black/20 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-slate-500" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
              )}
              <span className="text-sm font-black text-slate-800">
                {loading ? 'Iniciando sesión…' : 'Continuar con Google'}
              </span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-white/15 font-medium">
            Solo usuarios autorizados de NGR
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── AuthGuard — wrapper que protege toda la app ───────────────────────────────
export default function AuthGuard({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = cargando
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Escuchar cambios de sesión de Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error('Login error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Mientras Firebase resuelve la sesión inicial
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-orange-500" />
      </div>
    );
  }

  // No autenticado → pantalla de login
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <LoginScreen onLogin={handleLogin} loading={loading} error={error} />
      </AnimatePresence>
    );
  }

  // Autenticado → render children con user inyectado como prop
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="app"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {typeof children === 'function' ? children({ user, signOut: () => signOut(auth) }) : children}
      </motion.div>
    </AnimatePresence>
  );
}
