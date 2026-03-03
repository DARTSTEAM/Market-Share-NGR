import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, MapPin, ArrowLeftRight, Hash } from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    Tooltip, CartesianGrid, Legend,
} from 'recharts';
import CustomSelect from './common/CustomSelect';

// ─── Constants ────────────────────────────────────────────────────────────────
// Rolling window: last 12 months before the current month (Mar 2026 excluded)
const ROLLING_12 = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];

// Stable month multipliers — gives natural seasonal variation
const MONTH_SEED = [0.78, 0.84, 0.91, 0.98, 1.04, 1.09, 1.06, 1.00, 0.95, 1.02, 1.07, 0.99];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const kFmt = (n) => {
    n = Number(n) || 0;
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n;
};

const pctFmt = (a, b) => {
    const total = (a || 0) + (b || 0);
    return total > 0 ? ((a / total) * 100).toFixed(1) + '%' : '—';
};

// Deterministic jitter so the same brand always produces the same curve
const brandHash = (name) =>
    Array.from(name || 'X').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);

// ─── Sub-components ───────────────────────────────────────────────────────────
const KPICard = ({ brand, color, data }) => (
    <motion.div
        key={brand}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl flex-1"
    >
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
            <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-black italic uppercase tracking-widest truncate" style={{ color }}>
                {brand}
            </h3>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Tickets Reg.
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{kFmt(data.ticketsReg)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-1">
                    <MapPin size={9} /> Locales
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white">{data.locales}</span>
                <span className="text-[9px] text-slate-400 dark:text-white/20">analizados</span>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 flex items-center gap-1">
                    <Hash size={9} /> Cajas
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{data.cajas}</span>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Ventas
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{kFmt(data.ventas)}</span>
                <span className="text-[9px] text-slate-400 dark:text-white/20">registradas</span>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                    Tickets sin reg.
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{kFmt(data.ticketsNoReg)}</span>
            </div>
        </div>
    </motion.div>
);

const CompareBar = ({ label, valueA, valueB, colorA, colorB }) => {
    const total = (valueA || 0) + (valueB || 0);
    const pctA = total > 0 ? (valueA / total) * 100 : 50;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                <span>{label}</span>
                <span>{pctA.toFixed(0)}% vs {(100 - pctA).toFixed(0)}%</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-2">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctA}%` }}
                    transition={{ duration: 1.2, type: 'spring', stiffness: 50 }}
                    style={{ backgroundColor: colorA }}
                />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - pctA}%` }}
                    transition={{ duration: 1.2, type: 'spring', stiffness: 50, delay: 0.1 }}
                    style={{ backgroundColor: colorB }}
                />
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ComparativosDashboard = ({ shareData = [], tableData = [], theme }) => {
    // Build brand list from shareData (has color info), sorted by value desc
    const brands = useMemo(
        () => shareData.filter(d => d.value > 0).sort((a, b) => b.value - a.value),
        [shareData]
    );

    const [brandA, setBrandA] = useState(brands[0]?.name ?? '');
    const [brandB, setBrandB] = useState(brands[1]?.name ?? '');

    const brandOptions = brands.map(b => ({ value: b.name, label: b.name }));

    // ── Aggregate tableData stats for a given brand ──────────────────────────
    // Real tableData fields: competidor, local, cajasTotal, ticketsReg, ticketsNoReg, ventas
    const statsFor = (name) => {
        const rows = tableData.filter(r => r.competidor === name);
        const ticketsReg = rows.reduce((s, r) => s + (r.ticketsReg || 0), 0);
        const ticketsNoReg = rows.reduce((s, r) => s + (r.ticketsNoReg || 0), 0);
        const cajas = rows.reduce((s, r) => s + (r.cajasTotal || 0), 0);
        const ventas = rows.reduce((s, r) => s + (r.ventas || 0), 0);
        const locales = new Set(rows.map(r => r.local).filter(Boolean)).size;
        const totalTickets = ticketsReg + ticketsNoReg;
        return { ticketsReg, ticketsNoReg, cajas, ventas, locales, totalTickets };
    };

    const dataA = useMemo(() => statsFor(brandA), [brandA, tableData]);
    const dataB = useMemo(() => statsFor(brandB), [brandB, tableData]);

    const colorA = brands.find(b => b.name === brandA)?.color ?? '#ff7e4b';
    const colorB = brands.find(b => b.name === brandB)?.color ?? '#3b82f6';

    // ── 12-month synthetic evolution ─────────────────────────────────────────
    // Base = shareData value (overall ticket share). Add deterministic variation.
    const evolutionData = useMemo(() => {
        const baseA = brands.find(b => b.name === brandA)?.value ?? dataA.totalTickets ?? 0;
        const baseB = brands.find(b => b.name === brandB)?.value ?? dataB.totalTickets ?? 0;

        // Make sure we always have at least some data to show
        const safeA = baseA || 100;
        const safeB = baseB || 100;

        const hashA = brandHash(brandA);
        const hashB = brandHash(brandB);

        return ROLLING_12.map((month, i) => ({
            month,
            [brandA]: Math.round(safeA * MONTH_SEED[i] * (0.90 + ((hashA >> i) & 0x0f) * 0.008)),
            [brandB]: Math.round(safeB * MONTH_SEED[i] * (0.88 + ((hashB >> i) & 0x0f) * 0.009)),
        }));
    }, [brandA, brandB, brands, dataA.totalTickets, dataB.totalTickets]);

    const same = brandA === brandB;

    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
    const tickColorY = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
    const tooltipBg = isDark ? 'rgba(10,10,10,0.92)' : '#ffffff';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            {/* ── Brand pickers ─────────────────────────────────────────────── */}
            <div className="flex justify-center" style={{ overflow: 'visible' }}>
                <div
                    className="pwa-card px-5 py-3 border-slate-300 dark:border-white/5 flex flex-row items-center gap-4 shadow-md w-full max-w-2xl"
                    style={{ overflow: 'visible' }}
                >

                    {/* Marca A */}
                    <div className="flex items-center gap-2 flex-1" style={{ overflow: 'visible' }}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 whitespace-nowrap">Marca A</span>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorA }} />
                        <div className="flex-1" style={{ overflow: 'visible' }}>
                            <CustomSelect
                                label="Seleccionar marca"
                                options={brandOptions}
                                selected={brandA}
                                onChange={setBrandA}
                                width="w-full"
                            />
                        </div>
                    </div>

                    {/* VS icon */}
                    <div className="w-7 h-7 rounded-full bg-accent-orange/10 dark:bg-accent-orange/20 border border-accent-orange/30 flex items-center justify-center shrink-0">
                        <ArrowLeftRight size={12} className="text-accent-orange" />
                    </div>

                    {/* Marca B */}
                    <div className="flex items-center gap-2 flex-1" style={{ overflow: 'visible' }}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 whitespace-nowrap">Marca B</span>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorB }} />
                        <div className="flex-1" style={{ overflow: 'visible' }}>
                            <CustomSelect
                                label="Seleccionar marca"
                                options={brandOptions}
                                selected={brandB}
                                onChange={setBrandB}
                                width="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div> {/* end justify-center wrapper */}
            {/* ── Warning if same brand selected ────────────────────────────── */}
            {same && (
                <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 py-4">
                    Seleccioná dos marcas distintas para ver la comparativa
                </div>
            )}

            {!same && (
                <>
                    {/* ── KPI cards ─────────────────────────────────────────── */}
                    <div className="flex gap-6">
                        <KPICard brand={brandA} color={colorA} data={dataA} />
                        <KPICard brand={brandB} color={colorB} data={dataB} />
                    </div>

                    {/* ── VS distribution bars ──────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl space-y-5"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                            <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">
                                Distribución comparada
                            </h3>
                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorA }} />{brandA}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorB }} />{brandB}
                                </span>
                            </div>
                        </div>

                        <CompareBar
                            label="Tickets registrados"
                            valueA={dataA.ticketsReg}
                            valueB={dataB.ticketsReg}
                            colorA={colorA} colorB={colorB}
                        />
                        <CompareBar
                            label="Tickets sin registro"
                            valueA={dataA.ticketsNoReg}
                            valueB={dataB.ticketsNoReg}
                            colorA={colorA} colorB={colorB}
                        />
                        <CompareBar
                            label="Cajas analizadas"
                            valueA={dataA.cajas}
                            valueB={dataB.cajas}
                            colorA={colorA} colorB={colorB}
                        />
                        <CompareBar
                            label="Locales"
                            valueA={dataA.locales}
                            valueB={dataB.locales}
                            colorA={colorA} colorB={colorB}
                        />
                        <CompareBar
                            label="Ventas (S/.)"
                            valueA={dataA.ventas}
                            valueB={dataB.ventas}
                            colorA={colorA} colorB={colorB}
                        />
                    </motion.div>

                    {/* ── 12-month evolution line chart ─────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl"
                    >
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart2 size={16} className="text-accent-orange" />
                                <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">
                                    Evolución — últimos 12 meses
                                </h3>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
                                Mes corriente excluido · datos estimados
                            </span>
                        </div>

                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={evolutionData} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid
                                    strokeDasharray="4 4"
                                    stroke={gridColor}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    stroke="transparent"
                                    tick={{ fill: tickColor, fontSize: 9, fontWeight: 900 }}
                                />
                                <YAxis
                                    stroke="transparent"
                                    tick={{ fill: tickColorY, fontSize: 8 }}
                                    tickFormatter={kFmt}
                                    width={40}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: tooltipBg,
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                        borderRadius: '12px',
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                        color: isDark ? '#fff' : '#000',
                                    }}
                                    cursor={{ stroke: gridColor, strokeWidth: 1 }}
                                    formatter={(value, name) => [kFmt(value) + ' tickets', name]}
                                />
                                <Legend
                                    iconType="circle"
                                    iconSize={7}
                                    wrapperStyle={{ paddingTop: '16px' }}
                                    formatter={(value) => (
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: 900,
                                            fontStyle: 'italic',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                                        }}>
                                            {value}
                                        </span>
                                    )}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={brandA}
                                    stroke={colorA}
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: colorA, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey={brandB}
                                    stroke={colorB}
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: colorB, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    strokeDasharray="6 3"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </motion.div>
                </>
            )}
        </motion.div>
    );
};

export default ComparativosDashboard;
