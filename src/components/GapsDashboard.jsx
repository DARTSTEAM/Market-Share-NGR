import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  AlertTriangle, TrendingDown, Search, BarChart2,
  Calendar, Loader2, RefreshCw, Clock, ChevronUp, ChevronDown,
  Database, Wifi
} from 'lucide-react';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ngr-proxy-server-966549276703.us-central1.run.app';

const COMPETITOR_COLORS = {
  'KFC':           'bg-red-500/20 text-red-400 border-red-500/30',
  'MCDONALDS':     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'BURGER KING':   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'PIZZA HUT':     'bg-red-700/20 text-red-300 border-red-700/30',
  'DOMINOS':       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'LITTLE CAESARS':'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const METODO_STYLE = {
  'G_REC_ROLLING_6M':   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'INSUFICIENTE_DATA':  'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const METODO_LABEL = {
  'G_REC_ROLLING_6M':   'Rolling 6M',
  'INSUFICIENTE_DATA':  'Sin datos',
};

// Qué datos usa cada método — para la fila de detalle expandida
const METODO_DESC = {
  'G_REC_ROLLING_6M':   'Promedio ponderado de los últimos 6 meses (lecturas reales + historial de las mismas cajas). Chaining: los meses ya estimados en la secuencia también alimentan la ventana del siguiente gap.',
  'INSUFICIENTE_DATA':  'No hay suficiente historial para calcular una estimación confiable.',
};

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const fmt     = n => (n != null ? Number(n).toLocaleString('es-AR') : '—');
const fmtDate = s => s ? String(s).slice(0, 10) : '—';

const TIPO_STYLE = {
  REAL:      { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Real' },
  HISTORIAL: { bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',   dot: 'bg-indigo-400',  label: 'Historial' },
  ESTIMADO:  { bg: 'bg-amber-500/15  text-amber-400  border-amber-500/30',    dot: 'bg-amber-400',   label: 'Estimado' },
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function GapsDashboard({ gaps = [], isLoading = false, onRefresh }) {
  const [search,     setSearch]     = useState('');
  const [filterComp, setFilterComp] = useState('');
  const [filterMet,  setFilterMet]  = useState('');
  const [filterMes,  setFilterMes]  = useState('');
  const [filterAno,  setFilterAno]  = useState('');
  const [sortKey,    setSortKey]    = useState('trx_totales_estimadas');
  const [sortDir,    setSortDir]    = useState('desc');
  const [expanded,   setExpanded]   = useState(null);
  const [detailData, setDetailData] = useState({});   // key → { puntos, promedio }
  const [detailLoad, setDetailLoad] = useState({});   // key → bool
  const detailCache = useRef({});

  const openRow = useCallback(async (i, g) => {
    if (expanded === i) { setExpanded(null); return; }
    setExpanded(i);
    const key = `${g.codigo_tienda}-${g.mes}-${g.ano}`;
    if (detailCache.current[key]) {
      setDetailData(d => ({ ...d, [key]: detailCache.current[key] }));
      return;
    }
    setDetailLoad(d => ({ ...d, [key]: true }));
    try {
      const url = `${API}/api/gap-lookup?codigo_tienda=${encodeURIComponent(g.codigo_tienda)}&mes=${g.mes}&ano=${g.ano}`;
      const data = await fetch(url).then(r => r.json());
      detailCache.current[key] = data;
      setDetailData(d => ({ ...d, [key]: data }));
    } catch(e) {
      console.error('gap-lookup error', e);
    } finally {
      setDetailLoad(d => ({ ...d, [key]: false }));
    }
  }, [expanded]);

  const competidores = useMemo(() => [...new Set(gaps.map(g => g.competidor))].sort(), [gaps]);
  const meses        = useMemo(() => [...new Set(gaps.map(g => g.mes).filter(Boolean))].sort((a,b) => a-b), [gaps]);
  const anos         = useMemo(() => [...new Set(gaps.map(g => g.ano).filter(Boolean))].sort((a,b) => b-a), [gaps]);

  const filtered = useMemo(() => {
    let d = gaps;
    if (filterComp) d = d.filter(g => g.competidor === filterComp);
    if (filterMet)  d = d.filter(g => g.metodo === filterMet);
    if (filterMes)  d = d.filter(g => String(g.mes) === filterMes);
    if (filterAno)  d = d.filter(g => String(g.ano) === filterAno);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(g =>
        g.local?.toLowerCase().includes(q) ||
        g.codigo_tienda?.toLowerCase().includes(q)
      );
    }
    // Sort
    d = [...d].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return d;
  }, [gaps, filterComp, filterMet, filterMes, filterAno, search, sortKey, sortDir]);

  const totales = useMemo(() => ({
    locales:  filtered.length,
    txTotal:  filtered.reduce((acc, g) => acc + (g.trx_totales_estimadas || 0), 0),
    dias:     Math.round(filtered.reduce((acc, g) => acc + (g.delta_dias || 0), 0) / Math.max(filtered.length, 1)),
  }), [filtered]);

  const hasFilters = filterComp || filterMet || filterMes || filterAno || search;
  const clearAll   = useCallback(() => {
    setFilterComp(''); setFilterMet(''); setFilterMes(''); setFilterAno(''); setSearch('');
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  return (
    <div className="space-y-5 px-1">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown size={22} className="text-accent-orange" />
            Períodos Sin Captura
          </h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Estimación mensual por local · Expandí la fila para ver el período y método
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 transition-all disabled:opacity-50"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Locales con gap',      value: fmt(totales.locales), icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Tx estimadas totales', value: fmt(totales.txTotal), icon: BarChart2,     color: 'text-accent-orange' },
          { label: 'Días promedio gap',    value: fmt(totales.dias),    icon: Clock,         color: 'text-blue-400' },
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

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar local o código tienda…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterComp} onChange={e => setFilterComp(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los competidores</option>
            {competidores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los meses</option>
            {meses.map(m => <option key={m} value={m}>{MESES[m]}</option>)}
          </select>
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)}
            className="flex-1 min-w-[100px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los años</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterMet} onChange={e => setFilterMet(e.target.value)}
            className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los métodos</option>
            <option value="G_REC_ROLLING_6M">Rolling 6M</option>
            <option value="INSUFICIENTE_DATA">Sin datos</option>
          </select>
          {hasFilters && (
            <button onClick={clearAll}
              className="px-3 py-2 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap">
              ✕ Limpiar
            </button>
          )}
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { val: filterComp, label: filterComp,                          clear: () => setFilterComp('') },
              { val: filterMes,  label: MESES[+filterMes] || filterMes,      clear: () => setFilterMes('') },
              { val: filterAno,  label: filterAno,                           clear: () => setFilterAno('') },
              { val: filterMet,  label: METODO_LABEL[filterMet] || filterMet, clear: () => setFilterMet('') },
            ].filter(f => f.val).map(f => (
              <span key={f.val} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-orange/10 text-accent-orange rounded-full text-[8px] font-black uppercase tracking-widest">
                {f.label}
                <button onClick={f.clear} className="hover:text-white transition-colors">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-accent-orange" />
          <p className="text-[10px] font-black uppercase tracking-widest">Calculando estimaciones…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <TrendingDown size={40} strokeWidth={1} />
          <p className="text-[10px] font-black uppercase tracking-widest">Sin gaps para mostrar</p>
        </div>
      ) : (
        <div className="pwa-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400">Competidor</th>
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400">Local</th>
                  <th
                    className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-accent-orange select-none"
                    onClick={() => toggleSort('mes')}
                  >
                    <span className="flex items-center gap-1">Mes <SortIcon k="mes" /></span>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-accent-orange select-none"
                    onClick={() => toggleSort('delta_dias')}
                  >
                    <span className="flex items-center justify-end gap-1">Días <SortIcon k="delta_dias" /></span>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-accent-orange select-none"
                    onClick={() => toggleSort('trx_diarias_estimadas')}
                  >
                    <span className="flex items-center justify-end gap-1">Tx/día <SortIcon k="trx_diarias_estimadas" /></span>
                  </th>
                  <th
                    className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-accent-orange select-none"
                    onClick={() => toggleSort('trx_totales_estimadas')}
                  >
                    <span className="flex items-center justify-end gap-1">Tx estimadas <SortIcon k="trx_totales_estimadas" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((g, i) => {
                  const isOpen = expanded === i;
                  const detKey  = `${g.codigo_tienda}-${g.mes}-${g.ano}`;
                  const detail  = detailData[detKey];
                  const loading = detailLoad[detKey];
                  return (
                    <React.Fragment key={i}>
                      <tr
                        onClick={() => openRow(i, g)}
                        className={`cursor-pointer transition-colors group ${isOpen ? "bg-orange-50/30 dark:bg-slate-700 border-l-2 border-accent-orange" : "hover:bg-orange-50 dark:hover:!bg-orange-500/10"}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${COMPETITOR_COLORS[g.competidor] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                            {g.competidor}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-black text-slate-900 dark:text-white text-[11px] leading-tight">{g.local}</p>
                          <p className="text-[8px] text-slate-400 font-mono mt-0.5">{g.codigo_tienda}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={10} className="text-accent-orange" />
                            <span className="font-black text-slate-800 dark:text-white text-[10px]">{MESES[g.mes] || g.mes}</span>
                            <span className="text-[8px] text-slate-400">{g.ano}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-slate-800 dark:text-white text-[11px]">{g.delta_dias}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">
                          {fmt(g.trx_diarias_estimadas)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-black text-accent-orange text-[13px]">{fmt(g.trx_totales_estimadas)}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${METODO_STYLE[g.metodo] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                            {METODO_LABEL[g.metodo] || g.metodo}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-white/5">
                          <td colSpan={7} className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
                            <div className="flex gap-6 text-[10px]">

                              {/* ── Left: gap info ── */}
                              <div className="flex flex-col gap-3 min-w-[200px]">
                                <div>
                                  <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Período del gap</span>
                                  <p className="font-mono text-slate-700 dark:text-white/80 mt-1 text-[11px] font-bold">
                                    {fmtDate(g.fecha_anterior)}<span className="text-slate-400 mx-1">→</span>{fmtDate(g.fecha_estimacion)}
                                  </p>
                                </div>
                                <div className="p-3 rounded-xl bg-accent-orange/8 border border-accent-orange/20">
                                  <span className="text-[7px] font-black uppercase tracking-widest text-accent-orange/70">Fórmula</span>
                                  <p className="font-mono text-slate-800 dark:text-white mt-1 text-[11px] font-bold leading-snug">
                                    {fmt(g.trx_diarias_estimadas)} tx/día × {g.delta_dias} d = <span className="text-accent-orange">{fmt(g.trx_totales_estimadas)}</span>
                                  </p>
                                </div>
                              </div>

                              {/* ── Divider ── */}
                              <div className="w-px bg-slate-200 dark:bg-white/5 self-stretch" />

                              {/* ── Right: rolling window table ── */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Ventana rolling 6M</span>
                                  <div className="flex items-center gap-1.5">
                                    {[{t:'REAL',l:'Real'},{t:'HISTORIAL',l:'Historial'},{t:'ESTIMADO',l:'Estimado'}].map(({t,l}) => (
                                      <span key={t} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[6px] font-black uppercase border ${TIPO_STYLE[t]?.bg}`}>
                                        <span className={`w-1 h-1 rounded-full ${TIPO_STYLE[t]?.dot}`} />{l}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {loading ? (
                                  <div className="flex items-center gap-2 py-4 text-slate-400">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span className="text-[9px]">Cargando datos…</span>
                                  </div>
                                ) : detail?.puntos?.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-[10px]">
                                      <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/5">
                                          <th className="pb-1.5 text-left text-[7px] font-black uppercase tracking-widest text-slate-400">Mes / Año</th>
                                          <th className="pb-1.5 text-right text-[7px] font-black uppercase tracking-widest text-slate-400">Tx/día</th>
                                          <th className="pb-1.5 text-right text-[7px] font-black uppercase tracking-widest text-slate-400">Barra</th>
                                          <th className="pb-1.5 text-center text-[7px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03]">
                                        {(() => {
                                          const maxTasa = Math.max(...detail.puntos.map(p => p.tasa || 0), 1);
                                          return detail.puntos.map(p => (
                                            <tr key={`${p.mes}-${p.ano}`} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.04]">
                                              <td className="py-1.5 pr-3 whitespace-nowrap">
                                                <span className="font-black text-slate-800 dark:text-white">{MESES[p.mes]?.slice(0,3)} </span>
                                                <span className="text-slate-400 text-[8px]">{p.ano}</span>
                                              </td>
                                              <td className="py-1.5 pr-3 text-right font-mono font-black text-slate-700 dark:text-white/90">{fmt(p.tasa)}</td>
                                              <td className="py-1.5 pr-3">
                                                <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden">
                                                  <div
                                                    className={`h-full rounded-full transition-all ${
                                                      p.tipo === 'REAL' ? 'bg-emerald-400' : p.tipo === 'ESTIMADO' ? 'bg-amber-400' : 'bg-indigo-400'
                                                    }`}
                                                    style={{ width: `${Math.round((p.tasa / maxTasa) * 100)}%` }}
                                                  />
                                                </div>
                                              </td>
                                              <td className="py-1.5 text-center">
                                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[6px] font-black uppercase border ${TIPO_STYLE[p.tipo]?.bg || ''}`}>
                                                  {p.tipo === 'REAL' ? <Wifi size={7}/> : p.tipo === 'ESTIMADO' ? <TrendingDown size={7}/> : <Database size={7}/>}
                                                  {TIPO_STYLE[p.tipo]?.label || p.tipo}
                                                </span>
                                              </td>
                                            </tr>
                                          ));
                                        })()}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t-2 border-slate-200 dark:border-white/15">
                                          <td className="pt-2 text-[8px] font-black uppercase tracking-widest text-slate-500">Promedio</td>
                                          <td className="pt-2 text-right font-black text-accent-orange text-[13px]">{fmt(detail.promedio)}</td>
                                          <td colSpan={2} className="pt-2 text-right text-[7px] text-slate-400">{detail.puntos.length} fuentes</td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-slate-400 py-3">No se encontraron datos de referencia.</p>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={10} className="text-amber-400 shrink-0" />
              <p className="text-[8px] text-slate-400 font-bold">
                Estimaciones a nivel local — haz click para ver el período y la fórmula.
              </p>
            </div>
            <p className="text-[8px] text-slate-400 font-mono">
              {filtered.length} locales · {fmt(totales.txTotal)} tx estimadas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
