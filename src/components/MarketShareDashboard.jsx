import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Users,
    DollarSign,
    BarChart3,
    PieChart,
    Table as TableIcon,
    Filter,
} from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, XAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
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

export default function MarketShareDashboard({ filters, reactiveMetrics, reactiveShareData, reactiveTrendData, filteredTableData }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState('transacciones');
    const [sortDir, setSortDir] = useState('desc');
    const itemsPerPage = 20;

    const channelOptions = ['Delivery', 'Recojo en tienda', 'Salón'];

    // Generate deterministic channel and AC values for table display so it doesn't flicker on every render
    const displayTableData = useMemo(() => {
        return filteredTableData.map((item, i) => {
            const hash = item.competidor.charCodeAt(0) + item.local.charCodeAt(0) + i;
            const canal = channelOptions[hash % channelOptions.length];
            // Filter out by channel filter if selected
            if (filters.channel !== 'all' && canal.toLowerCase() !== filters.channel.toLowerCase() && filters.channel.toLowerCase() !== (canal === 'Recojo en tienda' ? 'tienda' : canal.toLowerCase())) {
                return null;
            }

            return {
                ...item,
                canal,
                transacciones: Math.round(item.ventas * 1.5),
                promDiario: Math.round(item.ventas / 30),
                ac: (hash % 3) - 1
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

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sortIcon = (key) => {
        if (sortKey !== key) return <span className="ml-1 opacity-20">↕</span>;
        return <span className="ml-1 text-accent-orange">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const totalPages = Math.ceil(sortedTableData.length / itemsPerPage);
    const paginatedData = sortedTableData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Channel mix logic based on reactiveShareData
    const channelMix = useMemo(() => {
        return reactiveShareData.map((comp, i) => {
            const h = comp.name.charCodeAt(0) + i;
            return {
                name: comp.name,
                Delivery: 30 + (h % 30),
                'Drive-Thru': 15 + (h % 20),
                'Salón': 100 - (30 + (h % 30)) - (15 + (h % 20))
            };
        });
    }, [reactiveShareData]);

    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* KPI Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Transacciones Totales"
                    value={new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(reactiveMetrics.totalVentas || 0)}
                    subtitle="Transacciones registradas en el periodo"
                    icon={DollarSign}
                    trend={+8.5}
                />
                <KPICard
                    title="Tickets Totales"
                    value={new Intl.NumberFormat('en-US').format(reactiveMetrics.totalTickets || 0)}
                    subtitle="Cantidad de tickets totales integrados"
                    icon={TrendingUp}
                    trend={+12.1}
                />
                <KPICard
                    title="Cajas Activas"
                    value={reactiveMetrics.cajasAnalizadas || 0}
                    subtitle="Cajas registrando ventas"
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
                            <div className="w-1.5 h-6 bg-accent-orange rounded-full" />
                            Evolución Transacciones Registradas
                        </h3>
                        <BarChart3 className="w-4 h-4 text-slate-400 dark:text-white/20" />
                    </div>
                    <div className="flex-1 w-full -ml-4 mt-6" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart data={reactiveTrendData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff5e00" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ff5e00" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke={theme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} fontSize={10} tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#ff5e00' }}
                                />
                                <Area type="monotone" dataKey="tickets" name="Transacciones" stroke="#ff5e00" fillOpacity={1} fill="url(#colorTrend)" />
                            </AreaChart>
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
                                    data={reactiveShareData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius="38%"
                                    outerRadius="58%"
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    label={false}
                                >
                                    {reactiveShareData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}
                                    formatter={(value, name) => [`${((value / reactiveShareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, name]}
                                />
                                <RechartsLegend
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value, entry) => (
                                        <span style={{ fontSize: '9px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                                            {value} {((entry.payload.value / reactiveShareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%
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
                                    { value: 'transacciones_desc', label: 'Transacciones ↓' },
                                    { value: 'transacciones_asc', label: 'Transacciones ↑' },
                                    { value: 'promDiario_desc', label: 'Prom. Diario ↓' },
                                    { value: 'promDiario_asc', label: 'Prom. Diario ↑' },
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
                            Mostrando {sortedTableData.length} registros
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('competidor')}>Competidor{sortIcon('competidor')}</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('local')}>Sede / Local{sortIcon('local')}</th>
                                <th className="px-6 py-5 cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('canal')}>Canal{sortIcon('canal')}</th>
                                <th className="px-6 py-5 text-center cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('transacciones')}>Transacciones{sortIcon('transacciones')}</th>
                                <th className="px-6 py-5 text-center cursor-pointer hover:text-accent-orange transition-colors select-none" onClick={() => handleSort('promDiario')}>Prom. Diario{sortIcon('promDiario')}</th>
                                <th className="px-6 py-5 text-center">Momento (A/C)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[11px] text-slate-700 dark:text-white/70">
                            {paginatedData.map((row) => (
                                <tr key={row.competidor + row.local} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                                    <td className="px-6 py-5">
                                        {(() => {
                                            const color = reactiveShareData.find(s => s.name === row.competidor)?.color || '#94a3b8';
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
                                    <td className="px-6 py-5 font-bold uppercase text-[10px] text-slate-500 dark:text-white/60">{row.local}</td>
                                    <td className="px-6 py-5">
                                        <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                            {row.canal}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-center font-black text-slate-900 dark:text-white font-mono">{row.transacciones}</td>
                                    <td className="px-6 py-5 text-center text-emerald-600 dark:text-accent-lemon font-black font-mono">{row.promDiario}</td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center gap-1.5">
                                            {[-1, 0, 1].map(v => (
                                                <div
                                                    key={v}
                                                    className={`w-2 h-2 rounded-full transition-shadow ${row.ac === v ? (v === -1 ? 'bg-accent-orange shadow-[0_0_8px_rgba(255,126,75,0.6)]' : v === 0 ? 'bg-accent-blue shadow-[0_0_8px_rgba(0,112,243,0.6)]' : 'bg-accent-lemon shadow-[0_0_8px_rgba(204,255,0,0.6)]') : 'bg-slate-200 dark:bg-white/10'}`}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10">
                        <span className="text-xs font-bold text-slate-500 dark:text-white/40">
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, displayTableData.length)} de {displayTableData.length} registros
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
        </div>
    );
}
