import React, { useState, useMemo } from 'react';
import { AlertTriangle, TrendingDown, Search, BarChart2, Calendar, MapPin, Loader2, RefreshCw } from 'lucide-react';

const COMPETITOR_COLORS = {
  'KFC':           'bg-red-500/20 text-red-400 border-red-500/30',
  'MCDONALDS':     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'BURGER KING':   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'PIZZA HUT':     'bg-red-700/20 text-red-300 border-red-700/30',
  'DOMINOS':       'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'LITTLE CAESARS':'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

const METODO_STYLE = {
  'ESTACIONAL':      'bg-emerald-500/20 text-emerald-400',
  'PROMEDIO_GLOBAL': 'bg-blue-500/20 text-blue-400',
  'PRO_RATA':        'bg-amber-500/20 text-amber-400',
};

const CONFIANZA_STYLE = {
  'ALTA':          'text-emerald-400',
  'MEDIA':         'text-blue-400',
  'BAJA':          'text-amber-400',
  'MUY_BAJA':      'text-orange-400',
  'SIN_HISTORIAL': 'text-slate-400',
};

const fmt = n => n?.toLocaleString('es-AR') ?? '—';

export default function GapsDashboard({ gaps = [], isLoading = false, onRefresh }) {
  const [search, setSearch]           = useState('');
  const [filterComp, setFilterComp]   = useState('');
  const [filterConf, setFilterConf]   = useState('');
  const [filterMet, setFilterMet]     = useState('');
  const [filterMes, setFilterMes]     = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  const competidores = useMemo(() => [...new Set(gaps.map(g => g.competidor))].sort(), [gaps]);
  const meses        = useMemo(() => [...new Set(gaps.map(g => g.nombre_mes_gap).filter(Boolean))], [gaps]);
  const regiones     = useMemo(() => [...new Set(gaps.map(g => g.region).filter(Boolean))].sort(), [gaps]);

  const filtered = useMemo(() => {
    let d = gaps;
    if (filterComp)   d = d.filter(g => g.competidor === filterComp);
    if (filterConf)   d = d.filter(g => g.confianza === filterConf);
    if (filterMet)    d = d.filter(g => g.metodo === filterMet);
    if (filterMes)    d = d.filter(g => g.nombre_mes_gap === filterMes);
    if (filterRegion) d = d.filter(g => g.region === filterRegion);
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(g =>
        g.local?.toLowerCase().includes(q) ||
        g.codigo_tienda?.toLowerCase().includes(q) ||
        g.caja?.toLowerCase().includes(q) ||
        g.distrito?.toLowerCase().includes(q)
      );
    }
    return d;
  }, [gaps, filterComp, filterConf, filterMet, filterMes, filterRegion, search]);

  const totales = useMemo(() => ({
    gaps:    filtered.length,
    txTotal: filtered.reduce((acc, g) => acc + (g.transacciones_estimadas || 0), 0),
    diasPromedio: filtered.length
      ? Math.round(filtered.reduce((acc, g) => acc + g.dias_gap, 0) / filtered.length)
      : 0,
  }), [filtered]);

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
            Estimación de transacciones en meses no medidos
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

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Gaps detectados', value: fmt(totales.gaps), icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Tx estimadas totales', value: fmt(totales.txTotal), icon: BarChart2, color: 'text-accent-orange' },
          { label: 'Días promedio sin captura', value: totales.diasPromedio, icon: Calendar, color: 'text-blue-400' },
        ].map(c => (
          <div key={c.label} className="pwa-card p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-white/5 ${c.color}`}>
              <c.icon size={18} />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        {/* Row 1: search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar local, código tienda, caja, distrito…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
          />
        </div>

        {/* Row 2: selectors */}
        <div className="flex flex-wrap gap-2">
          {/* Competidor */}
          <select value={filterComp} onChange={e => setFilterComp(e.target.value)}
            className="flex-1 min-w-[140px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los competidores</option>
            {competidores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Mes gap */}
          <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los meses</option>
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Región */}
          <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
            className="flex-1 min-w-[110px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todas las regiones</option>
            {regiones.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Confianza */}
          <select value={filterConf} onChange={e => setFilterConf(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todas las confianzas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
            <option value="MUY_BAJA">Muy baja</option>
            <option value="SIN_HISTORIAL">Sin historial</option>
          </select>

          {/* Método */}
          <select value={filterMet} onChange={e => setFilterMet(e.target.value)}
            className="flex-1 min-w-[130px] px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-accent-orange/30">
            <option value="">Todos los métodos</option>
            <option value="ESTACIONAL">Estacional</option>
            <option value="PROMEDIO_GLOBAL">Promedio global</option>
            <option value="PRO_RATA">Pro rata</option>
          </select>

          {/* Clear all */}
          {(filterComp || filterConf || filterMet || filterMes || filterRegion || search) && (
            <button
              onClick={() => { setFilterComp(''); setFilterConf(''); setFilterMet(''); setFilterMes(''); setFilterRegion(''); setSearch(''); }}
              className="px-3 py-2 bg-accent-orange/10 hover:bg-accent-orange/20 text-accent-orange rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap"
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {(filterComp || filterConf || filterMet || filterMes || filterRegion) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { val: filterComp,   label: filterComp,               clear: () => setFilterComp('') },
              { val: filterMes,    label: filterMes,                 clear: () => setFilterMes('') },
              { val: filterRegion, label: filterRegion,              clear: () => setFilterRegion('') },
              { val: filterConf,   label: filterConf?.replace('_',' '), clear: () => setFilterConf('') },
              { val: filterMet,    label: filterMet?.replace(/_/g,' '), clear: () => setFilterMet('') },
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
          <p className="text-[8px] text-slate-500">Esto puede tomar unos segundos</p>
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
                <tr className="border-b border-slate-200 dark:border-white/5">
                  {['Competidor', 'Local / Caja', 'Región', 'Mes sin captura', 'Días gap', 'Tx observadas', 'Tasa/día', 'Tx estimadas', 'Método', 'Confianza'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filtered.map((g, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">

                    {/* Competidor */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${COMPETITOR_COLORS[g.competidor] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {g.competidor}
                      </span>
                    </td>

                    {/* Local / Caja */}
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-900 dark:text-white text-[11px] leading-tight">{g.local}</p>
                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">{g.codigo_tienda} · Caja {g.caja}</p>
                    </td>

                    {/* Región */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[10px] font-bold text-slate-600 dark:text-white/60">{g.region}</p>
                      <p className="text-[8px] text-slate-400">{g.distrito}</p>
                    </td>

                    {/* Mes sin captura */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} className="text-accent-orange" />
                        <span className="font-black text-slate-800 dark:text-white text-[10px]">{g.nombre_mes_gap}</span>
                        {g.gap_multiple_meses && (
                          <span className="text-[7px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-black uppercase">+1 mes</span>
                        )}
                      </div>
                    </td>

                    {/* Días gap */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-black text-slate-800 dark:text-white text-[11px]">{g.dias_gap}</span>
                    </td>

                    {/* Tx observadas (período largo) */}
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">
                      {fmt(g.transacciones_observadas)}
                    </td>

                    {/* Tasa/día usada */}
                    <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-500">
                      {g.tasa_diaria_usada?.toFixed(1)}
                    </td>

                    {/* Tx estimadas — highlighted */}
                    <td className="px-4 py-3 text-right">
                      <p className="font-black text-accent-orange text-[13px]">{fmt(g.transacciones_estimadas)}</p>
                      {g.estimacion_baja !== g.estimacion_alta && (
                        <p className="text-[8px] text-slate-400 font-mono">
                          {fmt(g.estimacion_baja)} – {fmt(g.estimacion_alta)}
                        </p>
                      )}
                    </td>

                    {/* Método */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${METODO_STYLE[g.metodo] || 'bg-slate-500/20 text-slate-400'}`}>
                        {g.metodo?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Confianza */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[9px] font-black uppercase ${CONFIANZA_STYLE[g.confianza] || 'text-slate-400'}`}>
                        {g.confianza?.replace('_', ' ')}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
            <AlertTriangle size={10} className="text-amber-400 shrink-0" />
            <p className="text-[8px] text-slate-400 font-bold">
              Las estimaciones usan el promedio histórico de transacciones diarias de cada caja.
              Con más meses de historia, la precisión mejorará automáticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
