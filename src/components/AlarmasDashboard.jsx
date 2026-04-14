import React, { useState, useMemo, useRef } from 'react';
import {
    AlertTriangle,
    Search,
    Filter,
    Eye,
    Edit3,
    CheckCircle2,
    XCircle,
    Info,
    Loader2,
    RefreshCw,
    Image as ImageIcon,
    Save,
    X,
    ChevronRight,
    ChevronLeft,
    Clock,
    Hash,
    DollarSign,
    Calendar as CalendarIcon,
    MapPin,
    Monitor,
    Store,
    TrendingUp,
    ArrowUpDown
} from 'lucide-react';
import CustomSelect from './common/CustomSelect';



const ALARM_STATUS_CONFIG = {
    'REINICIO_TICKETS': { label: 'Reinicio Tickets', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: RefreshCw },
    'ALERTA_SIN_LOCAL': { label: 'Sin Local', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
    'HISTORIAL_ANTIGUO': { label: 'Historial Antiguo', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Clock },
    'REVISAR_TRANSACCIONES_ALTAS': { label: 'Transacciones Altas', color: 'text-red-500', bg: 'bg-red-500/10', icon: TrendingUp },
    'ALERTA_SIN_CAJA': { label: 'Sin Caja', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Hash },
    'SIN_HISTORIAL': { label: 'Sin Historial', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Info },
};

// Helper: resolve config for ESTIMADO-* statuses dynamically
const getEstimadoConfig = (status) => {
    if (!status?.startsWith('ESTIMADO-')) return null;
    const confianza = status.replace('ESTIMADO-', '');
    const map = {
        'ALTA':         { label: 'Estimado · Alta',      color: 'text-emerald-500', bg: 'bg-emerald-500/10', dot: '#10b981' },
        'MEDIA':        { label: 'Estimado · Media',     color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  dot: '#eab308' },
        'BAJA':         { label: 'Estimado · Baja',      color: 'text-yellow-600',  bg: 'bg-yellow-600/10',  dot: '#ca8a04' },
        'MUY_BAJA':     { label: 'Estimado · Muy Baja',  color: 'text-orange-500',  bg: 'bg-orange-500/10',  dot: '#f97316' },
        'SIN_HISTORIAL':{ label: 'Estimado · Sin Hist.', color: 'text-red-500',     bg: 'bg-red-500/10',     dot: '#ef4444' },
    };
    return map[confianza] || { label: status, color: 'text-slate-400', bg: 'bg-slate-400/10', dot: '#94a3b8' };
};

const ITEMS_PER_PAGE = 10;

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const AlarmasDashboard = ({ records, tickets, onUpdateTicket, isRefreshing }) => {
    const [activeTab, setActiveTab] = useState('alarmas'); // 'alarmas' | 'estimados'
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMes, setFilterMes] = useState('all');
    const [filterCompetidor, setFilterCompetidor] = useState('all');
    const [filterLocal, setFilterLocal] = useState('all');
    const [editingTicket, setEditingTicket] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('fecha_desc');
    const [estSearchTerm, setEstSearchTerm] = useState('');
    const [estFilterComp, setEstFilterComp] = useState('all');
    const [estSortBy, setEstSortBy] = useState('trx_desc');


    // Dynamic filter options derived from records
    const mesOptions = useMemo(() => {
        const meses = new Set();
        records.forEach(r => {
            if (r.mes) {
                const m = parseInt(r.mes);
                if (!isNaN(m)) meses.add(m);
            }
        });
        return [
            { value: 'all', label: 'Todos los Meses' },
            ...Array.from(meses).sort((a, b) => a - b).map(m => ({ value: String(m), label: MONTH_NAMES[m - 1] }))
        ];
    }, [records]);

    const competidorOptions = useMemo(() => {
        const comps = new Set(records.filter(r => r.status_busqueda !== 'OK' && r.status_busqueda !== 'HISTORIAL').map(r => r.competidor).filter(Boolean));
        return [
            { value: 'all', label: 'Todos los Competidores' },
            ...Array.from(comps).sort().map(c => ({ value: c, label: c }))
        ];
    }, [records]);

    const localOptions = useMemo(() => {
        const locals = new Set(
            records
                .filter(r => r.status_busqueda !== 'OK' && r.status_busqueda !== 'HISTORIAL' && (filterCompetidor === 'all' || r.competidor === filterCompetidor))
                .map(r => r.local)
                .filter(Boolean)
        );
        return [
            { value: 'all', label: 'Todos los Locales' },
            ...Array.from(locals).sort().map(l => ({ value: l, label: l }))
        ];
    }, [records, filterCompetidor]);

    // Filtered records based on status, selectors and search (real alarms only)
    const alarmRecords = useMemo(() => {
        const filtered = records.filter(r => {
            if (r.status_busqueda === 'OK') return false;
            if (r.status_busqueda === 'HISTORIAL') return false;
            if (r.status_busqueda?.startsWith('ESTIMADO-')) return false; // handled in Estimados tab

            const matchesStatus = selectedStatus === 'all' || r.status_busqueda === selectedStatus;
            const matchesMes = filterMes === 'all' || (r.mes && String(parseInt(r.mes)) === filterMes);
            const matchesCompetidor = filterCompetidor === 'all' || r.competidor === filterCompetidor;
            const matchesLocal = filterLocal === 'all' || r.local === filterLocal;
            const matchesSearch =
                (r.local || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.competidor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.filename_actual || '').toLowerCase().includes(searchTerm.toLowerCase());

            return matchesStatus && matchesMes && matchesCompetidor && matchesLocal && matchesSearch;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'fecha_desc') return new Date(b.fecha) - new Date(a.fecha);
            if (sortBy === 'fecha_asc') return new Date(a.fecha) - new Date(b.fecha);
            if (sortBy === 'competidor') return (a.competidor || '').localeCompare(b.competidor || '');
            if (sortBy === 'local') return (a.local || '').localeCompare(b.local || '');
            if (sortBy === 'status') return (a.status_busqueda || '').localeCompare(b.status_busqueda || '');
            if (sortBy === 'caja') return (a.caja || '').localeCompare(b.caja || '');
            if (sortBy === 'ticket_desc') return (parseInt(b.ticket_actual) || 0) - (parseInt(a.ticket_actual) || 0);
            if (sortBy === 'ticket_asc') return (parseInt(a.ticket_actual) || 0) - (parseInt(b.ticket_actual) || 0);
            if (sortBy === 'codigo_tienda') return (a.codigo_tienda || '').localeCompare(b.codigo_tienda || '');
            return 0;
        });
    }, [records, selectedStatus, searchTerm, filterMes, filterCompetidor, filterLocal, sortBy]);

    // Estimated gap records
    const estimatedRecords = useMemo(() => {
        const filtered = records.filter(r => r.status_busqueda?.startsWith('ESTIMADO-')).filter(r => {
            const matchesComp = estFilterComp === 'all' || r.competidor === estFilterComp;
            const matchesSearch =
                (r.local || '').toLowerCase().includes(estSearchTerm.toLowerCase()) ||
                (r.competidor || '').toLowerCase().includes(estSearchTerm.toLowerCase()) ||
                (r.codigo_tienda || '').toLowerCase().includes(estSearchTerm.toLowerCase());
            return matchesComp && matchesSearch;
        });
        return [...filtered].sort((a, b) => {
            if (estSortBy === 'trx_desc') return (b.promedio || 0) - (a.promedio || 0);
            if (estSortBy === 'trx_asc')  return (a.promedio || 0) - (b.promedio || 0);
            if (estSortBy === 'competidor') return (a.competidor || '').localeCompare(b.competidor || '');
            if (estSortBy === 'confianza') return (a.status_busqueda || '').localeCompare(b.status_busqueda || '');
            return 0;
        });
    }, [records, estFilterComp, estSearchTerm, estSortBy]);

    const estCompOptions = useMemo(() => {
        const comps = new Set(records.filter(r => r.status_busqueda?.startsWith('ESTIMADO-')).map(r => r.competidor).filter(Boolean));
        return [{ value: 'all', label: 'Todos' }, ...Array.from(comps).sort().map(c => ({ value: c, label: c }))];
    }, [records]);

    // Summary stats
    const stats = useMemo(() => {
        const counts = {};
        Object.keys(ALARM_STATUS_CONFIG).forEach(s => counts[s] = 0);

        records.forEach(r => {
            if (counts[r.status_busqueda] !== undefined) {
                counts[r.status_busqueda]++;
            }
        });
        return counts;
    }, [records]);

    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return alarmRecords.slice(start, start + ITEMS_PER_PAGE);
    }, [alarmRecords, currentPage]);

    const totalPages = Math.ceil(alarmRecords.length / ITEMS_PER_PAGE);

    const handleEdit = (record) => {
        const foundActual = tickets.find(t => t.filename === record.filename_actual);
        const actualData = foundActual ? {
            ...foundActual,
            competidor: foundActual.competidor || record.competidor || '',
            local: foundActual.local || record.local || '',
            codigoTienda: foundActual.codigo_tienda || foundActual.codigoTienda || record.codigo_tienda || '',
            caja: foundActual.caja || foundActual.numero_de_caja || record.caja || '',
            ticket: (foundActual.ticket != null ? foundActual.ticket : foundActual.numero_de_ticket) ?? record.ticket_actual?.toString() ?? '',
            importe: foundActual.importe ?? foundActual.importe_total ?? 0,
            fecha: foundActual.fecha ? foundActual.fecha.split('T')[0] : (record.fecha ? record.fecha.split('T')[0] : ''),
            originalFilename: foundActual.filename
        } : {
            competidor: record.competidor,
            local: record.local,
            caja: record.caja || '',
            codigoTienda: record.codigo_tienda || '',
            ticket: record.ticket_actual?.toString() || '',
            filename: record.filename_actual,
            originalFilename: record.filename_actual,
            importe: 0,
            fecha: record.fecha ? record.fecha.split('T')[0] : ''
        };

        let anteriorData = null;
        if (record.filename_anterior) {
            const foundAnterior = tickets.find(t => t.filename === record.filename_anterior);
            anteriorData = foundAnterior ? {
                ...foundAnterior,
                competidor: foundAnterior.competidor || record.competidor || '',
                local: foundAnterior.local || record.local || '',
                codigoTienda: foundAnterior.codigo_tienda || foundAnterior.codigoTienda || record.codigo_tienda || '',
                caja: foundAnterior.caja || foundAnterior.numero_de_caja || record.caja || '',
                ticket: foundAnterior.ticket || foundAnterior.numero_de_ticket || record.ticket_anterior?.toString() || '',
                importe: foundAnterior.importe ?? foundAnterior.importe_total ?? 0,
                fecha: foundAnterior.fecha ? foundAnterior.fecha.split('T')[0] : (record.fecha_anterior ? record.fecha_anterior.split('T')[0] : ''),
                originalFilename: foundAnterior.filename
            } : {
                competidor: record.competidor,
                local: record.local,
                caja: record.caja || '',
                codigoTienda: record.codigo_tienda || '',
                ticket: record.ticket_anterior?.toString() || '',
                filename: record.filename_anterior,
                originalFilename: record.filename_anterior,
                importe: 0,
                fecha: record.fecha_anterior ? record.fecha_anterior.split('T')[0] : ''
            };
        }

        setEditingTicket({
            actual: { ...actualData, originalFilename: record.filename_actual },
            anterior: anteriorData ? { ...anteriorData, originalFilename: record.filename_anterior } : null,
            alarmStatus: record.status_busqueda
        });
        const idx = alarmRecords.findIndex(r => r.filename_actual === record.filename_actual);
        setEditingIndex(idx >= 0 ? idx : null);
    };

    const navigateTo = (newIndex) => {
        if (newIndex < 0 || newIndex >= alarmRecords.length) return;
        handleEdit(alarmRecords[newIndex]);
    };

    const handleSave = () => {
        if (!onUpdateTicket || !editingTicket) return;

        // Close modal immediately — sync happens in background
        const toSave = editingTicket;
        setEditingTicket(null);

        onUpdateTicket(toSave.actual);
        if (toSave.anterior) {
            onUpdateTicket(toSave.anterior);
        }
    };

    // Construction of the image URL - Assuming a GCS bucket pattern
    // The user should provide the base URL, but we can use a placeholder for now.
    const getImageUrl = (filename) => {
        if (!filename) return null;
        // Updated with the nested folder path identified by the user
        return `https://storage.googleapis.com/ngr-market-share/Tickets%20JPG/Tickets%20JPG/${encodeURIComponent(filename)}`;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        Control de Alarmas
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Identifica y corrige inconsistencias en la captura de datos
                    </p>
                </div>
            </header>

            {/* Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <button
                    onClick={() => { setSelectedStatus('all'); setCurrentPage(1); }}
                    className={`pwa-card p-4 flex flex-col items-center justify-center gap-2 transition-all border-2 ${selectedStatus === 'all' ? 'border-accent-orange bg-accent-orange/5' : 'border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                >
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{alarmRecords.length}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Alarmas</span>
                </button>

                {Object.entries(ALARM_STATUS_CONFIG).map(([status, config]) => {
                    const Icon = config.icon;
                    const isActive = selectedStatus === status;
                    return (
                        <button
                            key={status}
                            onClick={() => { setSelectedStatus(status); setCurrentPage(1); }}
                            className={`pwa-card p-4 flex flex-col items-center justify-center gap-2 transition-all border-2 ${isActive ? `border-${config.color.split('-')[1]}-500 ${config.bg}` : 'border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                        >
                            <Icon size={20} className={config.color} />
                            <span className="text-xl font-black text-slate-900 dark:text-white">{stats[status] || 0}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center leading-tight">
                                {config.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Tab switcher: Alarmas / Estimados */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('alarmas')}
                    className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        activeTab === 'alarmas'
                            ? 'bg-accent-orange text-white shadow-lg shadow-accent-orange/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                >
                    ⚠ Alarmas <span className="ml-1 opacity-70">({alarmRecords.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('estimados')}
                    className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        activeTab === 'estimados'
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                >
                    ◈ Períodos Estimados <span className="ml-1 opacity-70">({estimatedRecords.length})</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6">
                {activeTab === 'estimados' && (
                <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[200px] relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar local, competidor o código..."
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    value={estSearchTerm}
                                    onChange={e => setEstSearchTerm(e.target.value)}
                                />
                            </div>
                            <CustomSelect
                                selected={estFilterComp}
                                onChange={setEstFilterComp}
                                options={estCompOptions}
                                icon={<TrendingUp size={14} />}
                            />
                            <CustomSelect
                                selected={estSortBy}
                                onChange={setEstSortBy}
                                options={[
                                    { value: 'trx_desc', label: 'Trx/día ↓' },
                                    { value: 'trx_asc',  label: 'Trx/día ↑' },
                                    { value: 'competidor', label: 'Competidor A-Z' },
                                    { value: 'confianza', label: 'Confianza' },
                                ]}
                                icon={<ArrowUpDown size={14} />}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-4">Confianza</th>
                                    <th className="px-6 py-4">ID Tienda</th>
                                    <th className="px-6 py-4">Competidor / Local</th>
                                    <th className="px-6 py-4 text-right">Trx/día estimadas</th>
                                    <th className="px-6 py-4 text-right">Total período</th>
                                    <th className="px-6 py-4">Período gap</th>
                                    <th className="px-6 py-4 text-right">Días</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[11px]">
                                {estimatedRecords.length === 0 && (
                                    <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold">Sin períodos estimados</td></tr>
                                )}
                                {estimatedRecords.map((r, idx) => {
                                    const cfg = getEstimadoConfig(r.status_busqueda);
                                    const trxDia = parseFloat(r.promedio) || 0;
                                    const totalTrx = parseFloat(r.transacciones) || 0;
                                    const dias = r.delta_dias ?? '-';
                                    const fechaDesde = r.fecha_anterior ? new Date(r.fecha_anterior).toLocaleDateString('es-ES') : '-';
                                    const fechaHasta = r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '-';
                                    return (
                                        <tr key={idx} className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03] border-l-4`}
                                            style={{ borderLeftColor: cfg?.dot || '#94a3b8' }}>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${cfg?.bg}`}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg?.dot, display: 'inline-block', flexShrink: 0 }} />
                                                    <span className={`font-black text-[10px] uppercase tracking-tighter ${cfg?.color}`}>{cfg?.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-400">{r.codigo_tienda || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase">{r.competidor}</span>
                                                    <span className="text-slate-500 font-bold">{r.local}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-black text-lg ${cfg?.color}`}>{trxDia.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>
                                                <span className="text-slate-400 text-[10px] font-bold ml-1">trx/día</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-600 dark:text-white/60">
                                                {totalTrx > 0 ? Math.round(totalTrx).toLocaleString('es-AR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-400">
                                                {fechaDesde} → {fechaHasta}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-400">{dias}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
                )}
                {activeTab === 'alarmas' && (
                <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col gap-3">
                        {/* Fila 1: Buscador + Ordenar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[240px] relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent-orange transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar por local, competidor o archivo..."
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <div className="w-52 shrink-0">
                                <CustomSelect
                                    selected={sortBy}
                                    onChange={(val) => { setSortBy(val); setCurrentPage(1); }}
                                    options={[
                                        { value: 'fecha_desc', label: 'Fecha ↓ (Reciente)' },
                                        { value: 'fecha_asc', label: 'Fecha ↑ (Antiguo)' },
                                        { value: 'competidor', label: 'Competidor (A-Z)' },
                                        { value: 'local', label: 'Local (A-Z)' },
                                        { value: 'status', label: 'Tipo Alarma' },
                                        { value: 'caja', label: 'Caja' },
                                        { value: 'ticket_desc', label: 'Ticket # ↓' },
                                        { value: 'ticket_asc', label: 'Ticket # ↑' },
                                        { value: 'codigo_tienda', label: 'Código Tienda' },
                                    ]}
                                    icon={<Filter size={14} />}
                                />
                            </div>
                        </div>
                        {/* Fila 2: Selectores de Mes / Competidor / Local */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-44 shrink-0">
                                <CustomSelect
                                    selected={filterMes}
                                    onChange={(val) => { setFilterMes(val); setCurrentPage(1); }}
                                    options={mesOptions}
                                    icon={<CalendarIcon size={14} />}
                                />
                            </div>
                            <div className="w-52 shrink-0">
                                <CustomSelect
                                    selected={filterCompetidor}
                                    onChange={(val) => { setFilterCompetidor(val); setFilterLocal('all'); setCurrentPage(1); }}
                                    options={competidorOptions}
                                    icon={<Store size={14} />}
                                />
                            </div>
                            <div className="w-56 shrink-0">
                                <CustomSelect
                                    selected={filterLocal}
                                    onChange={(val) => { setFilterLocal(val); setCurrentPage(1); }}
                                    options={localOptions}
                                    icon={<MapPin size={14} />}
                                />
                            </div>
                            {(filterMes !== 'all' || filterCompetidor !== 'all' || filterLocal !== 'all' || searchTerm) && (
                                <button
                                    onClick={() => { setFilterMes('all'); setFilterCompetidor('all'); setFilterLocal('all'); setSearchTerm(''); setCurrentPage(1); }}
                                    className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-accent-orange transition-colors flex items-center gap-1"
                                >
                                    <X size={12} /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">ID Tienda</th>
                                    <th className="px-6 py-4">Competidor / Local</th>
                                    <th className="px-6 py-4">Caja</th>
                                    <th className="px-6 py-4">Ticket Detec.</th>
                                    <th className="px-6 py-4">Fecha Reg.</th>
                                    <th className="px-6 py-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[11px]">
                                {paginatedRecords.map((r, idx) => {
                                    const config = ALARM_STATUS_CONFIG[r.status_busqueda] || { label: r.status_busqueda, color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Info };
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
                                                    <config.icon size={12} className={config.color} />
                                                    <span className={`font-black uppercase tracking-tighter ${config.color}`}>{config.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-400">
                                                {r.codigo_tienda || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase">{r.competidor}</span>
                                                    <span className="text-slate-500 font-bold">{r.local}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold">
                                                {r.caja
                                                    ? <span className="text-slate-400">{r.caja}</span>
                                                    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">
                                                        <Hash size={9} />Sin caja
                                                      </span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{r.ticket_actual != null ? `#${r.ticket_actual}` : <span className="text-slate-300 dark:text-white/20">—</span>}</td>
                                            <td className="px-6 py-4 font-bold text-slate-400">
                                                {r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleEdit(r)}
                                                    className="p-2 bg-accent-orange text-white rounded-lg hover:shadow-lg hover:shadow-accent-orange/20 transition-all flex items-center gap-2 font-black uppercase tracking-tighter"
                                                >
                                                    <Edit3 size={14} />
                                                    Corregir
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-slate-50/50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-20"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-20"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </section>
                )}
            </div>

            {/* Edit Modal / Slide-over */}
            {editingTicket && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full ${editingTicket.anterior ? 'max-w-7xl' : 'max-w-5xl'} h-full bg-white dark:bg-slate-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                                    <Edit3 className="text-accent-orange flex-shrink-0" />
                                    {editingTicket.anterior ? 'Comparativa y Corrección Dual' : 'Corrección de Ticket'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.bg || 'bg-slate-100'} ${ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.color || 'text-slate-400'}`}>
                                        {ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.label || editingTicket.alarmStatus}
                                    </span>
                                </div>
                            </div>
                            {/* Navigation arrows + counter */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => navigateTo(editingIndex - 1)}
                                    disabled={editingIndex === null || editingIndex === 0}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Alarma anterior"
                                >
                                    <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
                                </button>
                                {editingIndex !== null && (
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 min-w-[56px] text-center">
                                        {editingIndex + 1} / {alarmRecords.length}
                                    </span>
                                )}
                                <button
                                    onClick={() => navigateTo(editingIndex + 1)}
                                    disabled={editingIndex === null || editingIndex >= alarmRecords.length - 1}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Alarma siguiente"
                                >
                                    <ChevronRight size={20} className="text-slate-600 dark:text-slate-300" />
                                </button>
                                <button
                                    onClick={() => setEditingTicket(null)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors ml-1"
                                >
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden flex flex-col xl:flex-row">
                            {/* Comparison View */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-transparent custom-scrollbar">
                                <div className={`grid grid-cols-1 ${editingTicket.anterior ? 'md:grid-cols-2' : ''} gap-6`}>
                                    {/* Actual Ticket */}
                                    <TicketEditSection
                                        title="Ticket Actual (Detectado)"
                                        data={editingTicket.actual}
                                        onChange={(newData) => setEditingTicket({ ...editingTicket, actual: newData })}
                                        getImageUrl={getImageUrl}
                                    />

                                    {/* Anterior Ticket */}
                                    {editingTicket.anterior && (
                                        <TicketEditSection
                                            title="Ticket Anterior (Referencia)"
                                            data={editingTicket.anterior}
                                            onChange={(newData) => setEditingTicket({ ...editingTicket, anterior: newData })}
                                            getImageUrl={getImageUrl}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Summary & Save */}
                            <div className="w-full xl:w-[320px] border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-slate-950">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resumen de Cambios</h4>
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Competidor/Local</span>
                                            <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase truncate">{editingTicket.actual.competidor} - {editingTicket.actual.local}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Archivos Impactados</span>
                                            <span className="text-[9px] font-bold text-slate-500 dark:text-blue-400 truncate tracking-tight">{editingTicket.actual.originalFilename}</span>
                                            {editingTicket.anterior && (
                                                <span className="text-[9px] font-bold text-slate-500 dark:text-emerald-400 truncate tracking-tight mt-1">{editingTicket.anterior.originalFilename}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-3">
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 bg-accent-orange text-white shadow-accent-orange/20 hover:scale-[1.02] active:scale-95"
                                    >
                                        <Save size={20} />
                                        Guardar Cambios
                                    </button>
                                    {editingIndex !== null && editingIndex < alarmRecords.length - 1 && (
                                        <button
                                            onClick={() => {
                                                handleSave();
                                                // navigateTo fires after handleSave closes modal, so delay slightly
                                                setTimeout(() => navigateTo(editingIndex + 1), 80);
                                            }}
                                            className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
                                        >
                                            <Save size={15} />
                                            Guardar y Siguiente
                                            <ChevronRight size={15} />
                                        </button>
                                    )}
                                    <p className="text-[8px] text-center text-slate-400 font-bold uppercase underline leading-relaxed">
                                        Se ejecutarán comandos UPDATE en facturas_v2 para asegurar la consistencia.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-components for better organization ---

const TicketEditSection = ({ title, data, onChange, getImageUrl }) => {
    const [zoomed, setZoomed] = useState(false);
    const [origin, setOrigin] = useState('50% 50%');
    const imgRef              = useRef(null);
    const imgUrl              = getImageUrl(data.originalFilename);

    const handleImgClick = (e) => {
        if (imgRef.current) {
            const rect = imgRef.current.getBoundingClientRect();
            const x = (((e.clientX - rect.left) / rect.width)  * 100).toFixed(1);
            const y = (((e.clientY - rect.top)  / rect.height) * 100).toFixed(1);
            setOrigin(`${x}% ${y}%`);
        }
        setZoomed(z => !z);
    };

    return (
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-orange" />
                    {title}
                </h4>
                <span className="text-[8px] font-bold text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase truncate max-w-[150px]">
                    {data.originalFilename}
                </span>
            </div>

            <div className="p-0">
                {/* Image Section */}
                <div className={`aspect-[4/5] bg-slate-100 dark:bg-black/20 relative border-b border-slate-100 dark:border-white/5 flex items-center justify-center ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}>
                    {zoomed && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 bg-accent-orange/90 text-white text-[7px] font-black uppercase tracking-widest rounded-full pointer-events-none animate-pulse">
                            Zoom — click para salir
                        </div>
                    )}
                    <img
                        ref={imgRef}
                        src={imgUrl}
                        alt="Ticket"
                        onClick={handleImgClick}
                        style={{ transformOrigin: origin }}
                        className={`object-contain transition-all duration-300 select-none ${zoomed ? 'scale-[1.8] cursor-zoom-out' : 'w-full h-full cursor-zoom-in'}`}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://placehold.co/600x800/1e293b/FFFFFF?text=IMAGEN+NO+ENCONTRADA";
                        }}
                    />
                </div>

                {/* Form Fields */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Cod. Tienda</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Ej: PH 01"
                                    className="w-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                                    value={data.codigoTienda}
                                    onChange={(e) => onChange({ ...data, codigoTienda: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Caja</label>
                            <div className="relative">
                                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                                    value={data.caja}
                                    onChange={(e) => onChange({ ...data, caja: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Num. Ticket</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                                    value={data.ticket}
                                    onChange={(e) => onChange({ ...data, ticket: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Importe</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                                    value={data.importe}
                                    onChange={(e) => onChange({ ...data, importe: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                            <input
                                type="date"
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                                value={data.fecha}
                                onChange={(e) => onChange({ ...data, fecha: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Competidor</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-none p-0 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase focus:ring-0"
                                value={data.competidor}
                                onChange={(e) => onChange({ ...data, competidor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Local</label>
                            <input
                                type="text"
                                className="w-full bg-transparent border-none p-0 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase focus:ring-0"
                                value={data.local}
                                onChange={(e) => onChange({ ...data, local: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlarmasDashboard;
