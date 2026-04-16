import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardEdit, RefreshCw, AlertTriangle, CheckCircle2,
  Loader2, ChevronDown, ChevronRight, Search,
  TrendingDown, Wifi, Database, Info, X, Check, Pencil,
  ShieldCheck, Clock, Settings2, Plus, Power, BellOff, Store, Bell, Trash2
} from 'lucide-react';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ngr-proxy-server-gvxb4rjzvq-uc.a.run.app';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TIPO_CONFIG = {
  REAL:     { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Real',              icon: Wifi },
  HISTORIAL:{ dot: 'bg-indigo-400',  badge: 'bg-indigo-500/15  text-indigo-400  border-indigo-500/30',  label: 'Historial',         icon: Database },
  APROBADO: { dot: 'bg-violet-400',  badge: 'bg-violet-500/15  text-violet-400  border-violet-500/30',  label: 'Aprobado',          icon: ShieldCheck },
  PENDIENTE:{ dot: 'bg-amber-400',   badge: 'bg-amber-500/15   text-amber-400   border-amber-500/30',   label: 'Pend. Aprobación',  icon: Clock },
  GAP:      { dot: 'bg-red-400',     badge: 'bg-red-500/15     text-red-400     border-red-500/30',     label: 'Gap',               icon: AlertTriangle },
};

const fmt = n => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—';

// ── Calcula promedio simple de los últimos N meses ────────────────────────────
function calcularProm6M(puntos) {
  const disponibles = puntos
    .filter(p => p.tipo !== 'GAP' && p.tasa != null && p.tasa > 0)
    .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes)
    .slice(0, 6);
  if (!disponibles.length) return null;
  return disponibles.reduce((s, p) => s + p.tasa, 0) / disponibles.length;
}

// ── Promedio ponderado (más reciente = más peso, decay exponencial) ────────────
function calcularPromPonderado(puntos) {
  const disponibles = puntos
    .filter(p => p.tipo !== 'GAP' && p.tasa != null && p.tasa > 0)
    .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes)
    .slice(0, 6);
  if (!disponibles.length) return null;
  const decay = 0.75; // peso[i] = decay^i  (i=0 es el más reciente)
  let sumW = 0, sumWV = 0;
  disponibles.forEach((p, i) => {
    const w = Math.pow(decay, i);
    sumW  += w;
    sumWV += w * p.tasa;
  });
  return sumWV / sumW;
}

// ── Calcula "igual al anterior" (el mes más reciente disponible) ──────────────
function calcularIgualAnterior(puntos) {
  const disponibles = puntos
    .filter(p => p.tipo !== 'GAP' && p.tasa != null && p.tasa > 0)
    .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
  return disponibles[0]?.tasa ?? null;
}

const METODOS = [
  { key: 'PROM_6M',        label: 'Prom. 6 meses',     desc: 'Media simple de los últimos 6 meses reales',          calc: calcularProm6M },
  { key: 'IGUAL_ANTERIOR', label: 'Igual al anterior',  desc: 'Mismo valor que el mes inmediatamente anterior',      calc: calcularIgualAnterior },
  { key: 'PROM_PONDERADO', label: 'Prom. ponderado',    desc: 'Más peso a los meses recientes (decay exponencial)',  calc: calcularPromPonderado },
];

// ── Botón desregistrar (quita manual=false, saca del panel sin borrar de BQ) ─
function DesregistrarButton({ cfg, user, onCajasConfigChange, notify }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/cajas-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: cfg.codigo_tienda,
          caja: String(cfg.caja),
          local: cfg.local,
          competidor: cfg.competidor,
          status: 'ACTIVA',
          usuario: user?.email || 'dashboard',
          manual: false,
        }),
      });
      const r = await res.json();
      if (!r.success && r.error) throw new Error(r.error);
      onCajasConfigChange?.(prev =>
        prev.map(c =>
          c.codigo_tienda === cfg.codigo_tienda && c.caja === cfg.caja
            ? { ...c, manual: false }
            : c
        )
      );
      notify('success', `Caja ${cfg.caja} quitada del panel`);
    } catch(e) {
      notify('error', e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Tip label="Quitar del panel · No es manual">
      <button
        onClick={handle}
        disabled={loading}
        className="p-1 rounded-lg text-slate-300 dark:text-white/20 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
      </button>
    </Tip>
  );
}

// ── Panel de edición para un GAP ──────────────────────────────────────────────
function EditPanel({ cell, puntos, onSave, onCancelEdit }) {
  const pts = puntos || [];

  // Pre-calculamos los 3 métodos
  const valores = useMemo(() => {
    const v = {};
    METODOS.forEach(m => { v[m.key] = m.calc(pts); });
    return v;
  }, [pts]);

  // Método seleccionado (default: IGUAL_ANTERIOR si tiene valor, sino PROM_6M)
  const defaultMetodo = valores.IGUAL_ANTERIOR != null ? 'IGUAL_ANTERIOR'
    : valores.PROM_6M != null ? 'PROM_6M' : 'PROM_PONDERADO';

  const [metodo,    setMetodo]    = useState(defaultMetodo);
  const [manualVal, setManualVal] = useState('');
  const [aprobado,  setAprobado]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const inputRef = useRef(null);

  // Cuando cambia el método, pre-cargar el valor calculado
  useEffect(() => {
    const v = valores[metodo];
    if (v != null) setManualVal(String(Math.round(v)));
  }, [metodo, valores]);

  // Al montar, pre-llenar con el método por defecto y enfocar
  useEffect(() => {
    const v = valores[defaultMetodo];
    if (v != null) setManualVal(String(Math.round(v)));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const valor  = parseFloat(manualVal);
  const valido = !isNaN(valor) && valor > 0;

  const handleSave = async () => {
    if (!valido) return;
    setSaving(true);
    try {
      await onSave({ ...cell, trx_diarias: valor, metodo, aprobado });
      onCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="absolute right-0 top-full mt-1 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 p-4 space-y-3 z-30"
      onClick={e => e.stopPropagation()}
    >
      {/* ── Selector de método ── */}
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Método de estimación</p>
        <div className="grid grid-cols-3 gap-1.5">
          {METODOS.map(m => {
            const v = valores[m.key];
            const activo = metodo === m.key;
            return (
              <button
                key={m.key}
                title={m.desc}
                onClick={() => setMetodo(m.key)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl border text-center transition-all ${
                  activo
                    ? 'bg-accent-orange/10 border-accent-orange/40 text-accent-orange'
                    : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-400 hover:border-accent-orange/30 hover:text-slate-600 dark:hover:text-white/60'
                }`}
              >
                <span className="text-[8px] font-black uppercase tracking-tighter leading-tight">{m.label}</span>
                <span className={`text-[11px] font-black mt-0.5 ${activo ? 'text-accent-orange' : 'text-slate-500 dark:text-white/40'}`}>
                  {v != null ? fmt(v) : '—'}
                </span>
                <span className={`text-[7px] font-bold ${activo ? 'text-accent-orange/70' : 'text-slate-300 dark:text-white/20'}`}>tx/día</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Input manual (override) ── */}
      <div>
        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
          Trx / día estimadas <span className="font-normal normal-case tracking-normal">(editá si querés otro valor)</span>
        </label>
        <input
          ref={inputRef}
          type="number"
          value={manualVal}
          onChange={e => setManualVal(e.target.value)}
          placeholder="ej. 245"
          className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancelEdit(); }}
        />
      </div>

      {/* ── Checkbox aprobación ── */}
      <label
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
          aprobado
            ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-600/40'
            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-600/30'
        }`}
      >
        <div
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${
            aprobado ? 'bg-violet-500 border-violet-500' : 'border-slate-300 dark:border-white/30'
          }`}
          onClick={() => setAprobado(v => !v)}
        >
          {aprobado && <Check size={10} className="text-white" strokeWidth={3} />}
        </div>
        <div>
          <p className={`text-[10px] font-black leading-tight ${aprobado ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-white/60'}`}>
            Marcar como Aprobado
          </p>
          <p className="text-[8px] text-slate-400 dark:text-white/30 mt-0.5 leading-snug">
            Solo las estimaciones aprobadas se muestran en el dashboard de market share
          </p>
        </div>
      </label>

      {/* ── Preview estado ── */}
      {valido && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
          aprobado ? 'bg-violet-500/10 border-violet-500/20' : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <span className={`text-[9px] font-black uppercase tracking-widest ${aprobado ? 'text-violet-500' : 'text-amber-500'}`}>
            {aprobado ? '✓ Se publicará en dashboard' : '⏳ Quedará pendiente de revisión'}
          </span>
          <span className={`font-black text-base ${aprobado ? 'text-violet-500' : 'text-amber-500'}`}>
            {fmt(valor)} <span className="text-[9px]">tx/día</span>
          </span>
        </div>
      )}

      {/* ── Botones ── */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancelEdit}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !valido}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-40 transition-all ${
            aprobado ? 'bg-violet-500 hover:bg-violet-600' : 'bg-accent-orange hover:bg-orange-600'
          }`}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          {aprobado ? 'Aprobar' : 'Guardar borrador'}
        </button>
      </div>
    </div>
  );
}


// ── Celda individual ──────────────────────────────────────────────────────────
function Celda({ cell, puntos, onSave, pendingEdit, onStartEdit, onCancelEdit, isRevisada, onMarkRevisada, isGapRevisado, onToggleGapRevisado }) {
  const isEditing = pendingEdit?.key === cell.key;

  if (cell.tipo === 'GAP') {
    const gapKey = `${cell.codigo_tienda}||${cell.caja}||${cell.mes}||${cell.ano}`;
    const gapOk  = isGapRevisado;
    return (
      <td className="px-1.5 py-1.5 align-middle relative" style={{ minWidth: 90 }} onClick={e => e.stopPropagation()}>
        {isEditing && (
          <div className="relative z-20">
            <EditPanel cell={cell} puntos={puntos} onSave={onSave} onCancelEdit={onCancelEdit} />
          </div>
        )}
        {gapOk ? (
          /* GAP revisado: muestra guión verde + check, ya no es error */
          <div className="group w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 cursor-default">
            <Check size={9} className="text-emerald-400 shrink-0" />
            <span className="text-[10px] font-black text-emerald-400">OK</span>
            {onToggleGapRevisado && (
              <Tip label="Quitar revisión">
                <button
                  onClick={e => { e.stopPropagation(); onToggleGapRevisado(cell, false); }}
                  className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded text-slate-400 hover:text-red-400 transition-all"
                >
                  <X size={8} />
                </button>
              </Tip>
            )}
          </div>
        ) : (
          /* GAP normal: rojo + botón check en hover */
          <div className="group w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/35 transition-all">
            <button
              onClick={() => onStartEdit(cell)}
              className="flex items-center gap-1"
            >
              <AlertTriangle size={9} className="text-red-400 shrink-0" />
              <span className="text-[10px] font-black text-red-400">GAP</span>
            </button>
            {onToggleGapRevisado && (
              <Tip label="Marcar como revisado — ya no es un error">
                <button
                  onClick={e => { e.stopPropagation(); onToggleGapRevisado(cell, true); }}
                  className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded text-slate-400 hover:text-emerald-500 transition-all"
                >
                  <Check size={9} strokeWidth={3} />
                </button>
              </Tip>
            )}
          </div>
        )}
      </td>
    );
  }

  // PENDIENTE: guardado pero no aprobado
  if (cell.tipo === 'PENDIENTE') {
    const cfg = TIPO_CONFIG.PENDIENTE;
    return (
      <td
        className="px-3 py-2.5 text-right align-middle group relative cursor-pointer select-none transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-900/10"
        onClick={e => { e.stopPropagation(); onStartEdit(cell); }}
      >
        {isEditing && (
          <div className="relative z-20" onClick={e => e.stopPropagation()}>
            <EditPanel cell={cell} puntos={puntos} onSave={onSave} onCancelEdit={onCancelEdit} />
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-mono font-black text-[12px] text-amber-500">{fmt(cell.tasa)}</span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <Pencil size={7} className="opacity-0 group-hover:opacity-30 text-slate-400 transition-opacity shrink-0 -mr-0.5" />
        </div>
        <div className="text-[7px] text-amber-400/70 font-black text-right uppercase tracking-wider">pend.</div>
      </td>
    );
  }

  // APROBADO, REAL, HISTORIAL: mostrar con su color
  const cfg = TIPO_CONFIG[cell.tipo] || TIPO_CONFIG.REAL;

  // ── Alarma por caída + estado revisado ──
  const esCaidaAlarm = cell.caida_pct != null && cell.caida_pct <= -20;
  const revisada = isRevisada && esCaidaAlarm;

  return (
    <td
      className={`px-3 py-2.5 text-right align-middle group relative cursor-pointer select-none transition-colors ${
        revisada         ? 'bg-emerald-500/5    hover:bg-emerald-500/10' :
        esCaidaAlarm     ? 'bg-red-500/5'       :
                           'hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
      }`}
      onClick={e => { e.stopPropagation(); onStartEdit(cell); }}
    >
      {isEditing && (
        <div className="relative z-20" onClick={e => e.stopPropagation()}>
          <EditPanel cell={cell} puntos={puntos} onSave={onSave} onCancelEdit={onCancelEdit} />
        </div>
      )}
      <div className="flex items-center justify-end gap-1.5">
        {esCaidaAlarm && !revisada && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
        {revisada && <Check size={9} className="text-emerald-400 shrink-0" />}
        <span className={`font-mono font-black text-[12px] ${
          revisada ? 'text-emerald-400' : esCaidaAlarm ? 'text-red-400' : 'text-slate-800 dark:text-white/90'
        }`}>
          {fmt(cell.tasa)}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {(cell.tipo === 'APROBADO' || cell.tipo === 'REAL' || cell.tipo === 'HISTORIAL') &&
          <Pencil size={7} className="opacity-0 group-hover:opacity-30 text-slate-400 transition-opacity shrink-0 -mr-0.5" />
        }
      </div>
      {/* Porcentaje de caída + check de revisión */}
      {esCaidaAlarm && (
        <div className="flex items-center justify-end gap-1">
          <span className={`text-[8px] font-black ${ revisada ? 'text-emerald-400/70' : 'text-red-400'}`}>
            {cell.caida_pct?.toFixed(0)}%
          </span>
          {onMarkRevisada && (
            <button
              title={revisada ? 'Click para quitar revisión' : 'Marcar como revisado y OK'}
              onClick={e => { e.stopPropagation(); onMarkRevisada(cell, !revisada); }}
              className={`transition-all rounded-full p-0.5 ${
                revisada
                  ? 'opacity-100 text-emerald-400 hover:text-red-400'
                  : 'opacity-0 group-hover:opacity-80 text-slate-400 hover:text-emerald-500'
              }`}
            >
              <Check size={9} strokeWidth={3} />
            </button>
          )}
        </div>
      )}
    </td>
  );
}

// Competidores que NO necesitan desglose por caja
const NO_CAJA_DETAIL = new Set(['DOMINOS', "DOMINO'S", 'LITTLE CAESARS', "LITTLE CAESAR'S"]);

// ── Tooltip ─────────────────────────────────────────────────────────────────
function Tip({ label, children, placement = 'top' }) {
  const [show, setShow] = useState(false);
  const posClass = placement === 'bottom'
    ? 'top-full mt-1.5 left-1/2 -translate-x-1/2'
    : 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`pointer-events-none absolute z-50 ${posClass} whitespace-nowrap px-2 py-1 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-[8px] font-bold shadow-xl`}>
          {label}
          <span className={`absolute left-1/2 -translate-x-1/2 ${placement === 'bottom' ? '-top-1 border-b-slate-800 dark:border-b-slate-700 border-x-transparent border-x-4 border-b-4' : '-bottom-1 border-t-slate-800 dark:border-t-slate-700 border-x-transparent border-x-4 border-t-4'} w-0 h-0 border-solid`} />
        </div>
      )}
    </div>
  );
}

function DeleteCajaButton({ cfg, user, onDeleted, onError }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/cajas-config`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: cfg.codigo_tienda,
          caja:          String(cfg.caja),
          usuario:       user?.email || 'dashboard',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setOpen(false);
      onDeleted?.();
    } catch(e) {
      onError?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>

      {/* Modal de advertencia */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            {/* Header rojo */}
            <div className="bg-red-50 dark:bg-red-500/10 px-5 py-4 border-b border-red-100 dark:border-red-500/20 flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-500">
                <Trash2 size={17} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Eliminar caja</p>
                <p className="text-[13px] font-black text-slate-800 dark:text-white mt-0.5">
                  {cfg.local || cfg.codigo_tienda} · Caja {cfg.caja}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-[12px] text-slate-600 dark:text-white/70 leading-relaxed">
                Esto va a <span className="font-black text-red-500">eliminar permanentemente</span> el registro de esta caja de la base de datos.
              </p>
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                  Se van a perder <span className="font-black">todas las estimaciones manuales</span> ingresadas para esta caja. Si la caja tiene datos reales en el sistema, va a reaparecer automáticamente en la matriz.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {loading ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function LocalRow({ local, meses, pendingEdit, onStartEdit, onCancelEdit, onSave, expandido, onToggle, cajaStatusMap = {}, onToggleCaja, onToggleLocal, revisadasMap = {}, onMarkRevisada, gapsRevisadosMap = {}, onToggleGapRevisado }) {
  const esDesglose = !NO_CAJA_DETAIL.has(local.competidor?.toUpperCase().trim());
  const RUTINA_DESDE = '2025-12';
  const esRutina = (mk) => mk >= RUTINA_DESDE;

  const getPuntosCaja = useCallback((caja) => {
    return meses
      .map(mk => local.celdas[`${caja}||${mk}`])
      .filter(cell => cell && cell.tipo !== 'GAP' && cell.tasa != null && cell.tasa > 0)
      .map(cell => ({ tasa: cell.tasa, tipo: cell.tipo, mes: cell.mes, ano: cell.ano }))
      .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
  }, [local.celdas, meses]);

  const totalesPorMes = useMemo(() => {
    const t = {};
    meses.forEach(mk => {
      let sum = 0;
      let hasGap = false;
      local.cajas.forEach(caja => {
        const cell = local.celdas[`${caja}||${mk}`];
        if (cell?.tasa != null) sum += cell.tasa;
        if (cell?.tipo === 'GAP') hasGap = true;
      });
      t[mk] = { sum, hasGap };
    });
    return t;
  }, [local, meses]);

  const isCajaSilenciada = (c) => {
    const localKey = `${local.codigo_tienda}||__LOCAL__`;
    const cajaKey  = `${local.codigo_tienda}||${c}`;
    return (cajaStatusMap[localKey] || 'ACTIVA') === 'SIN_ALARMAS'
        || (cajaStatusMap[cajaKey]  || 'ACTIVA') === 'SIN_ALARMAS';
  };
  const isLocalSilenciado = (cajaStatusMap[`${local.codigo_tienda}||__LOCAL__`] || 'ACTIVA') === 'SIN_ALARMAS';

  const gapKey = (caja, mk) => `${local.codigo_tienda}||${caja}||${mk.split('-')[1]}||${mk.split('-')[0]}`;

  const gapCount = !esDesglose
    ? meses.filter(mk =>
        esRutina(mk) &&
        local.cajas.every(c => (local.celdas[`${c}||${mk}`]?.tipo ?? 'GAP') === 'GAP') &&
        local.cajas.every(c => !gapsRevisadosMap[gapKey(c, mk)])
      ).length
    : local.cajas.reduce((acc, c) =>
        isCajaSilenciada(c) ? acc :
        acc + meses.filter(mk =>
          esRutina(mk) &&
          local.celdas[`${c}||${mk}`]?.tipo === 'GAP' &&
          !gapsRevisadosMap[gapKey(c, mk)]
        ).length, 0);
  const pendienteCount = local.cajas.reduce((acc, c) =>
    acc + meses.filter(mk => esRutina(mk) && local.celdas[`${c}||${mk}`]?.tipo === 'PENDIENTE').length, 0);
  const tieneGaps = gapCount > 0;
  const tienePendientes = pendienteCount > 0;

  // Para NO_CAJA_DETAIL: celda editable
  const PRIO_TIPO = { REAL: 5, APROBADO: 4, PENDIENTE: 3, HISTORIAL: 2 };
  const getEditableCellLocal = (mk) => {
    let bestTipo = null;
    local.cajas.forEach(c => {
      const cell = local.celdas[`${c}||${mk}`];
      if (cell && cell.tipo !== 'GAP' && (PRIO_TIPO[cell.tipo] ?? 0) > (PRIO_TIPO[bestTipo] ?? -1)) {
        bestTipo = cell.tipo;
      }
    });
    const hasData = bestTipo !== null;
    const totalTasa = totalesPorMes[mk];
    if (!esRutina(mk) && !hasData) return null;
    const primaryCaja = local.cajas[0] ?? 'LOCAL';
    return {
      key: `${local.codigo_tienda}||${primaryCaja}||${mk}`,
      codigo_tienda: local.codigo_tienda,
      local: local.local,
      competidor: local.competidor,
      caja: primaryCaja,
      mes: parseInt(mk.split('-')[1]),
      ano: parseInt(mk.split('-')[0]),
      tipo: hasData ? bestTipo : 'GAP',
      tasa: hasData && totalTasa > 0 ? totalTasa : null,
    };
  };

  const puntosLocal = useMemo(() => {
    const byMes = {};
    meses.forEach(mk => {
      let sum = 0; let bestTipo = null;
      const [ano, mes] = mk.split('-');
      local.cajas.forEach(c => {
        const cell = local.celdas[`${c}||${mk}`];
        if (cell && cell.tipo !== 'GAP' && cell.tasa != null && cell.tasa > 0) {
          sum += cell.tasa;
          if (!bestTipo || (PRIO_TIPO[cell.tipo] ?? 0) > (PRIO_TIPO[bestTipo] ?? 0)) bestTipo = cell.tipo;
        }
      });
      if (sum > 0 && bestTipo) {
        byMes[mk] = { tasa: Math.round(sum * 10) / 10, tipo: bestTipo, mes: parseInt(mes), ano: parseInt(ano) };
      }
    });
    return Object.values(byMes).sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
  }, [local.celdas, local.cajas, meses]);

  return (
    <>
      {/* Fila header del local */}
      <tr
        onClick={esDesglose ? onToggle : undefined}
        className={`border-t border-slate-200 dark:border-white/5 transition-colors group/localrow ${esDesglose ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''}`}
      >
        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-950 z-10">
          <div className="flex items-center gap-2">
            {esDesglose
              ? (expandido
                  ? <ChevronDown size={13} className="text-accent-orange shrink-0" />
                  : <ChevronRight size={13} className="text-slate-400 shrink-0" />)
              : <span className="w-[13px] shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-black text-[11px] text-slate-900 dark:text-white leading-tight truncate">{local.local}</p>
              <p className="text-[8px] text-slate-400 font-mono">{local.codigo_tienda}</p>
            </div>
            {tienePendientes && !tieneGaps && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded text-[7px] font-black uppercase shrink-0">
                {pendienteCount} pend.
              </span>
            )}
            {tieneGaps && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-[7px] font-black uppercase shrink-0">
                {gapCount} gaps
              </span>
            )}
            {/* Toggle silenciar local entero — al extremo derecho */}
            {onToggleLocal && (
              <Tip label={isLocalSilenciado ? 'Reactivar alarmas del local' : 'Silenciar todas las alarmas del local'} placement="top">
                <button
                  onClick={e => { e.stopPropagation(); onToggleLocal(local, isLocalSilenciado ? 'ACTIVA' : 'SIN_ALARMAS'); }}
                  className={`ml-auto flex items-center gap-1 transition-all shrink-0 ${
                    isLocalSilenciado
                      ? 'opacity-100 text-amber-400'
                      : 'opacity-0 group-hover/localrow:opacity-60 text-slate-400 hover:text-amber-400'
                  }`}
                >
                  {isLocalSilenciado ? <BellOff size={12} /> : <Bell size={12} />}
                </button>
              </Tip>
            )}
          </div>
        </td>

        {/* Competidor */}
        <td className="px-3 py-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
            {local.competidor}
          </span>
        </td>

        {/* Monthly Columns */}
        {meses.map(mk => {
          const { sum, hasGap } = totalesPorMes[mk] || { sum: 0, hasGap: false };
          const [ano, mes] = mk.split('-');
          const esRutinaMk = (parseInt(ano) * 100 + parseInt(mes)) > 202511;

          return (
            <td key={mk} className={`px-2 py-3 text-center border-l border-slate-100 dark:border-white/5 ${esRutinaMk ? 'bg-orange-500/[0.02]' : ''}`}>
              {sum > 0 ? (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-900 dark:text-white">
                    {sum.toLocaleString('es-AR')}
                  </span>
                </div>
              ) : (
                hasGap ? (
                  <span className="text-[7px] font-black text-red-400 bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">GAP</span>
                ) : (
                  <span className="text-slate-300 dark:text-white/10">—</span>
                )
              )}
            </td>
          );
        })}

        {/* Cajas (Optional, moved or kept) */}
        <td className="px-3 py-3 text-right border-l border-slate-100 dark:border-white/5">
          <span className="text-[10px] font-bold text-slate-400">
            {local.cajas.length}
          </span>
        </td>

        {/* Summary Badges */}
        <td className="px-3 py-3 text-right">
          {tieneGaps ? (
            <span className="px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-[7px] font-black uppercase tracking-wider">
              {gapCount}
            </span>
          ) : <span className="text-emerald-400 opacity-20"><ShieldCheck size={10} className="ml-auto" /></span>}
        </td>
      </tr>

      {/* ── Transposed detail: rows=months, cols=cajas ─────────────────── */}
      <AnimatePresence>
        {esDesglose && expandido && (() => {
          // Sort cajas: 1..16 numerically, 99 always last
          const sortedCajas = [...local.cajas].sort((a, b) => {
            const na = parseInt(a), nb = parseInt(b);
            if (na === 99 && nb !== 99) return 1;
            if (nb === 99 && na !== 99) return -1;
            return na - nb;
          });
          // Show all months (same as parent)
          const desgloseMeses = meses;

          return (
            <motion.tr
              key="transposed"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {/* colSpan = Local + Marca + n_meses + Cj + G */}
              <td colSpan={2 + meses.length + 2} className="p-0 border-t-2 border-accent-orange/20">
                <div className="overflow-x-auto bg-slate-50/70 dark:bg-white/[0.015]">
                  <table className="w-full text-xs" style={{ minWidth: `${100 + sortedCajas.length * 90 + 80}px` }}>
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.03]">
                        {/* Mes column */}
                        <th className="pl-10 pr-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-100 dark:bg-slate-950 z-10"
                            style={{ minWidth: 80 }}>
                          Mes
                        </th>
                        {/* One column per caja */}
                        {sortedCajas.map(caja => {
                          const ck = `${local.codigo_tienda}||${caja}`;
                          const silenciada = (cajaStatusMap[ck] || 'ACTIVA') === 'SIN_ALARMAS';
                          return (
                            <th key={caja}
                                className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-widest text-slate-400"
                                style={{ minWidth: 88 }}>
                              <div className="flex items-center justify-end gap-1">
                                <span>Caja {caja}</span>
                                {/* Bell toggle inside header */}
                                {onToggleCaja && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onToggleCaja(local, caja, silenciada ? 'ACTIVA' : 'SIN_ALARMAS'); }}
                                    className={`transition-colors ${silenciada ? 'text-amber-400' : 'text-slate-300 dark:text-white/15 hover:text-amber-400'}`}
                                  >
                                    {silenciada ? <BellOff size={9} /> : <Bell size={9} />}
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        {/* Total column */}
                        <th className="px-3 py-2 text-right text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-white/40"
                            style={{ minWidth: 80 }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {desgloseMeses.map(mk => {
                        const [ano, mes] = mk.split('-');
                        const esRutinaMk = esRutina(mk);
                        return (
                          <tr key={mk}
                              className={`border-t border-slate-100 dark:border-white/[0.03] ${esRutinaMk ? '' : 'opacity-70'}`}>
                            {/* Month label */}
                            <td className="pl-10 pr-4 py-2 sticky left-0 bg-slate-50/90 dark:bg-slate-950/90 z-10">
                              <div className="flex items-center gap-1.5">
                                {esRutinaMk && <span className="w-1.5 h-1.5 rounded-full bg-accent-orange shrink-0" />}
                                <span className={`font-black text-[10px] uppercase tracking-widest ${esRutinaMk ? 'text-accent-orange' : 'text-slate-500 dark:text-white/40'}`}>
                                  {MESES[parseInt(mes)]} {ano.slice(2)}
                                </span>
                              </div>
                            </td>
                            {/* One cell per caja */}
                            {sortedCajas.map(caja => {
                              const existing = local.celdas[`${caja}||${mk}`];
                              const silenciada = isCajaSilenciada(caja);

                              if (silenciada && (!existing || existing?.tipo === 'GAP')) {
                                return (
                                  <td key={caja} className="px-3 py-2 text-right">
                                    <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
                                  </td>
                                );
                              }
                              if (!existing && !esRutinaMk) {
                                return (
                                  <td key={caja} className="px-3 py-2 text-right">
                                    <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
                                  </td>
                                );
                              }
                              const cell = existing || {
                                key: `${local.codigo_tienda}||${caja}||${mk}`,
                                codigo_tienda: local.codigo_tienda,
                                local: local.local,
                                competidor: local.competidor,
                                caja,
                                mes: parseInt(mes),
                                ano: parseInt(ano),
                                tipo: 'GAP',
                                tasa: null,
                              };
                              return (
                                <Celda
                                  key={caja}
                                  cell={cell}
                                  puntos={getPuntosCaja(caja)}
                                  onSave={onSave}
                                  pendingEdit={pendingEdit}
                                  onStartEdit={onStartEdit}
                                  onCancelEdit={onCancelEdit}
                                  isRevisada={!!revisadasMap[`${cell.codigo_tienda}||${cell.caja}||${cell.mes}||${cell.ano}`]}
                                  onMarkRevisada={onMarkRevisada}
                                  isGapRevisado={!!gapsRevisadosMap[`${cell.codigo_tienda}||${cell.caja}||${cell.mes}||${cell.ano}`]}
                                  onToggleGapRevisado={onToggleGapRevisado}
                                />
                              );
                            })}
                            {/* Total for month */}
                            <td className="px-3 py-2 text-right">
                              <span className="font-black text-[12px] text-slate-700 dark:text-white/70">
                                {totalesPorMes[mk] > 0
                                  ? fmt(totalesPorMes[mk])
                                  : <span className="text-slate-300 dark:text-white/15">—</span>
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </td>
            </motion.tr>
          );
        })()}
      </AnimatePresence>
    </>
  );
}


// ── Main Component ──────────────────────────────────────────────────────────
export default function EstimacionesDashboard({ user, cajasConfig = [], onCajasConfigChange, alarmasRevisadas = [], onAlarmasRevisadasChange }) {
  const [matrix, setMatrix]                 = useState([]);
  const [meses, setMeses]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [filterComp, setFilterComp]         = useState('');
  const [filterSoloGaps, setFilterSoloGaps] = useState(true);
  const [filterPendientes, setFilterPendientes] = useState(false);
  const [sortBy, setSortBy]                 = useState('gaps');
  const [search, setSearch]                 = useState('');
  const [expandidos, setExpandidos]         = useState(new Set());
  const [pendingEdit, setPendingEdit]       = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [notification, setNotification]     = useState(null);
  const [showGestion, setShowGestion]       = useState(false);
  const [addCajaOpen, setAddCajaOpen]       = useState(false);
  const [savingCaja, setSavingCaja]         = useState(null);
  const [newCaja, setNewCaja]               = useState({ codigo_tienda: '', caja: '', notas: '' });
  const [addingCaja, setAddingCaja]         = useState(false);
  const [showGapPct, setShowGapPct]         = useState(false); // toggle % / cant en KPI gaps
  // GAPs revisados (persistido en localStorage)
  const [gapsRevisados, setGapsRevisados]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('ngr_gaps_revisados') || '[]'); }
    catch { return []; }
  });

  const RUTINA_DESDE_GLOBAL = '2025-12';

  const notify = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API}/api/estimation-matrix${filterComp ? `?competidor=${encodeURIComponent(filterComp)}` : ''}`;
      const d = await fetch(url).then(r => r.json());
      setMatrix(d.locales || []);
      setMeses(d.meses || []);
    } catch(e) {
      notify('error', 'Error cargando la matriz de estimaciones');
    } finally {
      setLoading(false);
    }
  }, [filterComp]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  useEffect(() => {
    const handler = () => setPendingEdit(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Lookup rápido (debe estar ANTES de cualquier useMemo que lo use) ──
  // Claves: `codigo_tienda||caja` o `codigo_tienda||__LOCAL__` (local entero silenciado)
  const cajaStatusMap = useMemo(() => {
    const m = {};
    cajasConfig.forEach(c => { m[`${c.codigo_tienda}||${c.caja}`] = c.status; });
    return m;
  }, [cajasConfig]);

  const isSilenciada = (codigoTienda, caja) => {
    const localKey = `${codigoTienda}||__LOCAL__`;
    const cajaKey  = `${codigoTienda}||${caja}`;
    return (cajaStatusMap[localKey] || 'ACTIVA') === 'SIN_ALARMAS'
        || (cajaStatusMap[cajaKey]  || 'ACTIVA') === 'SIN_ALARMAS';
  };

  // Lookup rápido de GAPs revisados (DEBE estar antes de totalGaps que lo usa como dep)
  const gapsRevisadosMap = useMemo(() => {
    const m = {};
    gapsRevisados.forEach(r => { m[`${r.codigo_tienda}||${r.caja}||${r.mes}||${r.ano}`] = true; });
    return m;
  }, [gapsRevisados]);

  // Conteos (excluye cajas silenciadas del total de gaps)
  const totalGaps = useMemo(() =>
    matrix.reduce((acc, local) => {
      const noDesglose = NO_CAJA_DETAIL.has(local.competidor?.toUpperCase().trim());
      if (noDesglose) {
        return acc + meses.filter(mk =>
          mk >= RUTINA_DESDE_GLOBAL &&
          local.cajas.every(c => (local.celdas[`${c}||${mk}`]?.tipo ?? 'GAP') === 'GAP') &&
          local.cajas.every(c => !gapsRevisadosMap[`${local.codigo_tienda}||${c}||${mk.split('-')[1]}||${mk.split('-')[0]}`])
        ).length;
      }
      return acc + local.cajas.reduce((a, c) => {
        if (isSilenciada(local.codigo_tienda, c)) return a;
        return a + meses.filter(mk =>
          mk >= RUTINA_DESDE_GLOBAL &&
          local.celdas[`${c}||${mk}`]?.tipo === 'GAP' &&
          !gapsRevisadosMap[`${local.codigo_tienda}||${c}||${mk.split('-')[1]}||${mk.split('-')[0]}`]
        ).length;
      }, 0);
    }, 0),
    [matrix, meses, cajaStatusMap, gapsRevisadosMap]
  );

  const totalPendientes = useMemo(() =>
    matrix.reduce((acc, local) =>
      acc + local.cajas.reduce((a, c) =>
        a + meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${c}||${mk}`]?.tipo === 'PENDIENTE').length, 0), 0),
    [matrix, meses]
  );

  const totalAprobados = useMemo(() =>
    matrix.reduce((acc, local) =>
      acc + local.cajas.reduce((a, c) =>
        a + meses.filter(mk => local.celdas[`${c}||${mk}`]?.tipo === 'APROBADO').length, 0), 0),
    [matrix, meses]
  );

  // Total de celdas de rutina (excluyendo silenciadas) — denominador del porcentaje
  const totalCeldas = useMemo(() => {
    const rutinaMeses = meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL);
    return matrix.reduce((acc, local) => {
      const noDesglose = NO_CAJA_DETAIL.has(local.competidor?.toUpperCase().trim());
      if (noDesglose) return acc + rutinaMeses.length; // 1 fila × N meses
      return acc + local.cajas.filter(c => !isSilenciada(local.codigo_tienda, c)).length * rutinaMeses.length;
    }, 0);
  }, [matrix, meses, cajaStatusMap]);

  const pctEstimacion = totalCeldas > 0
    ? Math.round((totalAprobados + totalPendientes + (totalCeldas - totalGaps - totalAprobados - totalPendientes)) / totalCeldas * 100)
    : 0;
  // Más preciso: % de celdas que YA tienen algún dato (no GAP)
  const pctCubierto = totalCeldas > 0
    ? Math.round((totalCeldas - totalGaps) / totalCeldas * 100)
    : 0;

  // KPIs de actividad (monitorización de cajas/locales silenciados)
  const localesActivos = useMemo(() =>
    matrix.filter(l => (cajaStatusMap[`${l.codigo_tienda}||__LOCAL__`] || 'ACTIVA') !== 'SIN_ALARMAS').length,
    [matrix, cajaStatusMap]
  );
  const cajasActivas = useMemo(() =>
    matrix.reduce((acc, l) =>
      acc + l.cajas.filter(c => !isSilenciada(l.codigo_tienda, c)).length, 0),
    [matrix, cajaStatusMap]
  );

  // Lookup rápido de alarmas revisadas: `codigo_tienda||caja||mes||ano` → true
  const revisadasMap = useMemo(() => {
    const m = {};
    alarmasRevisadas.forEach(r => { m[`${r.codigo_tienda}||${r.caja}||${r.mes}||${r.ano}`] = true; });
    return m;
  }, [alarmasRevisadas]);

  // Marcar/desmarcar GAP como revisado
  const handleToggleGapRevisado = useCallback((cell, marcar) => {
    const key = `${cell.codigo_tienda}||${cell.caja}||${cell.mes}||${cell.ano}`;
    setGapsRevisados(prev => {
      const next = marcar
        ? [...prev.filter(r => `${r.codigo_tienda}||${r.caja}||${r.mes}||${r.ano}` !== key),
           { codigo_tienda: cell.codigo_tienda, caja: String(cell.caja), mes: cell.mes, ano: cell.ano }]
        : prev.filter(r => `${r.codigo_tienda}||${r.caja}||${r.mes}||${r.ano}` !== key);
      try { localStorage.setItem('ngr_gaps_revisados', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Filtrado + orden (excluye cajas silenciadas del filtro de gaps)
  const localesFiltrados = useMemo(() => {
    let d = matrix;
    if (filterSoloGaps) {
      d = d.filter(local => local.cajas.some(c => {
        return !isSilenciada(local.codigo_tienda, c)
          && meses.some(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${c}||${mk}`]?.tipo === 'GAP');
      }));
    } else if (filterPendientes) {
      d = d.filter(local => local.cajas.some(c =>
        meses.some(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${c}||${mk}`]?.tipo === 'PENDIENTE')
      ));
    }
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(l => l.local?.toLowerCase().includes(q) || l.codigo_tienda?.toLowerCase().includes(q));
    }
    d = [...d];
    if (sortBy === 'gaps') {
      const gc = (l) => l.cajas.reduce((acc, c) => {
        if (isSilenciada(l.codigo_tienda, c)) return acc;
        return acc + meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL && l.celdas[`${c}||${mk}`]?.tipo === 'GAP').length;
      }, 0);
      d.sort((a, b) => gc(b) - gc(a));
    } else if (sortBy === 'pendiente') {
      const pc = (l) => l.cajas.reduce((acc, c) =>
        acc + meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL && l.celdas[`${c}||${mk}`]?.tipo === 'PENDIENTE').length, 0);
      d.sort((a, b) => pc(b) - pc(a));
    } else {
      d.sort((a, b) => a.local?.localeCompare(b.local));
    }
    return d;
  }, [matrix, meses, filterSoloGaps, filterPendientes, search, sortBy, cajaStatusMap]);


  const competidores = useMemo(() => [...new Set(matrix.map(l => l.competidor))].sort(), [matrix]);

  const handleStartEdit = (cell) => setPendingEdit(cell);
  const handleCancelEdit = () => setPendingEdit(null);

  const handleSave = useCallback(async (cell) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/save-estimation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda:  cell.codigo_tienda,
          local:          cell.local,
          competidor:     cell.competidor,
          caja:           cell.caja,
          mes:            cell.mes,
          ano:            cell.ano,
          trx_diarias:   cell.trx_diarias,
          metodo:         cell.metodo || 'IGUAL_ANTERIOR',
          aprobado:       !!cell.aprobado,
          usuario:        user?.email        ?? 'dashboard',
          usuario_nombre: user?.displayName  ?? 'Dashboard',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error guardando');

      // Actualización optimista local
      const nuevoTipo = cell.aprobado ? 'APROBADO' : 'PENDIENTE';
      setMatrix(prev => prev.map(local => {
        if (local.codigo_tienda !== cell.codigo_tienda) return local;
        const mk = `${cell.ano}-${String(cell.mes).padStart(2, '0')}`;
        const ck = `${cell.caja}||${mk}`;
        return {
          ...local,
          celdas: {
            ...local.celdas,
            [ck]: {
              ...local.celdas[ck],
              tipo:    nuevoTipo,
              tasa:    cell.trx_diarias,
              metodo:  cell.metodo,
              aprobado: !!cell.aprobado,
            }
          }
        };
      }));

      const accion = cell.aprobado ? '✓ Aprobada y publicada' : '⏳ Guardada como borrador';
      notify('success', `${accion}: ${cell.local} · Caja ${cell.caja} · ${MESES[cell.mes]} ${cell.ano}`);
    } catch(e) {
      notify('error', `Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [user]);

  const toggleExpandido = (codigoTienda) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(codigoTienda)) next.delete(codigoTienda);
      else next.add(codigoTienda);
      return next;
    });
  };

  const expandAll  = () => setExpandidos(new Set(localesFiltrados.map(l => l.codigo_tienda)));
  const collapseAll = () => setExpandidos(new Set());

  // Toggle silenciar/activar alarmas para una caja o local entero
  const handleToggleCaja = useCallback(async (local, caja, newStatus) => {
    const ck = `${local.codigo_tienda}||${caja}`;
    // Optimistic update
    onCajasConfigChange?.(prev => {
      const exists = prev.find(c => c.codigo_tienda === local.codigo_tienda && c.caja === String(caja));
      if (exists) return prev.map(c => c.codigo_tienda === local.codigo_tienda && c.caja === String(caja) ? { ...c, status: newStatus } : c);
      return [...prev, { codigo_tienda: local.codigo_tienda, caja: String(caja), local: local.local, competidor: local.competidor, status: newStatus, notas: '' }];
    });
    try {
      const res = await fetch(`${API}/api/cajas-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: local.codigo_tienda,
          caja:          String(caja),
          local:         local.local,
          competidor:    local.competidor,
          status:        newStatus,
          notas:         '',
          usuario:       user?.email || 'dashboard',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      const label = newStatus === 'SIN_ALARMAS' ? '🔕 Alarmas silenciadas' : '🔔 Alarmas reactivadas';
      notify('success', `${label}: ${local.local} · Caja ${caja}`);
    } catch(e) {
      // Rollback on error
      onCajasConfigChange?.(prev => prev.map(c =>
        c.codigo_tienda === local.codigo_tienda && c.caja === String(caja)
          ? { ...c, status: newStatus === 'SIN_ALARMAS' ? 'ACTIVA' : 'SIN_ALARMAS' }
          : c
      ));
      notify('error', `Error: ${e.message}`);
    }
  }, [user, onCajasConfigChange]);

  // Toggle silenciar/activar el local entero (usa caja='__LOCAL__' como clave)
  const handleToggleLocal = useCallback(async (local, newStatus) => {
    onCajasConfigChange?.(prev => {
      const exists = prev.find(c => c.codigo_tienda === local.codigo_tienda && c.caja === '__LOCAL__');
      const entry = { codigo_tienda: local.codigo_tienda, caja: '__LOCAL__', local: local.local, competidor: local.competidor, status: newStatus, notas: 'Local completo' };
      if (exists) return prev.map(c => c.codigo_tienda === local.codigo_tienda && c.caja === '__LOCAL__' ? { ...c, status: newStatus } : c);
      return [...prev, entry];
    });
    try {
      const res = await fetch(`${API}/api/cajas-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: local.codigo_tienda,
          caja:          '__LOCAL__',
          local:         local.local,
          competidor:    local.competidor,
          status:        newStatus,
          notas:         'Local completo',
          usuario:       user?.email || 'dashboard',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      const label = newStatus === 'SIN_ALARMAS' ? '🔕 Local silenciado' : '🔔 Local reactivado';
      notify('success', `${label}: ${local.local}`);
    } catch(e) {
      onCajasConfigChange?.(prev => prev.map(c =>
        c.codigo_tienda === local.codigo_tienda && c.caja === '__LOCAL__'
          ? { ...c, status: newStatus === 'SIN_ALARMAS' ? 'ACTIVA' : 'SIN_ALARMAS' }
          : c
      ));
      notify('error', `Error: ${e.message}`);
    }
  }, [user, onCajasConfigChange]);

  // Marcar/desmarcar alarma de caída como revisada
  const handleMarkRevisada = useCallback(async (cell, marcar) => {
    // Optimistic update
    onAlarmasRevisadasChange?.(prev =>
      marcar
        ? [...prev, { codigo_tienda: cell.codigo_tienda, caja: String(cell.caja), mes: cell.mes, ano: cell.ano, revisado_por: user?.email || 'dashboard' }]
        : prev.filter(r => !(r.codigo_tienda === cell.codigo_tienda && String(r.caja) === String(cell.caja) && r.mes === cell.mes && r.ano === cell.ano))
    );
    try {
      const res = await fetch(`${API}/api/alarmas-revisadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: cell.codigo_tienda,
          caja:          String(cell.caja),
          mes:           cell.mes,
          ano:           cell.ano,
          revisado_por:  user?.email || 'dashboard',
          accion:        marcar ? 'MARCAR' : 'QUITAR',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      notify('success', marcar ? '✓ Alarma marcada como revisada' : 'Revisión quitada');
    } catch(e) {
      onAlarmasRevisadasChange?.(prev =>
        marcar
          ? prev.filter(r => !(r.codigo_tienda === cell.codigo_tienda && String(r.caja) === String(cell.caja) && r.mes === cell.mes && r.ano === cell.ano))
          : [...prev, { codigo_tienda: cell.codigo_tienda, caja: String(cell.caja), mes: cell.mes, ano: cell.ano, revisado_por: user?.email || 'dashboard' }]
      );
      notify('error', `Error: ${e.message}`);
    }
  }, [user, onAlarmasRevisadasChange]);

  return (
    <div className="space-y-5 px-1" onClick={e => e.stopPropagation()}>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-black ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span className="text-[11px]">{notification.msg}</span>
            <button onClick={() => setNotification(null)} className="ml-1 opacity-60 hover:opacity-100"><X size={12}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardEdit size={22} className="text-accent-orange" />
            Mesa de Estimaciones
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Gaps se pre-llenan con "igual al anterior" · Aprobá para publicar en dashboard
          </p>
        </div>
        <button
          onClick={fetchMatrix}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 transition-all disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Gestión de Cajas panel ─────────────────────────────────────── */}
      <div className="pwa-card overflow-hidden">
        <button
          onClick={() => setShowGestion(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={13} className="text-accent-orange" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">Gestión de Cajas</span>
            <span className="text-[8px] font-bold text-slate-400">
              {cajasConfig.length > 0 ? `${cajasConfig.length} cajas configuradas` : 'Sin configuraciones'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); setAddCajaOpen(v => !v); setShowGestion(true); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-accent-orange/10 border border-accent-orange/30 text-accent-orange rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-accent-orange/20 transition-colors"
            >
              <Plus size={10} /> Agregar caja
            </button>
            {showGestion ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
          </div>
        </button>

        <AnimatePresence>
          {showGestion && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-200 dark:border-white/5">

                {/* ── Agregar caja mini-form ── */}
                <AnimatePresence>
                  {addCajaOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-4 bg-accent-orange/5 border-b border-accent-orange/20"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent-orange mb-3 flex items-center gap-1.5">
                        <Plus size={11} /> Registrar nueva caja
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Buscador código tienda — combobox */}
                        <div className="col-span-2 sm:col-span-1 relative">
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Código tienda</label>
                          {(() => {
                            const tiendas = [...new Map(matrix.map(l => [l.codigo_tienda, l])).values()]
                              .sort((a, b) => a.local?.localeCompare(b.local));
                            const q = newCaja._tiendaSearch ?? newCaja.codigo_tienda;
                            const filtered = q
                              ? tiendas.filter(l =>
                                  l.codigo_tienda?.toLowerCase().includes(q.toLowerCase()) ||
                                  l.local?.toLowerCase().includes(q.toLowerCase()))
                              : tiendas;
                            return (
                              <>
                                <div className="relative">
                                  <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input
                                    type="text"
                                    placeholder="Buscar código o local…"
                                    value={newCaja._tiendaSearch ?? newCaja.codigo_tienda}
                                    onFocus={() => setNewCaja(prev => ({ ...prev, _tiendaOpen: true, _tiendaSearch: prev._tiendaSearch ?? '' }))}
                                    onChange={e => setNewCaja(prev => ({
                                      ...prev,
                                      _tiendaSearch: e.target.value,
                                      _tiendaOpen: true,
                                      ...(e.target.value === '' ? { codigo_tienda: '', _local: '', _competidor: '' } : {}),
                                    }))}
                                    onBlur={() => setTimeout(() => setNewCaja(prev => ({ ...prev, _tiendaOpen: false })), 150)}
                                    className="w-full pl-7 pr-2.5 py-1.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
                                  />
                                </div>
                                {newCaja._tiendaOpen && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                                    {filtered.length === 0 ? (
                                      <p className="px-3 py-3 text-[9px] text-slate-400 font-bold">Sin resultados</p>
                                    ) : filtered.map(l => (
                                      <button
                                        key={l.codigo_tienda}
                                        type="button"
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => setNewCaja(prev => ({
                                          ...prev,
                                          codigo_tienda: l.codigo_tienda,
                                          _local:        l.local || '',
                                          _competidor:   l.competidor || '',
                                          _tiendaSearch: undefined,
                                          _tiendaOpen:   false,
                                        }))}
                                        className={`w-full text-left px-3 py-2 text-[10px] transition-colors ${
                                          newCaja.codigo_tienda === l.codigo_tienda
                                            ? 'bg-accent-orange/10 text-accent-orange font-black'
                                            : 'text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                        }`}
                                      >
                                        <span className="font-black">{l.codigo_tienda}</span>
                                        <span className="text-slate-400 dark:text-white/30 ml-1.5">— {l.local}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        {/* Local (auto-fill) */}
                        <div>
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Local</label>
                          <input
                            readOnly
                            value={newCaja._local || ''}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-black/10 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-500 opacity-70"
                          />
                        </div>
                        {/* N° de caja */}
                        <div>
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1 block">N° Caja</label>
                          <input
                            type="text"
                            placeholder="ej. 3"
                            value={newCaja.caja}
                            onChange={e => setNewCaja(prev => ({ ...prev, caja: e.target.value }))}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
                          />
                        </div>
                        {/* Notas */}
                        <div className="col-span-2 sm:col-span-1 flex items-end gap-2">
                          <input
                            type="text"
                            placeholder="Notas opcionales"
                            value={newCaja.notas || ''}
                            onChange={e => setNewCaja(prev => ({ ...prev, notas: e.target.value }))}
                            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
                          />
                          <button
                            disabled={!newCaja.codigo_tienda || !newCaja.caja || addingCaja}
                            onClick={async () => {
                              setAddingCaja(true);
                              try {
                                const res = await fetch(`${API}/api/add-caja`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    codigo_tienda: newCaja.codigo_tienda,
                                    caja:          newCaja.caja,
                                    local:         newCaja._local || '',
                                    competidor:    newCaja._competidor || '',
                                    notas:         newCaja.notas || '',
                                    usuario:       user?.email || 'dashboard',
                                  }),
                                });
                                const result = await res.json();
                                if (!result.success) throw new Error(result.error);
                                // Actualizar lista local
                                const newEntry = {
                                  codigo_tienda: newCaja.codigo_tienda,
                                  caja: newCaja.caja,
                                  local: newCaja._local || '',
                                  competidor: newCaja._competidor || '',
                                  status: 'ACTIVA',
                                  notas: newCaja.notas || '',
                                  manual: true,
                                };
                                onCajasConfigChange?.(prev => [...prev, newEntry]);
                                setNewCaja({ codigo_tienda: '', caja: '', notas: '' });
                                setAddCajaOpen(false);
                                notify('success', `Caja ${newCaja.caja} registrada para ${newCaja._local || newCaja.codigo_tienda}`);
                              } catch(e) {
                                notify('error', e.message);
                              } finally {
                                setAddingCaja(false);
                              }
                            }}
                            className="px-3 py-1.5 bg-accent-orange text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
                          >
                            {addingCaja ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            Agregar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Cajas: silenciadas + registradas manualmente ── */}
                {(() => {
                  // Mostrar si está silenciada O fue registrada manualmente
                  const visible = cajasConfig.filter(c => c.manual || c.status === 'SIN_ALARMAS');
                  const silCount = visible.filter(c => c.status === 'SIN_ALARMAS').length;
                  const manCount = visible.filter(c => c.manual).length;

                  if (visible.length === 0) return (
                    <div className="px-4 py-5 flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                      <Bell size={11} className="text-slate-300 dark:text-white/20" />
                      Todo activo — ninguna alarma silenciada ni cajas registradas manualmente.
                    </div>
                  );

                  return (
                    <div className="px-4 py-4">
                      {/* Contador rápido */}
                      <div className="flex items-center gap-3 mb-3">
                        {silCount > 0 && (
                          <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-amber-500">
                            <BellOff size={9} /> {silCount} silenciada{silCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {manCount > 0 && (
                          <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-violet-500">
                            <Store size={9} /> {manCount} manual{manCount > 1 ? 'es' : ''}
                          </span>
                        )}
                      </div>

                      {/* Grid de cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {visible.map(cfg => {
                          const isSil = cfg.status === 'SIN_ALARMAS';
                          return (
                            <div
                              key={`${cfg.codigo_tienda}||${cfg.caja}`}
                              className={`relative group rounded-xl border p-2.5 flex flex-col gap-1.5 ${
                                isSil
                                  ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/15'
                                  : 'bg-white dark:bg-white/[0.025] border-slate-200 dark:border-white/8'
                              }`}
                            >
                              {/* Header: competidor + caja */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-black text-slate-800 dark:text-white leading-tight truncate">
                                    {cfg.local || cfg.codigo_tienda}
                                  </p>
                                  <p className="text-[8px] text-slate-400 dark:text-white/30 font-mono leading-none mt-0.5">
                                    {cfg.codigo_tienda}
                                  </p>
                                </div>
                                {/* Badge "manual" */}
                                {cfg.manual && (
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400 mt-0.5" title="Registrada manualmente" />
                                )}
                              </div>

                              {/* Caja num */}
                              <p className="text-[11px] font-black text-slate-600 dark:text-white/60">
                                Caja {cfg.caja}
                              </p>

                              {/* Notas + usuario */}
                              {(cfg.notas || cfg.usuario) && (
                                <div className="flex flex-col gap-0.5">
                                  {cfg.notas && (
                                    <p className="text-[9px] text-slate-500 dark:text-white/40 italic leading-tight line-clamp-2">
                                      "{cfg.notas}"
                                    </p>
                                  )}
                                  {cfg.usuario && (
                                    <p className="text-[8px] text-slate-400 dark:text-white/25 font-mono flex items-center gap-1">
                                      <span className="text-[7px]">👤</span>
                                      {cfg.usuario}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Footer: status + actions */}
                              <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-black/5 dark:border-white/5">
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                                  isSil
                                    ? 'bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                }`}>
                                  {isSil ? '🔕 Silenciada' : '🔔 Activa'}
                                </span>

                                <div className="flex items-center gap-0.5">
                                  {/* Toggle silencio */}
                                  <Tip label={isSil ? 'Reactivar alarmas de esta caja' : 'Silenciar alarmas de esta caja'}>
                                    <button
                                      onClick={() => handleToggleCaja(cfg, cfg.caja, isSil ? 'ACTIVA' : 'SIN_ALARMAS')}
                                      className={`p-1 rounded-lg transition-colors ${
                                        isSil
                                          ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/15'
                                          : 'text-slate-300 dark:text-white/20 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                                      }`}
                                    >
                                      {isSil ? <BellOff size={11} /> : <Bell size={11} />}
                                    </button>
                                  </Tip>

                                  {/* Desregistrar / Eliminar — solo para manuales */}
                                  {cfg.manual && (
                                    <>
                                      {/* Desregistrar: quita del panel sin borrar de BQ */}
                                      {!isSil && <DesregistrarButton cfg={cfg} user={user} onCajasConfigChange={onCajasConfigChange} notify={notify} />}
                                      {/* Eliminar: borra de BQ y de matrix */}
                                      <Tip label="Eliminar caja permanentemente">
                                        <DeleteCajaButton
                                          cfg={cfg}
                                          user={user}
                                          compact
                                          onDeleted={() => {
                                            onCajasConfigChange?.(prev =>
                                              prev.filter(c => !(c.codigo_tienda === cfg.codigo_tienda && c.caja === cfg.caja))
                                            );
                                            setMatrix([]);
                                            fetch(`${API}/api/estimation-matrix`).then(r => r.json()).then(d => {
                                              if (d.locales) setMatrix(d.locales);
                                              if (d.meses)   setMeses(d.meses);
                                            }).catch(() => {});
                                            notify('success', `Caja ${cfg.caja} eliminada`);
                                          }}
                                          onError={e => notify('error', e)}
                                        />
                                      </Tip>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {/* ── Card Gaps: toggle cant / % ── */}
        <button
          onClick={() => { setFilterSoloGaps(true); setFilterPendientes(false); }}
          className="pwa-card p-4 flex items-center gap-4 text-left hover:ring-2 hover:ring-accent-orange/20 transition-all relative overflow-hidden"
        >
          <div className="p-2.5 rounded-xl bg-white/5 text-red-400"><AlertTriangle size={18} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                {showGapPct ? '% Sin cubrir' : 'Gaps sin cubrir'}
              </p>
              {/* Toggle % / # */}
              <button
                onClick={e => { e.stopPropagation(); setShowGapPct(v => !v); }}
                className="shrink-0 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/8 text-slate-400 dark:text-white/30 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
              >
                {showGapPct ? '#' : '%'}
              </button>
            </div>
            <p className="text-xl font-black text-red-400 mt-0.5">
              {loading ? '—' : showGapPct ? `${100 - pctCubierto}%` : totalGaps}
            </p>
            {!loading && showGapPct && (
              <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 dark:bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${pctCubierto}%` }}
                />
              </div>
            )}
          </div>
        </button>

        {/* ── Pendientes + Aprobados ── */}
        {[
          { label: 'Pendientes de aprobación', value: loading ? '—' : totalPendientes, color: 'text-amber-400',  icon: Clock,      filter: () => { setFilterSoloGaps(false); setFilterPendientes(true); } },
          { label: 'Aprobados y publicados',   value: loading ? '—' : totalAprobados,  color: 'text-violet-400', icon: ShieldCheck, filter: () => { setFilterSoloGaps(false); setFilterPendientes(false); } },
        ].map(c => (
          <button
            key={c.label}
            onClick={c.filter}
            className="pwa-card p-4 flex items-center gap-4 text-left hover:ring-2 hover:ring-accent-orange/20 transition-all"
          >
            <div className={`p-2.5 rounded-xl bg-white/5 ${c.color}`}><c.icon size={18} /></div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{c.value}</p>
            </div>
          </button>
        ))}

        {/* ── % Estimación cubierta ── */}
        <div className="pwa-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><ShieldCheck size={18} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">% Estimación</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">
              {loading ? '—' : `${pctCubierto}%`}
            </p>
            {!loading && (
              <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 dark:bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${pctCubierto}%` }}
                />
              </div>
            )}
          </div>
        </div>
        {/* Locales activos */}
        <div className="pwa-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><Store size={18} /></div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Locales activos</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? '—' : localesActivos}
              {!loading && matrix.length > 0 && (
                <span className="text-[9px] font-bold text-slate-400 ml-1.5">/ {matrix.length}</span>
              )}
            </p>
          </div>
        </div>
        {/* Cajas activas */}
        <div className="pwa-card p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400"><Bell size={18} /></div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cajas activas</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? '—' : cajasActivas}
              {!loading && (() => {
                const total = matrix.reduce((a, l) => a + l.cajas.length, 0);
                return total > 0 ? <span className="text-[9px] font-bold text-slate-400 ml-1.5">/ {total}</span> : null;
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 pwa-card px-4 py-3">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 shrink-0">Referencia:</span>
        {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => (
          <span key={tipo} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        ))}
        <span className="ml-auto text-[8px] font-bold text-slate-300 dark:text-white/20 italic flex items-center gap-1">
          <Info size={10} />
          Solo los <strong className="text-violet-400">Aprobados</strong> se muestran en Market Share
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar local o código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </div>
        <select
          value={filterComp}
          onChange={e => setFilterComp(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none"
        >
          <option value="">Todos los competidores</option>
          {competidores.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Sort */}
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Ordenar</span>
          {[{ id: 'gaps', label: 'gaps' }, { id: 'pendiente', label: 'pendientes' }, { id: 'local', label: 'A-Z' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                sortBy === opt.id ? 'bg-accent-orange text-white shadow-sm' : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filtros rápidos */}
        <button
          onClick={() => { setFilterSoloGaps(v => !v); setFilterPendientes(false); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
            filterSoloGaps ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40'
          }`}
        >
          <AlertTriangle size={10} />
          Solo gaps
        </button>
        <button
          onClick={() => { setFilterPendientes(v => !v); setFilterSoloGaps(false); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
            filterPendientes ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40'
          }`}
        >
          <Clock size={10} />
          Pendientes
        </button>
        <button onClick={expandAll} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors">
          Expandir todo
        </button>
        <button onClick={collapseAll} className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors">
          Colapsar todo
        </button>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 size={36} className="animate-spin text-accent-orange" />
          <p className="text-[10px] font-black uppercase tracking-widest">Construyendo matriz de estimaciones…</p>
        </div>
      ) : localesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <CheckCircle2 size={40} strokeWidth={1} className="text-emerald-400" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            {filterSoloGaps ? '¡Sin gaps pendientes! Todos los períodos están cubiertos.' : 'Sin locales para mostrar.'}
          </p>
          {(filterSoloGaps || filterPendientes) && (
            <button
              onClick={() => { setFilterSoloGaps(false); setFilterPendientes(false); }}
              className="text-[9px] font-black uppercase tracking-widest text-accent-orange hover:underline"
            >
              Ver todos los locales →
            </button>
          )}
        </div>
      ) : (
        <div className="pwa-card overflow-x-auto">
          <div style={{ minWidth: `${220 + 100 + meses.length * 75 + 80}px` }}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-950 z-10" style={{ minWidth: 220 }}>
                    Local
                  </th>
                  <th className="px-3 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400" style={{ width: 100 }}>
                    Marca
                  </th>
                  {meses.map(mk => {
                    const [ano, mes] = mk.split('-');
                    const mesLabel = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][parseInt(mes)-1];
                    const esRutinaMk = (parseInt(ano) * 100 + parseInt(mes)) > 202511;

                    return (
                      <th key={mk} className="px-2 py-3 text-center text-[8px] font-black uppercase tracking-widest" style={{ minWidth: 70 }}>
                        <span className={esRutinaMk ? 'text-accent-orange' : 'text-slate-400'}>
                          {mesLabel}
                        </span>
                        <span className="block text-[6px] opacity-40">{ano}</span>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400" style={{ width: 40 }}>
                    Cj
                  </th>
                  <th className="px-3 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400" style={{ width: 40 }}>
                    G
                  </th>
                </tr>
              </thead>
              <tbody>
                {localesFiltrados.map(local => (
                  <LocalRow
                    key={local.codigo_tienda}
                    local={local}
                    meses={meses}
                    pendingEdit={pendingEdit}
                    onStartEdit={cell => { setPendingEdit(null); setTimeout(() => handleStartEdit(cell), 0); }}
                    onCancelEdit={handleCancelEdit}
                    onSave={handleSave}
                    expandido={expandidos.has(local.codigo_tienda)}
                    onToggle={() => toggleExpandido(local.codigo_tienda)}
                    cajaStatusMap={cajaStatusMap}
                    onToggleCaja={handleToggleCaja}
                    onToggleLocal={handleToggleLocal}
                    revisadasMap={revisadasMap}
                    onMarkRevisada={handleMarkRevisada}
                     gapsRevisadosMap={gapsRevisadosMap}
                     onToggleGapRevisado={handleToggleGapRevisado}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-[8px] text-slate-400 font-bold">
              {localesFiltrados.length} locales · Click en fila para ver cajas · Click en GAP para estimar
            </p>
            {saving && (
              <div className="flex items-center gap-1.5 text-accent-orange text-[9px] font-black">
                <Loader2 size={11} className="animate-spin" />
                Guardando en BigQuery…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
