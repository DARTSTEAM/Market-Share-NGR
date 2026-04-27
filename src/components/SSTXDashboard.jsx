import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, Search, LayoutDashboard, AlertCircle } from 'lucide-react';

const SSTXDashboard = ({ records, filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const currentYearSelected = parseInt(filters.year) || new Date().getFullYear();
  const previousYearSelected = currentYearSelected - 1;

  // Fix Off-by-one Month: filters.month is 0-indexed (0=Jan) but data is 1-indexed (1=Jan)
  const selectedMonthIdx = useMemo(() => {
    const fromFilter = parseInt(filters.month);
    // If NaN or 'all', we look for latest data. Otherwise, add 1.
    if (isNaN(fromFilter)) return 0; // 'all'
    return fromFilter + 1;
  }, [filters.month]);

  // 2. Build Matrices (Pre-filtered for scope and global filters EXCEPT month/year)
  const matrixData = useMemo(() => {
    if (!records || records.length === 0) return { matrix: {}, brands: [], months: [], totals: {}, latestMonthWithData: 1 };

    const years = [previousYearSelected, currentYearSelected];
    const monthsArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    const rawData = { [previousYearSelected]: {}, [currentYearSelected]: {} };
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
      // 1. Sync Logic Filter (recordInScope)
      if (!recordInScope(r)) return;

      // 2. Global Filters (Except date)
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
      const storeKey = `${r.local}||${r.caja ?? r.codigo_tienda ?? ''}`;
      if (!rawData[yr][ms][storeKey]) {
        rawData[yr][ms][storeKey] = { brand, name: r.local, code: r.codigo_tienda, sales: 0 };
      }
      // Prioridad absoluta a 'promedio' para coincidir con el KPI de Market Share (App.jsx)
      const dailyVal = parseFloat(r.promedio || r.trx_diarias || r.promedioDiario || 0);
      if (dailyVal > 0) {
        rawData[yr][ms][storeKey].sales += dailyVal;
      } else {
        // Fallback: total / días (solo si no hay columna de promedio diario)
        const totalVal = parseFloat(r.transacciones_diferencial || r.transacciones || r.trx_total || 0);
        const daysInMonth = new Date(yr, ms, 0).getDate();
        rawData[yr][ms][storeKey].sales += (totalVal / daysInMonth);
      }
      
      if (yr === currentYearSelected && ms > latestMonth) latestMonth = ms;
    });

    const brandsSorted = Array.from(brandNames).sort();
    const matrix = {};
    const monthlyTotals = {};

    brandsSorted.forEach(brand => {
      matrix[brand] = {};
      monthsArray.forEach(m => {
        const lyStores = rawData[previousYearSelected][m] || {};
        const tyStores = rawData[currentYearSelected][m] || {};
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
        if (!monthlyTotals[m]) monthlyTotals[m] = { ty: 0, ly: 0 };
        monthlyTotals[m].ty += sumTY; monthlyTotals[m].ly += sumLY;
      });
    });

    monthsArray.forEach(m => {
      monthlyTotals[m].growth = monthlyTotals[m].ly > 0 ? ((monthlyTotals[m].ty / monthlyTotals[m].ly) - 1) * 100 : 0;
    });

    return { matrix, brands: brandsSorted, months: monthsArray, totals: monthlyTotals, rawData, latestMonthWithData: latestMonth };
  }, [records, currentYearSelected, previousYearSelected, filters]);

  // Handle active month fallback
  const activeMonth = selectedMonthIdx || matrixData.latestMonthWithData;

  const rawStoresDetail = useMemo(() => {
    const detail = [];
    const lySelected = matrixData.rawData?.[previousYearSelected]?.[activeMonth] || {};
    const tySelected = matrixData.rawData?.[currentYearSelected]?.[activeMonth] || {};
    Object.keys(tySelected).forEach(key => {
      const tyVal = tySelected[key].sales;
      const lyVal = lySelected[key]?.sales || 0;
      if (tyVal > 0 && lyVal > 0) {
        detail.push({ brand: tySelected[key].brand, name: tySelected[key].name, code: tySelected[key].code, salesTY: tyVal, salesLY: lyVal, growth: ((tyVal / lyVal) - 1) * 100 });
      }
    });
    return detail.sort((a,b) => b.salesTY - a.salesTY);
  }, [matrixData.rawData, currentYearSelected, previousYearSelected, activeMonth]);

  const filteredStoresDetail = useMemo(() => {
    if (!searchTerm) return rawStoresDetail;
    const lowerSearch = searchTerm.toLowerCase();
    return rawStoresDetail.filter(s => s.name?.toLowerCase().includes(lowerSearch) || s.brand?.toLowerCase().includes(lowerSearch) || s.code?.toLowerCase().includes(lowerSearch));
  }, [rawStoresDetail, searchTerm]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    if (num === 0) return '-';
    if (Math.abs(num) > 999) return (num/1000).toFixed(1) + 'k';
    return num.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const currentMonthTotal = matrixData.totals[activeMonth] || { ty: 0, ly: 0, growth: 0 };

  return (
    <div className="space-y-12 pb-24">
      {/* Matrix */}
      <div className="pwa-card overflow-hidden shadow-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-orange/10 rounded-lg"><LayoutDashboard className="text-accent-orange" size={18} /></div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-widest">Master Matrix SSTX - Trx Diarias {currentYearSelected}</h3>
                <p className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-0.5 italic">Consistencia Garantizada vs Market Share Dash</p>
              </div>
           </div>
        </div>
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shadow-sm">
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-500 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 w-44">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-2 py-3 text-center text-[9px] font-black uppercase ${m === activeMonth ? 'text-accent-orange bg-orange-500/10' : 'text-slate-500 dark:text-white/40'}`}>{monthNames[m-1]}</th>
                ))}
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-accent-orange bg-orange-500/10">YTD</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => {
                let ytdTY = 0; let ytdLY = 0;
                return (
                  <tr key={brand} className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="px-6 py-3 text-[10px] font-black italic uppercase text-slate-700 dark:text-white/70 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800">{brand}</td>
                    {matrixData.months.map(m => {
                      const d = matrixData.matrix[brand][m]; const has = d.ty > 0 && d.ly > 0;
                      if (has) { ytdTY += d.ty; ytdLY += d.ly; }
                      return (
                        <td key={m} className={`px-1 py-3 text-center ${m === activeMonth ? 'bg-orange-500/5' : ''}`}>
                          <div className="flex flex-col items-center leading-tight">
                             <span className={`text-[10px] font-black ${has ? 'text-slate-900 dark:text-white' : 'text-slate-200 dark:text-white/5'}`}>{kFormatter(d.ty)}</span>
                             {has && <span className={`text-[8px] font-black ${d.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{d.growth >= 0 ? '↑' : '↓'} {Math.abs(d.growth).toFixed(0)}%</span>}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-3 text-right bg-orange-500/5">
                       <div className="flex flex-col items-end leading-tight">
                          <span className="text-[10px] text-accent-orange italic font-black">{kFormatter(ytdTY)}</span>
                          <span className={`text-[8px] font-black ${ytdTY >= ytdLY ? 'text-emerald-500' : 'text-red-500'}`}>{ytdLY > 0 ? (ytdTY >= ytdLY ? '+' : '') + ((ytdTY/ytdLY - 1)*100).toFixed(1) + '%' : '-'}</span>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-slate-800 dark:bg-white/[0.08] font-black border-t-2 border-accent-orange/30">
                <td className="px-6 py-4 text-[10px] font-black italic uppercase text-white sticky left-0 bg-slate-800 dark:bg-slate-700 z-10">TOTAL MERCADO</td>
                {matrixData.months.map(m => {
                   const d = matrixData.totals[m]; const has = d.ty > 0 && d.ly > 0;
                   return (
                    <td key={m} className={`px-1 py-4 text-center ${m === activeMonth ? 'bg-orange-500/20' : ''}`}>
                      <div className="flex flex-col items-center leading-tight">
                         <span className={`text-[11px] font-black ${has ? 'text-white' : 'text-white/20'}`}>{kFormatter(d.ty)}</span>
                         {has && <span className={`text-[8px] font-black ${d.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{d.growth >= 0 ? '+' : ''}{d.growth.toFixed(1)}%</span>}
                      </div>
                    </td>
                   );
                })}
                <td className="px-6 py-4 text-right bg-orange-500/20 text-white text-[10px] italic">TOTAL YTD</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* KPI Detail Header */}
      <div className="pwa-card p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 shadow-lg">
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiendas {fullMonthNames[activeMonth-1]}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{rawStoresDetail.length}</span>
         </div>
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Promedio Trx Diarias</span>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{kFormatter(currentMonthTotal.ty)}</span>
         </div>
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Growth Concuerdado</span>
            <span className={`text-xl font-black tracking-tighter ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
            </span>
         </div>
         <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-slate-400" /></div>
            <input type="text" placeholder="Filtrar por tienda..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-accent-orange/20 outline-none" />
         </div>
      </div>

      {/* Detail Table */}
      <div className="pwa-card overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-white/[0.05] border-b dark:border-white/10 shadow-sm">
                <th className="px-6 py-3 text-left text-[9px] font-black uppercase text-slate-500">Marca / Codigo</th>
                <th className="px-6 py-3 text-left text-[9px] font-black uppercase text-slate-500">Tienda</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500">{previousYearSelected}</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500">{currentYearSelected}</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500">Growth %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence>
              {filteredStoresDetail.length > 0 ? (
                filteredStoresDetail.map((store) => (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={store.brand + (store.code || '') + store.name} className="group hover:bg-slate-50 dark:hover:bg-white/[0.01]">
                    <td className="px-6 py-3">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black italic text-accent-orange uppercase">{store.brand}</span>
                          <span className="text-[8px] font-mono font-bold text-slate-400">{store.code || '-'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-3 text-[10px] font-bold text-slate-600 dark:text-white/80 uppercase">{store.name}</td>
                    <td className="px-6 py-3 text-right text-[10px] font-medium text-slate-400">{kFormatter(store.salesLY)}</td>
                    <td className="px-6 py-3 text-right text-[10px] font-black text-slate-900 dark:text-white">{kFormatter(store.salesTY)}</td>
                    <td className="px-6 py-3 text-right">
                       <span className={`text-[10px] font-black ${store.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{store.growth >= 0 ? '+' : ''}{store.growth.toFixed(1)}%</span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">No hay resultados para mostrar</td></tr>
              )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SSTXDashboard;
