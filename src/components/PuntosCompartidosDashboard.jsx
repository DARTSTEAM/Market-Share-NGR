import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Building2, Store, Users, TrendingUp, BarChart3,
    ChevronRight, ChevronLeft, ChevronDown, X, Layers
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
    BarChart, Bar, XAxis, YAxis, Legend, LabelList
} from 'recharts';
import CustomSelect from './common/CustomSelect';

// ─── Brand color palette ────────────────────────────────────────────────────
const PALETTE = ['#ff5e00', '#0070f3', '#ccff00', '#7000f3', '#00f3a0', '#f30070', '#f3a000', '#00d4f3'];

const BRAND_COLORS = {
    // — Hamburguesa —
    //   McDonald's → AMARILLO DORADO (Golden Arches), no rojo, para distinguirse de KFC/BK
    'mcdonald':    '#FFC72C',
    //   Burger King → naranja llama, diferente al rojo KFC y al dorado McDo
    'burger king': '#FF7A00',
    'bembos':      '#CC1F1F',
    'hermanos':    '#A52020',
    // — Pollo Frito —
    //   KFC → rojo primario (único que puede usar rojo puro)
    'kfc':         '#F40027',
    //   Popeyes → azul (usan azul en su identidad global)
    'popeyes':     '#0055A5',
    'church':      '#8B0000',
    //   Norky's → ámbar cálido
    'norkys':      '#F0A500',
    //   Pardo's → marrón tostado
    'pardos':      '#7B3F00',
    // — Pizza —
    //   Pizza Hut → granate oscuro (el techo rojo oscuro), distinto al rojo KFC
    'pizza hut':   '#8B1A1A',
    //   Domino's → azul (ya era correcto)
    'domino':      '#006AAD',
    //   Papa John's → verde
    'papa john':   '#007743',
    'telepizza':   '#C00D0D',
};

function colorForCompetidor(name, shareData) {
    // 1) If shareData already has a pre-assigned color, use it
    const found = shareData?.find(s => s.name === name);
    if (found?.color && !PALETTE.includes(found.color)) return found.color;
    // 2) Brand match by partial name
    if (name) {
        const lower = name.toLowerCase().trim();
        for (const [brand, color] of Object.entries(BRAND_COLORS)) {
            if (lower.includes(brand)) return color;
        }
    }
    // 3) Fallback: deterministic hash
    let hash = 0;
    for (let i = 0; i < (name?.length || 0); i++) hash = (name.charCodeAt(i) + ((hash << 5) - hash));
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ─── Mini donut for each PC card ───────────────────────────────────────────
const MiniDonut = ({ data, shareData }) => {
    const chartData = data.map(d => ({ ...d, color: colorForCompetidor(d.name, shareData) }));
    return (
        <ResponsiveContainer width="100%" height={120}>
            <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={48}
                    paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};

// ─── Big donut for expanded view ────────────────────────────────────────────
const BigDonut = ({ data, shareData, total }) => {
    const chartData = data.map(d => ({ ...d, color: colorForCompetidor(d.name, shareData) }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={64} outerRadius={100}
                    paddingAngle={3} dataKey="value" stroke="none" label={false}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend
                    iconType="circle" iconSize={7}
                    formatter={(value, entry) => (
                        <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                            {value} · {((entry.payload.value / total) * 100).toFixed(0)}%
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

// ─── Horizontal stacked bar for expanded view ───────────────────────────────
const StackedBar = ({ data, shareData, total }) => {
    return (
        <div className="space-y-2 py-2">
            {data.map((d, i) => {
                const pct = total > 0 ? (d.value / total) * 100 : 0;
                const color = colorForCompetidor(d.name, shareData);
                return (
                    <div key={i} className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40 w-28 truncate text-right">{d.name}</span>
                        <div className="flex-1 h-5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
                                className="h-full rounded-full flex items-center justify-end pr-2"
                                style={{ backgroundColor: color }}
                            >
                                {pct > 8 && (
                                    <span className="text-[8px] font-black text-white">{pct.toFixed(0)}%</span>
                                )}
                            </motion.div>
                        </div>
                        <span className="text-[9px] font-mono font-black text-slate-700 dark:text-white/70 w-16 text-right">
                            {new Intl.NumberFormat('es-ES').format(d.value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Individual PC Card ─────────────────────────────────────────────────────
const PCCard = ({ pc, shareData, onClick, isSelected }) => {
    const total = pc.byComp.reduce((s, d) => s + d.value, 0);
    const leader = pc.byComp[0];
    const leaderColor = colorForCompetidor(leader?.name, shareData);
    const isCC = !!pc.cc_nombre;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            onClick={() => onClick(pc)}
            className={`pwa-card p-5 flex flex-col cursor-pointer transition-all duration-200 relative overflow-hidden border-2 h-[400px] ${isSelected
                ? 'border-accent-orange shadow-[0_0_30px_rgba(255,94,0,0.2)]'
                : 'border-transparent hover:border-white/10 dark:hover:border-white/10'
                }`}
        >
            {/* Glow accent based on leader color */}
            <div className="absolute inset-0 opacity-[0.03] rounded-2xl" style={{ background: `radial-gradient(circle at 70% 30%, ${leaderColor}, transparent 60%)` }} />

            {/* Header */}
            <div className="flex justify-between items-start gap-2 flex-shrink-0 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        {isCC
                            ? <Building2 className="w-3 h-3 text-accent-blue flex-shrink-0" />
                            : <MapPin className="w-3 h-3 text-accent-orange flex-shrink-0" />
                        }
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                            {isCC ? (pc.grupos_cc || 'Centro Comercial') : 'Punto Compartido'}
                        </span>
                    </div>
                    <h4 className="text-sm font-black italic text-slate-900 dark:text-white uppercase tracking-tight truncate">{pc.nombre}</h4>
                    {isCC && (
                        <p className="text-[9px] text-accent-blue font-bold mt-0.5 truncate">{pc.cc_nombre}</p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${leaderColor}20`, color: leaderColor }}>
                        {pc.byComp.length} marcas
                    </span>
                    {isCC && (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">CC</span>
                    )}
                </div>
            </div>

            {/* Mini donut — fixed size */}
            <div className="flex-shrink-0">
                <MiniDonut data={pc.byComp} shareData={shareData} />
            </div>

            {/* All competitors with % bar — fills remaining space */}
            <div className="flex-1 flex flex-col justify-center gap-2 mt-1 min-h-0">
                {pc.byComp.map((comp, i) => {
                    const color = colorForCompetidor(comp.name, shareData);
                    const pct = total > 0 ? (comp.value / total) * 100 : 0;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-black uppercase tracking-tight truncate flex-1" style={{ color }}>
                                {comp.name}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full flex-shrink-0 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="text-[10px] font-mono font-black w-8 text-right flex-shrink-0" style={{ color }}>
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Transacciones</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('es-ES').format(total)}
                </span>
            </div>
        </motion.div>
    );
};

// ─── Expanded detail panel (modal) ─────────────────────────────────────────
const PCDetailPanel = ({ pc, shareData, onClose, allPCs, currentIndex, onNavigate }) => {
    if (!pc) return null;
    const total = pc.byComp.reduce((s, d) => s + d.value, 0);
    const isCC = !!pc.cc_nombre;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allPCs.length - 1;

    // Keyboard navigation
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
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                className="pwa-card no-hover p-6 space-y-6 w-full max-w-4xl max-h-[88vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
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
                            {pc.byComp.length} competidores · {pc.locales.length} locales registrados · {new Intl.NumberFormat('es-ES').format(total)} transacciones
                        </p>
                    </div>
                    {/* Navigation + close */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => hasPrev && onNavigate(currentIndex - 1)}
                            disabled={!hasPrev}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Anterior (←)"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => hasNext && onNavigate(currentIndex + 1)}
                            disabled={!hasNext}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            title="Siguiente (→)"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Big donut */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-4">Distribución de ventas</p>
                        <BigDonut data={pc.byComp} shareData={shareData} total={total} />
                    </div>

                    {/* Right: Bar share */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-4">Market share por marca</p>
                        <StackedBar data={pc.byComp} shareData={shareData} total={total} />

                        {/* Locales table */}
                        <div className="mt-6">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Locales en este punto</p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {pc.locales.map((loc, i) => {
                                    const color = colorForCompetidor(loc.competidor, shareData);
                                    return (
                                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                <span className="text-[9px] font-black uppercase tracking-widest truncate" style={{ color }}>{loc.competidor}</span>
                                                <span className="text-[9px] text-slate-500 dark:text-white/40 font-bold truncate">{loc.local}</span>
                                            </div>
                                            <span className="text-[9px] font-mono font-black text-slate-700 dark:text-white/70 flex-shrink-0 ml-2">
                                                {new Intl.NumberFormat('es-ES').format(loc.transacciones)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function PuntosCompartidosDashboard({ allRecords, shareData }) {
    const [selectedPC, setSelectedPC] = useState(null);
    const [filterTipo, setFilterTipo] = useState('all');   // all | cc | calle
    const [filterCadena, setFilterCadena] = useState('all');
    const [filterComp, setFilterComp] = useState('all');
    const [sortMode, setSortMode] = useState('transacciones'); // transacciones | marcas | nombre
    const [visibleCount, setVisibleCount] = useState(8);

    // Build PC index from allRecords
    const pcData = useMemo(() => {
        const map = {};
        allRecords.forEach(rec => {
            if (!rec.punto_compartido || rec.status_busqueda !== 'OK') return;
            const pcKey = rec.punto_compartido;
            if (!map[pcKey]) {
                map[pcKey] = {
                    nombre: rec.punto_compartido,
                    cc_nombre: rec.cc_punto_compartido || null,
                    grupos_cc: rec.grupos_cc || null,
                    byComp: {},
                    locales: {},
                };
            }
            if (!map[pcKey].byComp[rec.competidor]) map[pcKey].byComp[rec.competidor] = 0;
            map[pcKey].byComp[rec.competidor] += (parseFloat(rec.transacciones) || 0);

            const locKey = `${rec.competidor}||${rec.local}`;
            if (!map[pcKey].locales[locKey]) {
                map[pcKey].locales[locKey] = { competidor: rec.competidor, local: rec.local, transacciones: 0 };
            }
            map[pcKey].locales[locKey].transacciones += (parseFloat(rec.transacciones) || 0);
        });

        return Object.values(map).map(pc => ({
            nombre: pc.nombre,
            cc_nombre: pc.cc_nombre,
            grupos_cc: pc.grupos_cc,
            byComp: Object.entries(pc.byComp)
                .map(([name, value]) => ({ name, value: Math.round(value) }))
                .sort((a, b) => b.value - a.value),
            locales: Object.values(pc.locales).sort((a, b) => b.transacciones - a.transacciones),
        // Only keep PCs with 2+ distinct competitors (otherwise it's not truly "shared")
        })).filter(pc => pc.byComp.length >= 2);
    }, [allRecords]);

    // Derived filter options
    const cadenaOptions = useMemo(() => {
        const vals = [...new Set(pcData.map(p => p.grupos_cc).filter(Boolean))].sort();
        return [{ value: 'all', label: 'Todas las cadenas' }, ...vals.map(v => ({ value: v, label: v }))];
    }, [pcData]);

    const compOptions = useMemo(() => {
        const vals = [...new Set(pcData.flatMap(p => p.byComp.map(c => c.name)))].sort();
        return [{ value: 'all', label: 'Todos los competidores' }, ...vals.map(v => ({ value: v, label: v }))];
    }, [pcData]);

    // Apply filters
    const filteredPCs = useMemo(() => {
        let data = [...pcData];
        if (filterTipo === 'cc') data = data.filter(p => !!p.cc_nombre);
        if (filterTipo === 'calle') data = data.filter(p => !p.cc_nombre);
        if (filterCadena !== 'all') data = data.filter(p => p.grupos_cc === filterCadena);
        if (filterComp !== 'all') data = data.filter(p => p.byComp.some(c => c.name === filterComp));

        // Sort
        if (sortMode === 'transacciones') data.sort((a, b) => b.byComp.reduce((s, c) => s + c.value, 0) - a.byComp.reduce((s, c) => s + c.value, 0));
        else if (sortMode === 'marcas') data.sort((a, b) => b.byComp.length - a.byComp.length);
        else data.sort((a, b) => a.nombre.localeCompare(b.nombre));

        return data;
    }, [pcData, filterTipo, filterCadena, filterComp, sortMode]);

    // Reset visible cards when filters change
    React.useEffect(() => { setVisibleCount(8); }, [filterTipo, filterCadena, filterComp, sortMode]);

    // KPIs
    const kpis = useMemo(() => {
        const totalTrans = filteredPCs.reduce((s, p) => s + p.byComp.reduce((ss, c) => ss + c.value, 0), 0);
        const totalLocales = filteredPCs.reduce((s, p) => s + p.locales.length, 0);
        const allTrans = allRecords.filter(r => r.status_busqueda === 'OK').reduce((s, r) => s + (parseFloat(r.transacciones) || 0), 0);
        const sharePct = allTrans > 0 ? (totalTrans / allTrans) * 100 : 0;
        const pcsConCC = pcData.filter(p => !!p.cc_nombre).length;
        return { totalPCs: filteredPCs.length, totalLocales, totalTrans, sharePct, pcsConCC };
    }, [filteredPCs, allRecords, pcData]);

    const handleCardClick = (pc) => {
        setSelectedPC(prev => prev?.nombre === pc.nombre ? null : pc);
    };

    return (
        <>
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* KPIs */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: MapPin, label: 'Puntos Compartidos', value: kpis.totalPCs, color: 'text-accent-orange', bg: 'bg-accent-orange/10' },
                    { icon: Building2, label: 'En Centro Comercial', value: kpis.pcsConCC, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
                    { icon: Store, label: 'Locales en PCs', value: kpis.totalLocales, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { icon: TrendingUp, label: 'Share del mercado en PCs', value: `${kpis.sharePct.toFixed(1)}%`, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((kpi, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -3 }}
                        className="pwa-card no-hover p-5 flex flex-col gap-3"
                    >
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

            {/* Filters + Sort */}
            <section className="pwa-card no-hover p-4 flex flex-wrap gap-4 items-end border-slate-200 dark:border-white/5">
                <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Tipo</span>
                    <CustomSelect
                        selected={filterTipo}
                        onChange={setFilterTipo}
                        width="w-36"
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'cc', label: '🏬 Centro Comercial' },
                            { value: 'calle', label: '📍 Punto de Calle' },
                        ]}
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Cadena CC</span>
                    <CustomSelect selected={filterCadena} onChange={setFilterCadena} width="w-44" options={cadenaOptions} />
                </div>
                <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Competidor</span>
                    <CustomSelect selected={filterComp} onChange={setFilterComp} width="w-44" options={compOptions} />
                </div>
                <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Ordenar por</span>
                    <CustomSelect
                        selected={sortMode}
                        onChange={setSortMode}
                        width="w-40"
                        options={[
                            { value: 'transacciones', label: 'Transacciones ↓' },
                            { value: 'marcas', label: 'N° Marcas ↓' },
                            { value: 'nombre', label: 'Nombre A→Z' },
                        ]}
                    />
                </div>
                <div className="ml-auto flex items-center gap-2 pb-0.5">
                    <Layers className="w-3 h-3 text-slate-400 dark:text-white/20" />
                    <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase">
                        {filteredPCs.length} puntos · {kpis.totalLocales} locales
                    </span>
                </div>
            </section>

            {/* PC Cards Grid */}
            {filteredPCs.length === 0 ? (
                <div className="pwa-card p-20 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-slate-300 dark:text-white/10" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-white/20">
                        No se encontraron puntos compartidos para los filtros seleccionados
                    </p>
                </div>
            ) : (
                <>
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPCs.slice(0, visibleCount).map((pc, i) => (
                            <motion.div
                                key={pc.nombre}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min((i % 4) * 0.06, 0.3) }}
                            >
                                <PCCard
                                    pc={pc}
                                    shareData={shareData}
                                    onClick={handleCardClick}
                                    isSelected={selectedPC?.nombre === pc.nombre}
                                />
                            </motion.div>
                        ))}
                    </section>
                    {filteredPCs.length > visibleCount && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center gap-3 py-4"
                        >
                            <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                            <button
                                onClick={() => setVisibleCount(v => v + 4)}
                                className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 hover:border-accent-orange/40 transition-all duration-200 group"
                            >
                                <Layers className="w-3 h-3 text-slate-400 dark:text-white/30 group-hover:text-accent-orange transition-colors" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 group-hover:text-accent-orange transition-colors">
                                    Ver 4 más &nbsp;·&nbsp; quedan {filteredPCs.length - visibleCount}
                                </span>
                            </button>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
                        </motion.div>
                    )}
                </>
            )}

            {/* Global bar chart comparison across all PCs */}
            {filteredPCs.length > 1 && (
                <section className="pwa-card p-8 space-y-6 border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                        <h3 className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-slate-900 dark:text-white/90">
                            <div className="w-1.5 h-6 bg-accent-orange rounded-full" />
                            Comparativa de Transacciones por Punto Compartido (Top 12)
                        </h3>
                        <BarChart3 className="w-4 h-4 text-slate-400 dark:text-white/20" />
                    </div>
                    <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={filteredPCs.slice(0, 12).map(pc => {
                                    const row = { name: pc.nombre.length > 14 ? pc.nombre.slice(0, 14) + '…' : pc.nombre };
                                    pc.byComp.forEach(c => { row[c.name] = c.value; });
                                    return row;
                                })}
                                margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
                                barSize={18}
                            >
                                <XAxis dataKey="name" angle={-35} textAnchor="end" fontSize={8} interval={0}
                                    tick={{ fill: 'rgba(100,116,139,0.8)', fontWeight: 900, fontStyle: 'italic' }} />
                                <YAxis fontSize={8} tick={{ fill: 'rgba(100,116,139,0.6)' }}
                                    tickFormatter={v => new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(v)} />
                                <ReTooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: 'none', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}
                                    formatter={(val, name) => [new Intl.NumberFormat('es-ES').format(val), name]}
                                />
                                <Legend iconSize={7} iconType="circle"
                                    formatter={v => <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v}</span>}
                                />
                                {[...new Set(filteredPCs.flatMap(p => p.byComp.map(c => c.name)))].map((comp, i) => (
                                    <Bar key={comp} dataKey={comp} stackId="a"
                                        fill={colorForCompetidor(comp, shareData)} radius={i === 0 ? [0, 0, 3, 3] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}
        </div>

        {/* Modal — fixed overlay over the whole viewport */}
        <AnimatePresence>
            {selectedPC && (
                <PCDetailPanel
                    key={selectedPC.nombre}
                    pc={selectedPC}
                    shareData={shareData}
                    onClose={() => setSelectedPC(null)}
                    allPCs={filteredPCs}
                    currentIndex={filteredPCs.findIndex(p => p.nombre === selectedPC.nombre)}
                    onNavigate={(idx) => setSelectedPC(filteredPCs[idx])}
                />
            )}
        </AnimatePresence>
        </>
    );
}
