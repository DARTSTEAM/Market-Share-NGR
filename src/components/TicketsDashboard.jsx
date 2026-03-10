import React, { useState, useMemo, useEffect } from 'react';
import {
    Ticket,
    Search,
    Filter,
    Calendar,
    Store,
    ChevronRight,
    ChevronLeft,
    FileText,
    ExternalLink,
    Hash,
    Clock,
    DollarSign,
    ShieldAlert,
    BarChart2,
    Award,
    TrendingUp
} from 'lucide-react';
import CustomSelect from './common/CustomSelect';

const formatCurrency = (val) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val);

const TicketsDashboard = ({ tickets, records = [], shareData, globalFilters, onFilterChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        competidor: globalFilters?.competitor || 'all',
        local: globalFilters?.local || 'all',
        dateRange: 'all'
    });

    // Sync with global filters
    useEffect(() => {
        if (globalFilters) {
            setFilters(prev => ({
                ...prev,
                competidor: globalFilters.competitor,
                local: globalFilters.local
            }));
        }
    }, [globalFilters?.competitor, globalFilters?.local]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        if (onFilterChange) {
            const globalKey = key === 'competidor' ? 'competitor' : key;
            onFilterChange(prev => ({ ...prev, [globalKey]: value }));
        }
        setCurrentPage(1);
    };

    // Filter Options
    const competitors = useMemo(() => ['all', ...new Set(tickets.map(t => t.competidor))].filter(Boolean), [tickets]);
    const locations = useMemo(() => {
        const filtered = filters.competidor === 'all'
            ? tickets
            : tickets.filter(t => t.competidor === filters.competidor);
        return ['all', ...new Set(filtered.map(t => t.local))].filter(Boolean);
    }, [tickets, filters.competidor]);

    // Main Filtering Logic
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch =
                (t.numero_de_ticket || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.filename || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.local || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCompetitor = filters.competidor === 'all' || t.competidor === filters.competidor;
            const matchesLocal = filters.local === 'all' || t.local === filters.local;

            return matchesSearch && matchesCompetitor && matchesLocal;
        });
    }, [tickets, searchTerm, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTickets.slice(start, start + itemsPerPage);
    }, [filteredTickets, currentPage, itemsPerPage]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(val);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Refined Metrics for Header
    const stats = useMemo(() => {
        const total = filteredTickets.length;
        const totalImporte = filteredTickets.reduce((sum, t) => sum + (parseFloat(t.importe) || 0), 0);
        const sinLocal = tickets.filter(t => {
            const matchesComp = filters.competidor === 'all' || t.competidor === filters.competidor;
            const isDesconocido = !t.local || t.local === 'DESCONOCIDO' || t.local === 'Desconocido';
            return matchesComp && isDesconocido;
        }).length;

        const routineStats = records.reduce((acc, r) => {
            const matchesComp = filters.competidor === 'all' || r.competidor === filters.competidor;
            const matchesLocal = filters.local === 'all' || r.local === filters.local;

            if (matchesComp && matchesLocal) {
                if (r.status_busqueda === 'OK') acc.cerradas++;
                else acc.conError++;
            }
            return acc;
        }, { cerradas: 0, conError: 0 });

        return { total, importe: totalImporte, sinLocal, ...routineStats };
    }, [tickets, filteredTickets, records, filters]);

    const parseHour = (hourStr) => {
        if (!hourStr) return '-';
        try {
            if (hourStr.startsWith('{')) {
                const parsed = JSON.parse(hourStr);
                return parsed.value || '-';
            }
            return hourStr;
        } catch (e) {
            return hourStr;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header & Stats */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="shrink-0">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Ticket className="w-8 h-8 text-accent-orange" />
                        Auditoría de Tickets
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Explora y verifica cada ticket cargado en el sistema
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 flex-1">
                    <div className="pwa-card px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col group min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">Tickets Totales</span>
                            <TrendingUp size={12} className="text-accent-orange opacity-40" />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono truncate">{stats.total}</span>
                    </div>

                    <div className="pwa-card px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col group min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">Importe Total</span>
                            <DollarSign size={12} className="text-accent-lemon opacity-40" />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono truncate">{formatCurrency(stats.importe)}</span>
                    </div>

                    <div className="pwa-card px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col group min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">Tickets sin local</span>
                            <ShieldAlert size={12} className="text-accent-orange opacity-40" />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono truncate">{stats.sinLocal}</span>
                    </div>

                    <div className="pwa-card px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col group min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">Cajas cerradas</span>
                            <BarChart2 size={12} className="text-accent-blue opacity-40" />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white font-mono truncate">{stats.cerradas}</span>
                    </div>

                    <div className="pwa-card px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col group min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">Cajas con Error</span>
                            <ShieldAlert size={12} className="text-red-500 opacity-40" />
                        </div>
                        <span className="text-xl font-black text-red-600 dark:text-red-400 font-mono truncate">{stats.conError}</span>
                    </div>
                </div>
            </header>

            {/* Filters Bar */}
            <section className="pwa-card p-4 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[300px] relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent-orange transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por ticket, local o nombre de archivo..."
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Competidor</span>
                        <CustomSelect
                            selected={filters.competidor}
                            onChange={(v) => handleFilterChange('competidor', v)}
                            options={competitors.map(c => ({ value: c, label: c === 'all' ? 'Todos' : c }))}
                            width="w-40"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 ml-1">Local</span>
                        <CustomSelect
                            selected={filters.local}
                            onChange={(v) => handleFilterChange('local', v)}
                            options={locations.map(l => ({ value: l, label: l === 'all' ? 'Todos' : l }))}
                            width="w-48"
                        />
                    </div>
                </div>
            </section>

            {/* Tickets Table */}
            <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-6 py-5">Competidor</th>
                                <th className="px-6 py-5">Local / Cód.</th>
                                <th className="px-6 py-5">Canal</th>
                                <th className="px-6 py-5 text-center">Ticket</th>
                                <th className="px-6 py-5 text-center">Caja</th>
                                <th className="px-6 py-5 text-right">Importe</th>
                                <th className="px-6 py-5 text-center">Fecha / Hora</th>
                                <th className="px-6 py-5">Archivo Original</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[11px] text-slate-700 dark:text-white/70">
                            {paginatedTickets.map((t, idx) => {
                                const color = shareData.find(s => s.name === t.competidor)?.color || '#94a3b8';
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-6 py-5">
                                            <span
                                                className="font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full border inline-block"
                                                style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                                            >
                                                {t.competidor}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{t.local}</span>
                                                <span className="text-[9px] font-black text-accent-orange/70 font-mono tracking-tighter">{t.codigo_tienda || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-black uppercase tracking-tighter text-slate-400 dark:text-white/30">{t.canal || 'TIENDA'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-900 dark:text-white">
                                            #{t.ticket}
                                        </td>
                                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-500 dark:text-white/40">
                                            {t.caja}
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-slate-900 dark:text-white">
                                            {formatCurrency(t.importe)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold">{formatDate(t.fecha)}</span>
                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-white/20">{parseHour(t.hora)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 group/file cursor-help">
                                                <FileText size={14} className="text-slate-300 dark:text-white/10 group-hover/file:text-accent-orange transition-colors" />
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 group-hover/file:text-slate-600 dark:group-hover/file:text-white/60 transition-colors truncate max-w-[150px]" title={t.filename}>
                                                    {t.filename}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                        Mostrando <span className="text-slate-900 dark:text-white">{Math.min(paginatedTickets.length, itemsPerPage)}</span> de <span className="text-slate-900 dark:text-white">{filteredTickets.length}</span> tickets
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} className="text-slate-600 dark:text-white" />
                        </button>
                        <div className="flex items-center px-4 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                Página {currentPage} de {totalPages || 1}
                            </span>
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} className="text-slate-600 dark:text-white" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default TicketsDashboard;
