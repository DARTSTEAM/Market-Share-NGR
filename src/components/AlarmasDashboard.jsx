import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    Search,
    Filter,
    Eye,
    Edit3,
    CheckCircle2,
    XCircle,
    Info,
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
    Store
} from 'lucide-react';
import CustomSelect from './common/CustomSelect';

// Fallback icon for TrendingUp since it wasn't imported from previous context but common in dashboards
const TrendingUp = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const ALARM_STATUS_CONFIG = {
    'REINICIO_TICKETS': { label: 'Reinicio Tickets', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: RefreshCw },
    'ALERTA_SIN_LOCAL': { label: 'Sin Local', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle },
    'HISTORIAL_ANTIGUO': { label: 'Historial Antiguo', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Clock },
    'REVISAR_TRANSACCIONES_ALTAS': { label: 'Transacciones Altas', color: 'text-red-500', bg: 'bg-red-500/10', icon: TrendingUp },
    'ALERTA_SIN_CAJA': { label: 'Sin Caja', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Hash },
    'SIN_HISTORIAL': { label: 'Sin Historial', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Info },
};

const AlarmasDashboard = ({ records, tickets, onUpdateTicket }) => {
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingTicket, setEditingTicket] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtered records based on status and search
    const alarmRecords = useMemo(() => {
        return records.filter(r => {
            if (r.status_busqueda === 'OK') return false;

            const matchesStatus = selectedStatus === 'all' || r.status_busqueda === selectedStatus;
            const matchesSearch =
                (r.local || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.competidor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.filename_actual || '').toLowerCase().includes(searchTerm.toLowerCase());

            return matchesStatus && matchesSearch;
        });
    }, [records, selectedStatus, searchTerm]);

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
        const start = (currentPage - 1) * itemsPerPage;
        return alarmRecords.slice(start, start + itemsPerPage);
    }, [alarmRecords, currentPage]);

    const totalPages = Math.ceil(alarmRecords.length / itemsPerPage);

    const handleEdit = (record) => {
        const foundActual = tickets.find(t => t.filename === record.filename_actual);
        const actualData = foundActual ? {
            ...foundActual,
            codigoTienda: foundActual.codigo_tienda || foundActual.codigoTienda || record.codigo_tienda || '',
            caja: foundActual.numero_de_caja || foundActual.caja || record.caja || '',
            ticket: foundActual.ticket,
            importe: foundActual.importe,
            fecha: foundActual.fecha,
            originalFilename: foundActual.filename
        } : {
            competidor: record.competidor,
            local: record.local,
            caja: record.caja || '',
            codigoTienda: record.codigo_tienda || '',
            ticket: record.ticket_actual,
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
                codigoTienda: foundAnterior.codigo_tienda || foundAnterior.codigoTienda || record.codigo_tienda || '',
                caja: foundAnterior.numero_de_caja || foundAnterior.caja || record.caja || '',
                ticket: foundAnterior.ticket,
                importe: foundAnterior.importe,
                fecha: foundAnterior.fecha,
                originalFilename: foundAnterior.filename
            } : {
                competidor: record.competidor,
                local: record.local,
                caja: record.caja || '',
                codigoTienda: record.codigo_tienda || '',
                ticket: record.ticket_anterior,
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
    };

    const handleSave = async () => {
        if (!onUpdateTicket || !editingTicket) return;

        // Update Actual
        await onUpdateTicket(editingTicket.actual);

        // Update Anterior if exists
        if (editingTicket.anterior) {
            await onUpdateTicket(editingTicket.anterior);
        }

        setEditingTicket(null);
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

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6">
                <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex-1 min-w-[300px] relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent-orange transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por local, competidor o archivo..."
                                className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                                <tr>
                                    <th className="px-6 py-4">Status</th>
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
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase">{r.competidor}</span>
                                                    <span className="text-slate-500 font-bold">{r.local}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-400">{r.caja}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">#{r.ticket_actual}</td>
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
            </div>

            {/* Edit Modal / Slide-over */}
            {editingTicket && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`w-full ${editingTicket.anterior ? 'max-w-7xl' : 'max-w-5xl'} h-full bg-white dark:bg-slate-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                                    <Edit3 className="text-accent-orange" />
                                    {editingTicket.anterior ? 'Comparativa y Corrección Dual' : 'Corrección de Ticket'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.bg || 'bg-slate-100'} ${ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.color || 'text-slate-400'}`}>
                                        {ALARM_STATUS_CONFIG[editingTicket.alarmStatus]?.label || editingTicket.alarmStatus}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingTicket(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X size={24} className="text-slate-400" />
                            </button>
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

                                <div className="pt-6 space-y-4">
                                    <button
                                        onClick={handleSave}
                                        className="w-full py-4 bg-accent-orange text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-accent-orange/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save size={18} />
                                        Sincronizar BQ
                                    </button>
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
                <div className="aspect-[4/5] bg-slate-100 dark:bg-black/20 relative group overflow-hidden border-b border-slate-100 dark:border-white/5">
                    <img
                        src={getImageUrl(data.originalFilename)}
                        alt="Ticket"
                        className="w-full h-full object-contain hover:scale-150 transition-transform duration-500 cursor-zoom-in"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://placehold.co/600x800/1e293b/FFFFFF?text=IMAGEN+NO+ENCONTRADA";
                        }}
                    />
                    <div className="absolute bottom-4 right-4 z-10 p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ImageIcon size={14} className="text-accent-orange" />
                    </div>
                </div>

                {/* Form Fields */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Cod. Tienda (Sin Espacios)</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                                <input
                                    type="text"
                                    placeholder="Ej: PH01"
                                    className="w-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-xl py-2 pl-9 pr-3 text-xs font-bold focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
                                    value={data.codigoTienda}
                                    onChange={(e) => onChange({ ...data, codigoTienda: e.target.value.replace(/\s/g, '') })}
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
