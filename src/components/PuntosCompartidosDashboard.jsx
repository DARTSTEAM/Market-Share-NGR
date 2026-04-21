import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Building2, Store, TrendingUp, BarChart3,
    ChevronRight, ChevronLeft, X, Layers, Activity, Table2, LayoutGrid,
    Target, ShieldCheck
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
    AreaChart, Area,
} from 'recharts';
import CustomSelect from './common/CustomSelect';

// ─── Constants ───────────────────────────────────────────────────────────────
const PALETTE = ['#ff5e00', '#0070f3', '#7c3aed', '#00b4a0', '#f59e0b', '#e11d48', '#0ea5e9', '#84cc16'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const BRAND_COLORS = {
    'kfc':           '#E4002B',
    'mcdonald':      '#FFC72C',
    'burger king':   '#FF8C00',
    'domino':        '#006491',
    'pizza hut':     '#EE3A24',
    'little caesars': '#6D1F7E',
    'popeyes':       '#F26522',
    'bembos':        '#CC1F1F',
    'papa john':     '#007743',
    'telepizza':     '#C00D0D',
    'chinawok':      '#FFB800',
    'dunkin':        '#DA1884',
};

const COMPETITOR_TO_CATEGORY = {
    'KFC': 'Pollo Frito',
    'MCDONALD\'S': 'Hamburguesa',
    'MCDONALDS': 'Hamburguesa',
    'BEMBOS': 'Hamburguesa',
    'BURGER KING': 'Hamburguesa',
    'DOMINOS': 'Pizza',
    'DOMINO\'S': 'Pizza',
    'LITTLE CAESARS': 'Pizza',
    'PIZZA HUT': 'Pizza',
    'POPEYES': 'Pollo Frito',
    'PAPA JOHNS': 'Pizza',
    'PUNTOS COMPARTIDOS': 'Otros',
    'NGR': 'Otros',
    'TELEPIZZA': 'Pizza'
};

const CATEGORY_COLORS = {
    'Pollo Frito': '#E4002B',
    'Hamburguesa': '#FFC72C',
    'Pizza': '#006491',
    'Otros': '#94a3b8'
};

const getCategory = (name) => {
    if (!name) return 'Otros';
    const clean = name.replace(' (NGR)', '').replace(' (ngr)', '').trim().toUpperCase();
    return COMPETITOR_TO_CATEGORY[clean] || 'Otros';
};

function colorFor(name) {
    if (!name) return PALETTE[0];
    const lower = name.toLowerCase().trim();
    const cleanLower = lower.replace(' (ngr)', '').trim();
    
    // 1. Check if it's an EXACT category name (e.g. for "Group by Category" mode)
    if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];

    // 2. Match by brand name (stripping NGR suffix)
    for (const [brand, color] of Object.entries(BRAND_COLORS)) {
        if (cleanLower.includes(brand)) return color;
    }

    // 3. Last fallback: random hash from palette
    let hash = 0;
    for (let i = 0; i < (name?.length || 0); i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash));
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

const fmt = (n) => n == null ? '—' : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(n);
const fmtInt = (n) => n == null ? '—' : new Intl.NumberFormat('es-ES').format(Math.round(n));

// ─── Custom Tooltip for Line Chart ───────────────────────────────────────────
const LineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 border border-white/10 rounded-xl p-3 shadow-2xl text-[10px] min-w-[140px]">
            <p className="font-black uppercase tracking-widest text-white/50 mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex justify-between gap-4 items-center">
                    <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span className="font-black font-mono text-white">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Mini Donut ─────────────────────────────────────────────────────────────
const MiniDonut = ({ data }) => {
    const chartData = data.map(d => ({ ...d, color: colorFor(d.name) }));
    return (
        <ResponsiveContainer width="100%" height={110}>
            <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={26} outerRadius={46}
                    paddingAngle={3} dataKey="prom" stroke="none" isAnimationActive={false}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

// ─── PC Card ─────────────────────────────────────────────────────────────────
const PCCard = ({ pc, onClick, isSelected }) => {
    const total = pc.byComp.reduce((s, d) => s + (d.prom || 0), 0); // use prom not value
    const totalProm = pc.byComp.reduce((s, d) => s + (d.prom || 0), 0);
    const leader = pc.byComp[0];
    const leaderColor = colorFor(leader?.name);
    const isCC = !!pc.cc_nombre;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => onClick(pc)}
            className={`pwa-card p-5 flex flex-col cursor-pointer transition-all duration-200 relative overflow-hidden border-2 h-[380px] ${isSelected
                ? 'border-accent-orange shadow-[0_0_30px_rgba(255,94,0,0.2)]'
                : 'border-transparent hover:border-white/10'
                }`}
        >
            <div className="absolute inset-0 opacity-[0.04] rounded-2xl pointer-events-none"
                style={{ background: `radial-gradient(circle at 70% 20%, ${leaderColor}, transparent 60%)` }} />

            {/* Header */}
            <div className="flex justify-between items-start gap-2 flex-shrink-0 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        {isCC
                            ? <Building2 className="w-3 h-3 text-accent-blue flex-shrink-0" />
                            : <MapPin className="w-3 h-3 text-accent-orange flex-shrink-0" />
                        }
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                            {isCC ? (pc.grupos_cc || 'Centro Comercial') : 'Punto Compartido'}
                        </span>
                    </div>
                    <h4 className="text-sm font-black italic text-slate-900 dark:text-white uppercase tracking-tight truncate">{pc.nombre}</h4>
                    {isCC && <p className="text-[9px] text-accent-blue font-bold mt-0.5 truncate">{pc.cc_nombre}</p>}
                </div>
                <span className="text-[8px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${leaderColor}20`, color: leaderColor }}>
                    {pc.byComp.length} marcas
                </span>
            </div>

            {/* Donut */}
            <div className="flex-shrink-0">
                <MiniDonut data={pc.byComp} />
            </div>

            {/* Competitors */}
            <div className="flex-1 flex flex-col justify-center gap-1.5 mt-1 min-h-0">
                {pc.byComp.map((comp, i) => {
                    const color = colorFor(comp.name);
                    const pct = total > 0 ? ((comp.prom || 0) / total) * 100 : 0;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[9px] font-black uppercase tracking-tight truncate flex-1" style={{ color }}>
                                {comp.name}
                            </span>
                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full flex-shrink-0 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[9px] font-mono font-black w-7 text-right flex-shrink-0" style={{ color }}>
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Footer: Prom diario */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5 flex-shrink-0 mt-2">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Prom. Diario Total</span>
                <div className="text-right">
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                        {fmt(totalProm)}<span className="text-[8px] text-slate-400 dark:text-white/30 ml-0.5">trx/día</span>
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Evolution Line Chart ─────────────────────────────────────────────────────
const EvolutionChart = ({ monthData, competitors }) => {
    const data = Object.entries(monthData || {})
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([mk, byComp]) => {
            const [ano, mes] = mk.split('-');
            const label = `${MONTH_SHORT[parseInt(mes) - 1]}-${ano.slice(2)}`;
            const row = { name: label };
            competitors.forEach(c => { row[c] = byComp[c] ?? null; });
            return row;
        });

    if (data.length < 2) return (
        <div className="flex items-center justify-center h-40 text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest">
            Insuficiente historia para mostrar evolutivo
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" fontSize={8} tick={{ fill: 'rgba(100,116,139,0.7)', fontWeight: 900 }} />
                <YAxis fontSize={8} tick={{ fill: 'rgba(100,116,139,0.6)' }}
                    tickFormatter={v => fmt(v)} width={40} />
                <ReTooltip content={<LineTooltip />} />
                <Legend iconSize={7} iconType="circle"
                    formatter={v => <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>} />
                {competitors.map(comp => (
                    <Line key={comp} type="monotone" dataKey={comp}
                        stroke={colorFor(comp)} strokeWidth={2.5} dot={{ r: 3, fill: colorFor(comp) }}
                        activeDot={{ r: 5 }} connectNulls />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

// ─── Share Tooltip (module-level — avoids TDZ error en bundle minificado) ────
const ShareTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-900/95 border border-white/10 rounded-xl p-3 shadow-2xl text-[10px] min-w-[150px]">
            <p className="font-black uppercase tracking-widest text-white/50 mb-2">{label}</p>
            {[...payload].reverse().map((p, i) => (
                <div key={i} className="flex justify-between gap-4 items-center">
                    <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span className="font-black font-mono text-white">{p.value?.toFixed(1)}%</span>
                </div>
            ))}
        </div>
    );
};

// ─── Share % Evolution Chart (100% stacked area) ─────────────────────────────
const ShareEvolutionChart = ({ monthData, competitors }) => {
    const data = Object.entries(monthData || {})
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([mk, byComp]) => {
            const [ano, mes] = mk.split('-');
            const label = `${MONTH_SHORT[parseInt(mes) - 1]}-${ano.slice(2)}`;
            const total = competitors.reduce((s, c) => s + (byComp[c] ?? 0), 0);
            const row = { name: label };
            competitors.forEach(c => {
                row[c] = total > 0 ? Math.round((byComp[c] ?? 0) / total * 1000) / 10 : 0;
            });
            return row;
        });

    if (data.length < 2) return (
        <div className="flex items-center justify-center h-40 text-[10px] text-slate-400 dark:text-white/30 font-bold uppercase tracking-widest">
            Insuficiente historia para mostrar evolutivo
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="name" fontSize={8} tick={{ fill: 'rgba(100,116,139,0.7)', fontWeight: 900 }} />
                <YAxis fontSize={8} tick={{ fill: 'rgba(100,116,139,0.6)' }}
                    tickFormatter={v => `${Math.round(v * 100)}%`} domain={[0, 1]} width={36} />
                <ReTooltip content={ShareTooltip} />
                <Legend iconSize={7} iconType="circle"
                    formatter={v => <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>} />
                {competitors.map(comp => (
                    <Area key={comp} type="monotone" dataKey={comp}
                        stackId="1"
                        stroke={colorFor(comp)} strokeWidth={1.5}
                        fill={colorFor(comp)} fillOpacity={0.75}
                        connectNulls />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const norm = s => String(s || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const PCDetailPanel = ({ pc: rawPc, evolutionData: rawEvolutionData, onClose, allPCs, currentIndex, onNavigate, ngrByPC = {}, showNGR }) => {
    if (!rawPc) return null;

    // Normalize and find NGR records for this PC
    const ngrForPC = ngrByPC[norm(rawPc.nombre)] || [];

    // MERGE NGR into the current PC data for the charts
    const pc = useMemo(() => {
        if (!showNGR || ngrForPC.length === 0) return rawPc;
        
        const mergedByComp = [...rawPc.byComp];
        const mergedLocales = [...rawPc.locales];

        ngrForPC.forEach(n => {
            const name = `${n.marca} (NGR)`;
            // Add to byComp if not already there (avoid double counting)
            if (!mergedByComp.find(c => c.name === name)) {
                mergedByComp.push({
                    name: name,
                    prom: n.trx_promedio,
                    value: n.trx_promedio,
                    isNGR: true
                });
            }
            // Add to locales list
            mergedLocales.push({
                competidor: name,
                local: n.local_ngr || n.nombre_ngr,
                prom: n.trx_promedio,
                isNGR: true
            });
        });

        return {
            ...rawPc,
            byComp: mergedByComp.sort((a, b) => b.prom - a.prom),
            locales: mergedLocales.sort((a, b) => b.prom - a.prom)
        };
    }, [rawPc, ngrForPC, showNGR]);

    // Main evolution data as provided by parent (now includes NGR history)
    const evolutionData = rawEvolutionData;

    const isCC = !!pc.cc_nombre;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allPCs.length - 1;
    const totalProm = pc.byComp.reduce((s, d) => s + (d.prom || 0), 0);
    const [chartTab, setChartTab] = React.useState('trx'); // 'trx' | 'share'

    React.useEffect(() => {
        const handler = (e) => {
            if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
            if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentIndex, hasPrev, hasNext]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <motion.div
                key={pc.nombre}
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="pwa-card no-hover p-6 space-y-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isCC ? <Building2 className="w-4 h-4 text-accent-blue" /> : <MapPin className="w-4 h-4 text-accent-orange" />}
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                                {isCC ? (pc.grupos_cc || 'Centro Comercial') : 'Punto Compartido'}
                            </span>
                            <span className="text-[9px] font-black text-slate-300 dark:text-white/15 ml-1">
                                {currentIndex + 1} / {allPCs.length}
                            </span>
                        </div>
                        <h3 className="text-xl font-black italic uppercase text-slate-900 dark:text-white">{pc.nombre}</h3>
                        {isCC && <p className="text-xs text-accent-blue font-bold mt-0.5">{pc.cc_nombre}</p>}
                        <p className="text-[10px] text-slate-400 dark:text-white/30 mt-2 font-bold">
                            {pc.byComp.length} competidores · {pc.locales.length} locales
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => hasPrev && onNavigate(currentIndex - 1)} disabled={!hasPrev}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors disabled:opacity-20">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => hasNext && onNavigate(currentIndex + 1)} disabled={!hasNext}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors disabled:opacity-20">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Top: Donut + Bars */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Donut */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                            Share por marca (Prom. Diario)
                        </p>
                        <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={pc.byComp.map(d => ({ name: d.name, value: d.prom || 0 }))}
                                        cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                                        paddingAngle={2} dataKey="value" stroke="none" label={false}>
                                        {pc.byComp.map((e, i) => <Cell key={i} fill={colorFor(e.name)} />)}
                                    </Pie>
                                    <ReTooltip
                                        formatter={(val, name) => [`${fmt(val)} trx/día`, name]}
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        align="center"
                                        iconSize={7} 
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                        formatter={(v, e) => (
                                            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                                                {v} · {totalProm > 0 ? ((e.payload.value / totalProm) * 100).toFixed(0) : 0}%
                                            </span>
                                        )} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stacked bars with prom */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">
                            Prom. Transacciones Diarias por marca
                        </p>
                        <div className="space-y-2.5 py-2">
                            {pc.byComp.map((d, i) => {
                                const color = colorFor(d.name);
                                const pct = totalProm > 0 ? ((d.prom || 0) / totalProm) * 100 : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 w-24 truncate text-right">{d.name}</span>
                                        <div className="flex-1 h-5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                                                className="h-full rounded-full flex items-center justify-end pr-2"
                                                style={{ backgroundColor: color }}
                                            >
                                                {pct > 8 && <span className="text-[8px] font-black text-white">{pct.toFixed(0)}%</span>}
                                            </motion.div>
                                        </div>
                                        <span className="text-[9px] font-mono font-black text-slate-700 dark:text-white/70 w-20 text-right">
                                            {fmt(d.prom)} trx/día
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* KPI total */}
                        <div className="mt-4 p-3 rounded-xl bg-accent-orange/5 border border-accent-orange/20">
                            <p className="text-[8px] font-black uppercase tracking-widest text-accent-orange/70">Total Prom. Diario del Punto</p>
                            <p className="text-2xl font-black text-accent-orange mt-1">
                                {fmt(totalProm)} <span className="text-sm font-bold text-accent-orange/60">trx/día</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* NGR proprio performance block */}
                {ngrForPC.length > 0 && (
                    <div className="border-t border-orange-500/20 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">★ NGR</span>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Locales propios NGR en este punto</p>
                        </div>
                        <div className="space-y-2">
                            {ngrForPC.map((ngr, i) => {
                                const maxNgr = Math.max(...ngrForPC.map(n => n.trx_promedio));
                                const pct = maxNgr > 0 ? (ngr.trx_promedio / maxNgr) * 100 : 0;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-24 text-right flex-shrink-0">
                                            <span className="text-[9px] font-black uppercase" style={{ color: colorFor(ngr.marca) }}>{ngr.marca}</span>
                                        </div>
                                        <div className="flex-1 h-2 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colorFor(ngr.marca) }} />
                                        </div>
                                        <span className="text-[9px] font-black font-mono text-slate-700 dark:text-white/70 w-12 text-right">{ngr.trx_promedio.toFixed(0)}</span>
                                        <span className="text-[8px] text-slate-400 dark:text-white/25">/día</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Evolution charts with tab toggle */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-accent-orange" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                                {chartTab === 'trx'
                                    ? 'Evolutivo mensual — Prom. transacciones diarias'
                                    : 'Evolutivo mensual — Share % por competidor'}
                            </p>
                        </div>
                        {/* Tab toggle */}
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200 dark:border-white/8">
                            {[{ id: 'trx', label: 'Trx' }, { id: 'share', label: 'Share %' }].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setChartTab(tab.id)}
                                    className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                        chartTab === tab.id
                                            ? 'bg-accent-orange text-white shadow-sm'
                                            : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {chartTab === 'trx' ? (
                        <EvolutionChart
                            monthData={evolutionData || {}}
                            competitors={pc.byComp.map(c => c.name)}
                        />
                    ) : (
                        <ShareEvolutionChart
                            monthData={evolutionData || {}}
                            competitors={pc.byComp.map(c => c.name)}
                        />
                    )}
                </div>

                {/* Locales table */}
                <div className="border-t border-slate-200 dark:border-white/10 pt-6">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Locales en este punto</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {pc.locales.map((loc, i) => {
                            const color = colorFor(loc.competidor);
                            return (
                                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color }}>{loc.competidor}</span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] text-slate-500 dark:text-white/40 font-bold truncate leading-tight">{loc.local}</span>
                                            {loc.codigo_tienda && (
                                                <span className="text-[7px] font-black font-mono text-accent-orange/70 tracking-tighter leading-none">#{loc.codigo_tienda}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <p className="text-[9px] font-mono font-black text-slate-700 dark:text-white/70">
                                            {fmt(loc.prom)} trx/día
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Macro Summary Table ──────────────────────────────────────────────────────
const MacroTable = ({ pcs, onSelectPC, groupMode }) => {
    const [sortCol, setSortCol] = useState('prom');
    const [sortDir, setSortDir] = useState('desc');

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortCol(col); setSortDir('desc'); }
    };

    const sorted = [...pcs].sort((a, b) => {
        const av = sortCol === 'nombre' ? a.nombre : sortCol === 'marcas' ? a.byComp.length : a.byComp.reduce((s, c) => s + (c.prom || 0), 0);
        const bv = sortCol === 'nombre' ? b.nombre : sortCol === 'marcas' ? b.byComp.length : b.byComp.reduce((s, c) => s + (c.prom || 0), 0);
        if (typeof av === 'string' || typeof bv === 'string') return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        return sortDir === 'asc' ? av - bv : bv - av;
    });

    const Th = ({ col, children }) => (
        <th onClick={() => toggleSort(col)}
            className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 cursor-pointer hover:text-accent-orange transition-colors whitespace-nowrap select-none">
            {children} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : ''}
        </th>
    );

    // Columns are either Competitors or Categories
    const allColKeys = [...new Set(pcs.flatMap(p => p.byComp.map(c => c.name)))].sort();

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5">
            <table className="w-full text-xs whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-white/[0.03]">
                    <tr>
                        <Th col="nombre">Punto Compartido</Th>
                        <th className="px-4 py-3 text-left text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Tipo</th>
                        <Th col="marcas">{groupMode === 'category' ? 'Categorías' : groupMode === 'ownership' ? 'Segmento' : 'Marcas'}</Th>
                        {allColKeys.map(c => (
                            <th key={c} className="px-4 py-3 text-right text-[8px] font-black uppercase tracking-widest whitespace-nowrap"
                                style={{ color: colorFor(c) }}>
                                {c}
                            </th>
                        ))}
                        <Th col="prom">Total trx/día</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                    {sorted.map((pc, i) => {
                        const isCC = !!pc.cc_nombre;
                        const totalProm = pc.byComp.reduce((s, c) => s + (c.prom || 0), 0);
                        const leaderColor = colorFor(pc.byComp[0]?.name);
                        return (
                            <tr key={i}
                                onClick={() => onSelectPC(pc)}
                                className="hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: leaderColor }} />
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-[11px] group-hover:text-accent-orange transition-colors">{pc.nombre}</p>
                                            {isCC && <p className="text-[8px] text-accent-blue font-bold">{pc.cc_nombre}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${isCC
                                        ? 'bg-accent-blue/10 text-accent-blue'
                                        : 'bg-accent-orange/10 text-accent-orange'}`}>
                                        {isCC ? <Building2 className="w-2 h-2" /> : <MapPin className="w-2 h-2" />}
                                        {isCC ? 'CC' : 'Calle'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-white">{pc.byComp.length}</span>
                                </td>
                                {allColKeys.map(comp => {
                                    const found = pc.byComp.find(c => c.name === comp);
                                    const pct = totalProm > 0 && found ? (found.prom / totalProm) * 100 : 0;
                                    return (
                                        <td key={comp} className="px-4 py-3 text-right">
                                            {found ? (
                                                <div>
                                                    <p className="text-[10px] font-black font-mono" style={{ color: colorFor(comp) }}>
                                                        {fmt(found.prom)}
                                                    </p>
                                                    <p className="text-[7px] text-slate-400 font-mono">{pct.toFixed(0)}%</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-white/15">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-black font-mono text-slate-900 dark:text-white">{fmt(totalProm)}</span>
                                    <span className="text-[8px] text-slate-400 ml-0.5">trx/día</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 dark:bg-white/[0.03] border-t-2 border-slate-200 dark:border-white/10">
                        <td className="px-4 py-3" colSpan={3}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                                TOTAL ({sorted.length} puntos)
                            </span>
                        </td>
                        {allColKeys.map(comp => {
                            const total = sorted.reduce((s, pc) => s + (pc.byComp.find(c => c.name === comp)?.prom || 0), 0);
                            return (
                                <td key={comp} className="px-4 py-3 text-right">
                                    <span className="text-[10px] font-black font-mono" style={{ color: colorFor(comp) }}>
                                        {total > 0 ? fmt(total) : '—'}
                                    </span>
                                </td>
                            );
                        })}
                        <td className="px-4 py-3 text-right">
                            <span className="text-[12px] font-black font-mono text-slate-900 dark:text-white">
                                {fmt(sorted.reduce((s, pc) => s + pc.byComp.reduce((ss, c) => ss + (c.prom || 0), 0), 0))}
                            </span>
                            <span className="text-[8px] text-slate-400 ml-0.5">trx/día</span>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PuntosCompartidosDashboard({ allRecords, evolutionRecords, shareData, ngrLocales = [], filters }) {
    const [selectedPC, setSelectedPC] = useState(null);
    const [filterTipo, setFilterTipo] = useState('all');
    const [filterCadena, setFilterCadena] = useState('all');
    const [filterComp, setFilterComp] = useState([]); // Array for multi-select
    const [filterCat, setFilterCat] = useState('all'); // New category filter
    const [groupMode, setGroupMode] = useState('brand'); // 'brand' | 'category' | 'ownership'
    const [sortMode, setSortMode] = useState('prom');
    const [visibleCount, setVisibleCount] = useState(8);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
    const [showNGR, setShowNGR] = useState(false); // New: Mostrar marcas NGR propias

    const ngrByPC = useMemo(() => {
        const map = {};
        if (!ngrLocales) return map;
        
        const targetMonth = filters?.month && filters.month !== 'all' ? (parseInt(filters.month) + 1) : null;
        const targetYear = filters?.year && filters.year !== 'all' ? parseInt(filters.year) : null;

        ngrLocales.forEach(loc => {
            // Strict date matching: if a filter is set, record must have matching date info
            const locMonth = loc.mes ? parseInt(loc.mes) : null;
            const locYear = loc.ano ? parseInt(loc.ano) : null;

            if (targetMonth && locMonth !== targetMonth) return;
            if (targetYear && locYear !== targetYear) return;

            let pcName = loc.punto_compartido;
            if (!pcName || pcName === 'SI' || pcName === 'true') {
                 pcName = loc.cc_nombre || loc.local;
            }
            if (!pcName) return;
            const key = norm(pcName);
            if (!map[key]) map[key] = [];
            map[key].push(loc);
        });
        return map;
    }, [ngrLocales, filters?.month, filters?.year]);

    // ─── PC static data (from filtered allRecords — current period) ──────────
    const pcData = useMemo(() => {
        const map = {};
        
        // Process competition records and NGR records together
        const dataToProcess = [...allRecords];
        
        if (showNGR) {
            const targetMonth = filters?.month && filters.month !== 'all' ? (parseInt(filters.month) + 1) : null;
            const targetYear = filters?.year && filters.year !== 'all' ? parseInt(filters.year) : null;

            ngrLocales.forEach(r => {
                // Strict date matching: if a filter is set, record must have matching date info
                const rMonth = r.mes ? parseInt(r.mes) : null;
                const rYear = r.ano ? parseInt(r.ano) : null;

                if (targetMonth && rMonth !== targetMonth) return;
                if (targetYear && rYear !== targetYear) return;

                let pcName = r.punto_compartido;
                if (!pcName || pcName === 'SI' || pcName === 'true') {
                    pcName = r.cc_nombre || r.local;
                }
                
                dataToProcess.push({
                    punto_compartido: pcName,
                    cc_punto_compartido: r.cc_punto_compartido || r.cc_nombre,
                    competidor: r.marca + ' (NGR)',
                    local: r.local,
                    codigo_tienda: r.store_num || r.codigo_tienda || r.cod_tienda,
                    transacciones: (parseFloat(r.trx_promedio) || 0) * 30,
                    promedio: parseFloat(r.trx_promedio) || 0,
                    mes: r.mes || targetMonth || 12,
                    ano: r.ano || targetYear || 2025,
                    status_busqueda: 'OK'
                });
            });
        }

        dataToProcess.forEach(rec => {
            if (!rec.punto_compartido) return;

            const pcKey = String(rec.punto_compartido).toUpperCase().trim();
            
            if (!map[pcKey]) {
                map[pcKey] = {
                    nombre: rec.punto_compartido,
                    cc_nombre: rec.cc_punto_compartido || rec.cc_nombre || null,
                    grupos_cc: rec.grupos_cc || null,
                    byComp: {},
                    locales: {},
                };
            }

            const pc = map[pcKey];
            const comp = rec.competidor;
            const trx = parseFloat(rec.transacciones) || 0;
            const prom = parseFloat(rec.promedio) || 0;
            const mk = (rec.mes && rec.ano)
                ? `${parseInt(rec.ano)}-${String(parseInt(rec.mes)).padStart(2, '0')}`
                : '__nodate__';

            if (!pc.byComp[comp]) pc.byComp[comp] = { trx: 0, monthProm: {} };
            pc.byComp[comp].trx += trx;
            pc.byComp[comp].monthProm[mk] = (pc.byComp[comp].monthProm[mk] || 0) + prom;

            const locKey = `${comp}||${rec.local}`;
            if (!pc.locales[locKey]) {
                pc.locales[locKey] = { 
                    competidor: comp, 
                    local: rec.local, 
                    codigo_tienda: rec.codigo_tienda,
                    trx: 0, 
                    monthProm: {} 
                };
            }
            pc.locales[locKey].trx += trx;
            pc.locales[locKey].monthProm[mk] = (pc.locales[locKey].monthProm[mk] || 0) + prom;
        });

        return Object.values(map)
            .map(pc => ({
                nombre: pc.nombre,
                cc_nombre: pc.cc_nombre,
                grupos_cc: pc.grupos_cc,
                byComp: Object.entries(pc.byComp)
                    .map(([name, d]) => {
                        const months = Object.values(d.monthProm);
                        const avgProm = months.length > 0
                            ? months.reduce((s, v) => s + v, 0) / months.length
                            : 0;
                        return { name, value: Math.round(d.trx), prom: Math.round(avgProm * 10) / 10 };
                    })
                    .sort((a, b) => b.prom - a.prom),
                locales: Object.values(pc.locales)
                    .map(l => {
                        const months = Object.values(l.monthProm);
                        const avgProm = months.length > 0
                            ? months.reduce((s, v) => s + v, 0) / months.length
                            : 0;
                        return { 
                            competidor: l.competidor, 
                            local: l.local, 
                            codigo_tienda: l.codigo_tienda,
                            trx: Math.round(l.trx), 
                            prom: Math.round(avgProm * 10) / 10 
                        };
                    })
                    .filter((l, idx, self) => {
                        // Deduplicate NGR brands: if we have two with same brand and same prom, 
                        // and one has no code, keep only the one with code.
                        if (!l.codigo_tienda) {
                            const hasBetter = self.some(other => 
                                other.competidor === l.competidor && 
                                other.prom === l.prom && 
                                other.codigo_tienda
                            );
                            if (hasBetter) return false;
                        }
                        return true;
                    })
                    .sort((a, b) => b.prom - a.prom),
            }))
            .filter(pc => pc.byComp.length >= (showNGR ? 1 : 2));
    }, [allRecords, ngrLocales, showNGR]);

    // ─── Evolution data (from evolutionRecords — always last 12 months) ───────
    const pcEvolutionMap = useMemo(() => {
        const source = [...(evolutionRecords || allRecords)];
        
        if (showNGR && ngrLocales?.length) {
            ngrLocales.forEach(r => {
                const pcName = (r.punto_compartido && r.punto_compartido !== 'SI' && r.punto_compartido !== 'true') 
                    ? r.punto_compartido 
                    : r.local;

                source.push({
                    punto_compartido: pcName,
                    competidor: r.marca + ' (NGR)',
                    promedio: r.trx_promedio,
                    mes: r.mes,
                    ano: r.ano
                });
            });
        }

        const map = {};
        source.forEach(rec => {
            if (!rec.punto_compartido || !rec.mes || !rec.ano) return;
            const pcKey = String(rec.punto_compartido).toUpperCase().trim();
            const comp = rec.competidor;
            const prom = parseFloat(rec.promedio || rec.prom) || 0;
            const mk = `${parseInt(rec.ano)}-${String(parseInt(rec.mes)).padStart(2, '0')}`;
            if (!map[pcKey]) map[pcKey] = {};
            if (!map[pcKey][mk]) map[pcKey][mk] = {};
            map[pcKey][mk][comp] = (map[pcKey][mk][comp] || 0) + prom;
        });
        return map;
    }, [evolutionRecords, allRecords, ngrLocales, showNGR]);

    const catOptions = useMemo(() => {
        const allowed = ['Pollo Frito', 'Pizza', 'Hamburguesa'];
        return [
            { value: 'all', label: 'Todas las categorías' },
            ...allowed.map(v => ({ value: v, label: v })),
            { value: 'Otros', label: 'Otros' }
        ];
    }, []);

    const compOptions = useMemo(() => {
        let comps = [...new Set(pcData.flatMap(p => p.byComp.map(c => c.name)))].sort();
        if (filterCat !== 'all') {
            comps = comps.filter(c => getCategory(c) === filterCat);
        }
        return comps.map(v => ({ value: v, label: v }));
    }, [pcData, filterCat]);

    const filteredPCs = useMemo(() => {
        let data = [...pcData];
        if (filterTipo === 'cc') data = data.filter(p => !!p.cc_nombre);
        if (filterTipo === 'calle') data = data.filter(p => !p.cc_nombre);
        if (filterCadena !== 'all') data = data.filter(p => p.grupos_cc === filterCadena);
        
        // Filter by category — Isolate selected segment
        if (filterCat !== 'all') {
            data = data.filter(p => p.byComp.some(c => getCategory(c.name) === filterCat))
                .map(p => ({
                    ...p,
                    byComp: p.byComp.filter(c => getCategory(c.name) === filterCat),
                    locales: p.locales.filter(l => getCategory(l.competidor) === filterCat)
                }));
        }

        // Filter by multi-select competitors — Isolate selected brands
        if (filterComp.length > 0) {
            data = data.filter(p => 
                filterComp.some(target => p.byComp.some(c => c.name === target))
            ).map(p => ({
                ...p,
                byComp: p.byComp.filter(c => filterComp.includes(c.name)),
                locales: p.locales.filter(l => filterComp.includes(l.competidor))
            }));
        }

        // Apply Grouping Transformation if active
        // Note: Filtering happens BEFORE grouping, so we are grouping only the remaining items
        if (groupMode !== 'brand') {
            data = data.map(pc => {
                const groupMap = {};
                pc.byComp.forEach(c => {
                    let groupKey;
                    if (groupMode === 'category') {
                        groupKey = getCategory(c.name);
                    } else if (groupMode === 'ownership') {
                        groupKey = c.name.includes('(NGR)') ? 'Nuestras Marcas' : 'Competencia';
                    }

                    if (!groupMap[groupKey]) groupMap[groupKey] = { name: groupKey, value: 0, prom: 0 };
                    groupMap[groupKey].value += c.value;
                    groupMap[groupKey].prom += c.prom;
                });
                return {
                    ...pc,
                    byComp: Object.values(groupMap).sort((a, b) => b.prom - a.prom),
                };
            });
        }

        if (sortMode === 'prom') data.sort((a, b) => b.byComp.reduce((s, c) => s + c.prom, 0) - a.byComp.reduce((s, c) => s + c.prom, 0));
        else if (sortMode === 'transacciones') data.sort((a, b) => b.byComp.reduce((s, c) => s + c.value, 0) - a.byComp.reduce((s, c) => s + c.value, 0));
        else if (sortMode === 'marcas') data.sort((a, b) => b.byComp.length - a.byComp.length);
        else data.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

        return data;
    }, [pcData, filterTipo, filterCadena, filterComp, filterCat, groupMode, sortMode]);

    React.useEffect(() => { setVisibleCount(8); }, [filterTipo, filterCadena, filterComp, filterCat, sortMode, groupMode]);

    const cadenaOptions = useMemo(() => {
        const vals = [...new Set(pcData.map(p => p.grupos_cc).filter(Boolean))].sort();
        return [{ value: 'all', label: 'Todas las cadenas' }, ...vals.map(v => ({ value: v, label: v }))];
    }, [pcData]);

    const kpis = useMemo(() => {
        const totalProm = filteredPCs.reduce((s, p) => s + p.byComp.reduce((ss, c) => ss + c.prom, 0), 0);
        const totalLocales = filteredPCs.reduce((s, p) => s + p.locales.length, 0);
        const allOKProm = allRecords.filter(r => r.status_busqueda === 'OK' || r.status_busqueda === 'HISTORIAL')
            .reduce((s, r) => s + (parseFloat(r.promedio) || 0), 0);
        const sharePct = allOKProm > 0 ? (totalProm / allOKProm) * 100 : 0;
        const pcsConCC = filteredPCs.filter(p => !!p.cc_nombre).length;
        return { totalPCs: filteredPCs.length, totalLocales, totalProm, sharePct, pcsConCC };
    }, [filteredPCs, allRecords]);

    const handleCardClick = (pc) => {
        setSelectedPC(prev => prev?.nombre === pc.nombre ? null : pc);
    };

    // Keep selectedPC in sync with updated data (e.g. when showNGR toggle changes)
    useEffect(() => {
        if (selectedPC) {
            const updated = filteredPCs.find(p => p.nombre === selectedPC.nombre);
            if (updated) setSelectedPC(updated);
        }
    }, [filteredPCs]);

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-700">

                {/* KPIs */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: MapPin, label: 'Puntos Compartidos', value: kpis.totalPCs, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
                        { icon: Building2, label: 'En Centro Comercial', value: kpis.pcsConCC, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
                        { icon: Store, label: 'Locales en PCs', value: kpis.totalLocales, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { icon: TrendingUp, label: 'Share Prom. Diario en PCs', value: `${kpis.sharePct.toFixed(1)}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    ].map((kpi, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }}
                            className="pwa-card no-hover p-5 flex flex-col gap-3">
                            <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-400 dark:text-white/30 font-black uppercase tracking-widest mb-0.5">{kpi.label}</p>
                                <p className={`text-2xl font-black italic ${kpi.color}`}>{kpi.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </section>

                {/* Filters + View Toggle */}
                <section className="flex flex-col gap-4">
                    {/* NGR Toggle — Pill at top */}
                    <div className="flex items-center justify-between px-1">
                        <div />
                        <button
                            onClick={() => setShowNGR(prev => !prev)}
                            title={showNGR ? 'Click para ver solo competencia' : 'Click para incluir locales propios NGR'}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 transition-all duration-200 ${
                                showNGR
                                    ? 'bg-orange-500/20 border-orange-400 text-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.25)]'
                                    : 'bg-slate-100 dark:bg-white/[0.06] border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/50 hover:border-orange-400/50 hover:text-orange-400'
                            }`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full transition-all ${showNGR ? 'bg-orange-400' : 'bg-slate-300 dark:bg-white/20'}`} />
                            {showNGR ? '★ Marcas NGR incluidas' : '⊕ Incluir marcas NGR'}
                        </button>
                    </div>

                    <div className="pwa-card no-hover p-4 flex flex-wrap gap-4 items-end border-slate-200 dark:border-white/5">
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Tipo</span>
                            <CustomSelect selected={filterTipo} onChange={setFilterTipo} width="w-28"
                                options={[{ value: 'all', label: 'Todos' }, { value: 'cc', label: '🏬 CC' }, { value: 'calle', label: '📍 Calle' }]} />
                        </div>
                        
                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Categoría</span>
                            <CustomSelect selected={filterCat} onChange={(val) => { setFilterCat(val); setFilterComp([]); }} width="w-40" options={catOptions} searchable />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Competidores</span>
                            <CustomSelect selected={filterComp} onChange={setFilterComp} width="w-48" options={compOptions} multi searchable label="Seleccionar..." />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Cadena CC</span>
                            <CustomSelect selected={filterCadena} onChange={setFilterCadena} width="w-40" options={cadenaOptions} searchable />
                        </div>

                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Agrupación</span>
                            <div className="flex p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
                                {[
                                    { id: 'brand', label: 'Marca', icon: Target },
                                    { id: 'category', label: 'Categoría', icon: Layers },
                                    { id: 'ownership', label: 'Propio/Comp', icon: ShieldCheck }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setGroupMode(mode.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                            groupMode === mode.id
                                            ? 'bg-white dark:bg-white/10 text-accent-orange shadow-sm border border-slate-200 dark:border-white/10'
                                            : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white'
                                        }`}
                                    >
                                        <mode.icon className={`w-3.5 h-3.5 ${groupMode === mode.id ? 'animate-pulse' : ''}`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{mode.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Ordenar por</span>
                            <CustomSelect selected={sortMode} onChange={setSortMode} width="w-44"
                                options={[
                                    { value: 'prom', label: 'Prom. Diario ↓' },
                                    { value: 'transacciones', label: 'Transacciones ↓' },
                                    { value: 'marcas', label: 'N° Marcas ↓' },
                                    { value: 'nombre', label: 'Nombre A→Z' },
                                ]} />
                        </div>

                        {/* View toggle */}
                        <div className="ml-auto flex items-center gap-3 pb-0.5">
                            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/5">
                                {[
                                    { mode: 'cards', icon: LayoutGrid, label: 'Cards' },
                                    { mode: 'table', icon: Table2, label: 'Tabla' },
                                ].map(({ mode, icon: Icon, label }) => (
                                    <button key={mode} onClick={() => setViewMode(mode)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === mode
                                            ? 'bg-accent-orange text-white shadow-sm'
                                            : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white'}`}>
                                        <Icon className="w-3 h-3" />{label}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase">
                                {filteredPCs.length} puntos · {kpis.totalLocales} locales
                            </span>
                        </div>
                    </div>
                </section>

                {/* Content */}
                {filteredPCs.length === 0 ? (
                    <div className="pwa-card p-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-slate-300 dark:text-white/10" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
                            No se encontraron puntos compartidos para los filtros seleccionados
                        </p>
                    </div>
                ) : viewMode === 'table' ? (
                    /* ── TABLE VIEW ── */
                    <MacroTable pcs={filteredPCs} onSelectPC={handleCardClick} groupMode={groupMode} />
                ) : (
                    /* ── CARDS VIEW ── */
                    <>
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredPCs.slice(0, visibleCount).map((pc, i) => (
                                <motion.div key={pc.nombre} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min((i % 4) * 0.06, 0.3) }}>
                                    <PCCard pc={pc} onClick={handleCardClick} isSelected={selectedPC?.nombre === pc.nombre} />
                                </motion.div>
                            ))}
                        </section>
                        {filteredPCs.length > visibleCount && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 py-4">
                                <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                                <button onClick={() => setVisibleCount(v => v + 4)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-accent-orange/40 transition-all group">
                                    <Layers className="w-3 h-3 text-slate-400 group-hover:text-accent-orange transition-colors" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-accent-orange transition-colors">
                                        Ver 4 más &nbsp;·&nbsp; quedan {filteredPCs.length - visibleCount}
                                    </span>
                                </button>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                            </motion.div>
                        )}

                        {/* Global bar chart — only in cards view */}
                        {filteredPCs.length > 1 && (
                            <section className="pwa-card p-8 space-y-6 border-slate-200 dark:border-white/5">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                                    <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                                        <div className="w-1.5 h-6 bg-accent-orange rounded-full" />
                                        {groupMode === 'brand' ? 'Prom. Diario por Marca' : groupMode === 'category' ? 'Prom. Diario por Categoría' : 'Prom. Diario por Propio/Comp'} — Top 12 Puntos
                                    </h3>
                                    <BarChart3 className="w-4 h-4 text-slate-400 dark:text-white/20" />
                                </div>
                                <div style={{ height: '420px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={filteredPCs.slice(0, 12).map(pc => {
                                                const row = { name: pc.nombre.length > 14 ? pc.nombre.slice(0, 14) + '…' : pc.nombre };
                                                pc.byComp.forEach(c => { row[c.name] = c.prom; });
                                                return row;
                                            })}
                                            margin={{ top: 10, right: 20, left: 10, bottom: 90 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                            <XAxis dataKey="name" angle={-35} textAnchor="end" fontSize={8} interval={0}
                                                tick={{ fill: 'rgba(100,116,139,0.8)', fontWeight: 900, fontStyle: 'italic' }} />
                                            <YAxis fontSize={8} tick={{ fill: 'rgba(100,116,139,0.6)' }}
                                                tickFormatter={v => fmt(v)} />
                                            <ReTooltip
                                                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}
                                                formatter={(val, name) => [`${fmt(val)} trx/día`, name]}
                                            />
                                            <Legend iconSize={7} iconType="circle"
                                                formatter={v => <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>} />
                                            {[...new Set(filteredPCs.flatMap(p => p.byComp.map(c => c.name)))].map(comp => (
                                                <Line key={comp} type="monotone" dataKey={comp}
                                                    stroke={colorFor(comp)} strokeWidth={2.5} dot={{ r: 4, fill: colorFor(comp) }}
                                                    activeDot={{ r: 6 }} connectNulls />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedPC && (
                    <PCDetailPanel
                        key={selectedPC.nombre}
                        pc={selectedPC}
                        evolutionData={pcEvolutionMap[String(selectedPC.nombre).toUpperCase().trim()] || pcEvolutionMap[selectedPC.nombre]}
                        onClose={() => setSelectedPC(null)}
                        allPCs={filteredPCs}
                        currentIndex={filteredPCs.findIndex(p => p.nombre === selectedPC.nombre)}
                        onNavigate={(idx) => setSelectedPC(filteredPCs[idx])}
                        ngrByPC={ngrByPC}
                        showNGR={showNGR}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
