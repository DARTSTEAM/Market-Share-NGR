import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardEdit, RefreshCw, AlertTriangle, CheckCircle2,
  Loader2, ChevronDown, ChevronRight, Search,
  TrendingDown, Wifi, Database, Info, X, Check, Pencil
} from 'lucide-react';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ngr-proxy-server-gvxb4rjzvq-uc.a.run.app';

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const METODOS = [
  { id: 'IGUAL_ANTERIOR',  label: 'Igual al anterior',       desc: 'Replica el último mes con dato real' },
  { id: 'PROMEDIO_6M',     label: 'Promedio simple 6M',      desc: 'Promedio de los últimos 6 meses reales/historial' },
  { id: 'POND_6M',         label: 'Promedio ponderado 6M',   desc: 'Más peso a meses recientes (3:2:1)' },
  { id: 'MANUAL',          label: 'Manual',                  desc: 'Ingresá el valor directamente' },
];

const TIPO_CONFIG = {
  REAL:     { dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Real',     icon: Wifi },
  HISTORIAL:{ dot: 'bg-indigo-400',  badge: 'bg-indigo-500/15  text-indigo-400  border-indigo-500/30',  label: 'Historial',icon: Database },
  ESTIMADO: { dot: 'bg-amber-400',   badge: 'bg-amber-500/15   text-amber-400   border-amber-500/30',   label: 'Estimado', icon: TrendingDown },
  MANUAL:   { dot: 'bg-purple-400',  badge: 'bg-purple-500/15  text-purple-400  border-purple-500/30',  label: 'Manual',   icon: ClipboardEdit },
  GAP:      { dot: 'bg-red-400',     badge: 'bg-red-500/15     text-red-400     border-red-500/30',     label: 'Gap',      icon: AlertTriangle },
};

const fmt = n => n != null ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '—';

// ── Calcula el valor sugerido según método, dada la ventana de puntos históricos ──
function calcularSugerido(metodo, puntos, manualVal) {
  if (metodo === 'MANUAL') return parseFloat(manualVal) || null;
  const disponibles = puntos.filter(p => p.tipo !== 'GAP' && p.tasa != null && p.tasa > 0);
  if (disponibles.length === 0) return null;
  const sorted = [...disponibles].sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    return b.mes - a.mes;
  });
  if (metodo === 'IGUAL_ANTERIOR') return sorted[0]?.tasa ?? null;
  if (metodo === 'PROMEDIO_6M') {
    const slice = sorted.slice(0, 6);
    return Math.round(slice.reduce((s, p) => s + p.tasa, 0) / slice.length);
  }
  if (metodo === 'POND_6M') {
    const slice = sorted.slice(0, 6);
    const pesos = [6, 5, 4, 3, 2, 1];
    let suma = 0, pesosUsados = 0;
    slice.forEach((p, i) => { suma += p.tasa * (pesos[i] || 1); pesosUsados += (pesos[i] || 1); });
    return pesosUsados > 0 ? Math.round(suma / pesosUsados) : null;
  }
  return null;
}

// ── Panel de edición (reutilizado por GAP y celdas existentes) ─────────────────
function EditPanel({ cell, puntos, puntosLoading, onSave, onCancelEdit }) {
  const [metodo, setMetodo]       = useState('IGUAL_ANTERIOR');
  const [manualVal, setManualVal] = useState('');
  const [saving, setSaving]       = useState(false);
  const inputRef = useRef(null);

  // Pre-cargar el valor actual cuando se abre el panel sobre una celda existente
  useEffect(() => {
    if (cell.tipo !== 'GAP' && cell.tasa != null) {
      setManualVal(String(cell.tasa));
    }
  }, [cell.key]);

  useEffect(() => {
    if (metodo === 'MANUAL' && inputRef.current) inputRef.current.focus();
  }, [metodo]);

  const sugerido = useMemo(
    () => calcularSugerido(metodo, puntos || [], manualVal),
    [metodo, puntos, manualVal]
  );

  const handleSave = async () => {
    const valor = metodo === 'MANUAL' ? parseFloat(manualVal) : sugerido;
    if (valor == null || isNaN(valor)) return;
    setSaving(true);
    try {
      await onSave({ ...cell, trx_diarias: valor, metodo });
      onCancelEdit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 p-4 space-y-3 z-30">

      {/* Valor actual de referencia (solo si no es GAP) */}
      {cell.tipo !== 'GAP' && cell.tasa != null && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Valor actual</span>
          <span className="flex items-center gap-1.5 font-black text-sm text-slate-700 dark:text-white">
            {fmt(cell.tasa)}
            <span className={`w-1.5 h-1.5 rounded-full ${TIPO_CONFIG[cell.tipo]?.dot || 'bg-slate-400'}`} />
          </span>
        </div>
      )}

      {/* Método selector */}
      <div className="space-y-1.5">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {cell.tipo === 'GAP' ? 'Método de estimación' : 'Sobreescribir con'}
        </p>
        {METODOS.map(m => (
          <button
            key={m.id}
            onClick={() => setMetodo(m.id)}
            className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
              metodo === m.id
                ? 'bg-accent-orange/10 border border-accent-orange/30 text-accent-orange'
                : 'border border-transparent hover:border-slate-200 dark:hover:border-white/10 text-slate-600 dark:text-white/60'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center ${
              metodo === m.id ? 'border-accent-orange bg-accent-orange' : 'border-slate-300 dark:border-white/20'
            }`}>
              {metodo === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="text-[10px] font-black">{m.label}</p>
              <p className="text-[8px] text-slate-400 dark:text-white/30 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Input manual */}
      {metodo === 'MANUAL' && (
        <div>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Trx/día</p>
          <input
            ref={inputRef}
            type="number"
            value={manualVal}
            onChange={e => setManualVal(e.target.value)}
            placeholder="ej. 245"
            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </div>
      )}

      {/* Preview */}
      {puntosLoading ? (
        <div className="flex items-center gap-2 text-slate-400 py-1">
          <Loader2 size={12} className="animate-spin" />
          <span className="text-[9px]">Cargando historial…</span>
        </div>
      ) : sugerido != null ? (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Preview</span>
          <span className="font-black text-amber-600 dark:text-amber-400 text-base">{fmt(sugerido)} <span className="text-[9px]">tx/día</span></span>
        </div>
      ) : (
        <div className="px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl">
          <p className="text-[9px] text-slate-400">Sin historial suficiente</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancelEdit}
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || (metodo !== 'MANUAL' && sugerido == null) || (metodo === 'MANUAL' && !manualVal)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent-orange text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-40 transition-all hover:bg-orange-600"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          Guardar
        </button>
      </div>
    </div>
  );
}

// ── Celda individual — todas son editables ────────────────────────────────────
function Celda({ cell, puntos, puntosLoading, onSave, pendingEdit, onStartEdit, onCancelEdit }) {
  const isEditing = pendingEdit?.key === cell.key;

  // Celda con dato existente (REAL, HISTORIAL, ESTIMADO, MANUAL) — editable con click
  if (cell.tipo !== 'GAP') {
    const cfg = TIPO_CONFIG[cell.tipo] || TIPO_CONFIG.ESTIMADO;
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
            <EditPanel
              cell={cell}
              puntos={puntos}
              puntosLoading={puntosLoading}
              onSave={onSave}
              onCancelEdit={onCancelEdit}
            />
          </div>
        )}
        <div className="flex items-center justify-end gap-1.5">
          {esCaidaAlarm && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
          <span className={`font-mono font-black text-[12px] ${esCaidaAlarm ? 'text-red-400' : 'text-slate-800 dark:text-white/90'}`}>
            {fmt(cell.tasa)}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          <Pencil size={7} className="opacity-0 group-hover:opacity-30 text-slate-400 transition-opacity shrink-0 -mr-0.5" />
        </div>
        {esCaidaAlarm && (
          <div className="text-[8px] text-red-400 font-black text-right">
            {cell.caida_pct?.toFixed(0)}%
          </div>
        )}
      </td>
    );
  }

  // Celda GAP — editable (igual que antes)
  return (
    <td className="px-1.5 py-1.5 align-middle relative" style={{ minWidth: 90 }} onClick={e => e.stopPropagation()}>
      {isEditing && (
        <div className="relative z-20">
          <EditPanel
            cell={cell}
            puntos={puntos}
            puntosLoading={puntosLoading}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
          />
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

// Competidores que NO necesitan desglose por caja
const NO_CAJA_DETAIL = new Set(['DOMINOS', "DOMINO'S", 'LITTLE CAESARS', "LITTLE CAESAR'S"]);

// ── Fila de un local (expandible) ─────────────────────────────────────────────
function LocalRow({ local, meses, pendingEdit, onStartEdit, onCancelEdit, onSave, expandido, onToggle, pctEstimado = 0 }) {

  const esDesglose = !NO_CAJA_DETAIL.has(local.competidor?.toUpperCase().trim());

  // Primer mes de rutina — meses < este valor son historial y no generan GAP
  const RUTINA_DESDE = '2025-12';
  const esRutina = (mk) => mk >= RUTINA_DESDE;

  // Puntos históricos por caja directo de la matriz (para preview sin llamada extra a la API)
  const getPuntosCaja = useCallback((caja) => {
    return meses
      .map(mk => local.celdas[`${caja}||${mk}`])
      .filter(cell => cell && cell.tipo !== 'GAP' && cell.tasa != null && cell.tasa > 0)
      .map(cell => ({ tasa: cell.tasa, tipo: cell.tipo, mes: cell.mes, ano: cell.ano }))
      .sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
  }, [local.celdas, meses]);
  // Calcular totales por mes
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

  // Solo cuentan como GAP las celdas marcadas como GAP en meses de rutina
  const gapCount = local.cajas.reduce((acc, c) =>
    acc + meses.filter(mk => esRutina(mk) && local.celdas[`${c}||${mk}`]?.tipo === 'GAP').length, 0);
  const tieneGaps = gapCount > 0;

  // Para NO_CAJA_DETAIL: celda editable para CUALQUIER tipo de dato (no solo GAPs)
  const PRIO_TIPO = { REAL: 4, MANUAL: 3, ESTIMADO: 2, HISTORIAL: 1 };
  const getEditableCellLocal = (mk) => {
    // Determinar el tipo y dato disponible combinando todas las cajas
    let bestTipo = null;
    local.cajas.forEach(c => {
      const cell = local.celdas[`${c}||${mk}`];
      if (cell && cell.tipo !== 'GAP' && (PRIO_TIPO[cell.tipo] ?? 0) > (PRIO_TIPO[bestTipo] ?? -1)) {
        bestTipo = cell.tipo;
      }
    });

    const hasData = bestTipo !== null; // tiene al menos un dato no-GAP
    const totalTasa = totalesPorMes[mk];

    // Período histórico sin ningún dato → celda vacía (dash)
    if (!esRutina(mk) && !hasData) return null;

    // Usar la primera caja real del local como clave de guardado
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

  // Puntos para preview en modo no-desglose: SUMA de todas las cajas por mes (1 entrada por mes)
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
        className={`border-t border-slate-200 dark:border-white/5 transition-colors ${esDesglose ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''}`}
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
            {/* Badge % estimado */}
            {pctEstimado > 0 && (
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className={`text-[8px] font-black tabular-nums ${
                  pctEstimado >= 60 ? 'text-red-400' : pctEstimado >= 30 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {pctEstimado}% est.
                </span>
                <div className="w-14 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pctEstimado >= 60 ? 'bg-red-400' : pctEstimado >= 30 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${pctEstimado}%` }}
                  />
                </div>
              </div>
            )}
            {tieneGaps && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded text-[7px] font-black uppercase shrink-0">
                {gapCount} gaps
              </span>
            )}
          </div>
        </td>

        {meses.map(mk => {
          // NO_CAJA_DETAIL: celda editable para todos los tipos (REAL, HIST, GAP, etc.)
          if (!esDesglose) {
            const editCell = getEditableCellLocal(mk);
            if (editCell) {
              return (
                <Celda
                  key={mk}
                  cell={editCell}
                  puntos={puntosLocal}
                  puntosLoading={false}
                  onSave={onSave}
                  pendingEdit={pendingEdit}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                />
              );
            }
            // Histórico sin dato → celda vacía
            return (
              <td key={mk} className="px-3 py-3 text-right">
                <span className="text-slate-300 dark:text-white/10 text-[11px]">—</span>
              </td>
            );
          }
          // Competidores con desglose: celda de total (no editable — editar por caja abajo)
          return (
            <td key={mk} className="px-3 py-3 text-right">
              <span className="font-black text-[12px] text-slate-700 dark:text-white/70">
                {totalesPorMes[mk] > 0 ? fmt(totalesPorMes[mk]) : <span className="text-slate-300 dark:text-white/15">—</span>}
              </span>
            </td>
          );
        })}
      </tr>

      {/* Filas de cajas (solo para competidores con desglose habilitado) */}
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
              <span className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">
                Caja {caja}
              </span>
            </td>
            {meses.map(mk => {
              const existing = local.celdas[`${caja}||${mk}`];
              // Si no hay dato Y es período histórico → celda vacía (sin GAP)
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
                  puntosLoading={false}
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EstimacionesDashboard({ user }) {
  const [matrix, setMatrix]       = useState([]);    // locales con celdas
  const [meses, setMeses]         = useState([]);    // ['2025-01', ...]
  const [loading, setLoading]     = useState(false);
  const [filterComp, setFilterComp] = useState('');
  const [filterSoloGaps, setFilterSoloGaps] = useState(true);
  const [sortBy, setSortBy]               = useState('estimado'); // 'estimado'|'gaps'|'local'
  const [search, setSearch]               = useState('');
  const [expandidos, setExpandidos] = useState(new Set());
  const [pendingEdit, setPendingEdit] = useState(null);   // celda actualmente en edición
  const [savedCells, setSavedCells] = useState({});       // key → {tasa, metodo} guardadas localmente
  const [saving, setSaving]       = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API}/api/estimation-matrix${filterComp ? `?competidor=${encodeURIComponent(filterComp)}` : ''}`;
      const d = await fetch(url).then(r => r.json());
      setMatrix(d.locales || []);
      setMeses(d.meses || []);
    } catch(e) {
      console.error('estimation-matrix error', e);
      notify('error', 'Error cargando la matriz de estimaciones');
    } finally {
      setLoading(false);
    }
  }, [filterComp]);

  useEffect(() => { fetchMatrix(); }, [fetchMatrix]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handler = () => setPendingEdit(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Porcentaje estimado/manual por local (sobre el total de celdas en meses de rutina)
  const RUTINA_DESDE_GLOBAL = '2025-12';
  const getPctEstimado = useCallback((local) => {
    let total = 0; let estimados = 0;
    const rutinaMeses = meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL);
    local.cajas.forEach(caja => {
      rutinaMeses.forEach(mk => {
        const cell = local.celdas[`${caja}||${mk}`];
        if (!cell) return; // huecos vacíos no cuentan
        total++;
        if (['ESTIMADO','MANUAL','GAP'].includes(cell.tipo)) estimados++;
      });
    });
    return total > 0 ? Math.round((estimados / total) * 100) : 0;
  }, [meses]);

  // Locales filtrados + ordenados
  const localesFiltrados = useMemo(() => {
    let d = matrix;
    if (filterSoloGaps) {
      d = d.filter(local => local.cajas.some(caja =>
        meses.some(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${caja}||${mk}`]?.tipo === 'GAP')
      ));
    }
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(l => l.local?.toLowerCase().includes(q) || l.codigo_tienda?.toLowerCase().includes(q));
    }
    // Ordenar
    d = [...d];
    if (sortBy === 'estimado') {
      d.sort((a, b) => getPctEstimado(b) - getPctEstimado(a));
    } else if (sortBy === 'gaps') {
      const gapCount = (local) => local.cajas.reduce((acc, c) =>
        acc + meses.filter(mk => mk >= RUTINA_DESDE_GLOBAL && local.celdas[`${c}||${mk}`]?.tipo === 'GAP').length, 0);
      d.sort((a, b) => gapCount(b) - gapCount(a));
    } else if (sortBy === 'local') {
      d.sort((a, b) => a.local?.localeCompare(b.local));
    }
    return d;
  }, [matrix, meses, filterSoloGaps, search, sortBy, getPctEstimado]);

  const competidores = useMemo(() => [...new Set(matrix.map(l => l.competidor))].sort(), [matrix]);

  const totalGaps = useMemo(() =>
    matrix.reduce((acc, local) =>
      acc + local.cajas.reduce((a, c) =>
        a + meses.filter(mk => local.celdas[`${c}||${mk}`]?.tipo === 'GAP').length, 0), 0),
    [matrix, meses]
  );

  const totalEstimados = useMemo(() =>
    matrix.reduce((acc, local) =>
      acc + local.cajas.reduce((a, c) =>
        a + meses.filter(mk => ['ESTIMADO','MANUAL'].includes(local.celdas[`${c}||${mk}`]?.tipo)).length, 0), 0),
    [matrix, meses]
  );

  const handleStartEdit = (cell) => {
    setPendingEdit(cell);
  };
  const handleCancelEdit = () => setPendingEdit(null);

  const handleSave = useCallback(async (cell) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/save-estimation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_tienda: cell.codigo_tienda,
          local: cell.local,
          competidor: cell.competidor,
          caja: cell.caja,
          mes: cell.mes,
          ano: cell.ano,
          trx_diarias: cell.trx_diarias,
          metodo: cell.metodo,
          usuario:       user?.email        ?? 'dashboard',
          usuario_nombre: user?.displayName ?? 'Dashboard',
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Error guardando');

      // Actualización optimista local
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
              tipo: cell.metodo === 'MANUAL' ? 'MANUAL' : 'ESTIMADO',
              tasa: cell.trx_diarias,
              metodo: cell.metodo,
            }
          }
        };
      }));

      notify('success', `Estimación guardada: ${cell.local} · Caja ${cell.caja} · ${MESES[cell.mes]} ${cell.ano}`);
    } catch(e) {
      console.error('save-estimation error', e);
      notify('error', `Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleExpandido = (codigoTienda) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(codigoTienda)) next.delete(codigoTienda);
      else next.add(codigoTienda);
      return next;
    });
  };

  const expandAll = () => setExpandidos(new Set(localesFiltrados.map(l => l.codigo_tienda)));
  const collapseAll = () => setExpandidos(new Set());

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
                : notification.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
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
            Tabla de cajas × períodos · Gaps detectados automáticamente · Escritura directa a BigQuery
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Locales con gaps',    value: loading ? '—' : localesFiltrados.filter(l => l.cajas.some(c => meses.some(mk => l.celdas[`${c}||${mk}`]?.tipo === 'GAP'))).length,  color: 'text-red-400',     icon: AlertTriangle },
          { label: 'Períodos sin captura', value: loading ? '—' : totalGaps,    color: 'text-amber-400',   icon: TrendingDown },
          { label: 'Ya estimados',         value: loading ? '—' : totalEstimados, color: 'text-emerald-400', icon: CheckCircle2 },
        ].map(c => (
          <div key={c.label} className="pwa-card p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-white/5 ${c.color}`}><c.icon size={18} /></div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
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
          Click en GAP para estimar · Caída ≥ 20% se marca en rojo
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
          className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
        >
          <option value="">Todos los competidores</option>
          {competidores.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Sort control */}
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Ordenar</span>
          {[{ id: 'estimado', label: '% estimado' }, { id: 'gaps', label: 'gaps' }, { id: 'local', label: 'az' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                sortBy === opt.id
                  ? 'bg-accent-orange text-white shadow-sm'
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilterSoloGaps(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
            filterSoloGaps
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40'
          }`}
        >
          <AlertTriangle size={10} />
          Solo con gaps
        </button>
        <button
          onClick={expandAll}
          className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
        >
          Expandir todo
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
        >
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
            {filterSoloGaps ? '¡Sin gaps pendientes! Todos los períodos están completos.' : 'Sin locales para mostrar.'}
          </p>
          {filterSoloGaps && (
            <button
              onClick={() => setFilterSoloGaps(false)}
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
                    return (
                      <th key={mk} className="px-3 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400" style={{ minWidth: 90 }}>
                        <div>{MESES[parseInt(mes)]}</div>
                        <div className="text-[7px] text-slate-300 dark:text-white/20">{ano}</div>
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
                    pctEstimado={getPctEstimado(local)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-[8px] text-slate-400 font-bold">
              {localesFiltrados.length} locales · Hacé click en una fila para ver cajas · Click en GAP para estimar
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
