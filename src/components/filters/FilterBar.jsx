import React from 'react';
import { RotateCcw, Target, Layers, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../common/CustomSelect';

const PC_PRESETS = [
    { value: 'all',        label: 'Todos los locales' },
    { value: 'PJ+PH+DMN', label: 'PJ+PH+DMN' },
    { value: 'PJ+DMN+LC', label: 'PJ+DMN+LC' },
    { value: 'PJ+PH+LC',  label: 'PJ+PH+LC' },
    { value: 'PJ+LC',     label: 'PJ+LC' },
    { value: 'PJ+PH',     label: 'PJ+PH' },
    { value: 'BB+BK',     label: 'BB+BK' },
    { value: 'BB+MCD',    label: 'BB+MCD' },
];

const PC_CAT_OPTIONS = [
    { value: 'all',         label: 'Todas las categorías' },
    { value: 'Pollo Frito', label: 'Pollo Frito' },
    { value: 'Pizza',       label: 'Pizza' },
    { value: 'Hamburguesa', label: 'Hamburguesa' },
    { value: 'Otros',       label: 'Otros' },
];

const GROUP_MODES = [
    { id: 'brand',     label: 'Marca',  Icon: Target },
    { id: 'category',  label: 'Cat.',   Icon: Layers },
    { id: 'ownership', label: 'Grupos', Icon: ShieldCheck },
];

// Labelled divider between sections
const Divider = () => (
    <div className="hidden md:block w-px self-stretch bg-slate-200 dark:bg-white/[0.07] mx-1" />
);

const SectionLabel = ({ color, children }) => (
    <p className={`text-[8px] font-black uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5 ${color}`}>
        <span className={`inline-block w-1 h-3 rounded-full ${
            color === 'text-accent-orange' ? 'bg-accent-orange' :
            color === 'text-blue-500'      ? 'bg-blue-500' :
            color === 'text-emerald-500'   ? 'bg-emerald-500' :
            'bg-slate-400'
        }`} />
        {children}
    </p>
);

const FilterBar = ({
    filters,
    onFilterChange,
    monthOptions = [],
    yearOptions = [],
    competitorOptions = [],
    locationOptions = [],
    codigoTiendaOptions = [],
    categoryOptions = [],
    regionOptions = [],
    distritoOptions = [],
    zonaOptions = [],
    onReset,
    // Puntos Compartidos — null on other tabs
    pcFilters = null,
    onPcFilterChange = null,
}) => {
    return (
        <div className="pwa-card no-hover p-5 space-y-4">
            {/* ── Main filters row ── */}
            <div className="flex flex-wrap items-start gap-x-1 gap-y-4">

                {/* PERÍODO */}
                <div className="space-y-1 min-w-[130px]">
                    <SectionLabel color="text-accent-orange">Período</SectionLabel>
                    <div className="flex gap-2">
                        <CustomSelect
                            label="Año"
                            options={yearOptions}
                            selected={filters.year}
                            onChange={(val) => onFilterChange('year', val)}
                            width="w-24"
                            multi
                        />
                        <CustomSelect
                            label="Mes"
                            options={monthOptions}
                            selected={filters.month}
                            onChange={(val) => onFilterChange('month', val)}
                            width="w-32"
                            multi
                        />
                    </div>
                </div>

                <Divider />

                {/* SEGMENTACIÓN */}
                <div className="space-y-1">
                    <SectionLabel color="text-blue-500">Segmentación</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                        <CustomSelect
                            label="Categoría"
                            options={categoryOptions}
                            selected={filters.category}
                            onChange={(val) => onFilterChange('category', val)}
                            width="w-40"
                            multi
                        />
                        <CustomSelect
                            label="Competidor"
                            options={competitorOptions}
                            selected={filters.competitor}
                            onChange={(val) => onFilterChange('competitor', val)}
                            width="w-44"
                            multi
                        />
                        <CustomSelect
                            label="Local"
                            options={locationOptions}
                            selected={filters.local}
                            onChange={(val) => onFilterChange('local', val)}
                            width="w-44"
                            searchable
                            multi
                        />
                        {codigoTiendaOptions.length > 0 && (
                            <CustomSelect
                                label="Cód. Tienda"
                                options={codigoTiendaOptions}
                                selected={filters.codigoTienda}
                                onChange={(val) => onFilterChange('codigoTienda', val)}
                                width="w-36"
                                searchable
                                multi
                            />
                        )}
                    </div>
                </div>

                <Divider />

                {/* GEOGRAFÍA */}
                <div className="space-y-1">
                    <SectionLabel color="text-emerald-500">Geografía</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                        <CustomSelect
                            label="Región"
                            options={regionOptions}
                            selected={filters.region}
                            onChange={(val) => onFilterChange('region', val)}
                            width="w-36"
                            multi
                        />
                        <CustomSelect
                            label="Distrito"
                            options={distritoOptions}
                            selected={filters.distrito}
                            onChange={(val) => onFilterChange('distrito', val)}
                            width="w-44"
                            searchable
                            multi
                        />
                        <CustomSelect
                            label="Zona"
                            options={zonaOptions}
                            selected={filters.zona}
                            onChange={(val) => onFilterChange('zona', val)}
                            width="w-36"
                            multi
                        />
                    </div>
                </div>

                {/* Reset — pushed to end */}
                <div className="ml-auto flex items-end pb-0.5">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/[0.03] hover:bg-red-50 dark:hover:bg-red-500/10 border border-slate-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/30 rounded-xl transition-all group"
                        title="Restablecer filtros"
                    >
                        <RotateCcw className="w-3 h-3 text-slate-400 group-hover:text-red-400 group-hover:rotate-[-45deg] transition-all" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-red-400 transition-colors">
                            Reset
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Puntos Compartidos section (animated, only on that tab) ── */}
            <AnimatePresence>
                {pcFilters && onPcFilterChange && (
                    <motion.div
                        key="pc-filters"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="border-t border-dashed border-accent-orange/25 pt-4">
                            <SectionLabel color="text-accent-orange">Puntos Compartidos</SectionLabel>
                            <div className="flex flex-wrap gap-3 items-end">

                                <CustomSelect
                                    label="Tipo"
                                    selected={pcFilters.filterTipo}
                                    onChange={(v) => onPcFilterChange('filterTipo', v)}
                                    width="w-28"
                                    options={[
                                        { value: 'all',   label: 'Todos' },
                                        { value: 'cc',    label: '🏬 CC' },
                                        { value: 'calle', label: '📍 Calle' },
                                    ]}
                                />

                                <CustomSelect
                                    label="Categoría"
                                    selected={pcFilters.filterCat}
                                    onChange={(v) => onPcFilterChange('filterCat', v)}
                                    width="w-40"
                                    options={PC_CAT_OPTIONS}
                                    searchable
                                />

                                <CustomSelect
                                    label="Comparativa"
                                    selected={pcFilters.filterPreset}
                                    onChange={(v) => onPcFilterChange('filterPreset', v)}
                                    width="w-44"
                                    options={PC_PRESETS}
                                />

                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-white/30 ml-1">
                                        Agrupar por
                                    </p>
                                    <div className="flex p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10">
                                        {GROUP_MODES.map(({ id, label, Icon }) => (
                                            <button
                                                key={id}
                                                onClick={() => onPcFilterChange('groupMode', id)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase tracking-widest ${
                                                    pcFilters.groupMode === id
                                                        ? 'bg-white dark:bg-white/10 text-accent-orange shadow-sm border border-slate-200 dark:border-white/10'
                                                        : 'text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60'
                                                }`}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <CustomSelect
                                    label="Ordenar por"
                                    selected={pcFilters.sortMode}
                                    onChange={(v) => onPcFilterChange('sortMode', v)}
                                    width="w-40"
                                    options={[
                                        { value: 'prom',          label: 'Prom. Diario ↓' },
                                        { value: 'transacciones', label: 'Transacciones ↓' },
                                        { value: 'marcas',        label: 'N° Marcas ↓' },
                                        { value: 'nombre',        label: 'Nombre A→Z' },
                                    ]}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterBar;
