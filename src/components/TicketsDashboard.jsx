import React, { useState, useMemo, useRef } from 'react';
import {
    Ticket, Search, Filter, Calendar, Store,
    ChevronRight, ChevronLeft, Hash,
    DollarSign, ShieldAlert, BarChart2,
    TrendingUp, Edit3, X, Save, Loader2,
    Monitor, MapPin, ArrowUpDown, Image as ImageIcon,
    ZoomIn
} from 'lucide-react';
import CustomSelect from './common/CustomSelect';

const formatCurrency = (val) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val ?? 0);

const ITEMS_PER_PAGE = 15;
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const getImageUrl = (filename) => {
    if (!filename) return null;
    return `https://storage.googleapis.com/ngr-market-share/Tickets%20JPG/Tickets%20JPG/${encodeURIComponent(filename)}`;
};

// ─────────────────────────────────────────────
// Edit Modal with Image Viewer
// ─────────────────────────────────────────────
const EditModal = ({ ticket, onClose, onSave, isSaving }) => {
    const [form, setForm] = useState({
        competidor:   ticket.competidor   || '',
        local:        ticket.local        || '',
        codigoTienda: ticket.codigo_tienda || ticket.codigoTienda || '',
        caja:         ticket.caja         || ticket.numero_de_caja || '',
        ticket:       ticket.ticket       || ticket.numero_de_ticket || '',
        importe:      ticket.importe      ?? ticket.importe_total ?? 0,
        fecha:        ticket.fecha        ? String(ticket.fecha).split('T')[0] : '',
        canal:        ticket.canal        || ticket.canal_de_venta || '',
        filename:     ticket.filename     || '',
    });

    const [imgError, setImgError] = useState(false);
    const [zoomed, setZoomed]     = useState(false);
    const [origin, setOrigin]     = useState('50% 50%');
    const imgRef                  = useRef(null);
    const imageUrl = getImageUrl(form.filename);

    const handleImgClick = (e) => {
        if (imgRef.current) {
            const rect = imgRef.current.getBoundingClientRect();
            const x = (((e.clientX - rect.left) / rect.width)  * 100).toFixed(1);
            const y = (((e.clientY - rect.top)  / rect.height) * 100).toFixed(1);
            setOrigin(`${x}% ${y}%`);
        }
        setZoomed(z => !z);
    };

    const field = (label, key, type = 'text', icon = null) => (
        <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
            <div className="relative">
                {icon && React.cloneElement(icon, { className: 'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300' })}
                <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 ${icon ? 'pl-9' : 'pl-3'} pr-3 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-orange/30 focus:border-accent-orange transition-all`}
                />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[95vh] bg-white dark:bg-slate-950 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-400">

                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Edit3 size={18} className="text-accent-orange" />
                            Editar Ticket
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-xs">
                            {form.filename}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body: Image + Form side by side */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">

                    {/* Image Panel */}
                    <div className="w-full md:w-[340px] shrink-0 bg-slate-100 dark:bg-black/30 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <ImageIcon size={12} className="text-accent-orange" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Imagen del Ticket</span>
                            </div>
                            {zoomed && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-accent-orange animate-pulse">Zoom activo — click para salir</span>
                            )}
                        </div>
                        <div
                            className={`flex-1 min-h-[200px] md:min-h-0 relative flex items-center justify-center ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
                        >
                            {imageUrl && !imgError ? (
                                <img
                                    ref={imgRef}
                                    src={imageUrl}
                                    alt="Ticket"
                                    onClick={handleImgClick}
                                    style={{ transformOrigin: origin }}
                                    className={`object-contain transition-all duration-300 select-none ${zoomed ? 'scale-[1.8] cursor-zoom-out' : 'w-full h-full cursor-zoom-in'}`}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-white/20 p-8">
                                    <ImageIcon size={40} strokeWidth={1} />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-center">
                                        {imgError ? 'Imagen no encontrada' : 'Sin imagen disponible'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Panel */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {field('Competidor',     'competidor',   'text',   <Store size={14} />)}
                            {field('Local',          'local',        'text',   <MapPin size={14} />)}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {field('Cód. Tienda',    'codigoTienda', 'text',   <Store size={14} />)}
                            {field('Caja',           'caja',         'text',   <Monitor size={14} />)}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {field('Nº Ticket',      'ticket',       'text',   <Hash size={14} />)}
                            {field('Importe',        'importe',      'number', <DollarSign size={14} />)}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {field('Fecha',          'fecha',        'date',   <Calendar size={14} />)}
                            {field('Canal de Venta', 'canal',        'text')}
                        </div>

                        {/* Footer buttons inside scroll area */}
                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => onSave(form)}
                                disabled={isSaving}
                                className="flex-[2] py-3 rounded-2xl bg-accent-orange text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-accent-orange/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving
                                    ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                                    : <><Save size={16} /> Guardar Cambios</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
const TicketsDashboard = ({ tickets, records = [], shareData, globalFilters, onFilterChange, onUpdateTicket, isRefreshing }) => {

    const [searchTerm, setSearchTerm]     = useState('');
    const [currentPage, setCurrentPage]   = useState(1);
    const [editingTicket, setEditingTicket] = useState(null);
    const [isSaving, setIsSaving]         = useState(false);
    const [sortBy, setSortBy]             = useState('fecha_desc');

    const [filters, setFilters] = useState({
        competidor:   globalFilters?.competitor || 'all',
        local:        globalFilters?.local      || 'all',
        codigoTienda: 'all',
        mes:          'all',
    });

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            ...(key === 'competidor' ? { local: 'all', codigoTienda: 'all' } : {}),
        }));
        if (onFilterChange && (key === 'competidor' || key === 'local')) {
            const gKey = key === 'competidor' ? 'competitor' : key;
            onFilterChange(prev => ({ ...prev, [gKey]: value }));
        }
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({ competidor: 'all', local: 'all', codigoTienda: 'all', mes: 'all' });
        setSearchTerm('');
        setCurrentPage(1);
    };

    const isFiltered = Object.values(filters).some(v => v !== 'all') || !!searchTerm;

    // ── Filter options ──────────────────────────────
    const competitors = useMemo(() =>
        ['all', ...new Set(tickets.map(t => t.competidor).filter(Boolean))].sort(), [tickets]);

    const locations = useMemo(() => {
        const base = filters.competidor === 'all' ? tickets : tickets.filter(t => t.competidor === filters.competidor);
        return ['all', ...new Set(base.map(t => t.local).filter(Boolean))].sort();
    }, [tickets, filters.competidor]);

    const codigosTienda = useMemo(() => {
        const base = filters.competidor === 'all' ? tickets : tickets.filter(t => t.competidor === filters.competidor);
        return ['all', ...new Set(base.map(t => t.codigo_tienda).filter(Boolean))].sort();
    }, [tickets, filters.competidor]);

    const meses = useMemo(() => {
        const ms = new Set();
        tickets.forEach(t => {
            if (t.fecha) { const d = new Date(t.fecha); if (!isNaN(d)) ms.add(d.getMonth() + 1); }
        });
        return Array.from(ms).sort((a, b) => a - b);
    }, [tickets]);

    // ── Filtering & Sorting ──────────────────────────
    const filteredTickets = useMemo(() => {
        let result = tickets.filter(t => {
            const s = searchTerm.toLowerCase();
            const matchesSearch = !s
                || (t.numero_de_ticket || t.ticket || '').toLowerCase().includes(s)
                || (t.local || '').toLowerCase().includes(s)
                || (t.competidor || '').toLowerCase().includes(s)
                || (t.codigo_tienda || '').toLowerCase().includes(s);

            const matchesComp    = filters.competidor === 'all'   || t.competidor === filters.competidor;
            const matchesLocal   = filters.local === 'all'        || t.local === filters.local;
            const matchesCodigo  = filters.codigoTienda === 'all' || t.codigo_tienda === filters.codigoTienda;
            const matchesMes     = filters.mes === 'all' || (() => {
                if (!t.fecha) return false;
                const d = new Date(t.fecha);
                return !isNaN(d) && String(d.getMonth() + 1) === filters.mes;
            })();

            return matchesSearch && matchesComp && matchesLocal && matchesCodigo && matchesMes;
        });

        return [...result].sort((a, b) => {
            if (sortBy === 'fecha_desc')   return new Date(b.fecha || 0) - new Date(a.fecha || 0);
            if (sortBy === 'fecha_asc')    return new Date(a.fecha || 0) - new Date(b.fecha || 0);
            if (sortBy === 'competidor')   return (a.competidor || '').localeCompare(b.competidor || '');
            if (sortBy === 'local')        return (a.local || '').localeCompare(b.local || '');
            if (sortBy === 'importe_desc') return (parseFloat(b.importe) || 0) - (parseFloat(a.importe) || 0);
            if (sortBy === 'importe_asc')  return (parseFloat(a.importe) || 0) - (parseFloat(b.importe) || 0);
            if (sortBy === 'ticket_desc')  return (parseInt(b.ticket || b.numero_de_ticket) || 0) - (parseInt(a.ticket || a.numero_de_ticket) || 0);
            if (sortBy === 'ticket_asc')   return (parseInt(a.ticket || a.numero_de_ticket) || 0) - (parseInt(b.ticket || b.numero_de_ticket) || 0);
            return 0;
        });
    }, [tickets, searchTerm, filters, sortBy]);

    // ── Pagination ───────────────────────────────────
    const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTickets, currentPage]);

    // ── Stats ─────────────────────────────────────────
    const stats = useMemo(() => {
        const total       = filteredTickets.length;
        const totalImporte = filteredTickets.reduce((s, t) => s + (parseFloat(t.importe ?? t.importe_total) || 0), 0);
        const sinLocal    = filteredTickets.filter(t => !t.local || t.local === 'DESCONOCIDO').length;
        const routineStats = records.reduce((acc, r) => {
            const mc = filters.competidor === 'all' || r.competidor === filters.competidor;
            const ml = filters.local === 'all' || r.local === filters.local;
            if (mc && ml) { r.status_busqueda === 'OK' ? acc.cerradas++ : acc.conError++; }
            return acc;
        }, { cerradas: 0, conError: 0 });
        return { total, importe: totalImporte, sinLocal, ...routineStats };
    }, [filteredTickets, records, filters]);

    // ── Helpers ───────────────────────────────────────
    const formatDate = (d) => {
        if (!d) return '-';
        const dd = new Date(d);
        return isNaN(dd) ? '-' : dd.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const parseHour = (h) => {
        if (!h) return '-';
        try { return h.startsWith('{') ? (JSON.parse(h).value || '-') : h; } catch { return h; }
    };

    // ── Save ──────────────────────────────────────────
    const handleSave = async (form) => {
        if (!onUpdateTicket) return;
        setIsSaving(true);
        try {
            await onUpdateTicket({
                filename:     form.filename,
                ticket:       form.ticket,
                importe:      form.importe,
                fecha:        form.fecha,
                caja:         form.caja,
                local:        form.local,
                competidor:   form.competidor,
                codigoTienda: form.codigoTienda,
            });
            setEditingTicket(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header + Stats */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="shrink-0">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Ticket className="w-8 h-8 text-accent-orange" />
                        Auditoría de Tickets
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Explorá, filtrá y editá cada ticket del sistema
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
                    {[
                        { label: 'Tickets',       value: stats.total,                icon: <TrendingUp size={12} />, color: 'text-accent-orange' },
                        { label: 'Importe Total', value: formatCurrency(stats.importe), icon: <DollarSign size={12} />, color: 'text-accent-lemon' },
                        { label: 'Sin Local',     value: stats.sinLocal,             icon: <ShieldAlert size={12} />, color: 'text-orange-500' },
                        { label: 'Cajas OK',      value: stats.cerradas,             icon: <BarChart2 size={12} />,  color: 'text-sky-400' },
                        { label: 'Con Error',     value: stats.conError,             icon: <ShieldAlert size={12} />, color: 'text-red-500', valueClass: 'text-red-600 dark:text-red-400' },
                    ].map(s => (
                        <div key={s.label} className="pwa-card no-hover px-4 py-3 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 flex flex-col min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30 truncate">{s.label}</span>
                                <span className={s.color + ' opacity-40'}>{s.icon}</span>
                            </div>
                            <span className={`text-xl font-black font-mono truncate ${s.valueClass || 'text-slate-900 dark:text-white'}`}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Filters */}
            <section className="pwa-card no-hover p-4 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50 space-y-3">
                {/* Row 1: Search + Sort */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[260px] relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent-orange transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por ticket, local, competidor o código..."
                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent-orange/20 focus:border-accent-orange transition-all"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="w-52 shrink-0">
                        <CustomSelect
                            selected={sortBy}
                            onChange={v => { setSortBy(v); setCurrentPage(1); }}
                            options={[
                                { value: 'fecha_desc',   label: 'Fecha ↓ (Reciente)' },
                                { value: 'fecha_asc',    label: 'Fecha ↑ (Antiguo)' },
                                { value: 'importe_desc', label: 'Importe ↓' },
                                { value: 'importe_asc',  label: 'Importe ↑' },
                                { value: 'ticket_desc',  label: 'Ticket # ↓' },
                                { value: 'ticket_asc',   label: 'Ticket # ↑' },
                                { value: 'competidor',   label: 'Competidor (A-Z)' },
                                { value: 'local',        label: 'Local (A-Z)' },
                            ]}
                            icon={<ArrowUpDown size={14} />}
                        />
                    </div>
                </div>

                {/* Row 2: Category Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="w-52 shrink-0">
                        <CustomSelect
                            selected={filters.competidor}
                            onChange={v => handleFilterChange('competidor', v)}
                            options={competitors.map(c => ({ value: c, label: c === 'all' ? 'Todos los Competidores' : c }))}
                            icon={<Store size={14} />}
                        />
                    </div>
                    <div className="w-56 shrink-0">
                        <CustomSelect
                            selected={filters.local}
                            onChange={v => handleFilterChange('local', v)}
                            options={locations.map(l => ({ value: l, label: l === 'all' ? 'Todos los Locales' : l }))}
                            icon={<MapPin size={14} />}
                        />
                    </div>
                    <div className="w-44 shrink-0">
                        <CustomSelect
                            selected={filters.codigoTienda}
                            onChange={v => handleFilterChange('codigoTienda', v)}
                            options={codigosTienda.map(c => ({ value: c, label: c === 'all' ? 'Todos los Códigos' : c }))}
                            icon={<Hash size={14} />}
                        />
                    </div>
                    <div className="w-44 shrink-0">
                        <CustomSelect
                            selected={filters.mes}
                            onChange={v => handleFilterChange('mes', v)}
                            options={[
                                { value: 'all', label: 'Todos los Meses' },
                                ...meses.map(m => ({ value: String(m), label: MONTH_NAMES[m - 1] }))
                            ]}
                            icon={<Calendar size={14} />}
                        />
                    </div>

                    {isFiltered && (
                        <button
                            onClick={clearFilters}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-accent-orange transition-colors flex items-center gap-1"
                        >
                            <X size={12} /> Limpiar filtros
                        </button>
                    )}
                </div>
            </section>

            {/* Table */}
            <section className="pwa-card overflow-hidden border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/40 font-black text-[9px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-5 py-4">Competidor</th>
                                <th className="px-5 py-4">Local / Cód.</th>
                                <th className="px-5 py-4 text-center">Ticket #</th>
                                <th className="px-5 py-4 text-center">Caja</th>
                                <th className="px-5 py-4 text-right">Importe</th>
                                <th className="px-5 py-4 text-center">Fecha / Hora</th>
                                <th className="px-5 py-4 text-center">Imagen</th>
                                <th className="px-5 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px] text-slate-700 dark:text-white/70">
                            {paginatedTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400 dark:text-white/20 font-black uppercase tracking-widest text-xs">
                                        No se encontraron tickets con los filtros aplicados
                                    </td>
                                </tr>
                            ) : paginatedTickets.map((t, idx) => {
                                const color  = shareData?.find(s => s.name === t.competidor)?.color || '#94a3b8';
                                const caja   = t.caja || t.numero_de_caja;
                                const ticket = t.ticket || t.numero_de_ticket;
                                const importe = t.importe ?? t.importe_total;
                                const imgUrl = getImageUrl(t.filename);

                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-5 py-4">
                                            <span
                                                className="font-black text-[10px] tracking-widest px-2.5 py-1 rounded-full border inline-block"
                                                style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}
                                            >
                                                {t.competidor}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[160px]">{t.local || '—'}</span>
                                                <span className="text-[9px] font-black text-accent-orange/70 font-mono">{t.codigo_tienda || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                                            #{ticket}
                                        </td>
                                        <td className="px-5 py-4 text-center font-mono text-slate-500 dark:text-white/40 font-bold">
                                            {caja || '—'}
                                        </td>
                                        <td className="px-5 py-4 text-right font-black text-slate-900 dark:text-white">
                                            {formatCurrency(importe)}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold">{formatDate(t.fecha)}</span>
                                                <span className="text-[9px] font-black uppercase text-slate-300 dark:text-white/20">{parseHour(t.hora)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {imgUrl ? (
                                                <div className="w-10 h-12 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer group/img relative"
                                                    onClick={() => setEditingTicket(t)}
                                                >
                                                    <img
                                                        src={imgUrl}
                                                        alt="ticket"
                                                        className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                                        onError={e => { e.target.onerror = null; e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-300"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`; }}
                                                    />
                                                    <div className="absolute inset-0 bg-accent-orange/0 group-hover/img:bg-accent-orange/20 transition-colors flex items-center justify-center">
                                                        <ZoomIn size={12} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-200 dark:text-white/10 text-[9px] font-black uppercase">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => setEditingTicket(t)}
                                                className="p-2 bg-accent-orange/10 text-accent-orange rounded-xl hover:bg-accent-orange hover:text-white transition-all flex items-center gap-1.5 font-black uppercase tracking-tighter text-[9px] mx-auto"
                                            >
                                                <Edit3 size={12} /> Editar
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                        Mostrando <span className="text-slate-900 dark:text-white">{paginatedTickets.length}</span> de{' '}
                        <span className="text-slate-900 dark:text-white">{filteredTickets.length}</span> tickets
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} className="text-slate-600 dark:text-white" />
                        </button>
                        <div className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                {currentPage} / {totalPages || 1}
                            </span>
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} className="text-slate-600 dark:text-white" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Edit Modal */}
            {editingTicket && (
                <EditModal
                    ticket={editingTicket}
                    onClose={() => setEditingTicket(null)}
                    onSave={handleSave}
                    isSaving={isSaving || isRefreshing}
                />
            )}
        </div>
    );
};

export default TicketsDashboard;
