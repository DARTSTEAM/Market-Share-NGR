import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, Search, LayoutDashboard, AlertCircle, Calendar, ChevronDown, ChevronUp, Filter, Info } from 'lucide-react';

const SSTXDashboard = ({ records, ngrLocales = [], filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [detailMonths, setDetailMonths] = useState([]); // Multiple months selection for detail view
  
  // 1. Logic Constants (Sync with App.jsx)
  const HISTORIAL_CUTOFF = { ano: 2025, mes: 11 };
  const CUTOFF_KEY = HISTORIAL_CUTOFF.ano * 100 + HISTORIAL_CUTOFF.mes;

  const recordInScope = (r) => {
    const key = parseInt(r.ano || 0) * 100 + parseInt(r.mes || 0);
    if (r.status_busqueda === 'HISTORIAL') return key <= CUTOFF_KEY;
    if (r.status_busqueda === 'OK')        return key >  CUTOFF_KEY;
    if (r.status_busqueda?.startsWith('ESTIMADO-')) return key > CUTOFF_KEY;
    return false;
  };

  const COMPETITOR_TO_CATEGORY = {
    'KFC': 'Pollo Frito', 'MCDONALDS': 'Hamburguesa', 'MCDONALD\'S': 'Hamburguesa',
    'BEMBOS': 'Hamburguesa', 'BURGER KING': 'Hamburguesa', 'DOMINOS': 'Pizza',
    'DOMINO\'S': 'Pizza', 'LITTLE CAESARS': 'Pizza', 'PIZZA HUT': 'Pizza',
    'POPEYES': 'Pollo Frito', 'Bembos': 'Hamburguesa', 'Papa Johns': 'Pizza',
    'PAPA JOHNS': 'Pizza', 'CHINAWOK': 'Chifas',
  };

  const NGR_BRANDS = new Set(['POPEYES', 'BEMBOS', 'PAPA JOHNS', 'CHINAWOK', 'LITTLE CAESARS']);

  const isNGRBrand = (brand) => NGR_BRANDS.has(String(brand).toUpperCase().trim());

  // Parse filters
  const selectedYears = useMemo(() => {
    if (!filters.year || filters.year.length === 0) return [new Date().getFullYear()];
    return filters.year.map(y => parseInt(y));
  }, [filters.year]);

  const selectedMonthsFromFilter = useMemo(() => {
    if (!filters.month || filters.month.length === 0) return [];
    return filters.month.map(m => parseInt(m) + 1); // Convert 0-indexed to 1-indexed
  }, [filters.month]);

  // Main Year for Matrix (usually the latest selected)
  const currentYear = Math.max(...selectedYears);
  const previousYear = currentYear - 1;

  // 2. Build Matrices
  const matrixData = useMemo(() => {
    if (!records || records.length === 0) return { matrix: {}, brands: [], months: [], totals: {}, latestMonthWithData: 1, brandTotals: {} };

    const years = [previousYear, currentYear];
    const monthsArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    const rawData = { [previousYear]: {}, [currentYear]: {} };
    const brandNames = new Set();
    let latestMonth = 1;

    // Normalización
    const normalizeBrand = (name) => {
      let b = String(name || '').trim().toUpperCase();
      if (b.includes('LITTLE') && b.includes('CEASAR')) return 'LITTLE CAESARS';
      if (b === 'MCD' || b.includes('MCDONAL')) return 'MCDONALDS';
      return b;
    };

    records.forEach(r => {
      if (!recordInScope(r)) return;

      // Global Filters (Respond to Category and Brand selections)
      if (filters.competitor.length > 0 && !filters.competitor.includes(r.competidor)) return;
      if (filters.category.length > 0 && !filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor])) return;
      if (filters.region.length > 0 && !filters.region.includes(r.region)) return;
      if (filters.distrito.length > 0 && !filters.distrito.includes(r.distrito)) return;
      if (filters.codigoTienda.length > 0 && !filters.codigoTienda.includes(r.codigo_tienda)) return;
      if (filters.local.length > 0 && !filters.local.includes(r.local)) return;
      if (filters.zona && filters.zona.length > 0 && !filters.zona.includes(r.zona)) return;

      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr)) return;
      if (isNaN(ms)) return;

      const brand = normalizeBrand(r.competidor);
      if (brand === 'WANTA') return;
      brandNames.add(brand);

      if (!rawData[yr][ms]) rawData[yr][ms] = {};
      const storeKey = `${r.codigo_tienda || r.cod_tienda || 'S/C'}||${r.local}`;
      if (!rawData[yr][ms][storeKey]) {
        rawData[yr][ms][storeKey] = { brand, name: r.local, code: r.codigo_tienda, sales: 0 };
      }
      
      const dailyVal = parseFloat(r.promedio || r.trx_diarias || r.promedioDiario || 0);
      if (dailyVal > 0) {
        rawData[yr][ms][storeKey].sales += dailyVal;
      } else {
        const totalVal = parseFloat(r.transacciones_diferencial || r.transacciones || r.trx_total || 0);
        const daysInMonth = new Date(yr, ms, 0).getDate();
        rawData[yr][ms][storeKey].sales += (totalVal / daysInMonth);
      }
      
      if (yr === currentYear && ms > latestMonth) latestMonth = ms;
    });

    // ── NGR locales ────────────────────────────────────────────────────────
    // ngrLocales always have status_busqueda='HISTORIAL', so we bypass
    // recordInScope and instead process them directly using trx_promedio.
    ngrLocales.forEach(r => {
      // Apply same non-date global filters
      const brand = normalizeBrand(r.marca || '');
      if (!brand) return;
      if (filters.competitor.length > 0 && !filters.competitor.includes(r.marca)) return;
      if (filters.region.length   > 0 && !filters.region.includes(r.region))     return;
      if (filters.distrito.length > 0 && !filters.distrito.includes(r.distrito)) return;
      if (filters.local.length    > 0 && !filters.local.includes(r.local))       return;

      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr) || isNaN(ms)) return;

      brandNames.add(brand);
      if (!rawData[yr][ms]) rawData[yr][ms] = {};

      const storeKey = `${r.store_num || 'NGR'}||${r.local}`;
      if (!rawData[yr][ms][storeKey]) {
        rawData[yr][ms][storeKey] = { brand, name: r.local, code: r.store_num || 'NGR', sales: 0, _isNGR: true };
      }
      rawData[yr][ms][storeKey].sales += parseFloat(r.trx_promedio || 0);
      rawData[yr][ms][storeKey]._isNGR = true;

      if (yr === currentYear && ms > latestMonth) latestMonth = ms;
    });

    const brandsSorted = Array.from(brandNames).sort();
    const matrix = {};
    const monthlyTotals = {};
    const brandTotals = {};

    brandsSorted.forEach(brand => {
      matrix[brand] = {};
      brandTotals[brand] = { ty: 0, ly: 0 };
      
      monthsArray.forEach(m => {
        const lyStores = rawData[previousYear][m] || {};
        const tyStores = rawData[currentYear][m] || {};
        let sumLY = 0; let sumTY = 0;

        Object.keys(tyStores).forEach(key => {
          if (tyStores[key].brand === brand) {
            const tyVal = tyStores[key].sales;
            const lyVal = lyStores[key]?.sales || 0;
            if (tyVal > 0 && lyVal > 0) {
              sumTY += tyVal; sumLY += lyVal;
            }
          }
        });
        
        matrix[brand][m] = { ty: sumTY, ly: sumLY, growth: sumLY > 0 ? ((sumTY / sumLY) - 1) * 100 : 0 };
        
        // Sum if it's in the selected periods (or all if none selected)
        if (selectedMonthsFromFilter.length === 0 || selectedMonthsFromFilter.includes(m)) {
          brandTotals[brand].ty += sumTY;
          brandTotals[brand].ly += sumLY;
        }

        if (!monthlyTotals[m]) monthlyTotals[m] = { ty: 0, ly: 0 };
        monthlyTotals[m].ty += sumTY; monthlyTotals[m].ly += sumLY;
      });
      brandTotals[brand].growth = brandTotals[brand].ly > 0 ? ((brandTotals[brand].ty / brandTotals[brand].ly) - 1) * 100 : 0;
    });

    monthsArray.forEach(m => {
      monthlyTotals[m].growth = monthlyTotals[m].ly > 0 ? ((monthlyTotals[m].ty / monthlyTotals[m].ly) - 1) * 100 : 0;
    });

    // Total General (Aggregation of selected brands)
    const totalGeneral = { ty: 0, ly: 0, growth: 0 };
    Object.values(brandTotals).forEach(bt => {
      totalGeneral.ty += bt.ty;
      totalGeneral.ly += bt.ly;
    });
    totalGeneral.growth = totalGeneral.ly > 0 ? ((totalGeneral.ty / totalGeneral.ly) - 1) * 100 : 0;

    return { 
      matrix, 
      brands: brandsSorted, 
      months: monthsArray, 
      totals: monthlyTotals, 
      rawData, 
      latestMonthWithData: latestMonth,
      brandTotals,
      totalGeneral
    };
  }, [records, ngrLocales, currentYear, previousYear, filters, selectedMonthsFromFilter]);

  // Available months that have data
  const availableMonths = useMemo(() => {
    return matrixData.months.filter(m => {
      const d = matrixData.totals[m];
      return d && d.ty > 0;
    });
  }, [matrixData.totals, matrixData.months]);

  // Initial setup for detail months
  useEffect(() => {
    if (selectedMonthsFromFilter.length > 0) {
      setDetailMonths(selectedMonthsFromFilter);
    } else if (detailMonths.length === 0) {
      setDetailMonths([matrixData.latestMonthWithData]);
    }
  }, [selectedMonthsFromFilter, matrixData.latestMonthWithData]);

  // Detail data per store AND month (requested "by periods")
  const storesDetailByPeriod = useMemo(() => {
    const detail = [];
    const monthsToUse = detailMonths.length > 0 ? detailMonths : [matrixData.latestMonthWithData];

    monthsToUse.forEach(m => {
      const lyStores = matrixData.rawData?.[previousYear]?.[m] || {};
      const tyStores = matrixData.rawData?.[currentYear]?.[m] || {};
      
      Object.keys(tyStores).forEach(key => {
        const tyVal = tyStores[key].sales;
        const lyVal = lyStores[key]?.sales || 0;
        
        // include NGR-only stores (ty > 0 even if no LY)
        if (tyVal > 0) {
          detail.push({
            brand: tyStores[key].brand,
            name: tyStores[key].name,
            code: tyStores[key].code,
            month: m,
            salesTY: tyVal,
            salesLY: lyVal,
            growth: lyVal > 0 ? ((tyVal / lyVal) - 1) * 100 : null,
            _isNGR: !!tyStores[key]._isNGR,
          });
        }
      });
    });

    return detail.sort((a,b) => b.salesTY - a.salesTY);
  }, [matrixData.rawData, detailMonths, currentYear, previousYear, matrixData.latestMonthWithData]);

  const filteredDetail = useMemo(() => {
    let result = storesDetailByPeriod;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(lowerSearch) || 
        s.brand?.toLowerCase().includes(lowerSearch) || 
        s.code?.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [storesDetailByPeriod, searchTerm]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    if (num === 0 || isNaN(num)) return '-';
    if (Math.abs(num) > 999) return (num/1000).toFixed(1) + 'k';
    return num.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const toggleMonth = (m) => {
    setDetailMonths(prev => 
      prev.includes(m) ? (prev.length > 1 ? prev.filter(x => x !== m) : prev) : [...prev, m].sort((a,b) => a-b)
    );
  };

  return (
    <div className="space-y-12 pb-24">
      {/* 1. MASTER MATRIX SECTION */}
      <section className="pwa-card overflow-hidden shadow-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-orange/10 rounded-lg"><LayoutDashboard className="text-accent-orange" size={18} /></div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-widest">Master Matrix SSTX - Trx Diarias {currentYear}</h3>
                <p className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-0.5 italic">Consolidado Real + Estimado</p>
              </div>
           </div>
           <div className="hidden sm:flex items-center gap-2">
             <span className="text-[9px] font-black uppercase text-slate-400">Status:</span>
             <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[8px] font-black uppercase">Actualizado</span>
           </div>
        </div>
        
        <div className="overflow-y-auto max-h-[560px] custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shadow-sm">
                <th className="px-3 py-3 text-[8px] font-black uppercase text-slate-500 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 w-36">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-0.5 py-3 text-center text-[8px] font-black uppercase transition-colors ${selectedMonthsFromFilter.includes(m) ? 'text-accent-orange bg-orange-500/10' : 'text-slate-500 dark:text-white/40'}`}>
                    {monthNames[m-1]}
                  </th>
                ))}
                <th className="px-2 py-3 text-right text-[8px] font-black uppercase text-accent-orange bg-orange-500/10 w-16">SSTX</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-slate-800 dark:bg-white/[0.08] font-black text-white">
                <td className="px-3 py-3 text-[9px] italic uppercase sticky left-0 bg-slate-800 dark:bg-slate-700 z-10 border-b border-white/5">
                  TOTAL
                </td>
                {matrixData.months.map(m => {
                  const d = matrixData.totals[m] || { ty: 0, ly: 0, growth: 0 };
                  const has = d.ty > 0 && d.ly > 0;
                  return (
                    <td key={m} className={`px-0.5 py-3 text-center border-b border-white/5 ${selectedMonthsFromFilter.includes(m) ? 'bg-orange-500/20' : ''}`}>
                      <div className="flex flex-col items-center leading-none gap-0.5">
                        <span className={`text-[10px] font-black ${has ? 'text-white' : 'text-white/20'}`}>{kFormatter(d.ty)}</span>
                        {has && <span className={`text-[7px] font-black ${d.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{d.growth >= 0 ? '+' : ''}{d.growth.toFixed(1)}%</span>}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-3 text-right bg-orange-500/20 border-b border-white/5">
                  <div className="flex flex-col items-end leading-none gap-0.5">
                    <span className="text-[11px] text-accent-orange italic font-black">{kFormatter(matrixData.totalGeneral?.ty || 0)}</span>
                    <span className={`text-[7px] font-black ${matrixData.totalGeneral?.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {matrixData.totalGeneral?.growth >= 0 ? '+' : ''}{(matrixData.totalGeneral?.growth || 0).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>

              {/* BRAND ROWS */}
              {matrixData.brands.map((brand, bIdx) => {
                const bt = matrixData.brandTotals[brand];
                const isNGR = isNGRBrand(brand);
                return (
                  <tr key={brand} className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-3 py-2.5 text-[9px] font-black italic uppercase text-slate-700 dark:text-white/70 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNGR ? 'bg-accent-orange shadow-[0_0_6px_rgba(255,126,75,0.8)]' : 'bg-slate-300 dark:bg-white/10'}`} />
                        {isNGR && <span className="text-[7px] font-black px-1 py-0.5 rounded bg-accent-orange/15 text-accent-orange border border-accent-orange/30 flex-shrink-0">★</span>}
                        <span className="truncate">{brand}</span>
                      </div>
                    </td>
                    {matrixData.months.map(m => {
                      const d = matrixData.matrix[brand]?.[m] || { ty: 0, ly: 0, growth: 0 };
                      const has = d.ty > 0 && d.ly > 0;
                      return (
                        <td key={m} className={`px-0.5 py-2.5 text-center transition-all ${selectedMonthsFromFilter.includes(m) ? 'bg-orange-500/5' : ''}`}>
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className={`text-[9px] font-black ${has ? 'text-slate-900 dark:text-white' : 'text-slate-200 dark:text-white/5'}`}>{kFormatter(d.ty)}</span>
                            {has && <span className={`text-[7px] font-black ${d.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{d.growth >= 0 ? '↑' : '↓'}{Math.abs(d.growth).toFixed(0)}%</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-right bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors">
                      <div className="flex flex-col items-end leading-none gap-0.5">
                        <span className="text-[9px] text-accent-orange italic font-black">{kFormatter(bt?.ty || 0)}</span>
                        <span className={`text-[7px] font-black ${bt?.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {bt?.ly > 0 ? (bt?.growth >= 0 ? '+' : '') + (bt?.growth || 0).toFixed(1) + '%' : '-'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. GRANULAR DETAIL SECTION */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store size={18} className="text-accent-orange" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">SSTX de los periodos seleccionados</h2>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest italic flex items-center gap-1">
              <Info size={10} /> Análisis granular por tienda / unidad de negocio / mes
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-white/[0.02] p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
             <div className="px-3 py-2 text-[9px] font-black uppercase text-slate-500 dark:text-white/30 flex items-center gap-2 border-r border-slate-200 dark:border-white/10 mr-1">
               <Calendar size={12} className="text-accent-orange" /> Filtro de Meses:
             </div>
             <div className="flex flex-wrap gap-1">
               {availableMonths.map(m => (
                 <button 
                  key={m} 
                  onClick={() => toggleMonth(m)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all transform active:scale-95 ${detailMonths.includes(m) ? 'bg-accent-orange text-white shadow-lg shadow-orange-500/30' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                 >
                   {monthNames[m-1]}
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Card 1: Registros */}
           <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/80 dark:to-slate-900/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-white/5 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] transition-all duration-500">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-accent-orange/10 dark:bg-accent-orange/20 rounded-full blur-3xl group-hover:bg-accent-orange/20 dark:group-hover:bg-accent-orange/30 transition-all duration-700 group-hover:scale-150" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em]">Registros Analizados</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{filteredDetail.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">U. de Negocio</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 rounded-[16px] group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-accent-orange/20 transition-all duration-500">
                  <Store size={22} className="text-accent-orange" strokeWidth={2.5} />
                </div>
              </div>
           </div>
           
           {/* Card 2: Trx Diarias */}
           <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/80 dark:to-slate-900/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-white/5 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] transition-all duration-500">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-accent-blue/10 dark:bg-accent-blue/20 rounded-full blur-3xl group-hover:bg-accent-blue/20 dark:group-hover:bg-accent-blue/30 transition-all duration-700 group-hover:scale-150" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em]">Trx Diarias (Prom)</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">
                      {kFormatter(filteredDetail.reduce((acc, s) => acc + s.salesTY, 0))}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">Trx/Día</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 rounded-[16px] group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-accent-blue/20 transition-all duration-500">
                  <LayoutDashboard size={22} className="text-accent-blue" strokeWidth={2.5} />
                </div>
              </div>
           </div>

           {/* Card 3: Growth */}
           <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/80 dark:to-slate-900/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-100 dark:border-white/5 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] transition-all duration-500">
              {(() => {
                const tyTotal = filteredDetail.reduce((acc, s) => acc + s.salesTY, 0);
                const lyTotal = filteredDetail.reduce((acc, s) => acc + s.salesLY, 0);
                const growth = lyTotal > 0 ? ((tyTotal / lyTotal) - 1) * 100 : 0;
                const isPositive = growth >= 0;
                
                return (
                  <>
                    <div className={`absolute -left-6 -top-6 w-32 h-32 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150 ${isPositive ? 'bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/20' : 'bg-red-500/10 dark:bg-red-500/20 group-hover:bg-red-500/20'}`} />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-[0.2em]">Growth Consolidado</span>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-4xl font-black tracking-tighter leading-none ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{growth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className={`p-3 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 rounded-[16px] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ${isPositive ? 'group-hover:shadow-emerald-500/20' : 'group-hover:shadow-red-500/20'}`}>
                        {isPositive ? <TrendingUp size={22} className="text-emerald-500" strokeWidth={2.5} /> : <TrendingDown size={22} className="text-red-500" strokeWidth={2.5} />}
                      </div>
                    </div>
                  </>
                );
              })()}
           </div>
        </div>

        {/* SEARCH & FILTERS ROW (Moved Above Table) */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-white/5">
           <div className="relative w-full md:w-96 group">
             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110 group-focus-within:text-accent-orange">
               <Search size={16} className="text-slate-400 group-focus-within:text-accent-orange transition-colors" />
             </div>
             <input 
               type="text" 
               placeholder="Buscar por Marca, Código o Tienda..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-white placeholder-slate-400 focus:border-accent-orange/50 focus:ring-4 focus:ring-accent-orange/10 outline-none transition-all shadow-sm" 
             />
             {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                 <AlertCircle size={14} className="rotate-45" />
               </button>
             )}
           </div>
           <div className="text-[10px] font-black uppercase text-slate-400 px-4 flex items-center gap-2">
             <Filter size={12} /> Mostrando {filteredDetail.length} resultados
           </div>
        </div>

        {/* DETAIL TABLE */}
        <div className="pwa-card overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 rounded-[24px]">
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#f8fafc] dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/10 shadow-sm">
                  <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-500 tracking-wider">Marca</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-500 tracking-wider">Tienda (Código + Nombre)</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black uppercase text-slate-500 tracking-wider">Mes</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black uppercase text-slate-500 tracking-wider">Trx/Día {previousYear}</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black uppercase text-slate-500 tracking-wider font-bold text-slate-900 dark:text-white">Trx/Día {currentYear}</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black uppercase text-accent-orange tracking-widest">SSTX %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                <AnimatePresence>
                {filteredDetail.length > 0 ? (
                  filteredDetail.map((item, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                      key={`${item.code}-${item.name}-${item.month}`} 
                      className="group hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-6 py-4">
                         <span className={`text-[10px] font-black italic uppercase px-2 py-1 rounded ${isNGRBrand(item.brand) ? 'bg-accent-orange/10 text-accent-orange' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                           {isNGRBrand(item.brand) && '★ '} {item.brand}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col group-hover:translate-x-1 transition-transform">
                           <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                             {item.code || 'S/C'}
                           </span>
                           <span className="text-[9px] font-bold text-slate-400 dark:text-white/40 uppercase">
                             {item.name}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md text-[9px] font-black uppercase text-slate-500 dark:text-white/60">
                          {monthNames[item.month-1]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-medium text-slate-400 font-mono">
                        {item.salesLY > 0 ? kFormatter(item.salesLY) : <span className="text-slate-200 dark:text-white/10">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right text-[11px] font-black text-slate-900 dark:text-white font-mono bg-slate-500/5 group-hover:bg-accent-orange/5 transition-colors">
                        {kFormatter(item.salesTY)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         {item.growth != null ? (
                           <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-[10px] shadow-sm ${item.growth >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                             {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
                             {item.growth >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                           </div>
                         ) : (
                           <span className="text-[9px] font-black text-slate-300 dark:text-white/20 uppercase tracking-widest">Nuevo</span>
                         )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <AlertCircle size={48} />
                        <span className="text-xs font-black uppercase italic tracking-widest">No se encontraron datos para los filtros seleccionados</span>
                      </div>
                    </td>
                  </tr>
                )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SSTXDashboard;
