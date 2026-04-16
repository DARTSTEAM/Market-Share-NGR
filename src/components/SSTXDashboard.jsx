import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, Search, LayoutDashboard, Calculator, ArrowUpDown } from 'lucide-react';

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

    records.forEach(r => {
      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr)) return;
      if (isNaN(ms)) return;

      const brand = r.competidor?.trim().toUpperCase() || 'OTRO';
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
    <div className="space-y-12">
      {/* 1. Master Matrix */}
      <div className="pwa-card overflow-hidden shadow-2xl border-orange-500/10 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
        <div className="bg-slate-900/90 px-6 py-6 flex justify-between items-center border-b border-white/5">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                 <LayoutDashboard className="text-accent-orange" size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white italic uppercase tracking-widest">Master Matrix SSTX {currentYear}</h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 italic">Ventas (TY) y Variación vs {previousYear}</p>
              </div>
           </div>
           <span className="text-[10px] bg-accent-orange/20 text-accent-orange border border-accent-orange/30 px-3 py-1 rounded-full font-black uppercase tracking-tighter">
              v3.1 Matrix
           </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-white/40 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-48">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-4 py-5 text-center text-[10px] font-black uppercase transition-colors ${m === selectedMonthIdx ? 'text-accent-orange bg-orange-500/10' : 'text-slate-500 dark:text-white/40'}`}>
                    {monthNames[m-1]}
                  </th>
                ))}
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase text-accent-orange bg-orange-500/10">YTD Total</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => {
                let ytdTY = 0;
                let ytdLY = 0;
                return (
                  <tr key={brand} className="group border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5 text-[11px] font-black italic uppercase text-slate-700 dark:text-white/80 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors shadow-[4px_0_10px_rgba(0,0,0,0.02)]">
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
                        <td key={m} className={`px-2 py-5 text-center transition-all ${m === selectedMonthIdx ? 'bg-orange-500/5' : ''}`}>
                          <div className="flex flex-col items-center">
                             <span className={`text-[12px] font-black ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/10'}`}>
                               {kFormatter(data.ty)}
                             </span>
                             {hasData && (
                               <span className={`text-[10px] font-black px-1.5 rounded-full ${data.growth >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                 {data.growth >= 0 ? '↑' : '↓'} {Math.abs(data.growth).toFixed(0)}%
                               </span>
                             )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-5 text-right bg-orange-500/5 font-black">
                       <div className="flex flex-col items-end">
                          <span className="text-[12px] text-accent-orange italic">{kFormatter(ytdTY)}</span>
                          <span className={`text-[10px] ${ytdTY >= ytdLY ? 'text-emerald-500' : 'text-red-500'}`}>
                             {ytdLY > 0 ? (ytdTY >= ytdLY ? '+' : '') + ((ytdTY/ytdLY - 1)*100).toFixed(1) + '%' : '-'}
                          </span>
                       </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-900 dark:bg-white/[0.08] font-black border-t-4 border-accent-orange/30">
                <td className="px-6 py-8 text-[12px] font-black italic uppercase text-white sticky left-0 bg-slate-900 dark:bg-slate-800 z-10">TOTAL MERCADO</td>
                {matrixData.months.map(m => {
                   const data = matrixData.totals[m];
                   const hasData = data.ty > 0 && data.ly > 0;
                   return (
                    <td key={m} className={`px-2 py-8 text-center ${m === selectedMonthIdx ? 'bg-orange-500/20' : ''}`}>
                      <div className="flex flex-col items-center">
                         <span className={`text-[13px] font-black ${hasData ? 'text-white' : 'text-white/20'}`}>
                            {kFormatter(data.ty)}
                         </span>
                         {hasData && (
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${data.growth >= 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                           </span>
                         )}
                      </div>
                    </td>
                   );
                })}
                <td className="px-6 py-8 text-right bg-orange-500/20"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Detailed Store Table */}
      <div className="pwa-card overflow-hidden shadow-xl border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-black italic uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="text-accent-orange" size={20} />
                Detalle por Local - {fullMonthNames[selectedMonthIdx-1]}
              </h3>
              <div className="flex gap-6 mt-4">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiendas Activas</span>
                    <span className="text-2xl font-black text-accent-orange">{rawStoresDetail.length}</span>
                 </div>
                 <div className="w-[1px] bg-slate-200 dark:bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volumen Total</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</span>
                 </div>
                 <div className="w-[1px] bg-slate-200 dark:bg-white/10" />
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Promedio Growth</span>
                    <span className={`text-2xl font-black ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
                    </span>
                 </div>
              </div>
            </div>

            {/* Redesigned Search Bar */}
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400 group-focus-within:text-accent-orange transition-colors" />
               </div>
               <input
                 type="text"
                 placeholder="Buscar por tienda, marca o código..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="block w-full lg:w-96 pl-11 pr-4 py-3 bg-slate-100 dark:bg-white/5 border border-transparent focus:border-accent-orange/50 rounded-2xl text-xs font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-accent-orange/5 transition-all shadow-inner"
               />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.03]">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Marca</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Código</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Tienda</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">{previousYear}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">{currentYear}</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Variación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              <AnimatePresence>
              {filteredStoresDetail.length > 0 ? (
                filteredStoresDetail.map((store, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={store.brand + (store.code || '') + store.name} 
                    className="group hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-8 py-5 text-[11px] font-black italic text-accent-orange uppercase tracking-wider">{store.brand}</td>
                    <td className="px-8 py-5 text-[11px] font-mono font-bold text-slate-400 dark:text-white/20">{store.code || '-'}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-700 dark:text-white/80 uppercase tracking-tight">{store.name}</td>
                    <td className="px-8 py-5 text-right text-[11px] font-medium text-slate-400 dark:text-white/30">{kFormatter(store.salesLY)}</td>
                    <td className="px-8 py-5 text-right text-[11px] font-black text-slate-900 dark:text-white">{kFormatter(store.salesTY)}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {store.growth >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                        <span className={`text-[12px] font-black ${store.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {store.growth.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                       <Search size={32} className="text-slate-400" />
                       <p className="text-xs uppercase font-black text-slate-500 italic">No se encontraron tiendas que coincidan con la búsqueda</p>
                    </div>
                  </td>
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
