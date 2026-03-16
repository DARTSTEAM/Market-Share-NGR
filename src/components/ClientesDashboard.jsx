import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const CATEGORY_EMOJI = {
    'Pollo Frito': '🍗',
    'Hamburguesa': '🍔',
    'Pizza': '🍕',
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const COMPETITOR_COLORS = [
    '#ff5e00', '#0070f3', '#ccff00', '#7000f3', '#00f3a0',
    '#ff3366', '#00ccff', '#ffcc00', '#33ff99', '#cc00ff',
];

// ─── Table section ────────────────────────────────────────────────────────────
const SectionTable = ({ title, headerColor = '#1e3a5f', rows, months, renderCell, footnote }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg">
        <table className="w-full text-left whitespace-nowrap text-[11px]">
            <thead>
                <tr>
                    <th
                        className="px-4 py-3 font-black uppercase tracking-widest text-white text-center"
                        style={{ backgroundColor: headerColor, minWidth: 160 }}
                        colSpan={months.length + 1}
                    >
                        {title}
                    </th>
                </tr>
                <tr className="bg-slate-100 dark:bg-white/[0.04]">
                    <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 160 }}>
                        Competidor
                    </th>
                    {months.map(m => (
                        <th key={m.key} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right" style={{ minWidth: 90 }}>
                            {m.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {rows.map((row, i) => (
                    <tr
                        key={row.label}
                        className={`transition-colors ${row.isTotal
                            ? 'bg-slate-50 dark:bg-white/[0.03] font-black text-slate-900 dark:text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] text-slate-700 dark:text-white/70'
                            }`}
                    >
                        <td className="px-4 py-2.5 font-bold">
                            {row.isTotal ? (
                                <span className="text-slate-900 dark:text-white font-black uppercase tracking-wider">Total</span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: row.color }}
                                    />
                                    {row.label}
                                </span>
                            )}
                        </td>
                        {months.map(m => (
                            <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                {renderCell(row, m)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            {footnote && (
                <tfoot>
                    <tr>
                        <td colSpan={months.length + 1} className="px-4 py-2 text-[9px] text-slate-400 dark:text-white/20 font-bold uppercase tracking-widest">
                            {footnote}
                        </td>
                    </tr>
                </tfoot>
            )}
        </table>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ClientesDashboard = ({ records, competitorToCategory }) => {
    const [selectedCategory, setSelectedCategory] = useState('Hamburguesa');
    const [filterCompetidor, setFilterCompetidor] = useState('all');
    const [filterCajaMes, setFilterCajaMes] = useState('all');
    const [sortCaja, setSortCaja] = useState('competidor_asc');
    const [evolucionMetric, setEvolucionMetric] = useState('trx_total');
    const [sortEvol, setSortEvol] = useState('competidor_asc');

    const categories = ['Pollo Frito', 'Hamburguesa', 'Pizza'];

    // Build pivot: for each competitor x month → { trx, tiendas (distinct locals) }
    const { months, competitors, pivot } = useMemo(() => {
        // Filter to OK records in selected category
        const filtered = records.filter(r =>
            r.status_busqueda === 'OK' &&
            r.mes && r.ano &&
            (competitorToCategory[r.competidor] === selectedCategory)
        );

        // Derive sorted months
        const monthSet = {};
        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const key = `${ano}-${String(mes).padStart(2, '0')}`;
            if (!monthSet[key]) monthSet[key] = { key, ano, mes, label: `${MONTH_SHORT[mes - 1]}-${String(ano).slice(2)}` };
        });
        const months = Object.values(monthSet).sort((a, b) => a.key.localeCompare(b.key));

        // Derive competitors
        const compSet = new Set(filtered.map(r => r.competidor).filter(Boolean));
        const competitors = Array.from(compSet).sort();

        // Build pivot
        // pivot[comp][monthKey] = { trx: number, locals: Set }
        const pivot = {};
        const pivotTotal = {}; // pivot['__total__'][monthKey]

        competitors.forEach(c => { pivot[c] = {}; });
        months.forEach(m => { pivotTotal[m.key] = { trx: 0, locals: new Set() }; });

        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const mk = `${ano}-${String(mes).padStart(2, '0')}`;
            const comp = r.competidor;
            if (!comp || !pivot[comp]) return;

            if (!pivot[comp][mk]) pivot[comp][mk] = { trx: 0, locals: new Set() };
            const trx = parseFloat(r.transacciones) || 0;
            pivot[comp][mk].trx += trx;
            pivot[comp][mk].locals.add(r.local);
            pivotTotal[mk].trx += trx;
            pivotTotal[mk].locals.add(r.local);
        });

        pivot['__total__'] = pivotTotal;

        return { months, competitors, pivot };
    }, [records, selectedCategory, competitorToCategory]);

    // ── Competitors in this category (for sub-filter) ─────────────────────────
    const categoryCompetitors = useMemo(() => {
        const set = new Set(
            records
                .filter(r => r.status_busqueda === 'OK' && r.mes && r.ano && competitorToCategory[r.competidor] === selectedCategory)
                .map(r => r.competidor)
                .filter(Boolean)
        );
        return Array.from(set).sort();
    }, [records, selectedCategory, competitorToCategory]);

    // Reset competitor filter when category changes
    React.useEffect(() => { setFilterCompetidor('all'); setFilterCajaMes('all'); }, [selectedCategory]);

    // ── Caja pivot: (local, caja) × month ─────────────────────────────────────
    const { cajaRows, cajaMonths } = useMemo(() => {
        const filtered = records.filter(r =>
            r.status_busqueda === 'OK' &&
            r.mes && r.ano && r.local && r.caja &&
            competitorToCategory[r.competidor] === selectedCategory &&
            (filterCompetidor === 'all' || r.competidor === filterCompetidor)
        );

        const pivotMap = {};
        const monthSet = {};

        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const mk = `${ano}-${String(mes).padStart(2, '0')}`;
            const rowKey = `${r.local}||${r.caja}`;

            if (!monthSet[mk]) monthSet[mk] = { key: mk, label: `${MONTH_SHORT[mes - 1]}-${String(ano).slice(2)}` };

            if (!pivotMap[rowKey]) {
                pivotMap[rowKey] = { local: r.local, caja: r.caja || '-', competidor: r.competidor, months: {}, promedios: {}, promCounts: {}, counts: {}, total: 0 };
            }
            const trx = parseFloat(r.transacciones) || 0;
            const prom = parseFloat(r.promedio) || 0;
            pivotMap[rowKey].months[mk] = (pivotMap[rowKey].months[mk] || 0) + trx;
            pivotMap[rowKey].counts[mk] = (pivotMap[rowKey].counts[mk] || 0) + 1;
            pivotMap[rowKey].promedios[mk] = (pivotMap[rowKey].promedios[mk] || 0) + prom;
            pivotMap[rowKey].promCounts[mk] = (pivotMap[rowKey].promCounts[mk] || 0) + 1;
            pivotMap[rowKey].total += trx;
        });

        const cajaMonths = Object.values(monthSet).sort((a, b) => a.key.localeCompare(b.key));
        const cajaRows = Object.values(pivotMap).sort((a, b) =>
            a.local.localeCompare(b.local) || String(a.caja).localeCompare(String(b.caja))
        );

        // Compute local totals for % calculation
        const localTotals = {};
        cajaRows.forEach(r => {
            localTotals[r.local] = (localTotals[r.local] || 0) + r.total;
        });
        cajaRows.forEach(r => { r.localTotal = localTotals[r.local] || 1; });

        return { cajaRows, cajaMonths };
    }, [records, selectedCategory, filterCompetidor, competitorToCategory]);

    // ── Display rows for Distribución table (filtered by month + sorted) ────────
    const distribRows = useMemo(() => {
        const withTrx = cajaRows.map(row => {
            const trx = filterCajaMes === 'all' ? row.total : (row.months[filterCajaMes] || 0);
            return { ...row, displayTrx: trx };
        });
        // Recompute local totals for the selected period
        const localTotals = {};
        withTrx.forEach(r => { localTotals[r.local] = (localTotals[r.local] || 0) + r.displayTrx; });
        const withPct = withTrx.map(r => ({
            ...r,
            pct: localTotals[r.local] ? (r.displayTrx / localTotals[r.local]) * 100 : 0,
        }));
        return [...withPct].sort((a, b) => {
            if (sortCaja === 'competidor_asc') return a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local) || String(a.caja).localeCompare(String(b.caja));
            if (sortCaja === 'local_asc') return a.local.localeCompare(b.local) || String(a.caja).localeCompare(String(b.caja));
            if (sortCaja === 'trx_desc') return b.displayTrx - a.displayTrx;
            if (sortCaja === 'trx_asc') return a.displayTrx - b.displayTrx;
            if (sortCaja === 'pct_desc') return b.pct - a.pct;
            if (sortCaja === 'caja_asc') return String(a.caja).localeCompare(String(b.caja));
            return 0;
        });
    }, [cajaRows, filterCajaMes, sortCaja]);

    // Build rows for each table (competitors + total)
    const rows = useMemo(() => {
        return [
            ...competitors.map((c, i) => ({ label: c, key: c, isTotal: false, color: COMPETITOR_COLORS[i % COMPETITOR_COLORS.length] })),
            { label: 'Total', key: '__total__', isTotal: true, color: '#94a3b8' },
        ];
    }, [competitors]);

    // Helpers
    const getTrx = (compKey, monthKey) => pivot[compKey]?.[monthKey]?.trx ?? null;
    const getTiendas = (compKey, monthKey) => pivot[compKey]?.[monthKey]?.locals?.size ?? null;
    const getTotalTrx = (monthKey) => pivot['__total__']?.[monthKey]?.trx ?? null;

    const formatTrx = (v) => v === null ? <span className="text-slate-300 dark:text-white/15">-</span> : new Intl.NumberFormat('es-PE').format(Math.round(v));

    const renderCrec = (compKey, m, i) => {
        if (i === 0) return <span className="text-slate-300 dark:text-white/15">#N/A</span>;
        const curr = getTrx(compKey, months[i].key);
        const prev = getTrx(compKey, months[i - 1].key);
        if (curr === null && prev === null) return <span className="text-slate-300 dark:text-white/15">-</span>;
        if (prev === null || prev === 0) return <span className="text-slate-300 dark:text-white/15">#N/A</span>;
        const pct = ((curr - prev) / prev) * 100;
        const color = pct > 0 ? 'text-emerald-500' : pct < 0 ? 'text-red-500' : 'text-slate-400';
        return (
            <span className={`font-black ${color}`}>
                {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
            </span>
        );
    };

    const renderShare = (compKey, monthKey) => {
        if (compKey === '__total__') {
            return <span className="text-slate-900 dark:text-white font-black">100%</span>;
        }
        const compTrx = getTrx(compKey, monthKey);
        const totalTrx = getTotalTrx(monthKey);
        if (compTrx === null || !totalTrx) return <span className="text-slate-300 dark:text-white/15">-</span>;
        const pct = (compTrx / totalTrx) * 100;
        return <span>{pct.toFixed(1)}%</span>;
    };

    const hasData = months.length > 0 && competitors.length > 0;

    return (
        <motion.div
            key="clientes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-accent-orange" />
                        Evolución por Categoría
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Análisis temporal de métricas por tipo de comida
                    </p>
                </div>

                {/* Category Selector */}
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${selectedCategory === cat
                                    ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20'
                                    : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-base leading-none">{CATEGORY_EMOJI[cat]}</span>
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {!hasData ? (
                <div className="pwa-card p-16 flex flex-col items-center justify-center gap-4 text-center">
                    <span className="text-5xl">{CATEGORY_EMOJI[selectedCategory]}</span>
                    <p className="text-slate-400 dark:text-white/30 font-black uppercase tracking-widest text-sm">
                        Sin datos de rutina para {selectedCategory}
                    </p>
                    <p className="text-slate-300 dark:text-white/20 text-xs font-bold">
                        Verificá que los competidores estén mapeados a esta categoría
                    </p>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* ── 1. Trx Totales ──────────────────────────────────────────────── */}
                    <SectionTable
                        title="Trx Totales"
                        headerColor="#1e3a5f"
                        rows={rows}
                        months={months}
                        renderCell={(row, m) => formatTrx(getTrx(row.key, m.key))}
                    />

                    {/* ── 2. Crec % ───────────────────────────────────────────────────── */}
                    <SectionTable
                        title="Crec %"
                        headerColor="#1e3a5f"
                        rows={rows}
                        months={months}
                        renderCell={(row, m) => {
                            const idx = months.findIndex(x => x.key === m.key);
                            return renderCrec(row.key, m, idx);
                        }}
                        footnote="Crec% = variación respecto al mes anterior. #N/A = sin período previo."
                    />

                    {/* ── 3. Share % ──────────────────────────────────────────────────── */}
                    <SectionTable
                        title="Share %"
                        headerColor="#1e3a5f"
                        rows={rows}
                        months={months}
                        renderCell={(row, m) => renderShare(row.key, m.key)}
                    />

                    {/* ── 4. Número de Tiendas ────────────────────────────────────────── */}
                    <SectionTable
                        title="Número de Tiendas"
                        headerColor="#1e3a5f"
                        rows={rows}
                        months={months}
                        renderCell={(row, m) => {
                            const v = getTiendas(row.key, m.key);
                            return v === null
                                ? <span className="text-slate-300 dark:text-white/15">-</span>
                                : v;
                        }}
                        footnote="Tiendas únicas (locales) con al menos una transacción registrada en el período."
                    />

                    {/* ── Divider ─────────────────────────────────────────────────────── */}
                    {cajaRows.length > 0 && (
                        <>
                            <div className="flex items-center gap-4 pt-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-orange">Detalle por Caja</span>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                            </div>

                            {/* Controls for Distribución table */}
                            <div className="pwa-card p-4 flex flex-col gap-3">
                                {/* Row 1: Competitor filter */}
                                {categoryCompetitors.length > 1 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0">Competidor:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {['all', ...categoryCompetitors].map(comp => (
                                                <button
                                                    key={comp}
                                                    onClick={() => setFilterCompetidor(comp)}
                                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filterCompetidor === comp
                                                        ? 'bg-accent-orange/20 border-accent-orange/50 text-accent-orange'
                                                        : 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                                        }`}
                                                >
                                                    {comp === 'all' ? 'Todos' : comp}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Row 2: Month filter + Sort */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0">Mes:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {[{ key: 'all', label: 'Todos' }, ...cajaMonths].map(m => (
                                            <button
                                                key={m.key}
                                                onClick={() => setFilterCajaMes(m.key)}
                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filterCajaMes === m.key
                                                    ? 'bg-accent-orange/20 border-accent-orange/50 text-accent-orange'
                                                    : 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                                    }`}
                                            >
                                                {m.label || 'Todos'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ordenar:</span>
                                        <select
                                            value={sortCaja}
                                            onChange={e => setSortCaja(e.target.value)}
                                            className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-700 dark:text-white focus:outline-none"
                                        >
                                            <option value="competidor_asc">Competidor (A-Z)</option>
                                            <option value="local_asc">Local (A-Z)</option>
                                            <option value="caja_asc">Caja (A-Z)</option>
                                            <option value="trx_desc">Trx ↓ (Mayor)</option>
                                            <option value="trx_asc">Trx ↑ (Menor)</option>
                                            <option value="pct_desc">% Local ↓</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* ── 5. Distribución por Caja ──────────────────────────────────── */}
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg">
                                <table className="w-full text-left whitespace-nowrap text-[11px]">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-white text-center bg-[#1e3a5f]" colSpan={5}>
                                                Distribución de Ventas por Caja {filterCajaMes !== 'all' ? `— ${cajaMonths.find(m => m.key === filterCajaMes)?.label}` : ''}
                                            </th>
                                        </tr>
                                        <tr className="bg-slate-100 dark:bg-white/[0.04]">
                                            {['Competidor', 'Local', 'Caja', 'Trx Totales', '% del Local'].map(h => (
                                                <th key={h} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right first:text-left">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                        {distribRows.map((row, i) => {
                                            const compChanged = i === 0 || distribRows[i - 1].competidor !== row.competidor;
                                            const isFirstOfLocal = sortCaja === 'competidor_asc' && (compChanged || distribRows[i - 1].local !== row.local);
                                            const isNewComp = sortCaja === 'competidor_asc' && compChanged;
                                            return (
                                                <tr key={`${row.local}-${row.caja}`} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${compChanged ? 'border-t-2 border-slate-200 dark:border-white/10' : ''}`}>
                                                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                                        {sortCaja === 'competidor_asc'
                                                            ? (isNewComp ? <span className="font-black text-accent-orange">{row.competidor}</span> : isFirstOfLocal ? row.competidor : <span className="text-slate-300 dark:text-white/20">↳</span>)
                                                            : <span className={compChanged ? 'font-black text-accent-orange' : 'text-slate-500 dark:text-white/40 font-bold'}>{row.competidor}</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-white/70">{row.local}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-slate-500 dark:text-white/40">{row.caja}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                                        {new Intl.NumberFormat('es-PE').format(Math.round(row.displayTrx))}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={`font-black ${row.pct > 50 ? 'text-accent-orange' : 'text-slate-600 dark:text-white/60'}`}>
                                                            {row.pct.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── 6. Evolución por Caja ─────────────────────────────────────── */}
                            {/* Controls row */}
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0">Evolución — mostrar:</span>
                                {[{ value: 'trx_total', label: 'Trx Totales' }, { value: 'trx_avg', label: 'Prom. Diario' }].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setEvolucionMetric(opt.value)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${evolucionMetric === opt.value
                                            ? 'bg-accent-orange/20 border-accent-orange/50 text-accent-orange'
                                            : 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ordenar:</span>
                                    <select
                                        value={sortEvol}
                                        onChange={e => setSortEvol(e.target.value)}
                                        className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-700 dark:text-white focus:outline-none"
                                    >
                                        <option value="competidor_asc">Competidor (A-Z)</option>
                                        <option value="local_asc">Local (A-Z)</option>
                                        <option value="caja_asc">Caja (A-Z)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg">
                                <table className="w-full text-left whitespace-nowrap text-[11px]">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 font-black uppercase tracking-widest text-white text-center bg-[#1e3a5f]" colSpan={cajaMonths.length + 3}>
                                                {evolucionMetric === 'trx_total' ? 'Evolución de Trx Totales por Caja y Local' : 'Evolución de Promedio Diario por Caja y Local'}
                                            </th>
                                        </tr>
                                        <tr className="bg-slate-100 dark:bg-white/[0.04]">
                                            <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 180 }}>Competidor</th>
                                            <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 180 }}>Local</th>
                                            <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 80 }}>Caja</th>
                                            {cajaMonths.map(m => (
                                                <th key={m.key} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right" style={{ minWidth: 90 }}>
                                                    {m.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                        {[...cajaRows].sort((a, b) => {
                                            if (sortEvol === 'competidor_asc') return a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local) || String(a.caja).localeCompare(String(b.caja));
                                            if (sortEvol === 'local_asc') return a.local.localeCompare(b.local) || String(a.caja).localeCompare(String(b.caja));
                                            if (sortEvol === 'caja_asc') return String(a.caja).localeCompare(String(b.caja));
                                            return 0;
                                        }).map((row, i, arr) => {
                                            const compChanged = i === 0 || arr[i - 1].competidor !== row.competidor;
                                            const isNewComp = sortEvol === 'competidor_asc' && compChanged;
                                            const isNewLocal = sortEvol === 'competidor_asc' && (compChanged || arr[i - 1].local !== row.local);
                                            return (
                                                <tr key={`ev-${row.local}-${row.caja}`} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${compChanged ? 'border-t-2 border-slate-200 dark:border-white/10' : ''}`}>
                                                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                                        {sortEvol === 'competidor_asc'
                                                            ? (isNewComp ? <span className="font-black text-accent-orange">{row.competidor}</span> : isNewLocal ? row.competidor : <span className="text-slate-300 dark:text-white/20">↳</span>)
                                                            : <span className={compChanged ? 'font-black text-accent-orange' : 'text-slate-500 dark:text-white/40 font-bold'}>{row.competidor}</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-white/70">{row.local}</td>
                                                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-white/40">{row.caja}</td>
                                                    {cajaMonths.map(m => {
                                                        const total = row.months[m.key];
                                                        const promSum = row.promedios?.[m.key];
                                                        const promCount = row.promCounts?.[m.key] || 1;
                                                        const v = evolucionMetric === 'trx_total'
                                                            ? total
                                                            : (promSum !== undefined ? promSum / promCount : undefined);
                                                        return (
                                                            <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                                                {v !== undefined
                                                                    ? <span className="font-black text-slate-900 dark:text-white">
                                                                        {v.toFixed(1)}
                                                                    </span>
                                                                    : <span className="text-slate-300 dark:text-white/15">-</span>
                                                                }
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default ClientesDashboard;
