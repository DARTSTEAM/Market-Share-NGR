import React from 'react';
import { RotateCcw } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

const FilterBar = ({
    filters,
    onFilterChange,
    monthOptions = [],
    yearOptions = [],
    competitorOptions = [],
    locationOptions = [],
    codigoTiendaOptions = [],
    channelOptions = [],
    categoryOptions = [],
    regionOptions = [],
    distritoOptions = [],
    onReset
}) => {
    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* Date Filters Group */}
            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <CustomSelect
                    label="Mes"
                    options={monthOptions}
                    selected={filters.month}
                    onChange={(val) => onFilterChange('month', val)}
                    width="w-32"
                />
                <CustomSelect
                    label="Año"
                    options={yearOptions}
                    selected={filters.year}
                    onChange={(val) => onFilterChange('year', val)}
                    width="w-24"
                />
            </div>

            <div className="h-8 w-[1px] bg-slate-300 dark:bg-white/10 hidden md:block" />

            {/* Category Filter (multi) */}
            <CustomSelect
                label="Categoría"
                options={categoryOptions}
                selected={filters.category}
                onChange={(val) => onFilterChange('category', val)}
                width="w-44"
            />

            <div className="h-8 w-[1px] bg-slate-300 dark:bg-white/10 hidden md:block" />

            {/* Geography Filters */}
            <CustomSelect
                label="Región"
                options={regionOptions}
                selected={filters.region || 'all'}
                onChange={(val) => onFilterChange('region', val)}
                width="w-40"
            />
            <CustomSelect
                label="Distrito"
                options={distritoOptions}
                selected={filters.distrito || 'all'}
                onChange={(val) => onFilterChange('distrito', val)}
                width="w-48"
                searchable
            />

            <div className="h-8 w-[1px] bg-slate-300 dark:bg-white/10 hidden md:block" />

            {/* Logic Filters Group */}
            <CustomSelect
                label="Competidor"
                options={competitorOptions}
                selected={filters.competitor}
                onChange={(val) => onFilterChange('competitor', val)}
                width="w-48"
            />
            <CustomSelect
                label="Local"
                options={locationOptions}
                selected={filters.local}
                onChange={(val) => onFilterChange('local', val)}
                width="w-48"
                searchable
            />
            {codigoTiendaOptions.length > 1 && (
                <CustomSelect
                    label="Cód. Tienda"
                    options={codigoTiendaOptions}
                    selected={filters.codigoTienda || 'all'}
                    onChange={(val) => onFilterChange('codigoTienda', val)}
                    width="w-40"
                    searchable
                />
            )}
            <button
                onClick={onReset}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/[0.02] hover:bg-white/80 dark:hover:bg-white/[0.05] border border-slate-300 dark:border-white/10 rounded-2xl transition-all group shrink-0"
                title="Restablecer filtros"
            >
                <div className="w-6 h-6 rounded-lg bg-accent-orange/10 flex items-center justify-center group-hover:rotate-[-45deg] transition-transform">
                    <RotateCcw className="w-3.5 h-3.5 text-accent-orange" />
                </div>
                <span className="text-[10px] font-black text-slate-600 dark:text-white/60 uppercase tracking-widest leading-none">Reset</span>
            </button>
        </div>
    );
};

export default FilterBar;
