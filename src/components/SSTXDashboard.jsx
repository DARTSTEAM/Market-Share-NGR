import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, Search, LayoutDashboard, AlertCircle } from 'lucide-react';

const SSTXDashboard = ({ records, filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // 1. Identify periods
  const currentYear = parseInt(filters.year) || new Date().getFullYear();
  const previousYear = currentYear - 1;

  // 2. Build All-Month Metadata and Data Matrices
  const matrixData = useMemo(() => {
    if (!records || records.length === 0) return { matrix: {}, brands: [], months: [], totals: {}, latestMonthWithData: 1 };

    const years = [previousYear, currentYear];
    const monthsArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    const rawData = { [previousYear]: {}, [currentYear]: {} };
    const brandNames = new Set();
    let latestMonth = 1;

    // Normalización de marcas para evitar duplicados por typos comunes
    const normalizeBrand = (name) => {
      let b = (name || '').trim().toUpperCase();
      if (b.includes('LITTLE') && b.includes('CEASAR')) return 'LITTLE CAESARS';
      if (b === 'MCD' || b.includes('MCDONAL')) return 'MCDONALDS';
      return b;
    };

    records.forEach(r => {
      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr)) return;
      if (isNaN(ms)) return;

      const brand = normalizeBrand(r.competidor);
      if (brand === 'WANTA') return;
      
      brandNames.add(brand);

      if (!rawData[yr][ms]) rawData[yr][ms] = {};
      const storeCodeRaw = (r.codigo_tienda || r.local || '').trim().toUpperCase();
      const storeKey = `${brand}||${storeCodeRaw}`;
      
      if (!rawData[yr][ms][storeKey]) {
        rawData[yr][ms][storeKey] = { brand, name: r.local, code: r.codigo_tienda, sales: 0 };
      }
      rawData[yr][ms][storeKey].sales += (parseFloat(r.transacciones_diferencial || r.transacciones) || 0);
      
      if (yr === currentYear && ms > latestMonth) latestMonth = ms;
    });

    const brandsSorted = Array.from(brandNames).sort();
    const matrix = {};
    const monthlyTotals = {};

    brandsSorted.forEach(brand => {
      matrix[brand] = {};
      monthsArray.forEach(m => {
        const lyStores = rawData[previousYear][m] || {};
        const tyStores = rawData[currentYear][m] || {};
        
        let sumLY = 0;
        let sumTY = 0;

        Object.keys(tyStores).forEach(key => {
          if (tyStores[key].brand === brand) {
            const tyVal = tyStores[key].sales;
            const lyVal = lyStores[key]?.sales || 0;
            if (tyVal > 0 && lyVal > 0) {
              sumTY += tyVal;
              sumLY += lyVal;
            }
          }
        });
        
        matrix[brand][m] = { ty: sumTY, ly: sumLY, growth: sumLY > 0 ? ((sumTY / sumLY) - 1) * 100 : 0 };
        
        if (!monthlyTotals[m]) monthlyTotals[m] = { ty: 0, ly: 0 };
        monthlyTotals[m].ty += sumTY;
        monthlyTotals[m].ly += sumLY;
      });
    });

    monthsArray.forEach(m => {
      monthlyTotals[m].growth = monthlyTotals[m].ly > 0 ? ((monthlyTotals[m].ty / monthlyTotals[m].ly) - 1) * 100 : 0;
    });

    return {
      matrix,
      brands: brandsSorted,
      months: monthsArray,
      totals: monthlyTotals,
      rawData,
      latestMonthWithData: latestMonth
    };
  }, [records, currentYear, previousYear]);

  const selectedMonthIdx = useMemo(() => {
    const fromFilter = parseInt(filters.month);
    if (!isNaN(fromFilter) && fromFilter > 0) return fromFilter;
    return matrixData.latestMonthWithData;
  }, [filters.month, matrixData.latestMonthWithData]);

  const rawStoresDetail = useMemo(() => {
    const detail = [];
    const lySelected = matrixData.rawData?.[previousYear]?.[selectedMonthIdx] || {};
    const tySelected = matrixData.rawData?.[currentYear]?.[selectedMonthIdx] || {};

    Object.keys(tySelected).forEach(key => {
      const tyVal = tySelected[key].sales;
      const lyVal = lySelected[key]?.sales || 0;
      if (tyVal > 0 && lyVal > 0) {
        detail.push({
          brand: tySelected[key].brand,
          name: tySelected[key].name,
          code: tySelected[key].code,
          salesTY: tyVal,
          salesLY: lyVal,
          growth: ((tyVal / lyVal) - 1) * 100
        });
      }
    });
    return detail.sort((a,b) => b.salesTY - a.salesTY);
  }, [matrixData.rawData, currentYear, previousYear, selectedMonthIdx]);

  const filteredStoresDetail = useMemo(() => {
    if (!searchTerm) return rawStoresDetail;
    const lowerSearch = searchTerm.toLowerCase();
    return rawStoresDetail.filter(s => 
      s.name?.toLowerCase().includes(lowerSearch) || 
      s.brand?.toLowerCase().includes(lowerSearch) || 
      s.code?.toLowerCase().includes(lowerSearch)
    );
  }, [rawStoresDetail, searchTerm]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    if (num === 0) return '-';
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : Math.round(num);
  };

  const currentMonthTotal = matrixData.totals[selectedMonthIdx] || { ty: 0, ly: 0, growth: 0 };

  return (
    <div className="space-y-12 pb-24">
      {/* 1. Master Matrix - Finer and more compact */}
      <div className="pwa-card overflow-hidden shadow-2xl border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 px-6 py-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-orange/10 rounded-lg">
                 <LayoutDashboard className="text-accent-orange" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-widest">Master Matrix SSTX {currentYear}</h3>
                <p className="text-[9px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-0.5 italic">Ventas (TY) y Variación vs {previousYear}</p>
              </div>
           </div>
           <span className="text-[9px] text-slate-400 dark:text-white/20 font-black uppercase">v3.2 Compact</span>
        </div>
        
        {/* Scrollable Container with Max Height */}
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-white/10 shadow-sm">
                <th className="px-6 py-3 text-[9px] font-black uppercase text-slate-500 dark:text-white/40 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 w-44">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-2 py-3 text-center text-[9px] font-black uppercase transition-colors ${m === selectedMonthIdx ? 'text-accent-orange bg-orange-500/10' : 'text-slate-500 dark:text-white/40'}`}>
                    {monthNames[m-1]}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-accent-orange bg-orange-500/10">YTD</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => {
                let ytdTY = 0;
                let ytdLY = 0;
                return (
                  <tr key={brand} className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-3 text-[10px] font-black italic uppercase text-slate-700 dark:text-white/70 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                      {brand}
                    </td>
                    {matrixData.months.map(m => {
                      const data = matrixData.matrix[brand][m];
                      const hasData = data.ty > 0 && data.ly > 0;
                      if (hasData) {
                        ytdTY += data.ty;
                        ytdLY += data.ly;
                      }
                      return (
                        <td key={m} className={`px-1 py-3 text-center transition-all ${m === selectedMonthIdx ? 'bg-orange-500/5' : ''}`}>
                          <div className="flex flex-col items-center leading-tight">
                             <span className={`text-[10px] font-black ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-200 dark:text-white/5'}`}>
                               {kFormatter(data.ty)}
                             </span>
                             {hasData && (
                               <span className={`text-[8px] font-black ${data.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                 {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(0)}%
                               </span>
                             )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-3 text-right bg-orange-500/5 font-black">
                       <div className="flex flex-col items-end leading-tight">
                          <span className="text-[10px] text-accent-orange italic">{kFormatter(ytdTY)}</span>
                          <span className={`text-[8px] ${ytdTY >= ytdLY ? 'text-emerald-500' : 'text-red-500'}`}>
                             {ytdLY > 0 ? (ytdTY >= ytdLY ? '+' : '') + ((ytdTY/ytdLY - 1)*100).toFixed(1) + '%' : '-'}
                          </span>
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
                   const data = matrixData.totals[m];
                   const hasData = data.ty > 0 && data.ly > 0;
                   return (
                    <td key={m} className={`px-1 py-4 text-center ${m === selectedMonthIdx ? 'bg-orange-500/20' : ''}`}>
                      <div className="flex flex-col items-center leading-tight">
                         <span className={`text-[11px] font-black ${hasData ? 'text-white' : 'text-white/20'}`}>
                            {kFormatter(data.ty)}
                         </span>
                         {hasData && (
                           <span className={`text-[8px] font-black ${data.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                           </span>
                         )}
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

      {/* Detail Table Header KPI summary (Smaller) */}
      <div className="pwa-card p-6 grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5">
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiendas {fullMonthNames[selectedMonthIdx-1]}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{rawStoresDetail.length}</span>
         </div>
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ventas Estimadas</span>
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{kFormatter(currentMonthTotal.ty)}</span>
         </div>
         <div className="flex flex-col border-l-2 border-accent-orange pl-4">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Growth Matcheado</span>
            <span className={`text-xl font-black tracking-tighter ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
            </span>
         </div>
         <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search size={14} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar tienda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-accent-orange/20 outline-none"
            />
         </div>
      </div>

      {/* Detailed Store Table - Compact */}
      <div className="pwa-card overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-white/[0.05] border-b dark:border-white/10">
                <th className="px-6 py-3 text-left text-[9px] font-black uppercase text-slate-500 dark:text-white/30">Marca / Codigo</th>
                <th className="px-6 py-3 text-left text-[9px] font-black uppercase text-slate-500 dark:text-white/30">Tienda</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500 dark:text-white/30">{previousYear}</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500 dark:text-white/30">{currentYear}</th>
                <th className="px-6 py-3 text-right text-[9px] font-black uppercase text-slate-500 dark:text-white/30">Var %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence>
              {filteredStoresDetail.length > 0 ? (
                filteredStoresDetail.map((store) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={store.brand + (store.code || '') + store.name} 
                    className="group hover:bg-slate-50 dark:hover:bg-white/[0.01]"
                  >
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
                       <span className={`text-[10px] font-black ${store.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                         {store.growth >= 0 ? '+' : ''}{store.growth.toFixed(1)}%
                       </span>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">No hay resultados</td>
                </tr>
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
