import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, AlertCircle } from 'lucide-react';

const SSTXDashboard = ({ records, filters }) => {
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
      const storeKey = `${brand}||${(r.codigo_tienda || r.local || '').trim().toUpperCase()}`;
      
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

  const storesDetail = useMemo(() => {
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

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    if (num === 0) return '-';
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : Math.round(num);
  };

  const currentMonthTotal = matrixData.totals[selectedMonthIdx] || { ty: 0, ly: 0, growth: 0 };

  return (
    <div className="space-y-12">
      {/* 1. Master Matrix: TRX + Growth for ALL Months */}
      <div className="pwa-card overflow-hidden shadow-2xl border-orange-500/10">
        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center border-b border-white/5">
           <div>
              <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Master Matrix SSTX {currentYear}</h3>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1 italic">Ventas (TY) y Variación vs {previousYear}</p>
           </div>
           <div className="flex gap-2">
             <span className="text-[9px] bg-accent-orange text-white px-2 py-1 rounded font-black uppercase">V3.0 FINAL</span>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 w-40">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-4 py-4 text-center text-[10px] font-black uppercase ${m === selectedMonthIdx ? 'text-accent-orange bg-orange-500/5' : 'text-slate-500 dark:text-white/40'}`}>
                    {monthNames[m-1]}
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-accent-orange bg-orange-500/5">YTD Total</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => {
                let ytdTY = 0;
                let ytdLY = 0;
                return (
                  <tr key={brand} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[11px] font-black italic uppercase text-slate-700 dark:text-white/80 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">{brand}</td>
                    {matrixData.months.map(m => {
                      const data = matrixData.matrix[brand][m];
                      const hasData = data.ty > 0 && data.ly > 0;
                      if (hasData) {
                        ytdTY += data.ty;
                        ytdLY += data.ly;
                      }
                      return (
                        <td key={m} className={`px-2 py-4 text-center ${m === selectedMonthIdx ? 'bg-orange-500/5' : ''}`}>
                          <div className="flex flex-col items-center">
                             <span className={`text-[11px] font-black ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/10'}`}>
                               {kFormatter(data.ty)}
                             </span>
                             {hasData && (
                               <span className={`text-[9px] font-black ${data.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                 {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(0)}%
                               </span>
                             )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-right bg-orange-500/5">
                       <div className="flex flex-col items-end">
                          <span className="text-[11px] font-black text-accent-orange italic">{kFormatter(ytdTY)}</span>
                          <span className={`text-[9px] font-black ${ytdTY >= ytdLY ? 'text-emerald-500' : 'text-red-500'}`}>
                             {ytdLY > 0 ? (ytdTY >= ytdLY ? '+' : '') + ((ytdTY/ytdLY - 1)*100).toFixed(1) + '%' : '-'}
                          </span>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-slate-100/50 dark:bg-white/[0.05] font-black border-t-2 border-slate-200 dark:border-white/10">
                <td className="px-6 py-6 text-[11px] font-black italic uppercase text-slate-900 dark:text-white sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">TOTAL MERCADO</td>
                {matrixData.months.map(m => {
                   const data = matrixData.totals[m];
                   const hasData = data.ty > 0 && data.ly > 0;
                   return (
                    <td key={m} className={`px-2 py-6 text-center ${m === selectedMonthIdx ? 'bg-orange-500/10' : ''}`}>
                      <div className="flex flex-col items-center">
                         <span className={`text-[11px] font-black ${hasData ? 'text-slate-900 dark:text-white' : 'text-slate-400/50'}`}>
                            {kFormatter(data.ty)}
                         </span>
                         {hasData && (
                           <span className={`text-[9px] font-black ${data.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                           </span>
                         )}
                      </div>
                    </td>
                   );
                })}
                <td className="px-6 py-6 text-right bg-orange-500/10">
                   {/* YTD Total for all market would go here if calculated */}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Detailed Store Table for Selected Month */}
      <div className="pwa-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white">
            Detalle por Local - Coincidencias {fullMonthNames[selectedMonthIdx-1]}
          </h3>
          <div className="grid grid-cols-3 gap-8 mt-4">
             <div className="border-l-2 border-orange-500 pl-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tiendas Activas</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{storesDetail.length}</p>
             </div>
             <div className="border-l-2 border-orange-500 pl-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volumen Matcheado</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</p>
             </div>
             <div className="border-l-2 border-orange-500 pl-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Var % del Mes</p>
                <p className={`text-xl font-black ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
                </p>
             </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-white/[0.01]">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Marca</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Tienda</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{previousYear}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{currentYear}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Variación %</th>
              </tr>
            </thead>
            <tbody>
              {storesDetail.length > 0 ? (
                storesDetail.map(store => (
                  <tr key={store.brand + store.code + store.name} className="border-t border-slate-100 dark:border-white/[0.02] hover:bg-slate-200/20 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-3 text-[10px] font-black italic text-accent-orange uppercase">{store.brand}</td>
                    <td className="px-6 py-3 text-[10px] font-bold text-slate-600 dark:text-white/60 uppercase">{store.name}</td>
                    <td className="px-6 py-3 text-right text-[10px] font-medium text-slate-500 dark:text-white/40">{kFormatter(store.salesLY)}</td>
                    <td className="px-6 py-3 text-right text-[10px] font-black text-slate-900 dark:text-white">{kFormatter(store.salesTY)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`text-[11px] font-black ${store.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {store.growth.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 uppercase font-black text-xs italic opacity-50">
                    Seleccione un mes con datos para ver el detalle por local
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SSTXDashboard;
