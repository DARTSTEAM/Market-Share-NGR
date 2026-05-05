import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Users,
    DollarSign,
    BarChart3,
    PieChart,
    Table as TableIcon,
    Filter,
    BookOpen,
} from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import CustomSelect from './common/CustomSelect';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, prevValue, prevLabel }) => (
    <motion.div
        whileHover={{ y: -4 }}
        className="pwa-card p-6 flex flex-col gap-4"
    >
        <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Icon className="text-accent-orange w-5 h-5" />
            </div>
            {trend != null && (
                <span className={`text-sm font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm ${
                    trend > 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                        : trend < 0
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 ring-1 ring-slate-200 dark:ring-white/10'
                }`}>
                    <span className="text-base">{trend > 0 ? '▲' : trend < 0 ? '▼' : '—'}</span>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black italic text-slate-900 dark:text-white leading-none">{value}</p>
            {prevValue != null && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 shrink-0">
                        {prevLabel || 'Período anterior'}
                    </span>
                    <span className="text-xs font-black tabular-nums text-slate-600 dark:text-white/60 ml-auto">
                        {prevValue}
                    </span>
                </div>
            )}
            <p className="text-[9px] text-slate-400 dark:text-white/20 font-bold mt-2 uppercase">{subtitle}</p>
        </div>
    </motion.div>
);

const ITEMS_PER_PAGE_MAIN = 20;

// Confidence color for estimated rows
const CONFIANZA_DOT = {
    'ALTA':          '#10b981',
    'MEDIA':         '#eab308',
    'BAJA':          '#ca8a04',
    'MUY_BAJA':      '#f97316',
    'SIN_HISTORIAL': '#ef4444',
};

export default function MarketShareDashboard({ filters, onFilterChange, globalFilterBar, reactiveMetrics, shareData, trendData, filteredTableData, allRecords, includeNGR = false, onToggleNGR }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState('transacciones');
    const [sortDir, setSortDir] = useState('desc');
    const [showHistorial, setShowHistorial] = useState(false);
    const [onlyEstimados, setOnlyEstimados] = useState(false);

    const [chartMetric, setChartMetric] = useState('prom_diario');
    const [ngrChartMode, setNgrChartMode] = useState('sum'); // 'sum' | 'share'
    const [groupMode, setGroupMode] = useState('grupo'); // 'marca' | 'grupo'

    // Compute Grupo data
    const GRUPO_COLORS = {
        'DELOSI': '#005596', // Delosi blue
        'NGR': '#F26522', // NGR orange
        'DMN': '#006491', // Dominos blue
        'LC': '#6D1F7E', // Little Caesars purple
        'DEFAULT': '#94a3b8'
    };

    const { gruposShareData, gruposTrendData, activeGrupos } = useMemo(() => {
        const shareMap = {};
        const trendMap = {};
        const activeSet = new Set();
        
        allRecords.forEach(r => {
            const grupo = (r.grupo_tienda && r.grupo_tienda !== '-') ? r.grupo_tienda : 'Otros';
            const prom = parseFloat(r.promedio) || parseFloat(r.trx_promedio) || 0;
            
            // Share
            if (!shareMap[grupo]) shareMap[grupo] = 0;
            shareMap[grupo] += prom;
            activeSet.add(grupo);
            
            // Trend
            if (r.mes && r.ano) {
                const mk = `${parseInt(r.ano)}-${String(parseInt(r.mes)).padStart(2, '0')}`;
                if (!trendMap[mk]) trendMap[mk] = {};
                if (!trendMap[mk][grupo]) trendMap[mk][grupo] = 0;
                trendMap[mk][grupo] += prom;
            }
        });

        const gShare = Object.entries(shareMap).map(([name, value]) => ({
            name,
            value,
            color: GRUPO_COLORS[name?.toUpperCase()] || GRUPO_COLORS.DEFAULT,
            isNGR: name === 'NGR'
        })).sort((a, b) => b.value - a.value);

        const sortedGrupos = [...activeSet].sort((a, b) => (shareMap[b] || 0) - (shareMap[a] || 0));

        // Sort months for trend
        const allKeys = Object.keys(trendMap).sort();
        const gTrend = allKeys.map(name => {
            const row = { name };
            sortedGrupos.forEach(g => {
                row[g] = trendMap[name][g] || 0;
            });
            return row;
        }).slice(-12);

        return { gruposShareData: gShare, gruposTrendData: gTrend, activeGrupos: sortedGrupos };
    }, [allRecords]);

    const displayShareData = groupMode === 'grupo' ? gruposShareData : shareData;

    // Filter trend data

    const chartData = useMemo(() => {
        if (!trendData) return [];
        if (showHistorial) return trendData;
        return trendData.filter(d => d.tickets != null).slice(-12);
    }, [trendData, showHistorial]);


    const channelOptions = ['Delivery', 'Recojo en tienda', 'Salón'];

    // Use real values from the aggregated data
    const displayTableData = useMemo(() => {
        return filteredTableData.map((item, i) => {
            const hash = item.competidor.charCodeAt(0) + item.local.charCodeAt(0) + i;
            const canal = channelOptions[hash % channelOptions.length];

            // Estimated rows don't have a real channel — skip channel filter for them
            if (!item.isEstimado && filters.channel.length > 0) {
                const canalLow = canal.toLowerCase();
                const isSelected = filters.channel.some(c => {
                    if (c == null || typeof c === 'object') return false;
                    const cLow = String(c).toLowerCase();
                    if (cLow === 'all') return true;
                    return cLow === canalLow || cLow === (canalLow === 'recojo en tienda' ? 'tienda' : canalLow);
                });
                if (!isSelected) return null;
            }

            return {
                ...item,
                canal: item.isEstimado ? null : canal,
                transacciones: item.ventas,
                promDiario: parseFloat(item.promedioDiario) || 0
            };
        }).filter(Boolean);
    }, [filteredTableData, filters.channel]);

    // Reset pagination when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [displayTableData, sortKey, sortDir]);

    const sortedTableData = useMemo(() => {
        return [...displayTableData].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
    }, [displayTableData, sortKey, sortDir]);

    const filteredByEstimado = useMemo(() => {
        if (!onlyEstimados) return sortedTableData;
        return sortedTableData.filter(r => r.isEstimado);
    }, [sortedTableData, onlyEstimados]);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sortIcon = (key) => {
        if (sortKey !== key) return <span className="ml-1 opacity-20">↕</span>;
        return <span className="ml-1 text-accent-orange">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const totalPages = Math.ceil(filteredByEstimado.length / ITEMS_PER_PAGE_MAIN);
    const paginatedData = filteredByEstimado.slice((currentPage - 1) * ITEMS_PER_PAGE_MAIN, currentPage * ITEMS_PER_PAGE_MAIN);

    // Channel mix logic based on shareData
    const channelMix = useMemo(() => {
        return shareData.map((comp, i) => {
            const h = comp.name.charCodeAt(0) + i;
            return {
                name: comp.name,
                Delivery: 30 + (h % 30),
                'Drive-Thru': 15 + (h % 20),
                'Salón': 100 - (30 + (h % 30)) - (15 + (h % 20))
            };
        });
    }, [shareData]);

    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    const BRAND_THEMES = {
        'KFC':           { color: '#e4002b', bg: 'bg-[#e4002b]/10' },
        'MCDONALDS':     { color: '#ffc72c', bg: 'bg-[#ffc72c]/10' },
        'BURGER KING':   { color: '#f58220', bg: 'bg-[#f58220]/10' },
        'BEMBOS':        { color: '#005596', bg: 'bg-[#005596]/10' },
        'POPEYES':       { color: '#ff8200', bg: 'bg-[#ff8200]/10' },
        'LITTLE CAESARS': { color: '#ff6600', bg: 'bg-[#ff6600]/10' },
        'PIZZA HUT':     { color: '#ee3124', bg: 'bg-[#ee3124]/10' },
        'PAPA JOHNS':    { color: '#007a33', bg: 'bg-[#007a33]/10' },
        'CHINAWOK':      { color: '#e20613', bg: 'bg-[#e20613]/10' },
        'DEFAULT':       { color: '#f97316', bg: 'bg-accent-orange/10' }
    };

    const selectedBrands = useMemo(() => {
        if (filters.competitor.length > 0) return filters.competitor;
        // If no competitor filter but category selected, show all in that category
        if (filters.category.length > 0) {
            return Object.keys(BRAND_THEMES).filter(b => {
                const cat = {
                    'KFC': 'Pollo Frito', 'POPEYES': 'Pollo Frito',
                    'MCDONALDS': 'Hamburguesa', 'BEMBOS': 'Hamburguesa', 'BURGER KING': 'Hamburguesa',
                    'DOMINOS': 'Pizza', 'LITTLE CAESARS': 'Pizza', 'PIZZA HUT': 'Pizza', 'PAPA JOHNS': 'Pizza',
                    'CHINAWOK': 'Chifas'
                }[b];
                return filters.category.includes(cat);
            });
        }
        return [];
    }, [filters.competitor, filters.category]);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* Brand Banners Section */}
            <AnimatePresence>
                {selectedBrands.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-wrap gap-3"
                    >
                        {selectedBrands.map(brand => {
                            const theme = BRAND_THEMES[brand.toUpperCase()] || BRAND_THEMES.DEFAULT;
                            return (
                                <div 
                                    key={brand}
                                    className={`px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/5 ${theme.bg} flex items-center gap-3 shadow-sm`}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }} />
                                    <span className="text-[10px] font-black uppercase tracking-tighter italic text-slate-700 dark:text-white/90">
                                        {brand}
                                    </span>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* KPI Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <KPICard
                    title="Promedio de Transacciones Diarias"
                    value={new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(reactiveMetrics.totalTransDailyAvg || 0)}
                    subtitle="Promedio de transacciones generadas por día"
                    icon={TrendingUp}
                    trend={reactiveMetrics.momDailyAvg != null ? parseFloat(reactiveMetrics.momDailyAvg.toFixed(1)) : null}
                    prevValue={reactiveMetrics.prevDailyAvg != null ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(reactiveMetrics.prevDailyAvg) : null}
                    prevLabel="Período anterior"
                />
                <KPICard
                    title="Transacciones por Local"
                    value={new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(reactiveMetrics.avgTransPerLocal || 0)}
                    subtitle="Promedio de transacciones por sede"
                    icon={Users}
                    trend={reactiveMetrics.momPerLocal != null ? parseFloat(reactiveMetrics.momPerLocal.toFixed(1)) : null}
                    prevValue={reactiveMetrics.prevPerLocal != null ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(reactiveMetrics.prevPerLocal) : null}
                    prevLabel="Período anterior"
                />
            </section>

            {/* ── NGR vs Competencia full-width view ── */}
            {includeNGR && (
                <section className="pwa-card border-slate-200 dark:border-white/5 overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                            <div className="w-1.5 h-6 rounded-full bg-orange-400" />
                            Análisis de Mercado
                            <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 normal-case tracking-normal italic ml-1">trx diarias promedio</span>
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Agrupar por:</span>
                                <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10">
                                    {[{ k: 'marca', label: 'Marca' }, { k: 'grupo', label: 'Grupo' }].map(({ k, label }) => (
                                        <button
                                            key={k}
                                            onClick={() => setGroupMode(k)}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                                                groupMode === k
                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                    : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                            }`}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Evolutive mode toggle */}
                                <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10">
                                    {[{ k: 'sum', label: 'Abs' }, { k: 'share', label: 'Share %' }].map(({ k, label }) => (
                                        <button
                                            key={k}
                                            onClick={() => setNgrChartMode(k)}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                                                ngrChartMode === k
                                                    ? 'bg-blue-500 text-white shadow-sm'
                                                    : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                            }`}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Two-column: evolutive left, pie right */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/5">
                        {/* Evolutive chart — 3/5 */}
                        <div className="lg:col-span-3 p-6" style={{ minHeight: '340px' }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart
                                    data={groupMode === 'grupo' ? gruposTrendData.map(d => {
                                        const total = activeGrupos.reduce((acc, g) => acc + (d[g] || 0), 0);
                                        if (ngrChartMode === 'share') {
                                            const shareRow = { ...d, _total: total };
                                            activeGrupos.forEach(g => {
                                                shareRow[g] = total > 0 ? Math.round((d[g] || 0) / total * 1000) / 10 : 0;
                                                shareRow[`_raw_${g}`] = d[g] || 0;
                                            });
                                            return shareRow;
                                        }
                                        return d;
                                    }) : chartData.map(d => {
                                        // Both series use daily avg: d.promedio for comp, d.ngrTrx for NGR
                                        const comp = d.promedio ?? d.historialProm ?? 0;
                                        const ngr  = d.ngrTrx ?? 0;
                                        const total = comp + ngr;
                                        if (ngrChartMode === 'share') {
                                            return {
                                                ...d,
                                                competencia: total > 0 ? Math.round(comp / total * 1000) / 10 : 0,
                                                ngr:         total > 0 ? Math.round(ngr  / total * 1000) / 10 : 0,
                                                _rawComp: comp, _rawNgr: ngr, _total: total,
                                            };
                                        }
                                        return { ...d, competencia: comp, ngr };
                                    })}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                                >
                                    <XAxis
                                        dataKey="name"
                                        stroke={theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}
                                        fontSize={9}
                                        tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}
                                        interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                                        tickFormatter={(str) => {
                                            if (!str || !str.includes('-')) return str;
                                            const [y, m] = str.split('-');
                                            const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
                                            return `${months[parseInt(m) - 1]} ${y.slice(-2)}`;
                                        }}
                                    />
                                    <YAxis
                                        fontSize={9}
                                        tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}
                                        tickFormatter={v =>
                                            ngrChartMode === 'share'
                                                ? `${v}%`
                                                : Math.round(v).toLocaleString('es-AR')
                                        }
                                        domain={ngrChartMode === 'share' ? [0, 100] : ['auto', 'auto']}
                                        width={38}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(10,10,10,0.92)' : '#fff', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px' }}
                                        itemSorter={(item) => -item.value}
                                        formatter={(value, name, props) => {
                                            if (groupMode === 'grupo') {
                                                const rawVal = ngrChartMode === 'share' ? props.payload[`_raw_${name}`] : value;
                                                if (ngrChartMode === 'share') return [`${value.toFixed(1)}%  (${rawVal != null ? Math.round(rawVal).toLocaleString('es-AR') : '—'} trx/día)`, name];
                                                return [value != null ? `${Math.round(value).toLocaleString('es-AR')} trx/día` : '—', name];
                                            }
                                            const label = name === 'ngr' ? 'NGR' : 'Competencia';
                                            if (ngrChartMode === 'share') {
                                                const rawVal = name === 'ngr' ? props.payload._rawNgr : props.payload._rawComp;
                                                return [
                                                    `${value.toFixed(1)}%  (${rawVal != null ? Math.round(rawVal).toLocaleString('es-AR') : '—'} trx/día)`,
                                                    label
                                                ];
                                            }
                                            return [value != null ? `${Math.round(value).toLocaleString('es-AR')} trx/día` : '—', label];
                                        }}
                                    />
                                    
                                    {groupMode === 'grupo' ? (
                                        activeGrupos.map((g, i) => (
                                            <Area key={g} type="monotone" dataKey={g} name={g}
                                                stroke={GRUPO_COLORS[g?.toUpperCase()] || GRUPO_COLORS.DEFAULT} strokeWidth={2}
                                                fill={GRUPO_COLORS[g?.toUpperCase()] || GRUPO_COLORS.DEFAULT} fillOpacity={0.2} connectNulls stackId={ngrChartMode === 'share' ? "a" : undefined} />
                                        ))
                                    ) : (
                                        <>
                                            <Area type="monotone" dataKey="competencia" name="competencia"
                                                stroke="#8b5cf6" strokeWidth={1.5}
                                                fill="#8b5cf6" fillOpacity={0.2} connectNulls stackId="a" />
                                            <Area type="monotone" dataKey="ngr" name="ngr"
                                                stroke="#F26522" strokeWidth={2.5}
                                                fill="#F26522" fillOpacity={0.4} connectNulls stackId="a" />
                                        </>
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Pie + brand table — 2/5 */}
                        <div className="lg:col-span-2 p-6 flex flex-col gap-4">
                            {/* Donut */}
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={[...displayShareData].sort((a, b) => b.value - a.value)}
                                            cx="50%" cy="50%"
                                            innerRadius="42%" outerRadius="65%"
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                            label={false}
                                        >
                                            {[...displayShareData].sort((a, b) => b.value - a.value).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(10,10,10,0.92)' : '#fff', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px' }}
                                            formatter={(value, name) => {
                                                const total = displayShareData.reduce((a, b) => a + b.value, 0);
                                                return [`${((value / total) * 100).toFixed(1)}%  (${Math.round(value).toLocaleString('es-AR')} trx/día)`, name];
                                            }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Brand breakdown table */}
                            <div className="flex-1 overflow-y-auto space-y-1.5">
                                {(() => {
                                    const total = displayShareData.reduce((a, b) => a + b.value, 0);
                                    return [...displayShareData]
                                        .sort((a, b) => b.value - a.value)
                                        .map((brand, i) => {
                                            const sharePct = total > 0 ? (brand.value / total * 100) : 0;
                                            const isNGR = groupMode === 'marca' 
                                                ? ['POPEYES','BEMBOS','PAPA JOHNS','CHINAWOK'].includes(brand.name?.toUpperCase())
                                                : brand.isNGR;
                                            return (
                                                <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: brand.color }} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest flex-1 truncate text-slate-700 dark:text-white/70">
                                                        {brand.name}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 tabular-nums">
                                                        {Math.round(brand.value).toLocaleString('es-AR')}
                                                    </span>
                                                    <span className="text-[9px] font-black tabular-nums min-w-[38px] text-right" style={{ color: brand.color }}>
                                                        {sharePct.toFixed(1)}%
                                                    </span>
                                                </div>
                                            );
                                        });
                                })()}
                                {displayShareData.length === 0 && (
                                    <p className="text-[10px] text-slate-400 dark:text-white/20 text-center py-8">Sin datos para el período</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <StoreEvolutionChart
                allRecords={allRecords}
                shareData={shareData}
                currentFilters={filters}
            />

            <MonthlyTransactionsTable
                allRecords={allRecords}
                shareData={shareData}
                currentFilters={filters}
            />
        </div>
    );
}

/* ─── Store Evolution Chart ───────────────────────────────────────────────── */
const StoreEvolutionChart = ({ allRecords, shareData, currentFilters }) => {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const [selectedMonth, setSelectedMonth] = useState(null); // index into months array

    // Same 12M months logic (arrays-aware)
    const months = useMemo(() => {
        const now = new Date();
        const yearArr  = Array.isArray(currentFilters.year)  ? currentFilters.year  : [];
        const monthArr = Array.isArray(currentFilters.month) ? currentFilters.month : [];
        const anchorYear  = yearArr.length  > 0 ? Math.max(...yearArr.map(Number))  : now.getFullYear();
        
        let anchorMonth;
        if (monthArr.length > 0) {
            anchorMonth = Math.max(...monthArr.map(Number));
        } else {
            anchorMonth = anchorYear < now.getFullYear() ? 11 : now.getMonth();
        }

        const list = [];
        const endDate = new Date(anchorYear, anchorMonth, 1);
        for (let i = 11; i >= 0; i--) {
            const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
            const mLabel = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const yLabel = d.getFullYear().toString().slice(-2);
            list.push({
                label: `${mLabel.charAt(0).toUpperCase() + mLabel.slice(1)} ${yLabel}`,
                month: d.getMonth(),
                year:  d.getFullYear(),
            });
        }
        return list;
    }, [currentFilters.year, currentFilters.month]);

    // Build: for each month → Set of active store keys
    const monthStores = useMemo(() => {
        // Map: `${year}__${month}` -> Set<storeKey>
        const map = {};
        allRecords.forEach(rec => {
            let y, m;
            if (rec.mes != null && rec.ano != null) {
                y = parseInt(rec.ano); m = parseInt(rec.mes) - 1;
            } else if (rec.fecha_y_hora_registro || rec.fecha) {
                const d = new Date(rec.fecha_y_hora_registro || rec.fecha);
                if (!isNaN(d)) { y = d.getFullYear(); m = d.getMonth(); }
            }
            if (y == null || isNaN(y) || m == null || isNaN(m)) return;
            if (!rec.local) return;

            const mk = `${y}__${m}`;
            if (!map[mk]) map[mk] = new Set();
            // Store key = codigo_tienda if available, else local name (for matching across months)
            const sk = rec.codigo_tienda || rec.local;
            map[mk].add(JSON.stringify({ key: sk, local: rec.local, codigo: rec.codigo_tienda || '', competidor: rec.competidor }));
        });
        return map;
    }, [allRecords]);

    // Build chart data and deltas
    const { chartData, deltas } = useMemo(() => {
        const cData = [];
        const dels  = {}; // index -> { added: [], removed: [] }

        months.forEach((mo, idx) => {
            const mk = `${mo.year}__${mo.month}`;
            const stores = monthStores[mk] || new Set();
            const parsed = [...stores].map(s => JSON.parse(s));
            const count  = parsed.length;

            cData.push({
                name:  mo.label,
                count,
                stores: parsed,
            });

            if (idx > 0) {
                const prevParsed = [...(monthStores[`${months[idx-1].year}__${months[idx-1].month}`] || new Set())].map(s => JSON.parse(s));
                const prevKeys   = new Set(prevParsed.map(s => s.key));
                const currKeys   = new Set(parsed.map(s => s.key));

                const added   = parsed.filter(s => !prevKeys.has(s.key));
                const removed = prevParsed.filter(s => !currKeys.has(s.key));

                if (added.length > 0 || removed.length > 0) {
                    dels[idx] = { added, removed };
                }
            }
        });
        return { chartData: cData, deltas: dels };
    }, [months, monthStores]);

    const hasChanges = Object.keys(deltas).length > 0;
    const focusIdx   = selectedMonth ?? (chartData.length - 1);
    const focusDelta = deltas[focusIdx];

    // Custom dot to highlight months with changes
    const CustomDot = (props) => {
        const { cx, cy, index } = props;
        const hasDelta = !!deltas[index];
        if (!hasDelta) return <circle cx={cx} cy={cy} r={3} fill="#f97316" strokeWidth={0} />;
        return (
            <g>
                <circle cx={cx} cy={cy} r={7} fill="rgba(239,68,68,0.15)" />
                <circle cx={cx} cy={cy} r={4} fill="#ef4444" />
            </g>
        );
    };

    return (
        <section className="pwa-card border-slate-200 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                    <div className="w-1.5 h-6 rounded-full bg-blue-400" />
                    Evolutivo de Tiendas Activas
                    <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 normal-case tracking-normal italic ml-1">rolling 12M · click mes para ver detalle</span>
                </h3>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Cambios detectados</span>
                        </div>
                    )}
                    <div className="px-3 py-1 rounded-full bg-accent-orange/10 border border-accent-orange/20">
                        <span className="text-[10px] font-black uppercase text-accent-orange">
                            {chartData[chartData.length - 1]?.count ?? 0} tiendas activas
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart */}
                <div className="lg:col-span-2" style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                            onClick={(e) => {
                                if (e?.activeTooltipIndex != null) setSelectedMonth(e.activeTooltipIndex);
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} />
                            <XAxis
                                dataKey="name"
                                fontSize={9}
                                tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                fontSize={9}
                                tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(10,10,10,0.92)' : '#fff', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', fontWeight: 'bold' }}
                                formatter={(value, name, props) => {
                                    const idx = props?.payload && chartData.findIndex(d => d.name === props.payload.name);
                                    const delta = idx != null && idx > 0 ? deltas[idx] : null;
                                    const lines = [`${value} tiendas`];
                                    if (delta?.added?.length)   lines.push(`+${delta.added.length} nuevas`);
                                    if (delta?.removed?.length) lines.push(`-${delta.removed.length} salieron`);
                                    return [lines.join('  ·  '), 'Tiendas activas'];
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#f97316"
                                strokeWidth={2.5}
                                dot={<CustomDot />}
                                activeDot={{ r: 6, fill: '#f97316' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Delta Panel */}
                <div className="flex flex-col gap-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                        {selectedMonth != null ? `Cambios en ${chartData[selectedMonth]?.name ?? ''}` : 'Último mes con cambios'}
                    </div>

                    {focusDelta ? (
                        <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                            {focusDelta.added.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Incorporadas ({focusDelta.added.length})</span>
                                    </div>
                                    {focusDelta.added.map((s, i) => {
                                        const color = shareData.find(sd => sd.name === s.competidor)?.color || '#94a3b8';
                                        return (
                                            <div key={i} className="flex items-center gap-2 pl-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                <div className="flex flex-col min-w-0">
                                                    {s.codigo && <span className="text-[8px] font-black font-mono text-accent-orange/70">{s.codigo}</span>}
                                                    <span className="text-[9px] font-bold text-slate-700 dark:text-white/70 uppercase truncate">{s.local}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {focusDelta.removed.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500">No se registraron ({focusDelta.removed.length})</span>
                                    </div>
                                    {focusDelta.removed.map((s, i) => {
                                        const color = shareData.find(sd => sd.name === s.competidor)?.color || '#94a3b8';
                                        return (
                                            <div key={i} className="flex items-center gap-2 pl-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
                                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                <div className="flex flex-col min-w-0">
                                                    {s.codigo && <span className="text-[8px] font-black font-mono text-accent-orange/70">{s.codigo}</span>}
                                                    <span className="text-[9px] font-bold text-slate-700 dark:text-white/70 uppercase truncate">{s.local}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-slate-300 dark:text-white/20" />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">
                                {selectedMonth != null ? 'Sin cambios en este mes' : 'Sin cambios en el período'}
                            </p>
                            {selectedMonth != null && (
                                <button onClick={() => setSelectedMonth(null)} className="text-[9px] font-black text-accent-orange/60 hover:text-accent-orange underline transition-colors">
                                    Ver último cambio
                                </button>
                            )}
                        </div>
                    )}

                    {/* Month navigator pills */}
                    {hasChanges && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-white/5">
                            {Object.keys(deltas).map(Number).map(idx => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedMonth(idx)}
                                    className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                                        focusIdx === idx
                                            ? 'bg-accent-orange text-white'
                                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-orange-50 hover:text-accent-orange'
                                    }`}
                                >
                                    {chartData[idx]?.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

const ITEMS_PER_PAGE_MONTHLY = 15;

const MonthlyTransactionsTable = ({ allRecords, shareData, currentFilters }) => {
    const [localFilters, setLocalFilters] = useState({
        competidor: 'all',
        local: 'all',
    });
    const [currentPage, setCurrentPage] = useState(1);

    // Generate rolling 12M months.
    // currentFilters.year/.month are string arrays, e.g. ['2025'] / ['0','3'] (0=Jan)
    const months = useMemo(() => {
        const now = new Date();
        const yearArr  = Array.isArray(currentFilters.year)  ? currentFilters.year  : [];
        const monthArr = Array.isArray(currentFilters.month) ? currentFilters.month : [];
        const anchorYear  = yearArr.length  > 0 ? Math.max(...yearArr.map(Number))  : now.getFullYear();
        
        let anchorMonth;
        if (monthArr.length > 0) {
            anchorMonth = Math.max(...monthArr.map(Number));
        } else {
            anchorMonth = anchorYear < now.getFullYear() ? 11 : now.getMonth();
        }

        const list = [];
        const endDate = new Date(anchorYear, anchorMonth, 1);
        for (let i = 11; i >= 0; i--) {
            const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
            const mLabel = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const yLabel = d.getFullYear().toString().slice(-2);
            list.push({
                label: `${mLabel.charAt(0).toUpperCase() + mLabel.slice(1)} ${yLabel}`,
                month: d.getMonth(),
                year:  d.getFullYear(),
            });
        }
        return list;
    }, [currentFilters.year, currentFilters.month]);

    // Aggregate by TIENDA (local). Includes real + estimado records.
    const matrixData = useMemo(() => {
        const storeMonthMap = {}; // `${local}__${year}__${month0}` -> { prom, count }
        const storeMetaMap = {}; // `${local}` -> { competidor, local }

        allRecords.forEach(rec => {
            let y, m;
            if (rec.mes != null && rec.ano != null) {
                y = parseInt(rec.ano);
                m = parseInt(rec.mes) - 1; // mes is 1-indexed in Firestore
            } else if (rec.fecha_y_hora_registro || rec.fecha) {
                const date = new Date(rec.fecha_y_hora_registro || rec.fecha);
                if (!isNaN(date)) { y = date.getFullYear(); m = date.getMonth(); }
            }
            if (y == null || isNaN(y) || m == null || isNaN(m)) return;

            const storeKey = rec.local;
            if (!storeKey) return;

            const monthKey = `${storeKey}__${y}__${m}`;
            // promedio for competitor records, trx_promedio for NGR records
            const dailyAvg = parseFloat(rec.promedio) || parseFloat(rec.trx_promedio) || 0;

            if (!storeMonthMap[monthKey]) storeMonthMap[monthKey] = { prom: 0, count: 0 };
            storeMonthMap[monthKey].prom  += dailyAvg;
            storeMonthMap[monthKey].count += 1;

            if (!storeMetaMap[storeKey]) {
                storeMetaMap[storeKey] = {
                    competidor:    rec.competidor,
                    local:         rec.local,
                    codigo_tienda: rec.codigo_tienda || rec.store_num || '',
                };
            }
        });

        return Object.values(storeMetaMap).map(meta => {
            const monthlyProm = months.map(mo => {
                const mk = `${meta.local}__${mo.year}__${mo.month}`;
                const entry = storeMonthMap[mk];
                if (!entry || entry.count === 0) return 0;
                return entry.prom / entry.count;
            });

            const lastM = monthlyProm[monthlyProm.length - 1];
            const prevM = monthlyProm[monthlyProm.length - 2];
            const mom = (prevM > 0) ? ((lastM - prevM) / prevM) * 100 : null;

            return {
                ...meta,
                monthlyProm,
                totalProm: monthlyProm.reduce((a, b) => a + b, 0) / 12,
                mom,
            };
        }).filter(row => row.monthlyProm.some(v => v > 0));
    }, [allRecords, months]);

    // Flag top decliners (bottom 20% by MoM)
    const declinerThreshold = useMemo(() => {
        const moms = matrixData.map(r => r.mom).filter(v => v != null && v < 0).sort((a, b) => a - b);
        if (moms.length === 0) return null;
        return moms[Math.floor(moms.length * 0.2)] ?? moms[moms.length - 1];
    }, [matrixData]);

    const filteredMatrix = useMemo(() => {
        return matrixData.filter(row => {
            const mComp = localFilters.competidor === 'all' || row.competidor === localFilters.competidor;
            const mLoc  = localFilters.local === 'all' || row.local === localFilters.local;
            return mComp && mLoc;
        }).sort((a, b) => (b.totalProm - a.totalProm));
    }, [matrixData, localFilters]);

    useEffect(() => { setCurrentPage(1); }, [filteredMatrix]);

    const totalPages = Math.ceil(filteredMatrix.length / ITEMS_PER_PAGE_MONTHLY);
    const displayedRows = useMemo(
        () => filteredMatrix.slice((currentPage - 1) * ITEMS_PER_PAGE_MONTHLY, currentPage * ITEMS_PER_PAGE_MONTHLY),
        [filteredMatrix, currentPage]
    );

    const monthlyTotals = useMemo(() => {
        const totalsP = new Array(12).fill(0);
        filteredMatrix.forEach(row => {
            row.monthlyProm.forEach((val, i) => { totalsP[i] += val; });
        });
        return totalsP;
    }, [filteredMatrix]);

    const grandTotalProm = useMemo(() =>
        filteredMatrix.length > 0 ? filteredMatrix.reduce((s, r) => s + r.totalProm, 0) : 0,
        [filteredMatrix]
    );

    const competitors = useMemo(() => ['all', ...new Set(matrixData.map(d => d.competidor))], [matrixData]);
    const locations   = useMemo(() => {
        const base = ['all'];
        const pool = localFilters.competidor === 'all' ? matrixData : matrixData.filter(d => d.competidor === localFilters.competidor);
        return [...base, ...new Set(pool.map(d => d.local))];
    }, [matrixData, localFilters.competidor]);

    const handleLocalFilterChange = (key, value) => {
        setLocalFilters(prev => {
            const nf = { ...prev, [key]: value };
            if (key === 'competidor') nf.local = 'all';
            return nf;
        });
    };

    return (
        <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                        <TrendingUp className="w-4 h-4 text-accent-orange" />
                        Matriz de Transacciones Mensuales (Rolling 12M)
                        <span className="text-[9px] font-bold text-slate-400 dark:text-white/30 normal-case tracking-normal italic ml-1">prom. diario por tienda · real + estimado</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Mayor decrecimiento MoM</span>
                        </div>
                        <div className="px-3 py-1 bg-accent-orange/10 rounded-full border border-accent-orange/20">
                            <span className="text-[10px] font-black uppercase text-accent-orange">
                                Pág. {currentPage} de {totalPages || 1} · {filteredMatrix.length} tiendas
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Competidor</span>
                        <CustomSelect
                            selected={localFilters.competidor}
                            onChange={(v) => handleLocalFilterChange('competidor', v)}
                            options={competitors.map(c => ({ value: c, label: c === 'all' ? 'Todos' : c }))}
                            width="w-40"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Local</span>
                        <CustomSelect
                            selected={localFilters.local}
                            onChange={(v) => handleLocalFilterChange('local', v)}
                            options={locations.map(l => ({ value: l, label: l === 'all' ? 'Todos' : l }))}
                            width="w-40"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto relative custom-scrollbar max-h-[600px]">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                    <thead className="bg-[#f8fafc] dark:bg-black/40 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.1em] sticky top-0 z-30">
                        <tr>
                            <th className="px-4 py-4 sticky left-0 z-40 bg-[#f8fafc] dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">Competidor</th>
                            <th className="px-4 py-4 sticky left-[120px] z-40 bg-[#f8fafc] dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[180px]">Tienda</th>
                            {months.map(m => (
                                <th key={m.label} className="px-3 py-4 text-center min-w-[80px] border-l border-slate-200 dark:border-white/5">{m.label}</th>
                            ))}
                            <th className="px-3 py-4 text-center min-w-[80px] border-l border-slate-200 dark:border-white/5 text-slate-400">Var%</th>
                            <th className="px-4 py-4 text-center bg-accent-orange/5 text-accent-orange font-bold min-w-[90px]">Prom 12M</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[10px] text-slate-700 dark:text-white/70">
                        {/* Totals Row */}
                        <tr className="bg-slate-100 dark:bg-white/10 font-black text-slate-900 dark:text-white sticky top-[44px] z-20 backdrop-blur-md">
                            <td colSpan="2" className="px-4 py-3 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-right uppercase italic text-accent-orange">Totales Consolidados</td>
                            {monthlyTotals.map((total, i) => (
                                <td key={i} className="px-3 py-3 text-center text-accent-orange font-mono border-l border-slate-200 dark:border-white/5">
                                    {total > 0 ? Math.round(total).toLocaleString('es-AR') : <span className="opacity-30">-</span>}
                                </td>
                            ))}
                            <td className="px-3 py-3 text-center border-l border-slate-200 dark:border-white/5 text-slate-400">—</td>
                            <td className="px-4 py-3 text-center bg-accent-orange text-white font-black shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
                                {Math.round(grandTotalProm).toLocaleString('es-AR')}
                            </td>
                        </tr>

                        {displayedRows.map((row, idx) => {
                            const isDecliner = declinerThreshold != null && row.mom != null && row.mom <= declinerThreshold;
                            const brandColor = shareData.find(s => s.name === row.competidor)?.color || '#ccc';
                            return (
                                <tr key={idx} className={`transition-colors group ${
                                    isDecliner
                                        ? 'bg-red-50/60 dark:bg-red-900/10 border-l-4 border-red-400'
                                        : 'border-l-4 border-transparent hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                                }`}>
                                    <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)]" style={isDecliner ? { backgroundColor: 'rgb(254 242 242 / 0.9)' } : {}}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: brandColor }} />
                                            <span className="font-bold truncate text-[9px] uppercase tracking-tighter">{row.competidor}</span>
                                        </div>
                                    </td>
                                     <td className="px-4 py-3 sticky left-[120px] z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] truncate" style={isDecliner ? { backgroundColor: 'rgb(254 242 242 / 0.9)' } : {}}>
                                        <div className="flex flex-col gap-0.5">
                                            {row.codigo_tienda && (
                                                <span className="text-[8px] font-black font-mono text-accent-orange/80 tracking-tight">{row.codigo_tienda}</span>
                                            )}
                                            <span className="text-[10px] font-medium text-slate-600 dark:text-white/60 uppercase truncate">{row.local}</span>
                                        </div>
                                    </td>
                                    {row.monthlyProm.map((val, i) => (
                                        <td key={i} className="px-3 py-3 text-center font-mono border-l border-slate-100 dark:border-white/[0.02]">
                                            {val > 0
                                                ? <span className={val > 200 ? 'text-emerald-500 font-bold' : ''}>{Math.round(val).toLocaleString('es-AR')}</span>
                                                : <span className="opacity-20">-</span>
                                            }
                                        </td>
                                    ))}
                                    <td className="px-3 py-3 text-center border-l border-slate-100 dark:border-white/[0.02]">
                                        {row.mom != null ? (
                                            <span className={`text-[9px] font-black ${
                                                row.mom >= 0 ? 'text-emerald-500' : isDecliner ? 'text-red-500' : 'text-slate-400'
                                            }`}>
                                                {row.mom >= 0 ? '+' : ''}{row.mom.toFixed(1)}%
                                            </span>
                                        ) : <span className="opacity-20">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center bg-accent-orange/[0.02] font-black text-accent-orange group-hover:bg-accent-orange/[0.05]">
                                        {Math.round(row.totalProm).toLocaleString('es-AR')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredMatrix.length === 0 ? (
                <div className="p-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <TrendingUp className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">No se encontraron datos para los filtros seleccionados</p>
                </div>
            ) : totalPages > 1 && (
                <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
                    <span className="text-xs font-bold text-slate-500 dark:text-white/40">
                        Mostrando {(currentPage - 1) * ITEMS_PER_PAGE_MONTHLY + 1} a {Math.min(currentPage * ITEMS_PER_PAGE_MONTHLY, filteredMatrix.length)} de {filteredMatrix.length} tiendas
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >Anterior</button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >Siguiente</button>
                    </div>
                </div>
            )}
        </section>
    );
};
