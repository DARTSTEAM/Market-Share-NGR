import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, FileDown, Loader2, Maximize2, Minimize2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const CATEGORY_EMOJI = {
    'Pollo Frito': '🍗',
    'Hamburguesa': '🍔',
    'Pizza':       '🍕',
    'Chifas':      '🥡',
};

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const COMPETITOR_COLORS = [
    '#ff5e00', '#0070f3', '#ccff00', '#7000f3', '#00f3a0',
    '#ff3366', '#00ccff', '#ffcc00', '#33ff99', '#cc00ff',
];

// ─── Brand color palette ───────────────────────────────────────────────
const BRAND_COLORS = {
    // — Hamburguesa —
    'mcdonald':    '#FFC72C',
    'burger king': '#FF7A00',
    'bembos':      '#CC1F1F',
    'hermanos':    '#A52020',
    // — Pollo Frito —
    'kfc':         '#F40027',
    'popeyes':     '#F26522',
    'church':      '#8B0000',
    'norkys':      '#F0A500',
    'pardos':      '#7B3F00',
    // — Pizza —
    'pizza hut':   '#8B1A1A',
    'domino':      '#006AAD',
    'papa john':   '#007743',
    'telepizza':   '#C00D0D',
    // — Chifas —
    'chinawok':    '#F0A500',
    'china wok':   '#F0A500',
};

// Find best brand color by partial-matching the competitor name
const getBrandColor = (name, fallbackIdx = 0) => {
    if (!name) return COMPETITOR_COLORS[fallbackIdx % COMPETITOR_COLORS.length];
    const lower = String(name || '').toLowerCase().trim();
    for (const [brand, color] of Object.entries(BRAND_COLORS)) {
        if (lower.includes(brand)) return color;
    }
    return COMPETITOR_COLORS[fallbackIdx % COMPETITOR_COLORS.length];
};

// ─── Table section ────────────────────────────────────────────────────────────
const SectionTable = ({ title, headerColor = '#1e3a5f', rows, months, renderCell, footnote }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg">
        <table className="w-full text-left whitespace-nowrap text-[11px]">
            <thead>
                <tr>
                    <th
                        className="px-4 py-3 font-black uppercase tracking-widest text-white text-center"
                        style={{ backgroundColor: headerColor, minWidth: 160 }}
                        colSpan={months.length + 1}
                    >
                        {title}
                    </th>
                </tr>
                <tr className="bg-slate-100 dark:bg-white/[0.04]">
                    <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 160 }}>
                        Competidor
                    </th>
                    {months.map(m => (
                        <th key={m.key} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right" style={{ minWidth: 90 }}>
                            {m.label}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {rows.map((row, i) => (
                    <tr
                        key={row.label}
                        className={`transition-colors ${row.isTotal
                            ? 'bg-slate-50 dark:bg-white/[0.03] font-black text-slate-900 dark:text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] text-slate-700 dark:text-white/70'
                            }`}
                    >
                        <td className="px-4 py-2.5 font-bold">
                            {row.isTotal ? (
                                <span className="text-slate-900 dark:text-white font-black uppercase tracking-wider">Total</span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: row.color }}
                                    />
                                    {row.label}
                                </span>
                            )}
                        </td>
                        {months.map(m => (
                            <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                {renderCell(row, m)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            {footnote && (
                <tfoot>
                    <tr>
                        <td colSpan={months.length + 1} className="px-4 py-2 text-[9px] text-slate-400 dark:text-white/20 font-bold uppercase tracking-widest">
                            {footnote}
                        </td>
                    </tr>
                </tfoot>
            )}
        </table>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ClientesDashboard = ({ records, competitorToCategory, ngrLocales = [], filters }) => {
    const selectedCategories = filters?.category?.length > 0 ? filters.category : ['Hamburguesa'];
    const selectedCompetitors = filters?.competitor || [];
    const filterYear = filters?.year || [];

    const [sortCaja, setSortCaja] = useState('competidor_asc');
    const [evolucionMetric, setEvolucionMetric] = useState('trx_avg');
    const [sortEvol, setSortEvol] = useState('competidor_asc');



    const [topMetric, setTopMetric] = useState('prom_diario'); // show prom diario only
    const [exporting, setExporting] = useState(false);
    const [expandDistribucion, setExpandDistribucion] = useState(false);
    const [expandEvolucion, setExpandEvolucion] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportSelections, setExportSelections] = useState({
        trx: true, crec: true, share: true, tiendas: true, distribucion: true, evolucion: true,
    });

    const refTrx = useRef(null);
    const refCrec = useRef(null);
    const refShare = useRef(null);
    const refTiendas = useRef(null);
    const refDistribucion = useRef(null);
    const refEvolucion = useRef(null);

    const EXPORT_SECTIONS = [
        { key: 'trx', label: 'Trx Totales', ref: refTrx },
        { key: 'crec', label: 'Crec %', ref: refCrec },
        { key: 'share', label: 'Share %', ref: refShare },
        { key: 'tiendas', label: 'Número de Tiendas', ref: refTiendas },
        { key: 'distribucion', label: 'Distribución por Caja', ref: refDistribucion },
        { key: 'evolucion', label: 'Evolución por Caja', ref: refEvolucion },
    ];

    const exportPDF = useCallback(async () => {
        setShowExportModal(false);
        setExporting(true);
        try {
            const isDark = document.documentElement.classList.contains('dark');
            const bg = isDark ? '#0f172a' : '#f8fafc';
            const MARGIN = 8;   // mm margin on each side
            const GAP = 4;      // mm between sections
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const contentW = pageW - MARGIN * 2;

            let cursorY = MARGIN;      // current Y position on the page
            let isFirstSection = true;

            for (const section of EXPORT_SECTIONS) {
                if (!exportSelections[section.key] || !section.ref.current) continue;

                const canvas = await html2canvas(section.ref.current, {
                    scale: 2, useCORS: true, backgroundColor: bg, logging: false,
                });
                const imgData = canvas.toDataURL('image/png');
                // Scale image to fit content width
                const imgH = (canvas.height * contentW) / canvas.width;

                if (!isFirstSection) {
                    // Check if section fits on remaining page space (with gap)
                    const needed = GAP + Math.min(imgH, pageH - MARGIN * 2);
                    if (cursorY + needed > pageH - MARGIN) {
                        pdf.addPage();
                        cursorY = MARGIN;
                    } else {
                        cursorY += GAP;
                    }
                }
                isFirstSection = false;

                // Draw the image, potentially spanning multiple pages
                let remainingH = imgH;
                let srcOffsetY = 0;
                while (remainingH > 0) {
                    const availableH = pageH - MARGIN - cursorY;
                    const sliceH = Math.min(remainingH, availableH > 0 ? availableH : pageH - MARGIN * 2);
                    // jsPDF clips drawing that goes outside the page, so we place the
                    // full image shifted up by srcOffsetY and let the page clip it.
                    pdf.addImage(imgData, 'PNG', MARGIN, cursorY - srcOffsetY, contentW, imgH);
                    srcOffsetY += sliceH;
                    remainingH -= sliceH;
                    if (remainingH > 0) {
                        pdf.addPage();
                        cursorY = MARGIN;
                    } else {
                        cursorY += sliceH;
                    }
                }
            }

            const catLabel = selectedCategories.join('+').replace(/ /g, '_');
            pdf.save(`Clientes_${catLabel}_${new Date().toISOString().slice(0, 10)}.pdf`);
        } finally {
            setExporting(false);
        }
    }, [exportSelections, selectedCategories, EXPORT_SECTIONS]);
    const categories = ['Pollo Frito', 'Hamburguesa', 'Pizza', 'Chifas'];


    // Confidence dot colors for ESTIMADO-* rows
    const CONFIANZA_DOT = {
        'ALTA':          '#10b981',
        'MEDIA':         '#eab308',
        'BAJA':          '#ca8a04',
        'MUY_BAJA':      '#f97316',
        'SIN_HISTORIAL': '#ef4444',
    };

    // Build pivot: for each competitor x month → { trx, tiendas (distinct locals) }
    const { months, competitors, pivot } = useMemo(() => {
        // Filter to OK records in selected category
        const CUTOFF = 2025 * 100 + 11; // Nov 2025 inclusive para historico
        const filtered = records.filter(r => {
            const key = parseInt(r.ano || 0) * 100 + parseInt(r.mes || 0);
            if (r.status_busqueda === 'HISTORIAL' && key > CUTOFF) return false;
            if (r.status_busqueda === 'OK'        && key <= CUTOFF) return false;
            if (r.status_busqueda !== 'OK' && r.status_busqueda !== 'HISTORIAL') return false;
            
            // Global Filters
            if (filterYear.length > 0 && !filterYear.includes(String(r.ano))) return false;
            if (filters?.month?.length > 0 && !filters.month.includes(String(parseInt(r.mes) - 1))) return false;
            if (!selectedCategories.includes(competitorToCategory[r.competidor])) return false;
            if (selectedCompetitors.length > 0 && !selectedCompetitors.includes(r.competidor)) return false;
            if (filters?.local?.length > 0 && !filters.local.includes(r.local)) return false;
            if (filters?.region?.length > 0 && !filters.region.includes(r.region)) return false;
            if (filters?.distrito?.length > 0 && !filters.distrito.includes(r.distrito)) return false;
            if (filters?.zona?.length > 0 && !filters.zona.includes(r.zona)) return false;
            if (filters?.codigoTienda?.length > 0 && !filters.codigoTienda.includes(r.codigo_tienda)) return false;

            return !!(r.mes && r.ano);
        });

        // Derive sorted months
        const monthSet = {};
        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const key = `${ano}-${String(mes).padStart(2, '0')}`;
            if (!monthSet[key]) monthSet[key] = { key, ano, mes, label: `${MONTH_SHORT[mes - 1]}-${String(ano).slice(2)}` };
        });
        const months = Object.values(monthSet).sort((a, b) => a.key.localeCompare(b.key));

        // Derive competitors
        const compSet = new Set(filtered.map(r => r.competidor).filter(Boolean));
        const competitors = Array.from(compSet).sort();

        // Build pivot
        // pivot[comp][monthKey] = { trx: number, locals: Set }
        const pivot = {};
        const pivotTotal = {}; // pivot['__total__'][monthKey]

        competitors.forEach(c => { pivot[c] = {}; });
        months.forEach(m => { pivotTotal[m.key] = { trx: 0, locals: new Set() }; });

        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const mk = `${ano}-${String(mes).padStart(2, '0')}`;
            const comp = r.competidor;
            if (!comp || !pivot[comp]) return;

            if (!pivot[comp][mk]) pivot[comp][mk] = { trx: 0, promSum: 0, locals: new Set() };
            const trx = parseFloat(r.transacciones) || 0;
            const prom = parseFloat(r.promedio) || 0;
            pivot[comp][mk].trx += trx;
            pivot[comp][mk].promSum += prom;
            pivot[comp][mk].locals.add(r.local);
            if (!pivotTotal[mk]) pivotTotal[mk] = { trx: 0, promSum: 0, locals: new Set() };
            pivotTotal[mk].trx += trx;
            pivotTotal[mk].promSum += prom;
            pivotTotal[mk].locals.add(r.local);
        });

        pivot['__total__'] = pivotTotal;

        return { months, competitors, pivot };
    }, [records, selectedCategories, selectedCompetitors, filterYear, filters, competitorToCategory]);





    // ── Local pivot: (competidor, local) × month ──────────────────────
    const { cajaRows, cajaMonths } = useMemo(() => {
        const CUTOFF2 = 202511;
        const filtered = records.filter(r => {
            const key = parseInt(r.ano || 0) * 100 + parseInt(r.mes || 0);
            const isEst = r.status_busqueda?.startsWith('ESTIMADO-');
            if (r.status_busqueda === 'HISTORIAL' && key > CUTOFF2) return false;
            if (r.status_busqueda === 'OK'        && key <= CUTOFF2) return false;
            if (isEst                             && key <= CUTOFF2) return false; // estimados solo post-cutoff
            if (!isEst && r.status_busqueda !== 'OK' && r.status_busqueda !== 'HISTORIAL') return false;
            
            // Global Filters
            if (filterYear.length > 0 && !filterYear.includes(String(r.ano))) return false;
            if (filters?.month?.length > 0 && !filters.month.includes(String(parseInt(r.mes) - 1))) return false;
            if (!selectedCategories.includes(competitorToCategory[r.competidor])) return false;
            if (selectedCompetitors.length > 0 && !selectedCompetitors.includes(r.competidor)) return false;
            if (filters?.local?.length > 0 && !filters.local.includes(r.local)) return false;
            if (filters?.region?.length > 0 && !filters.region.includes(r.region)) return false;
            if (filters?.distrito?.length > 0 && !filters.distrito.includes(r.distrito)) return false;
            if (filters?.zona?.length > 0 && !filters.zona.includes(r.zona)) return false;
            if (filters?.codigoTienda?.length > 0 && !filters.codigoTienda.includes(r.codigo_tienda)) return false;

            // Internal sub-filter
            if (filterCompetidor !== 'all' && r.competidor !== filterCompetidor) return false;

            return !!(r.mes && r.ano && r.local);
        });

        const pivotMap = {};
        const monthSet = {};

        filtered.forEach(r => {
            const ano = parseInt(r.ano);
            const mes = parseInt(r.mes);
            if (!ano || !mes || isNaN(ano) || isNaN(mes)) return;
            const mk = `${ano}-${String(mes).padStart(2, '0')}`;
            const rowKey = `${r.competidor}||${r.local}`;

            if (!monthSet[mk]) monthSet[mk] = { key: mk, label: `${MONTH_SHORT[mes - 1]}-${String(ano).slice(2)}` };

            if (!pivotMap[rowKey]) {
                const isEst = r.status_busqueda?.startsWith('ESTIMADO-');
                pivotMap[rowKey] = {
                    local: r.local, competidor: r.competidor,
                    months: {}, promedios: {}, promCounts: {}, counts: {}, total: 0,
                    isEstimado: isEst,
                    confianza: isEst ? r.status_busqueda.replace('ESTIMADO-', '') : null,
                };
            }
            const trx = parseFloat(r.transacciones) || 0;
            const prom = parseFloat(r.promedio) || 0;
            pivotMap[rowKey].months[mk] = (pivotMap[rowKey].months[mk] || 0) + trx;
            pivotMap[rowKey].counts[mk] = (pivotMap[rowKey].counts[mk] || 0) + 1;
            pivotMap[rowKey].promedios[mk] = (pivotMap[rowKey].promedios[mk] || 0) + prom;
            pivotMap[rowKey].promCounts[mk] = (pivotMap[rowKey].promCounts[mk] || 0) + 1;
            pivotMap[rowKey].total += trx;
        });

        const cajaMonths = Object.values(monthSet).sort((a, b) => a.key.localeCompare(b.key));
        const cajaRows = Object.values(pivotMap).sort((a, b) =>
            a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local)
        );

        // Compute local totals for % calculation
        const localTotals = {};
        cajaRows.forEach(r => {
            localTotals[r.local] = (localTotals[r.local] || 0) + r.total;
        });
        cajaRows.forEach(r => { r.localTotal = localTotals[r.local] || 1; });

        return { cajaRows, cajaMonths };
    }, [records, selectedCategories, selectedCompetitors, filterYear, filters, competitorToCategory]);

    // ── Display rows for Distribución table (filtered by month + sorted) ────────
    const distribRows = useMemo(() => {
        const withTrx = cajaRows.map(row => {
            // If header filters select specific months, we should probably average them.
            // If nothing selected, average all.
            const targetMonths = filters?.month?.length > 0 ? filters.month : Object.keys(row.promedios || {});
            
            const promSum = targetMonths.reduce((s, mk) => {
                const val = row.promedios?.[mk];
                return s + (val != null ? val / (row.promCounts[mk] || 1) : 0);
            }, 0);
            const avgProm = targetMonths.length > 0 ? promSum / targetMonths.length : 0;

            return { ...row, displayTrx: avgProm };
        });
        // Recompute local totals for the selected period
        const localTotals = {};
        withTrx.forEach(r => { localTotals[r.local] = (localTotals[r.local] || 0) + r.displayTrx; });
        const withPct = withTrx.map(r => ({
            ...r,
            pct: localTotals[r.local] ? (r.displayTrx / localTotals[r.local]) * 100 : 0,
        }));
        return [...withPct].sort((a, b) => {
            if (sortCaja === 'competidor_asc') return a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local);
            if (sortCaja === 'local_asc') return a.local.localeCompare(b.local);
            if (sortCaja === 'trx_desc') return b.displayTrx - a.displayTrx;
            if (sortCaja === 'trx_asc') return a.displayTrx - b.displayTrx;
            if (sortCaja === 'pct_desc') return b.pct - a.pct;
            return 0;
        });
    }, [cajaRows, sortCaja, filters]);

    // Build rows for each table (competitors + total)
    const rows = useMemo(() => {
        return [
            ...competitors.map((c, i) => ({ label: c, key: c, isTotal: false, color: getBrandColor(c, i) })),
            { label: 'Total', key: '__total__', isTotal: true, color: '#94a3b8' },
        ];
    }, [competitors]);

    // Apply competitor multi-filter to rows (removes Total when specific ones are selected)
    const filteredRows = useMemo(() => {
        if (selectedCompetitors.length === 0) return rows;
        return rows.filter(r => !r.isTotal && selectedCompetitors.includes(r.key));
    }, [rows, selectedCompetitors]);

    // Helpers
    const getTrx = (compKey, monthKey) => pivot[compKey]?.[monthKey]?.trx ?? null;
    const getTiendas = (compKey, monthKey) => pivot[compKey]?.[monthKey]?.locals?.size ?? null;
    const getTotalTrx = (monthKey) => pivot['__total__']?.[monthKey]?.trx ?? null;

    const getProm = (compKey, monthKey) => pivot[compKey]?.[monthKey]?.promSum ?? null;

    const formatTrx = (v) => v === null ? <span className="text-slate-300 dark:text-white/15">-</span> : new Intl.NumberFormat('es-PE').format(Math.round(v));

    const renderCrec = (compKey, m, i) => {
        if (i === 0) return <span className="text-slate-300 dark:text-white/15">#N/A</span>;
        const curr = getTrx(compKey, months[i].key);
        const prev = getTrx(compKey, months[i - 1].key);
        if (curr === null && prev === null) return <span className="text-slate-300 dark:text-white/15">-</span>;
        if (prev === null || prev === 0) return <span className="text-slate-300 dark:text-white/15">#N/A</span>;
        const pct = ((curr - prev) / prev) * 100;
        const color = pct > 0 ? 'text-emerald-500' : pct < 0 ? 'text-red-500' : 'text-slate-400';
        return (
            <span className={`font-black ${color}`}>
                {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
            </span>
        );
    };

    const renderShare = (compKey, monthKey) => {
        if (compKey === '__total__') {
            return <span className="text-slate-900 dark:text-white font-black">100%</span>;
        }
        const compTrx = getTrx(compKey, monthKey);
        const totalTrx = getTotalTrx(monthKey);
        if (compTrx === null || !totalTrx) return <span className="text-slate-300 dark:text-white/15">-</span>;
        const pct = (compTrx / totalTrx) * 100;
        return <span>{pct.toFixed(1)}%</span>;
    };

    const hasData = months.length > 0 && competitors.length > 0;

    const exportCSV = useCallback(() => {
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const sections = [];

        // Helper: raw number from renderCrec
        const getCrecRaw = (compKey, i) => {
            if (i === 0) return '#N/A';
            const curr = getTrx(compKey, months[i].key);
            const prev = getTrx(compKey, months[i - 1].key);
            if (curr === null && prev === null) return '-';
            if (prev === null || prev === 0) return '#N/A';
            return (((curr - prev) / prev) * 100).toFixed(1) + '%';
        };
        const getShareRaw = (compKey, monthKey) => {
            if (compKey === '__total__') return '100%';
            const ct = getTrx(compKey, monthKey);
            const tt = getTotalTrx(monthKey);
            if (ct === null || !tt) return '-';
            return ((ct / tt) * 100).toFixed(1) + '%';
        };

        // Trx Totales
        sections.push('Trx Totales');
        sections.push(['Competidor', ...months.map(m => m.label)].map(esc).join(','));
        rows.forEach(row => {
            const vals = months.map(m => { const v = getTrx(row.key, m.key); return v === null ? '-' : Math.round(v); });
            sections.push([row.label, ...vals].map(esc).join(','));
        });
        sections.push('');

        // Crec %
        sections.push('Crec %');
        sections.push(['Competidor', ...months.map(m => m.label)].map(esc).join(','));
        rows.forEach(row => {
            const vals = months.map((m, idx) => getCrecRaw(row.key, idx));
            sections.push([row.label, ...vals].map(esc).join(','));
        });
        sections.push('');

        // Share %
        sections.push('Share %');
        sections.push(['Competidor', ...months.map(m => m.label)].map(esc).join(','));
        rows.forEach(row => {
            const vals = months.map(m => getShareRaw(row.key, m.key));
            sections.push([row.label, ...vals].map(esc).join(','));
        });
        sections.push('');

        // Tiendas
        sections.push('Número de Tiendas');
        sections.push(['Competidor', ...months.map(m => m.label)].map(esc).join(','));
        rows.forEach(row => {
            const vals = months.map(m => { const v = getTiendas(row.key, m.key); return v === null ? '-' : v; });
            sections.push([row.label, ...vals].map(esc).join(','));
        });
        sections.push('');

        // Distribución por Local
        sections.push('Distribución de Ventas por Local');
        sections.push(['Competidor', 'Local', 'Trx Totales', '% del Local'].map(esc).join(','));
        distribRows.forEach(row => {
            sections.push([row.competidor, row.local, Math.round(row.displayTrx), row.pct.toFixed(1) + '%'].map(esc).join(','));
        });
        sections.push('');

        // Evolución por Local
        sections.push('Evolución por Local');
        sections.push(['Competidor', 'Local', ...cajaMonths.map(m => m.label)].map(esc).join(','));
        cajaRows.forEach(row => {
            const vals = cajaMonths.map(m => {
                const v = evolucionMetric === 'trx_total'
                    ? row.months[m.key]
                    : (row.promedios?.[m.key] !== undefined ? (row.promedios[m.key] / (row.promCounts?.[m.key] || 1)) : undefined);
                return v !== undefined ? v.toFixed(1) : '-';
            });
            sections.push([row.competidor, row.local, ...vals].map(esc).join(','));
        });

        const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Clientes_${selectedCategories.join('+').replace(/ /g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filteredRows, rows, months, distribRows, cajaRows, cajaMonths, evolucionMetric, selectedCategories, getTrx, getTotalTrx, getTiendas]);


    return (
        <motion.div
            key="clientes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
        >
            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-8 h-8 text-accent-orange" />
                        Evolución por Categoría
                    </h2>
                    <p className="text-slate-500 dark:text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                        Análisis temporal de métricas por tipo de comida
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Export buttons */}
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-emerald-500 hover:text-emerald-500 transition-all duration-200"
                    >
                        <FileText className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button
                        onClick={() => setShowExportModal(true)}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-accent-orange hover:text-accent-orange transition-all duration-200 disabled:opacity-50"
                    >
                        {exporting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exportando...</>
                            : <><FileDown className="w-4 h-4" /> Exportar PDF</>
                        }
                    </button>

                    {/* Export Selection Modal */}
                    {showExportModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Seleccionar secciones</h3>
                                    <p className="text-[10px] text-slate-400 dark:text-white/30 font-bold mt-0.5">Elegí qué tablas incluir en el PDF</p>
                                </div>
                                <div className="space-y-2">
                                    {EXPORT_SECTIONS.map(s => (
                                        <label key={s.key} className="flex items-center gap-3 cursor-pointer group">
                                            <div
                                                onClick={() => setExportSelections(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${exportSelections[s.key]
                                                    ? 'bg-accent-orange border-accent-orange'
                                                    : 'border-slate-300 dark:border-white/20 group-hover:border-accent-orange/50'
                                                    }`}
                                            >
                                                {exportSelections[s.key] && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{s.label}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setShowExportModal(false)}
                                        className="flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                    >Cancelar</button>
                                    <button
                                        onClick={exportPDF}
                                        disabled={!Object.values(exportSelections).some(Boolean)}
                                        className="flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-accent-orange text-white shadow-lg shadow-accent-orange/20 hover:bg-orange-600 transition-colors disabled:opacity-40"
                                    >Generar Reporte</button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </header>





            <div className="space-y-6">
                {!hasData ? (
                    <div className="pwa-card p-16 flex flex-col items-center justify-center gap-4 text-center">
                        <span className="text-5xl">{selectedCategories.map(c => CATEGORY_EMOJI[c] || '🍽️').join(' ')}</span>
                        <p className="text-slate-400 dark:text-white/30 font-black uppercase tracking-widest text-sm">
                            Sin datos de rutina para {selectedCategories.join(', ')}
                        </p>
                        <p className="text-slate-300 dark:text-white/20 text-xs font-bold">
                            Verificá que los competidores estén mapeados a esta categoría
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">

                                        {/* ── 1. Suma Promedio Diario ────────────────────────────────── */}
                        <div ref={refTrx}>
                            <SectionTable
                                title="Suma Promedio Diario por Competidor"
                                headerColor="#1e3a5f"
                                rows={filteredRows}
                                months={months}
                                renderCell={(row, m) => formatTrx(getProm(row.key, m.key))}
                                footnote="Suma del campo promedio de transacciones diarias de todos los locales del competidor en el período."
                            />
                        </div>

                        {/* ── 2. Crec % ───────────────────────────────────────────────────── */}
                        <div ref={refCrec}><SectionTable
                            title="Crec %"
                            headerColor="#1e3a5f"
                            rows={filteredRows}
                            months={months}
                            renderCell={(row, m) => {
                                const idx = months.findIndex(x => x.key === m.key);
                                return renderCrec(row.key, m, idx);
                            }}
                            footnote="Crec% = variación respecto al mes anterior. #N/A = sin período previo."
                        /></div>

                        {/* ── 3. Share % ──────────────────────────────────────────────────── */}
                        <div ref={refShare}><SectionTable
                            title="Share %"
                            headerColor="#1e3a5f"
                            rows={filteredRows}
                            months={months}
                            renderCell={(row, m) => renderShare(row.key, m.key)}
                        /></div>

                        {/* ── 4. Número de Tiendas ────────────────────────────────────────── */}
                        <div ref={refTiendas}><SectionTable
                            title="Número de Tiendas"
                            headerColor="#1e3a5f"
                            rows={filteredRows}
                            months={months}
                            renderCell={(row, m) => {
                                const v = getTiendas(row.key, m.key);
                                return v === null
                                    ? <span className="text-slate-300 dark:text-white/15">-</span>
                                    : v;
                            }}
                            footnote="Tiendas únicas (locales) con al menos una transacción registrada en el período."
                        /></div>

                        {/* ── Divider ─────────────────────────────────────────────────────── */}
                        {cajaRows.length > 0 && (
                            <>
                                <div className="flex items-center gap-4 pt-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-orange">Detalle por Local</span>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                </div>

                                {/* Controls for Distribución table */}
                                <div ref={refDistribucion} className="space-y-3">
                                    {/* Row 1: Sort */}
                                    <div className="flex flex-wrap items-center justify-end gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ordenar:</span>
                                            <select
                                                value={sortCaja}
                                                onChange={e => setSortCaja(e.target.value)}
                                                className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-700 dark:text-white focus:outline-none"
                                            >
                                                <option value="competidor_asc">Competidor (A-Z)</option>
                                                <option value="local_asc">Local (A-Z)</option>
                                                <option value="trx_desc">Trx ↓ (Mayor)</option>
                                                <option value="trx_asc">Trx ↑ (Menor)</option>
                                                <option value="pct_desc">% Local ↓</option>
                                            </select>
                                        </div>
                                    </div>

                                {/* ── 5. Distribución por Caja ──────────────────────────────────── */}
                                <div className="relative rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg overflow-hidden">
                                    <div className={expandDistribucion ? 'overflow-x-auto' : 'overflow-auto max-h-96'}>
                                    <table className="w-full text-left whitespace-nowrap text-[11px]">
                                        <thead className="sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 font-black uppercase tracking-widest text-white text-center bg-[#1e3a5f]" colSpan={4}>
                                                    Distribución de Ventas por Local
                                                </th>
                                            </tr>
                                            <tr className="bg-slate-100 dark:bg-white/[0.04]">
                                                {['Competidor', 'Local', 'Prom. Diario', '% del Local'].map(h => (
                                                    <th key={h} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right first:text-left">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                            {distribRows.map((row, i) => {
                                                const compChanged = i === 0 || distribRows[i - 1].competidor !== row.competidor;
                                                const isFirstOfLocal = sortCaja === 'competidor_asc' && (compChanged || distribRows[i - 1].local !== row.local);
                                                const isNewComp = sortCaja === 'competidor_asc' && compChanged;
                                                const dotColor = row.isEstimado ? (CONFIANZA_DOT[row.confianza] || '#94a3b8') : null;
                                                return (
                                                    <tr
                                                        key={`${row.competidor}-${row.local}`}
                                                        className={`transition-colors border-l-4 ${
                                                            row.isEstimado
                                                                ? 'bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/15'
                                                                : `hover:bg-slate-50 dark:hover:bg-white/[0.02] border-transparent ${compChanged ? 'border-t-2 border-slate-200 dark:border-white/10' : ''}`
                                                        }`}
                                                        style={row.isEstimado ? { borderLeftColor: dotColor } : {}}
                                                    >
                                                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                                            {row.isEstimado ? (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                                                                    <span style={{ color: dotColor }} className="font-black text-[9px] uppercase tracking-widest">{row.competidor}</span>
                                                                </span>
                                                            ) : (
                                                                sortCaja === 'competidor_asc'
                                                                    ? (isNewComp ? <span className="font-black text-accent-orange">{row.competidor}</span> : isFirstOfLocal ? row.competidor : <span className="text-slate-300 dark:text-white/20">↓</span>)
                                                                    : <span className={compChanged ? 'font-black text-accent-orange' : 'text-slate-500 dark:text-white/40 font-bold'}>{row.competidor}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 dark:text-white/70">{row.local}</td>
                                                        <td className="px-4 py-2.5 text-right font-mono font-black" style={row.isEstimado ? { color: dotColor } : {}}>
                                                            {row.isEstimado && <span className="opacity-50 mr-0.5">~</span>}
                                                            {new Intl.NumberFormat('es-PE').format(Math.round(row.displayTrx))}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <span className={`font-black ${row.pct > 50 ? 'text-accent-orange' : 'text-slate-600 dark:text-white/60'}`}>
                                                                {row.pct.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                    <button
                                        onClick={() => setExpandDistribucion(v => !v)}
                                        title={expandDistribucion ? 'Contraer' : 'Expandir'}
                                        className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 shadow-md text-slate-400 dark:text-white/40 hover:text-accent-orange hover:border-accent-orange transition-all z-20"
                                    >
                                        {expandDistribucion ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                </div>

                                <div ref={refEvolucion} className="space-y-3">
                                {/* ── 6. Evolución por Caja ─────────────────────────────────────── */}
                                {/* Controls row */}
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Ordenar:</span>
                                    <select
                                        value={sortEvol}
                                        onChange={e => setSortEvol(e.target.value)}
                                        className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-700 dark:text-white focus:outline-none"
                                    >
                                        <option value="competidor_asc">Competidor (A-Z)</option>
                                        <option value="local_asc">Local (A-Z)</option>
                                    </select>
                                </div>
                                    <div className="relative rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg overflow-hidden">
                                    <div className={expandEvolucion ? 'overflow-x-auto' : 'overflow-auto max-h-96'}>
                                        <table className="w-full text-left whitespace-nowrap text-[11px]">
                                            <thead className="sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-3 font-black uppercase tracking-widest text-white text-center bg-[#1e3a5f]" colSpan={cajaMonths.length + 2}>
                                                        Evolución de Promedio Diario por Local
                                                    </th>
                                                </tr>
                                                <tr className="bg-slate-100 dark:bg-white/[0.04]">
                                                    <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 180 }}>Competidor</th>
                                                    <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40" style={{ minWidth: 180 }}>Local</th>
                                                    {cajaMonths.map(m => (
                                                        <th key={m.key} className="px-4 py-2 font-black uppercase tracking-widest text-slate-500 dark:text-white/40 text-right" style={{ minWidth: 90 }}>
                                                            {m.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                                                {[...cajaRows].sort((a, b) => {
                                                    if (sortEvol === 'competidor_asc') return a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local);
                                                    if (sortEvol === 'local_asc') return a.local.localeCompare(b.local);
                                                    return 0;
                                                }).map((row, i, arr) => {
                                                    const compChanged = i === 0 || arr[i - 1].competidor !== row.competidor;
                                                    const isNewComp = sortEvol === 'competidor_asc' && compChanged;
                                                    const dotColor = row.isEstimado ? (CONFIANZA_DOT[row.confianza] || '#94a3b8') : null;
                                                    return (
                                                        <tr
                                                            key={`ev-${row.competidor}-${row.local}`}
                                                            className={`transition-colors border-l-4 ${
                                                                row.isEstimado
                                                                    ? 'bg-amber-50/40 dark:bg-amber-900/10 hover:bg-amber-50/70 dark:hover:bg-amber-900/15'
                                                                    : `hover:bg-slate-50 dark:hover:bg-white/[0.02] border-transparent ${compChanged ? 'border-t-2 border-slate-200 dark:border-white/10' : ''}`
                                                            }`}
                                                            style={row.isEstimado ? { borderLeftColor: dotColor } : {}}
                                                        >
                                                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                                                {row.isEstimado ? (
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                                                                        <span style={{ color: dotColor }} className="font-black text-[9px] uppercase tracking-widest">{row.competidor}</span>
                                                                    </span>
                                                                ) : (
                                                                    sortEvol === 'competidor_asc'
                                                                        ? (isNewComp ? <span className="font-black text-accent-orange">{row.competidor}</span> : <span className="text-slate-500 dark:text-white/40 font-bold">{row.competidor}</span>)
                                                                        : <span className={compChanged ? 'font-black text-accent-orange' : 'text-slate-500 dark:text-white/40 font-bold'}>{row.competidor}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-white/70">{row.local}</td>
                                                            {cajaMonths.map(m => {
                                                                const total = row.months[m.key];
                                                                const promSum = row.promedios?.[m.key];
                                                                const promCount = row.promCounts?.[m.key] || 1;
                                                                const promVal = promSum !== undefined ? promSum / promCount : undefined;

                                                                if (evolucionMetric === 'ambos') {
                                                                    return (
                                                                        <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                                                            {total !== undefined ? (
                                                                                <div className="flex flex-col items-end gap-0.5">
                                                                                    <span className="font-black text-[11px]" style={row.isEstimado ? { color: dotColor } : { color: 'inherit' }}>
                                                                                        {row.isEstimado && <span className="opacity-50 mr-0.5">~</span>}
                                                                                        {Math.round(total).toLocaleString('es-PE')}
                                                                                    </span>
                                                                                    <span className="text-[9px] text-violet-400 font-bold">{promVal !== undefined ? promVal.toFixed(1) : '-'}</span>
                                                                                </div>
                                                                            ) : <span className="text-slate-300 dark:text-white/15">-</span>}
                                                                        </td>
                                                                    );
                                                                }

                                                                const v = evolucionMetric === 'trx_total' ? total : promVal;
                                                                return (
                                                                    <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                                                        {v !== undefined
                                                                            ? <span className="font-black" style={row.isEstimado ? { color: dotColor } : {}}>
                                                                                {row.isEstimado && <span className="opacity-50 mr-0.5">~</span>}{v.toFixed(1)}
                                                                              </span>
                                                                            : <span className="text-slate-300 dark:text-white/15">-</span>
                                                                        }
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button
                                        onClick={() => setExpandEvolucion(v => !v)}
                                        title={expandEvolucion ? 'Contraer' : 'Expandir'}
                                        className="absolute bottom-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-1.5 shadow-md text-slate-400 dark:text-white/40 hover:text-accent-orange hover:border-accent-orange transition-all z-20"
                                    >
                                        {expandEvolucion ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                    </button>
                                    </div>
                                </div>{/* closes refEvolucion */}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* ── NGR Locales Propios ────────────────────────────────────────── */}
            {ngrLocales.length > 0 && (() => {
                // Build pivot: marca+local × month using trx_promedio and trx_total
                const NGR_COLORS = {
                    'POPEYES':    '#F26522',
                    'Bembos':     '#CC1F1F',
                    'Papa Johns': '#007743',
                    'CHINAWOK':   '#F0A500',
                };

                const filtered = ngrLocales.filter(r => {
                    if (filterYear !== 'all' && String(r.ano) !== filterYear) return false;
                    if (r.estado !== 'Activa') return false;
                    return true;
                });

                if (filtered.length === 0) return null;

                const monthSet = {};
                const pivotRows = {}; // `${marca}||${local}` → { marca, local, months: {mk: trx_total}, proms: {mk: trx_promedio} }

                filtered.forEach(r => {
                    const mk = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
                    if (!monthSet[mk]) monthSet[mk] = { key: mk, label: `${MONTH_SHORT[r.mes - 1]}-${String(r.ano).slice(2)}` };
                    const rowKey = `${r.marca}||${r.local}`;
                    if (!pivotRows[rowKey]) pivotRows[rowKey] = { marca: r.marca, local: r.local, months: {}, proms: {} };
                    pivotRows[rowKey].months[mk] = (pivotRows[rowKey].months[mk] || 0) + r.trx_total;
                    pivotRows[rowKey].proms[mk]  = (pivotRows[rowKey].proms[mk]  || 0) + r.trx_promedio;
                });

                const ngrMonths = Object.values(monthSet).sort((a, b) => a.key.localeCompare(b.key));
                const ngrRows   = Object.values(pivotRows).sort((a, b) =>
                    a.marca.localeCompare(b.marca) || a.local.localeCompare(b.local)
                );

                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 pt-4">
                            <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">★ NGR</span>
                            <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">
                                Locales Propios NGR
                            </h3>
                        </div>

                        {/* Prom diario por local */}
                        <div className="overflow-x-auto rounded-2xl border border-orange-500/20 shadow-lg">
                            <table className="w-full text-left whitespace-nowrap text-[11px]">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 font-black uppercase tracking-widest text-white text-center"
                                            style={{ backgroundColor: '#7c2d12' }} colSpan={ngrMonths.length + 2}>
                                            Prom. Diario por Local
                                        </th>
                                    </tr>
                                    <tr className="bg-orange-50 dark:bg-orange-900/10">
                                        <th className="px-4 py-2 font-black uppercase tracking-widest text-orange-700 dark:text-orange-400" style={{ minWidth: 110 }}>Marca</th>
                                        <th className="px-4 py-2 font-black uppercase tracking-widest text-orange-700 dark:text-orange-400" style={{ minWidth: 180 }}>Local</th>
                                        {ngrMonths.map(m => (
                                            <th key={m.key} className="px-4 py-2 font-black uppercase tracking-widest text-orange-700 dark:text-orange-400 text-right" style={{ minWidth: 80 }}>
                                                {m.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100 dark:divide-orange-900/20">
                                    {ngrRows.map((row, i) => {
                                        const color = NGR_COLORS[row.marca] || '#94a3b8';
                                        return (
                                            <tr key={i} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/5 transition-colors">
                                                <td className="px-4 py-2.5">
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                        <span className="font-black text-[10px] uppercase" style={{ color }}>{row.marca}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-white/70">{row.local}</td>
                                                {ngrMonths.map(m => {
                                                    const v = row.proms[m.key];
                                                    return (
                                                        <td key={m.key} className="px-4 py-2.5 text-right font-mono">
                                                            {v != null
                                                                ? <span className="font-black">{v.toFixed(0)}</span>
                                                                : <span className="text-slate-300 dark:text-white/15">-</span>
                                                            }
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

        </motion.div>
    );
};

export default ClientesDashboard;
