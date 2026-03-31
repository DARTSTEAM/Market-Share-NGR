import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Store, CalendarDays, TrendingUp, Search, X, Clock } from 'lucide-react';

const MES_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const MES_FULL  = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function HistorialDashboard({ records }) {
  const [search, setSearch]               = useState('');
  const [filterAno, setFilterAno]         = useState('all');
  const [filterMes, setFilterMes]         = useState('all');
  const [filterRegion, setFilterRegion]   = useState('all');
  const [filterLocal, setFilterLocal]     = useState('all');
  const [page, setPage]                   = useState(1);
  const PAGE_SIZE = 50;

  // ── Sólo registros históricos ─────────────────────────────────────────────
  const historial = useMemo(
    () => (records || []).filter(r => r.status_busqueda === 'HISTORIAL'),
    [records]
  );

  // ── Opciones de filtros ───────────────────────────────────────────────────
  const anos    = useMemo(() => [...new Set(historial.map(r => r.ano))].sort((a,b) => b-a), [historial]);
  const meses   = useMemo(() => [...new Set(historial.map(r => r.mes))].sort((a,b) => a-b), [historial]);
  const regions = useMemo(() => [...new Set(historial.map(r => r.region).filter(Boolean))].sort(), [historial]);
  const locals  = useMemo(() => [...new Set(historial.map(r => r.local).filter(Boolean))].sort(), [historial]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const tiendas  = new Set(historial.map(r => r.codigo_tienda)).size;
    const cajas    = new Set(historial.map(r => `${r.codigo_tienda}__${r.caja}`)).size;
    const anoMin   = Math.min(...historial.map(r => r.ano));
    const anoMax   = Math.max(...historial.map(r => r.ano));
    const totalTrx = historial.reduce((s, r) => s + (r.transacciones_diferencial || 0), 0);
    return { tiendas, cajas, anoMin, anoMax, totalTrx };
  }, [historial]);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return historial.filter(r => {
      if (filterAno    !== 'all' && String(r.ano) !== filterAno) return false;
      if (filterMes    !== 'all' && String(r.mes) !== filterMes) return false;
      if (filterRegion !== 'all' && r.region !== filterRegion)   return false;
      if (filterLocal  !== 'all' && r.local  !== filterLocal)    return false;
      if (q && !`${r.local} ${r.codigo_tienda} ${r.caja} ${r.distrito}`
                .toLowerCase().includes(q)) return false;
      return true;
    }).sort((a,b) => b.ano - a.ano || b.mes - a.mes || (a.local||'').localeCompare(b.local||''));
  }, [historial, search, filterAno, filterMes, filterRegion, filterLocal]);

  const pageCount  = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const hasFilters = search || filterAno !== 'all' || filterMes !== 'all' ||
                     filterRegion !== 'all' || filterLocal !== 'all';

  const clearFilters = () => {
    setSearch(''); setFilterAno('all'); setFilterMes('all');
    setFilterRegion('all'); setFilterLocal('all'); setPage(1);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selClass = 'bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-violet-400/60 cursor-pointer min-w-[110px]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-400/20">
          <BookOpen size={20} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Historial de Cajas</h2>
          <p className="text-xs text-white/40">Datos de campo 2022 – 2026 · Solo KFC · Fuente: archivo operativo</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tiendas', value: kpis.tiendas, icon: Store, color: 'violet' },
          { label: 'Cajas únicas', value: kpis.cajas, icon: Store, color: 'purple' },
          { label: 'Período', value: `${kpis.anoMin}–${kpis.anoMax}`, icon: CalendarDays, color: 'indigo' },
          { label: 'Trx totales est.', value: kpis.totalTrx.toLocaleString('es-PE'), icon: TrendingUp, color: 'fuchsia' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white/[0.03] border border-${color}-400/20 rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-xl bg-${color}-500/15 shrink-0`}>
              <Icon size={16} className={`text-${color}-400`} />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Buscar local, caja, distrito…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-transparent border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60"
            />
          </div>

          <select value={filterAno} onChange={e => { setFilterAno(e.target.value); setPage(1); }} className={selClass}>
            <option value="all">Todos los años</option>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select value={filterMes} onChange={e => { setFilterMes(e.target.value); setPage(1); }} className={selClass}>
            <option value="all">Todos los meses</option>
            {meses.map(m => <option key={m} value={m}>{MES_FULL[m]}</option>)}
          </select>

          <select value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setPage(1); }} className={selClass}>
            <option value="all">Todas las regiones</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={filterLocal} onChange={e => { setFilterLocal(e.target.value); setPage(1); }} className={selClass}>
            <option value="all">Todos los locales</option>
            {locals.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/80 border border-red-400/20 hover:bg-red-400/10 transition-colors">
              <X size={11} /> Limpiar
            </button>
          )}
        </div>

        <p className="text-[10px] text-white/30">
          {filtered.length.toLocaleString('es-PE')} registros · página {page} de {pageCount || 1}
        </p>
      </div>

      {/* ── Table ── */}
      <div className="bg-white/[0.03] border border-violet-400/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-violet-500/10 border-b border-violet-400/10 text-white/50 uppercase tracking-widest text-[9px]">
                <th className="text-left px-4 py-3 font-semibold">Año / Mes</th>
                <th className="text-left px-4 py-3 font-semibold">Local</th>
                <th className="text-left px-4 py-3 font-semibold">Caja</th>
                <th className="text-right px-4 py-3 font-semibold">Prom. diario</th>
                <th className="text-right px-4 py-3 font-semibold">Trx est./mes</th>
                <th className="text-left px-4 py-3 font-semibold">Región</th>
                <th className="text-left px-4 py-3 font-semibold">Distrito</th>
                <th className="text-center px-4 py-3 font-semibold">Fuente</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {pageData.map((r, i) => (
                  <motion.tr
                    key={`${r.codigo_tienda}-${r.caja}-${r.ano}-${r.mes}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.005 }}
                    className="border-b border-violet-400/5 hover:bg-violet-500/5 transition-colors group"
                  >
                    {/* Año / Mes */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-violet-300 font-bold">{r.ano}</span>
                        <span className="bg-violet-500/20 text-violet-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {MES_NAMES[r.mes] || r.mes}
                        </span>
                      </div>
                    </td>

                    {/* Local */}
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-white/80 font-medium">{r.local}</span>
                        <span className="text-white/30 text-[9px] ml-2">{r.codigo_tienda}</span>
                      </div>
                    </td>

                    {/* Caja */}
                    <td className="px-4 py-3">
                      <span className="bg-white/5 text-white/60 px-2 py-0.5 rounded text-[10px] font-mono">{r.caja}</span>
                    </td>

                    {/* Prom. diario */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-violet-200 font-bold tabular-nums">
                        {parseFloat(r.promedio_transacciones_diarias || 0).toFixed(0)}
                      </span>
                      <span className="text-white/30 text-[9px] ml-1">tx/día</span>
                    </td>

                    {/* Trx estimadas mes */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-white/70 tabular-nums">
                        {(r.transacciones_diferencial || 0).toLocaleString('es-PE')}
                      </span>
                    </td>

                    {/* Región */}
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        r.region === 'Lima'
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-orange-500/15 text-orange-300'
                      }`}>
                        {r.region || '—'}
                      </span>
                    </td>

                    {/* Distrito */}
                    <td className="px-4 py-3 text-white/40 text-[10px]">{r.distrito || '—'}</td>

                    {/* Fuente badge */}
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 bg-violet-500/15 text-violet-300 text-[8px] font-bold px-2 py-0.5 rounded-full border border-violet-400/20 whitespace-nowrap">
                        <Clock size={8} />
                        HISTÓRICO
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {pageData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-white/30">
                    <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No hay registros históricos con los filtros aplicados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 p-3 border-t border-violet-400/10">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg text-xs text-violet-300 border border-violet-400/20 hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-xs text-white/40">
              {page} / {pageCount}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p+1))}
              disabled={page === pageCount}
              className="px-3 py-1 rounded-lg text-xs text-violet-300 border border-violet-400/20 hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
