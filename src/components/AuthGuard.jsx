import React, { useEffect, useState } from 'react';
import { auth, googleProvider, microsoftProvider } from '../firebase';
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
const ALLOWED_DOMAINS  = ['ngr.com.pe', 'dartsteam.com', 'abndigital.com.ar'];
const ALLOWED_EMAILS   = new Set([
  'dartsteam@ngr.com.pe',
  'franco.victorio@ngr.com.pe',
  'bautiballatore@hotmail.com',
]);

function isAuthorized(email) {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  if (ALLOWED_EMAILS.has(e)) return true;
  return ALLOWED_DOMAINS.some(d => e.endsWith(`@${d}`));
}

const ACTION_CODE_SETTINGS = {
  url: window.location.origin + window.location.pathname,
  handleCodeInApp: true,
};

// ── Microsoft SVG logo (Sober) ────────────────────────────────────────────────
function MicrosoftLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 21 21" className="opacity-80">
      <rect x="0" y="0" width="10" height="10" fill="currentColor" />
      <rect x="11" y="0" width="10" height="10" fill="currentColor" />
      <rect x="0" y="11" width="10" height="10" fill="currentColor" />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLoginGoogle, onLoginMicrosoft, loading, error, setError }) {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [sending, setSending] = useState(false);

  const handleSendLink = async (e) => {
    e.preventDefault();
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) return;

    if (!isAuthorized(trimmed)) {
      setError(`Acceso restringido: El email no está autorizado.`);
      return;
    }

    setSending(true);
    setError(null);
    try {
      await sendSignInLinkToEmail(auth, trimmed, ACTION_CODE_SETTINGS);
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
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-['Outfit']">
      
      {/* Background Orbs (Sober edition) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-orange-600/5 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="bg-[#0c0c0c] border border-white/5 p-12 rounded-[40px] shadow-2xl relative overflow-hidden group">
          
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

          {/* Logo Section */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <img src="/hike_logo.png" alt="Hike" className="w-16 h-16 object-contain brightness-110 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]" />
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-1">
              HIKE <span className="text-orange-500">ANALYTICS</span>
            </h1>
            <p className="text-[9px] text-white/50 font-black uppercase tracking-[0.4em]">
              FOR NGR GROUP
            </p>
          </header>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div 
                key="sent" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="space-y-8 text-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} strokeWidth={2} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold">Verificá tu bandeja</p>
                    <p className="text-xs text-white/60 leading-relaxed px-4">
                      Enviamos el acceso directo a <br/>
                      <span className="text-orange-500 font-bold">{email}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="w-full py-3.5 bg-white/10 hover:bg-white/15 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all border border-white/10 text-white/80">
                    Abrir Gmail
                  </a>
                  <a href="https://outlook.office.com" target="_blank" rel="noreferrer" className="w-full py-3.5 bg-white/10 hover:bg-white/15 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all border border-white/10 text-white/80">
                    Abrir Outlook
                  </a>
                </div>

                <button onClick={() => { setSent(false); setEmail(''); }} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors">
                  ← Volver
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                {/* Auth Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={onLoginMicrosoft}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white/10 hover:bg-white/[0.15] border border-white/10 rounded-3xl transition-all group disabled:opacity-40"
                  >
                    <div className="text-white/60 group-hover:text-white transition-colors">
                      {loading === 'microsoft' ? <Loader2 size={16} className="animate-spin" /> : <MicrosoftLogo />}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90">M365</span>
                  </button>

                  <button
                    onClick={onLoginGoogle}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white/10 hover:bg-white/[0.15] border border-white/10 rounded-3xl transition-all group disabled:opacity-40"
                  >
                    <div className="text-white/60 group-hover:text-white transition-colors">
                      {loading === 'google' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor">
                          <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white/90">Google</span>
                  </button>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center"><span className="bg-[#0c0c0c] px-4 text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Corporate Access</span></div>
                </div>

                {/* Email Access */}
                <form onSubmit={handleSendLink} className="space-y-4">
                  <div className="relative group/input">
                    <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within/input:text-orange-500/70 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      placeholder="Email Institucional"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-[11px] font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !email}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl transition-all disabled:opacity-30 group shadow-[0_0_40px_rgba(255,126,75,0.3)]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Solicitar Acceso</span>
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />}
                  </button>
                </form>

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                    <p className="text-[10px] text-red-400 font-bold leading-relaxed text-center italic">{error}</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <footer className="mt-8 text-center space-y-4 opacity-50">
          <div className="space-y-1">
            <p className="text-[8px] font-black uppercase tracking-[0.4em]">NGR Corporate Network</p>
            <p className="text-[8px] font-medium opacity-70 tracking-tight italic">Access strictly monitored · Logged session</p>
          </div>
          
          <div className="pt-2 border-t border-white/5 inline-block px-6">
            <a 
              href="mailto:contact@hikethecloud.com" 
              className="group flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-orange-500 transition-colors"
            >
              <span>Support & Contact</span>
              <span className="text-white/20 group-hover:text-orange-500/50">—</span>
              <span className="lowercase font-bold tracking-normal italic opacity-60 group-hover:opacity-100 transition-opacity">contact@hikethecloud.com</span>
            </a>
          </div>
        </footer>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .pwa-btn-sober {
          border: 1px solid rgba(255,255,255,0.05);
        }
        .pwa-btn-sober:hover {
          border-color: rgba(255,126,75,0.5);
          box-shadow: 0 0 30px rgba(255,126,75,0.15);
        }
      `}} />
    </div>
  );
}

// ── AuthGuard ─────────────────────────────────────────────────────────────────
export default function AuthGuard({ children }) {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem('ngr_signin_email');
      if (!email) email = window.prompt('Confirme su email para finalizar el ingreso:');
      if (email) {
        signInWithEmailLink(auth, email, window.location.href)
          .then(() => {
            localStorage.removeItem('ngr_signin_email');
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
        setError(`Email no autorizado: ${u.email}`);
        return;
      }
      setUser(u ?? null);
    });
    return unsub;
  }, []);

  const handleLogin = async (type) => {
    setLoading(type);
    setError(null);
    try {
      const p = type === 'microsoft' ? microsoftProvider : googleProvider;
      await signInWithPopup(auth, p);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-orange-500 opacity-40" />
      </div>
    );
  }

  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <LoginScreen
          onLoginGoogle={() => handleLogin('google')}
          onLoginMicrosoft={() => handleLogin('microsoft')}
          loading={loading}
          setError={setError}
          error={error}
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
