import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, ShieldCheck, PlusCircle, Ticket, LogIn,
  BellOff, RefreshCw, Search, Activity, Clock, User, Filter,
  ChevronDown
} from 'lucide-react';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ngr-proxy-server-966549276703.us-central1.run.app';

// ── Config visual — todos los colores tienen variantes light + dark ───────────
const EVENTO_CONFIG = {
  LOGIN: {
    icon: LogIn,
    label: 'Login',
    dot:    'bg-blue-500',
    color:  'text-blue-600 dark:text-blue-400',
    bg:     'bg-blue-50   dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    iconBg: 'bg-blue-100  dark:bg-blue-500/15',
    badge:  'bg-blue-100  dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  },
  ESTIMACION_APROBADA: {
    icon: CheckCircle2,
    label: 'Estimación aprobada',
    dot:    'bg-violet-500',
    color:  'text-violet-600 dark:text-violet-400',
    bg:     'bg-violet-50  dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/20',
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    badge:  'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400',
  },
  ESTIMACION_GUARDADA: {
    icon: Clock,
    label: 'Estimación guardada',
    dot:    'bg-amber-500',
    color:  'text-amber-600 dark:text-amber-400',
    bg:     'bg-amber-50   dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    iconBg: 'bg-amber-100  dark:bg-amber-500/15',
    badge:  'bg-amber-100  dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  },
  TICKET_CORREGIDO: {
    icon: Ticket,
    label: 'Ticket corregido',
    dot:    'bg-orange-500',
    color:  'text-orange-600 dark:text-orange-400',
    bg:     'bg-orange-50  dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
    iconBg: 'bg-orange-100 dark:bg-orange-500/15',
    badge:  'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
  },
  CAJA_AGREGADA: {
    icon: PlusCircle,
    label: 'Caja agregada',
    dot:    'bg-emerald-500',
    color:  'text-emerald-600 dark:text-emerald-400',
    bg:     'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    badge:  'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  },
  CAJA_CONFIGURADA: {
    icon: BellOff,
    label: 'Alarma config.',
    dot:    'bg-slate-400',
    color:  'text-slate-600 dark:text-slate-400',
    bg:     'bg-slate-100  dark:bg-slate-500/10',
    border: 'border-slate-200 dark:border-slate-500/20',
    iconBg: 'bg-slate-200  dark:bg-slate-500/15',
    badge:  'bg-slate-200  dark:bg-slate-500/20 text-slate-600 dark:text-slate-400',
  },
  ALARMA_REVISADA: {
    icon: ShieldCheck,
    label: 'Alarma revisada',
    dot:    'bg-teal-500',
    color:  'text-teal-600 dark:text-teal-400',
    bg:     'bg-teal-50   dark:bg-teal-500/10',
    border: 'border-teal-200 dark:border-teal-500/20',
    iconBg: 'bg-teal-100  dark:bg-teal-500/15',
    badge:  'bg-teal-100  dark:bg-teal-500/20 text-teal-700 dark:text-teal-400',
  },
};

const DEFAULT_CFG = {
  icon: Activity, label: 'Evento',
  dot: 'bg-slate-400', color: 'text-slate-600 dark:text-slate-400',
  bg: 'bg-slate-100 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20',
  iconBg: 'bg-slate-200 dark:bg-slate-500/15',
  badge: 'bg-slate-200 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400',
};

const ALL_TIPOS = ['Todos', ...Object.keys(EVENTO_CONFIG)];

function relativeTime(tsValue) {
  const date = tsValue?.value ? new Date(tsValue.value) : tsValue instanceof Date ? tsValue : new Date(tsValue);
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return 'hace unos segundos';
  if (s < 3600)  return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
}

function formatFull(tsValue) {
  const date = tsValue?.value ? new Date(tsValue.value) : tsValue instanceof Date ? tsValue : new Date(tsValue);
  return date.toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function ActivityLogDashboard({ user }) {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [filterTipo, setFilter]     = useState('Todos');
  const [showFilter, setShowFilter] = useState(false);
  const [lastFetch, setLastFetch]   = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/activity-log?limit=300`);
      const data = await res.json();
      setLogs(data.logs || []);
      setLastFetch(new Date());
    } catch(e) {
      console.error('[ActivityLog]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    const t = setInterval(fetchLogs, 60000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  const logsFiltered = logs.filter(l => {
    if (filterTipo !== 'Todos' && l.evento !== filterTipo) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return l.descripcion?.toLowerCase().includes(q)
        || l.usuario?.toLowerCase().includes(q)
        || l.usuario_nombre?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 px-1">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Log de Actividad</h2>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-medium mt-0.5">
            {lastFetch ? `Actualizado: ${formatFull(lastFetch)}` : 'Cargando...'}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/20 transition-all disabled:opacity-40"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por descripción o usuario..."
            className="w-full pl-8 pr-3 py-2 text-[11px] bg-white dark:bg-white/[0.03] border border-slate-300 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </div>

        {/* Tipo filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.03] text-[10px] font-black text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-white/20 transition-all"
          >
            <Filter size={10} />
            {filterTipo === 'Todos' ? 'Todos los eventos' : (EVENTO_CONFIG[filterTipo]?.label || filterTipo)}
            <ChevronDown size={10} />
          </button>
          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden"
              >
                {ALL_TIPOS.map(tipo => {
                  const cfg = EVENTO_CONFIG[tipo];
                  const activo = filterTipo === tipo;
                  return (
                    <button
                      key={tipo}
                      onClick={() => { setFilter(tipo); setShowFilter(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-black text-left transition-colors ${
                        activo
                          ? 'bg-accent-orange/10 text-accent-orange'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-white/60'
                      }`}
                    >
                      {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />}
                      {!cfg && <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20 shrink-0" />}
                      {cfg ? cfg.label : 'Todos los eventos'}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contador */}
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
          {logsFiltered.length} eventos
        </span>
      </div>

      {/* ── Feed ── */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={18} className="animate-spin text-accent-orange" />
        </div>
      ) : logsFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300 dark:text-white/20">
          <Activity size={32} />
          <p className="text-[11px] font-black uppercase tracking-widest">Sin eventos encontrados</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {logsFiltered.map((log, i) => {
              const cfg  = EVENTO_CONFIG[log.evento] || DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.012, 0.25) }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
                >
                  {/* Ícono */}
                  <div className={`p-1.5 rounded-lg shrink-0 ${cfg.iconBg}`}>
                    <Icon size={13} className={cfg.color} />
                  </div>

                  {/* Descripción */}
                  <p className="flex-1 text-[11px] font-bold text-slate-800 dark:text-white leading-snug min-w-0 truncate">
                    {log.descripcion || log.evento}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Badge tipo */}
                    <span className={`hidden sm:inline-block px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${cfg.badge}`}>
                      {cfg.label}
                    </span>

                    {/* Usuario */}
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-white/40 whitespace-nowrap">
                      <User size={8} />
                      {log.usuario_nombre || log.usuario || '—'}
                    </span>

                    {/* Separador */}
                    <span className="text-slate-300 dark:text-white/15 text-xs">·</span>

                    {/* Tiempo relativo */}
                    <span
                      title={formatFull(log.timestamp)}
                      className="text-[9px] font-semibold text-slate-500 dark:text-white/40 whitespace-nowrap cursor-default"
                    >
                      {relativeTime(log.timestamp)}
                    </span>

                    {/* Fecha completa */}
                    <span className="hidden lg:block text-[9px] font-mono text-slate-400 dark:text-white/30 whitespace-nowrap">
                      {formatFull(log.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
