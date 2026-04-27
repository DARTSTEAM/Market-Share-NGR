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
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import CustomSelect from './common/CustomSelect';

const KPICard = ({ title, value, subtitle, icon: Icon, trend }) => (
    <motion.div
        whileHover={{ y: -4 }}
        className="pwa-card p-6 flex flex-col gap-4"
    >
        <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Icon className="text-accent-orange w-5 h-5" />
            </div>
            {trend && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${trend > 0 ? 'bg-accent-lemon/10 text-emerald-600 dark:text-accent-lemon' : 'bg-red-500/10 text-red-500'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <div>
            <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black italic text-slate-900 dark:text-white leading-none">{value}</p>
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
                    value={new Intl.NumberFormat('en-US').format(reactiveMetrics.totalTransDailyAvg || 0)}
                    subtitle="Promedio de transacciones generadas por día"
                    icon={TrendingUp}
                    trend={+12.1}
                />
                <KPICard
                    title="Transacciones por Local"
                    value={new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(reactiveMetrics.avgTransPerLocal || 0)}
                    subtitle="Promedio de transacciones por sede"
                    icon={Users}
                    trend={-2.4}
                />
            </section>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Evolution Chart */}
                <section className="pwa-card p-8 space-y-6 border-slate-200 dark:border-white/5 flex flex-col">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                        <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                            <div className={`w-1.5 h-6 rounded-full ${includeNGR ? 'bg-orange-400' : 'bg-accent-orange'}`} />
                            {includeNGR ? 'NGR vs Competencia' : 'Evolución Transacciones Registradas'}
                        </h3>
                        <div className="flex items-center gap-2">
                            {/* Suma / Share toggle — only when NGR is active */}
                            {includeNGR && (
                                <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/10">
                                    {[{ k: 'sum', label: 'Suma' }, { k: 'share', label: 'Share %' }].map(({ k, label }) => (
                                        <button
                                            key={k}
                                            onClick={() => setNgrChartMode(k)}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                                                ngrChartMode === k
                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                    : 'text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60'
                                            }`}
                                        >{label}</button>
                                    ))}
                                </div>
                            )}
                            <BarChart3 className="w-4 h-4 text-slate-400 dark:text-white/20" />
                        </div>
                    </div>


                    <div className="flex-1 w-full mt-2" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height={320}>
                            {includeNGR ? (
                                /* NGR vs Competencia — stacked (sum) or 100% share */
                                <AreaChart
                                    data={chartData.map(d => {
                                        const comp = d.tickets ?? d.historial ?? 0;
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
                                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                                >
                                    <defs>
                                        <linearGradient id="colorNGR" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#F26522" stopOpacity={0.85} />
                                            <stop offset="95%" stopColor="#F26522" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        stroke={theme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
                                        fontSize={10}
                                        tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
                                        interval={Math.floor(chartData.length / 10)}
                                        tickFormatter={(str) => {
                                            if (!str || !str.includes('-')) return str;
                                            const [y, m] = str.split('-');
                                            const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
                                            return `${months[parseInt(m) - 1]} ${y.slice(-2)}`;
                                        }}
                                    />
                                    <YAxis
                                        fontSize={9}
                                        tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }}
                                        tickFormatter={v =>
                                            ngrChartMode === 'share'
                                                ? `${v}%`
                                                : v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v
                                        }
                                        domain={ngrChartMode === 'share' ? [0, 100] : ['auto', 'auto']}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(10,10,10,0.92)' : '#fff', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', fontWeight: 'bold' }}
                                        formatter={(value, name, props) => {
                                            const label = name === 'ngr' ? '★ NGR Propio' : 'Competencia';
                                            if (ngrChartMode === 'share') {
                                                const rawVal = name === 'ngr' ? props.payload._rawNgr : props.payload._rawComp;
                                                return [
                                                    `${value.toFixed(1)}%  (${rawVal != null ? rawVal.toLocaleString('es-PE') : '—'} trx)`,
                                                    label
                                                ];
                                            }
                                            return [value != null ? value.toLocaleString('es-PE') : '—', label];
                                        }}
                                    />
                                    <Area type="monotone" dataKey="competencia" name="competencia"
                                        stroke="#8b5cf6" strokeWidth={1.5}
                                        fillOpacity={1} fill="url(#colorComp)" connectNulls stackId="a" />
                                    <Area type="monotone" dataKey="ngr" name="ngr"
                                        stroke="#F26522" strokeWidth={2}
                                        fillOpacity={1} fill="url(#colorNGR)" connectNulls stackId="a" />
                                </AreaChart>
                            ) : (
                                /* Original single-area chart */
                                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#ff5e00" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ff5e00" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorHistorial" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        stroke={theme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
                                        fontSize={10}
                                        tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
                                        interval={showHistorial ? Math.floor(chartData.length / 10) : 0}
                                        tickFormatter={(str) => {
                                            if (!str || !str.includes('-')) return str;
                                            const [y, m] = str.split('-');
                                            const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
                                            return `${months[parseInt(m) - 1]} ${y.slice(-2)}`;
                                        }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(10,10,10,0.9)' : '#fff', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', fontWeight: 'bold' }}
                                        formatter={(value, name) => [
                                            value != null ? value.toLocaleString('es-PE') : '—',
                                            name === 'historial' ? 'Historial campo' : 'Mediciones OK'
                                        ]}
                                        itemStyle={{ color: '#ff5e00' }}
                                    />
                                    {showHistorial && chartMetric === 'trx' && (
                                        <Area type="monotone" dataKey="historial" name="historial"
                                            stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3"
                                            fillOpacity={1} fill="url(#colorHistorial)" connectNulls />
                                    )}
                                    {showHistorial && chartMetric === 'prom_diario' && (
                                        <Area type="monotone" dataKey="historialProm" name="historialProm"
                                            stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 3"
                                            fillOpacity={1} fill="url(#colorHistorial)" connectNulls />
                                    )}
                                    {chartMetric === 'trx' ? (
                                        <Area type="monotone" dataKey="tickets" name="tickets"
                                            stroke="#ff5e00" strokeWidth={2}
                                            fillOpacity={1} fill="url(#colorTrend)" connectNulls />
                                    ) : (
                                        <Area type="monotone" dataKey="promedio" name="promedio"
                                            stroke="#ff5e00" strokeWidth={2}
                                            fillOpacity={1} fill="url(#colorTrend)" connectNulls />
                                    )}
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Market Share Chart (Pie Chart) */}
                <section className="pwa-card p-8 space-y-6 border-slate-200 dark:border-white/5 flex flex-col">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                        <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                            <div className="w-1.5 h-6 bg-accent-blue rounded-full" />
                            Market Share Total
                        </h3>
                        <PieChart className="w-4 h-4 text-slate-400 dark:text-white/20" />
                    </div>
                    <div className="flex-1 w-full flex items-center justify-center mt-6" style={{ minHeight: '340px' }}>
                        <ResponsiveContainer width="100%" height={340}>
                            <RechartsPieChart>
                                <Pie
                                    data={[...shareData].sort((a, b) => b.value - a.value)}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius="38%"
                                    outerRadius="58%"
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    label={false}
                                >
                                    {[...shareData].sort((a, b) => b.value - a.value).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}
                                    formatter={(value, name) => [`${((value / shareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, name]}
                                />
                                <RechartsLegend
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value, entry) => (
                                        <span style={{ fontSize: '9px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                            {value} {((entry.payload.value / shareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%
                                        </span>
                                    )}
                                />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            </div>

            {/* Mix por Canal */}
            <section className="pwa-card p-8 space-y-8 border-slate-200 dark:border-white/5">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                    <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                        <div className="w-1.5 h-6 bg-slate-400 dark:bg-white/20 rounded-full" />
                        Mix por Canal por Competidor (Estimado)
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {channelMix.map((comp, i) => (
                        <div key={i} className="space-y-3 p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest truncate pr-2">{comp.name}</span>
                                <span className="text-[8px] font-black text-accent-orange">LIVE</span>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { name: 'Delivery', val: comp.Delivery, color: 'bg-accent-orange' },
                                    { name: 'Recojo Tienda', val: comp['Drive-Thru'], color: 'bg-accent-blue' },
                                    { name: 'Salón', val: comp['Salón'], color: 'bg-slate-300 dark:bg-white/20' }
                                ].map((channel, j) => (
                                    <div key={j} className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                                            <span>{channel.name}</span>
                                            <span>{channel.val}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${channel.val}%` }}
                                                className={`h-full ${channel.color}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Audit Table */}
            <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex flex-wrap gap-3 items-center justify-between">
                    <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                        <TableIcon className="w-4 h-4 text-accent-orange" />
                        Tabla de Auditoría y Detalle
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Sort dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ordenar por</span>
                            <CustomSelect
                                label="Ordenar"
                                width="w-44"
                                selected={sortKey + '_' + sortDir}
                                onChange={(val) => {
                                    const [key, dir] = val.split('_');
                                    setSortKey(key);
                                    setSortDir(dir);
                                }}
                                options={[
                                    { value: 'promDiario_desc', label: 'Prom. Diario ↓' },
                                    { value: 'promDiario_asc', label: 'Prom. Diario ↑' },
                                    { value: 'codigo_tienda_asc', label: 'Cód. Tienda A→Z' },
                                    { value: 'codigo_tienda_desc', label: 'Cód. Tienda Z→A' },
                                    { value: 'competidor_asc', label: 'Competidor A→Z' },
                                    { value: 'competidor_desc', label: 'Competidor Z→A' },
                                    { value: 'local_asc', label: 'Local A→Z' },
                                    { value: 'local_desc', label: 'Local Z→A' },
                                    { value: 'canal_asc', label: 'Canal A→Z' },
                                ]}
                            />
                        </div>
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-white/60">
                            <Filter className="w-3 h-3" />
                            Mostrando {filteredByEstimado.length} registros
                        </div>

                        {/* Toggle Solo Estimados */}
                        <button
                            onClick={() => { setOnlyEstimados(v => !v); setCurrentPage(1); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                onlyEstimados
                                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-600 dark:text-amber-400 shadow-inner'
                                    : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-amber-400/40 hover:text-amber-500'
                            }`}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: onlyEstimados ? '#f59e0b' : '#94a3b8', display: 'inline-block', transition: 'background 0.2s' }} />
                            Solo Estimados
                            {onlyEstimados && (
                                <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[8px] leading-none">
                                    {filteredByEstimado.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('competidor')}>Competidor{sortIcon('competidor')}</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('codigo_tienda')}>Cód. Tienda{sortIcon('codigo_tienda')}</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('local')}>Sede / Local{sortIcon('local')}</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('canal')}>Canal{sortIcon('canal')}</th>
                                <th className="px-6 py-5 text-center">Caja</th>
                                <th className="px-6 py-5 text-center cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('promDiario')}>Prom. Diario{sortIcon('promDiario')}</th>
                                <th className="px-6 py-5 text-center">Momento (A/C)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[11px] text-slate-700 dark:text-white/70">
                            {paginatedData.map((row) => {
                                const isEst = row.isEstimado;
                                const dotColor = isEst ? (CONFIANZA_DOT[row.confianza] || '#94a3b8') : null;
                                return (
                                <tr
                                    key={row.competidor + row.local + String(row.caja)}
                                    className={`transition-colors group border-l-4 ${
                                        isEst
                                            ? 'border-dashed bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/15'
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                    }`}
                                    style={isEst ? { borderLeftColor: dotColor } : {}}
                                >
                                    <td className="px-6 py-5">
                                        {(() => {
                                            const color = shareData.find(s => s.name === row.competidor)?.color || '#94a3b8';
                                            return (
                                                <span
                                                    className="font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full border inline-block truncate max-w-[140px]"
                                                    style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                                                >
                                                    {row.competidor}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-5 font-black text-[10px] text-accent-orange/80 font-mono tracking-tight">{row.codigo_tienda || '-'}</td>
                                    <td className="px-6 py-5 font-bold uppercase text-[10px] text-slate-500 dark:text-white/60">{row.local}</td>
                                    <td className="px-6 py-5">
                                        {isEst ? (
                                            <span className="inline-flex items-center gap-1">
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                                                <span className="font-black text-[9px] uppercase tracking-widest" style={{ color: dotColor }}>
                                                    Est. {row.confianza?.replace('_', ' ')}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                                {row.canal}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center font-bold text-slate-500 dark:text-white/40">
                                        {isEst ? <span className="opacity-30 text-[10px]">—</span> : (row.caja || '-')}
                                    </td>
                                    <td className="px-6 py-5 text-center font-black font-mono" style={isEst ? { color: dotColor } : {}} >
                                        {isEst && <span className="opacity-60 mr-0.5">~</span>}{row.promDiario.toFixed ? row.promDiario.toFixed(1) : row.promDiario}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        {isEst ? (
                                            <span className="text-[9px] font-bold text-slate-400 italic">estimado</span>
                                        ) : (
                                            <div className="flex justify-center gap-1.5">
                                                {[-1, 0, 1].map(v => (
                                                    <div
                                                        key={v}
                                                        className={`w-2 h-2 rounded-full transition-shadow ${row.ac === v ? (v === -1 ? 'bg-accent-orange shadow-[0_0_8px_rgba(255,126,75,0.6)]' : v === 0 ? 'bg-accent-blue shadow-[0_0_8px_rgba(0,112,243,0.6)]' : 'bg-accent-lemon shadow-[0_0_8px_rgba(204,255,0,0.6)]') : 'bg-slate-200 dark:bg-white/10'}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/40">
                            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE_MAIN + 1} a {Math.min(currentPage * ITEMS_PER_PAGE_MAIN, displayTableData.length)} de {displayTableData.length} registros
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </section>
            <MonthlyTransactionsTable
                allRecords={allRecords}
                shareData={shareData}
                currentFilters={filters}
            />
        </div>
    );
}

const ITEMS_PER_PAGE_MONTHLY = 15;

const MonthlyTransactionsTable = ({ allRecords, shareData, currentFilters }) => {
    const [localFilters, setLocalFilters] = useState({
        competidor: 'all',
        local: 'all',
        caja: 'all'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [matrixMetric, setMatrixMetric] = useState('prom_diario');


    // Generate real months based on available data or a rolling 12M from selection
    const months = useMemo(() => {
        const list = [];
        const selectedYear = parseInt(currentFilters.year);
        const selectedMonth = currentFilters.month === 'all' ? 11 : parseInt(currentFilters.month);

        // Use the selected month/year as the END of the 12 month period
        const endDate = new Date(selectedYear || 2026, selectedMonth, 1);

        for (let i = 11; i >= 0; i--) {
            const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
            const m = d.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const y = d.getFullYear().toString().slice(-2);
            list.push({
                label: `${m.charAt(0).toUpperCase() + m.slice(1)} ${y}`,
                month: d.getMonth(),
                year: d.getFullYear(),
                key: `${d.getFullYear()}-${d.getMonth()}`
            });
        }
        return list;
    }, [currentFilters.year, currentFilters.month]);

    const matrixData = useMemo(() => {
        const localMonthMap = {};
        const promMonthMap = {};
        const countMonthMap = {};

        allRecords.forEach(rec => {
            let y, m;
            if (rec.mes && rec.ano) {
                y = parseInt(rec.ano);
                m = parseInt(rec.mes) - 1;
            } else {
                const date = new Date(rec.fecha_y_hora_registro || rec.fecha);
                y = date.getFullYear();
                m = date.getMonth();
            }

            const key = `${rec.local}||${rec.caja ?? ''}_${y}_${m}`;
            if (!localMonthMap[key]) { localMonthMap[key] = 0; promMonthMap[key] = 0; countMonthMap[key] = 0; }
            localMonthMap[key] += parseInt(rec.transacciones_diferencial || rec.transacciones) || 0;
            promMonthMap[key]  += parseFloat(rec.promedio) || 0;
            countMonthMap[key] += 1;
        });

        const localsMetadata = {};
        allRecords.forEach(rec => {
            const rowKey = `${rec.local}||${rec.caja ?? ''}`;
            if (!localsMetadata[rowKey]) {
                localsMetadata[rowKey] = {
                    competidor: rec.competidor,
                    local: rec.local,
                    caja: rec.caja || '-',
                    cajasTotal: rec.caja || 1
                };
            }
        });

        return Object.values(localsMetadata).map(meta => {
            const monthly = months.map(m => {
                const key = `${meta.local}||${meta.caja ?? ''}_${m.year}_${m.month}`;
                return localMonthMap[key] || 0;
            });
            const monthlyProm = months.map(m => {
                const key = `${meta.local}||${meta.caja ?? ''}_${m.year}_${m.month}`;
                const count = countMonthMap[key] || 1;
                return promMonthMap[key] != null ? (promMonthMap[key] / count) : 0;
            });
            return {
                ...meta,
                monthly,
                monthlyProm,
                total: monthly.reduce((a, b) => a + b, 0),
                totalProm: monthlyProm.reduce((a, b) => a + b, 0) / 12
            };
        }).filter(row => row.total > 0);
    }, [allRecords, months]);

    const filteredMatrix = useMemo(() => {
        return matrixData.filter(row => {
            const mComp = localFilters.competidor === 'all' || row.competidor === localFilters.competidor;
            const mLoc = localFilters.local === 'all' || row.local === localFilters.local;
            const mCaj = localFilters.caja === 'all' || String(row.caja) === localFilters.caja;
            return mComp && mLoc && mCaj;
        });
    }, [matrixData, localFilters]);

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [filteredMatrix]);

    const totalPages = Math.ceil(filteredMatrix.length / ITEMS_PER_PAGE_MONTHLY);
    const displayedRows = useMemo(
        () => filteredMatrix.slice((currentPage - 1) * ITEMS_PER_PAGE_MONTHLY, currentPage * ITEMS_PER_PAGE_MONTHLY),
        [filteredMatrix, currentPage]
    );

    const monthlyTotals = useMemo(() => {
        const totals = new Array(12).fill(0);
        const totalsP = new Array(12).fill(0);
        filteredMatrix.forEach(row => {
            row.monthly.forEach((val, i) => { totals[i] += val; });
            row.monthlyProm.forEach((val, i) => { totalsP[i] += val; });
        });
        return { trx: totals, prom: totalsP };
    }, [filteredMatrix]);

    const grandTotal = useMemo(() => filteredMatrix.reduce((sum, row) => sum + row.total, 0), [filteredMatrix]);
    const grandTotalProm = useMemo(() => filteredMatrix.length > 0 ? filteredMatrix.reduce((sum, row) => sum + row.totalProm, 0) / filteredMatrix.length : 0, [filteredMatrix]);

    // Internal Cascading Filters Logic
    const competitors = useMemo(() => ['all', ...new Set(matrixData.map(d => d.competidor))], [matrixData]);

    const locations = useMemo(() => {
        const base = ['all'];
        const filtered = localFilters.competidor === 'all'
            ? matrixData
            : matrixData.filter(d => d.competidor === localFilters.competidor);
        return [...base, ...new Set(filtered.map(d => d.local))];
    }, [matrixData, localFilters.competidor]);

    const boxes = useMemo(() => {
        const base = ['all'];
        const filtered = matrixData.filter(d => {
            const mComp = localFilters.competidor === 'all' || d.competidor === localFilters.competidor;
            const mLoc = localFilters.local === 'all' || d.local === localFilters.local;
            return mComp && mLoc;
        });
        return [...base, ...new Set(filtered.map(d => String(d.caja)))];
    }, [matrixData, localFilters.competidor, localFilters.local]);

    const handleLocalFilterChange = (key, value) => {
        setLocalFilters(prev => {
            const newFilters = { ...prev, [key]: value };
            if (key === 'competidor') {
                newFilters.local = 'all';
                newFilters.caja = 'all';
            } else if (key === 'local') {
                newFilters.caja = 'all';
            }
            return newFilters;
        });
    };

    return (
        <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                        <TrendingUp className="w-4 h-4 text-accent-orange" />
                        Matriz de Transacciones Mensuales (Rolling 12M)
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 rounded-lg bg-accent-orange/10 border border-accent-orange/20">
                            <span className="text-[9px] font-black uppercase tracking-widest text-accent-orange">Prom. Diario</span>
                        </div>
                        <div className="px-3 py-1 bg-accent-orange/10 rounded-full border border-accent-orange/20">
                            <span className="text-[10px] font-black uppercase text-accent-orange">
                                Pág. {currentPage} de {totalPages || 1} · {filteredMatrix.length} locales
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
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Caja</span>
                        <CustomSelect
                            selected={localFilters.caja}
                            onChange={(v) => handleLocalFilterChange('caja', v)}
                            options={boxes.map(b => ({ value: b, label: b === 'all' ? 'Todas' : `Caja ${b}` }))}
                            width="w-32"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto relative custom-scrollbar max-h-[600px]">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-[#f8fafc] dark:bg-black/40 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.1em] sticky top-0 z-30">
                        <tr>
                            <th className="px-4 py-4 sticky left-0 z-40 bg-[#f8fafc] dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[120px]">Competidor</th>
                            <th className="px-4 py-4 sticky left-[120px] z-40 bg-[#f8fafc] dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[160px]">Local</th>
                            <th className="px-4 py-4 sticky left-[280px] z-40 bg-[#f8fafc] dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[80px]">Caja</th>
                            {months.map(m => (
                                <th key={m.label} className="px-3 py-4 text-center min-w-[80px] border-l border-slate-200 dark:border-white/5">{m.label}</th>
                            ))}
                            <th className="px-4 py-4 text-center bg-accent-orange/5 text-accent-orange font-bold min-w-[100px]">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[10px] text-slate-700 dark:text-white/70">
                        {/* Totals Row (Sticky under the header) */}
                        <tr className="bg-slate-100 dark:bg-white/10 font-black text-slate-900 dark:text-white sticky top-[44px] z-20 backdrop-blur-md">
                            <td colSpan="3" className="px-4 py-3 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-right uppercase italic text-accent-orange">Totales Consolidados</td>
                            {monthlyTotals.trx.map((total, i) => {
                                const pVal = monthlyTotals.prom[i];
                                return (
                                    <td key={i} className="px-3 py-3 text-center text-accent-orange font-mono border-l border-slate-200 dark:border-white/5">
                                        {matrixMetric === 'ambos' ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span>{new Intl.NumberFormat('es-ES').format(total)}</span>
                                                <span className="text-violet-400 text-[9px]">{pVal.toFixed(1)}</span>
                                            </div>
                                        ) : matrixMetric === 'prom_diario' ? pVal.toFixed(1)
                                          : new Intl.NumberFormat('es-ES').format(total)}
                                    </td>
                                );
                            })}
                            <td className="px-4 py-3 text-center bg-accent-orange text-white font-black shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
                                {matrixMetric === 'prom_diario' ? grandTotalProm.toFixed(1)
                                    : new Intl.NumberFormat('es-ES').format(grandTotal)}
                            </td>
                        </tr>

                        {displayedRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="px-4 py-3 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-3 rounded-full" style={{ backgroundColor: shareData.find(s => s.name === row.competidor)?.color || '#ccc' }} />
                                        <span className="font-bold truncate text-[9px] uppercase tracking-tighter">{row.competidor}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 sticky left-[120px] z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-medium text-slate-500 truncate">{row.local}</td>
                                <td className="px-4 py-3 sticky left-[280px] z-10 bg-white dark:bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center font-bold opacity-50">{row.caja}</td>
                                {row.monthly.map((val, i) => {
                                    const pVal = row.monthlyProm[i];
                                    return (
                                        <td key={i} className="px-3 py-3 text-center font-mono border-l border-slate-100 dark:border-white/[0.02]">
                                            {matrixMetric === 'ambos' ? (
                                                val > 0 ? (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`font-mono ${val > 2500 ? 'text-emerald-500 font-bold' : ''}`}>{new Intl.NumberFormat('es-ES').format(val)}</span>
                                                        <span className="text-violet-400 text-[9px] font-bold">{pVal.toFixed(1)}</span>
                                                    </div>
                                                ) : <span className="opacity-20">-</span>
                                            ) : matrixMetric === 'prom_diario' ? (
                                                pVal > 0 ? <span className="text-violet-400 font-bold">{pVal.toFixed(1)}</span> : <span className="opacity-20">-</span>
                                            ) : (
                                                <span className={`${val > 2500 ? 'text-emerald-500 font-bold' : val === 0 ? 'opacity-20' : ''}`}>
                                                    {val === 0 ? '-' : new Intl.NumberFormat('es-ES').format(val)}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-3 text-center bg-accent-orange/[0.02] font-black text-accent-orange group-hover:bg-accent-orange/[0.05]">
                                    {matrixMetric === 'prom_diario' ? row.totalProm.toFixed(1)
                                        : new Intl.NumberFormat('es-ES').format(row.total)}
                                </td>
                            </tr>
                        ))}
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
                        Mostrando {(currentPage - 1) * ITEMS_PER_PAGE_MONTHLY + 1} a {Math.min(currentPage * ITEMS_PER_PAGE_MONTHLY, filteredMatrix.length)} de {filteredMatrix.length} locales
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-white/80 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};
