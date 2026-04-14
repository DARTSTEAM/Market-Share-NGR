import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardEdit, RefreshCw, AlertTriangle, CheckCircle2,
  Loader2, ChevronDown, ChevronRight, Search,
  TrendingDown, Wifi, Database, Info, X, Check, Pencil,
  ShieldCheck, Clock, Settings2, Plus, Power, BellOff, Store, Bell
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
function Celda({ cell, puntos, onSave, pendingEdit, onStartEdit, onCancelEdit }) {
  const isEditing = pendingEdit?.key === cell.key;

  if (cell.tipo === 'GAP') {
    return (
      <td className="px-1.5 py-1.5 align-middle relative" style={{ minWidth: 90 }} onClick={e => e.stopPropagation()}>
        {isEditing && (
          <div className="relative z-20">
            <EditPanel cell={cell} puntos={puntos} onSave={onSave} onCancelEdit={onCancelEdit} />
          </div>
        )}
        <button
          onClick={() => onStartEdit(cell)}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all group"
        >
          <AlertTriangle size={9} className="text-red-400 shrink-0" />
          <span className="text-[10px] font-black text-red-400">GAP</span>
        </button>
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
  const esCaidaAlarm = cell.caida_pct != null && cell.caida_pct <= -20;
  return (
    <td
      className={`px-3 py-2.5 text-right align-middle group relative cursor-pointer select-none transition-colors ${
        esCaidaAlarm ? 'bg-red-500/5' : 'hover:bg-slate-100/60 dark:hover:bg-white/[0.04]'
      }`}
      onClick={e => { e.stopPropagation(); onStartEdit(cell); }}
    >
      {isEditing && (
        <div className="relative z-20" onClick={e => e.stopPropagation()}>
          <EditPanel cell={cell} puntos={puntos} onSave={onSave} onCancelEdit={onCancelEdit} />
        </div>
      )}
      <div className="flex items-center justify-end gap-1.5">
        {esCaidaAlarm && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
        <span className={`font-mono font-black text-[12px] ${esCaidaAlarm ? 'text-red-400' : 'text-slate-800 dark:text-white/90'}`}>
          {fmt(cell.tasa)}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {(cell.tipo === 'APROBADO' || cell.tipo === 'REAL' || cell.tipo === 'HISTORIAL') &&
          <Pencil size={7} className="opacity-0 group-hover:opacity-30 text-slate-400 transition-opacity shrink-0 -mr-0.5" />
        }
      </div>
      {esCaidaAlarm && (
        <div className="text-[8px] text-red-400 font-black text-right">{cell.caida_pct?.toFixed(0)}%</div>
      )}
    </td>
  );
}

// Competidores que NO necesitan desglose por caja
const NO_CAJA_DETAIL = new Set(['DOMINOS', "DOMINO'S", 'LITTLE CAESARS', "LITTLE CAESAR'S"]);

// ── Fila de un local ──────────────────────────────────────────────────────────
function LocalRow({ local, meses, pendingEdit, onStartEdit, onCancelEdit, onSave, expandido, onToggle, cajaStatusMap = {}, onToggleCaja, onToggleLocal }) {
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
      local.cajas.forEach(caja => {
        const cell = local.celdas[`${caja}||${mk}`];
        if (cell?.tasa != null) sum += cell.tasa;
      });
      t[mk] = sum;
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

  const gapCount = local.cajas.reduce((acc, c) =>
    isCajaSilenciada(c) ? acc :
    acc + meses.filter(mk => esRutina(mk) && local.celdas[`${c}||${mk}`]?.tipo === 'GAP').length, 0);
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
              <button
                title={isLocalSilenciado ? 'Local silenciado — click para reactivar' : 'Silenciar todas las alarmas de este local'}
                onClick={e => { e.stopPropagation(); onToggleLocal(local, isLocalSilenciado ? 'ACTIVA' : 'SIN_ALARMAS'); }}
                className={`ml-auto flex items-center gap-1 transition-all shrink-0 ${
                  isLocalSilenciado
                    ? 'opacity-100 text-amber-400'
                    : 'opacity-0 group-hover/localrow:opacity-60 text-slate-400 hover:text-amber-400'
                }`}
              >
                {isLocalSilenciado ? <BellOff size={12} /> : <Bell size={12} />}
              </button>
            )}
          </div>
        </td>

        {meses.map(mk => {
          if (!esDesglose) {
            const editCell = getEditableCellLocal(mk);
            if (editCell) {
              return (
                <Celda
                  key={mk}
                  cell={editCell}
                  puntos={puntosLocal}
                  onSave={onSave}
                  pendingEdit={pendingEdit}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                />
              );
            }
            return (
              <td key={mk} className="px-3 py-3 text-right">
                <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
              </td>
            );
          }
          return (
            <td key={mk} className="px-3 py-3 text-right">
              <span className="font-black text-[12px] text-slate-700 dark:text-white/70">
                {totalesPorMes[mk] > 0 ? fmt(totalesPorMes[mk]) : <span className="text-slate-300 dark:text-white/15">—</span>}
              </span>
            </td>
          );
        })}
      </tr>

      {/* Filas de cajas */}
      <AnimatePresence>
        {esDesglose && expandido && local.cajas.map(caja => (
          <motion.tr
            key={caja}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-slate-50/60 dark:bg-white/[0.015] border-t border-slate-100 dark:border-white/[0.03]"
          >
            <td className="pl-10 pr-4 py-2 sticky left-0 bg-slate-50/80 dark:bg-slate-950/80 z-10">
              {/* Texto de caja + campana al extremo derecho */}
              <div className="flex items-center justify-between w-full group/cajacell">
                <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">
                  Caja {caja}
                </span>
                {/* Toggle de alarmas: extremo derecho */}
                {onToggleCaja && (() => {
                  const ck = `${local.codigo_tienda}||${caja}`;
                  const silenciada = (cajaStatusMap[ck] || 'ACTIVA') === 'SIN_ALARMAS';
                  return (
                    <button
                      title={silenciada ? 'Alarmas silenciadas — click para reactivar' : 'Click para silenciar alarmas de esta caja'}
                      onClick={e => { e.stopPropagation(); onToggleCaja(local, caja, silenciada ? 'ACTIVA' : 'SIN_ALARMAS'); }}
                      className={`flex items-center gap-1 transition-all shrink-0 ${
                        silenciada
                          ? 'opacity-100 text-amber-400'
                          : 'opacity-0 group-hover/cajacell:opacity-60 text-slate-400 hover:text-amber-400'
                      }`}
                    >
                      {silenciada ? <BellOff size={11} /> : <Bell size={11} />}
                    </button>
                  );
                })()}
              </div>
            </td>
            {meses.map(mk => {
              const existing = local.celdas[`${caja}||${mk}`];
              const silenciada = isCajaSilenciada(caja);

              // Caja silenciada: GAPs se muestran como guión (sin badge rojo)
              if (silenciada && (!existing && esRutina(mk))) {
                return (
                  <td key={mk} className="px-3 py-2 text-right">
                    <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
                  </td>
                );
              }
              if (silenciada && existing?.tipo === 'GAP') {
                return (
                  <td key={mk} className="px-3 py-2 text-right">
                    <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
                  </td>
                );
              }

              if (!existing && !esRutina(mk)) {
                return (
                  <td key={mk} className="px-3 py-2 text-right">
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
                mes: parseInt(mk.split('-')[1]),
                ano: parseInt(mk.split('-')[0]),
                tipo: 'GAP',
                tasa: null,
              };
              return (
                <Celda
                  key={mk}
                  cell={cell}
                  puntos={getPuntosCaja(caja)}
                  onSave={onSave}
                  pendingEdit={pendingEdit}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                />
              );
            })}
          </motion.tr>
        ))}
      </AnimatePresence>
    </>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function EstimacionesDashboard({ user, cajasConfig = [], onCajasConfigChange }) {
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
  const [showGestion, setShowGestion]       = useState(false);  // panel de gestiΓ³n de cajas
  const [addCajaOpen, setAddCajaOpen]       = useState(false);  // mini form agregar caja
  const [savingCaja, setSavingCaja]         = useState(null);   // key de caja guardΓ'ndose
  const [newCaja, setNewCaja]               = useState({ codigo_tienda: '', caja: '', notas: '' });
  const [addingCaja, setAddingCaja]         = useState(false);

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

  // Conteos (excluye cajas silenciadas del total de gaps)
  const totalGaps = useMemo(() =>
    matrix.reduce((acc, local) =>
      acc + local.cajas.reduce((a, c) => {
        if (isSilenciada(local.codigo_tienda, c)) return a;
        return a + meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${c}||${mk}`]?.tipo === 'GAP').length;
      }, 0), 0),
    [matrix, meses, cajaStatusMap]
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
                        {/* Selector código tienda */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="text-[7px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Código tienda</label>
                          <select
                            value={newCaja.codigo_tienda}
                            onChange={e => {
                              const ct = e.target.value;
                              const local = matrix.find(l => l.codigo_tienda === ct);
                              setNewCaja(prev => ({
                                ...prev,
                                codigo_tienda: ct,
                                _local:      local?.local      || '',
                                _competidor: local?.competidor || '',
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
                          >
                            <option value="">Seleccionar…</option>
                            {[...new Map(matrix.map(l => [l.codigo_tienda, l])).values()]
                              .sort((a, b) => a.local?.localeCompare(b.local))
                              .map(l => (
                                <option key={l.codigo_tienda} value={l.codigo_tienda}>
                                  {l.codigo_tienda} — {l.local}
                                </option>
                              ))
                            }
                          </select>
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

                {/* ── Resumen de cajas silenciadas ── */}
                {(() => {
                  const silenciadas = cajasConfig.filter(c => c.status === 'SIN_ALARMAS');
                  return silenciadas.length === 0 ? (
                    <div className="px-4 py-4 text-slate-400 text-[10px] font-bold flex items-center gap-2">
                      <Bell size={11} className="text-slate-300" />
                      Ninguna caja silenciada — usá el ícono 🔔 en cada fila de caja para silenciar alarmas
                    </div>
                  ) : (
                    <div className="px-4 py-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-1.5">
                        <BellOff size={10} /> {silenciadas.length} {silenciadas.length === 1 ? 'caja silenciada' : 'cajas silenciadas'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {silenciadas.map(cfg => (
                          <div key={`${cfg.codigo_tienda}||${cfg.caja}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[9px] font-black text-amber-500">
                            <BellOff size={9} />
                            <span>{cfg.local || cfg.codigo_tienda} · Caja {cfg.caja}</span>
                            <button
                              onClick={() => handleToggleCaja(cfg, cfg.caja, 'ACTIVA')}
                              title="Reactivar alarmas"
                              className="ml-1 text-amber-400 hover:text-amber-600 transition-colors"
                            ><X size={9} /></button>
                          </div>
                        ))}
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
        {[
          { label: 'Gaps sin cubrir',         value: loading ? '—' : totalGaps,       color: 'text-red-400',    icon: AlertTriangle, filter: () => { setFilterSoloGaps(true); setFilterPendientes(false); } },
          { label: 'Pendientes de aprobación', value: loading ? '—' : totalPendientes, color: 'text-amber-400',  icon: Clock,         filter: () => { setFilterSoloGaps(false); setFilterPendientes(true); } },
          { label: 'Aprobados y publicados',   value: loading ? '—' : totalAprobados,  color: 'text-violet-400', icon: ShieldCheck,   filter: () => { setFilterSoloGaps(false); setFilterPendientes(false); } },
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
        <div className="pwa-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: `${180 + meses.length * 100}px` }}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-950 z-10" style={{ minWidth: 220 }}>
                    Local
                  </th>
                  {meses.map(mk => {
                    const [ano, mes] = mk.split('-');
                    const esRutina = mk >= '2025-12';
                    return (
                      <th key={mk} className={`px-3 py-3 text-right text-[8px] font-black uppercase tracking-widest ${esRutina ? 'text-accent-orange' : 'text-slate-400'}`} style={{ minWidth: 90 }}>
                        <div>{MESES[parseInt(mes)]}</div>
                        <div className={`text-[7px] ${esRutina ? 'text-accent-orange/60' : 'text-slate-300 dark:text-white/20'}`}>{ano}</div>
                      </th>
                    );
                  })}
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
