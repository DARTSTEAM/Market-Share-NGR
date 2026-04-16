import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, BarChart3 } from 'lucide-react';

const SSTXDashboard = ({ records, filters, globalFilterBar }) => {
  // 1. Identify periods
  const currentYear = parseInt(filters.year) || new Date().getFullYear();
  const previousYear = currentYear - 1;
  
  // Handle the month: SSTX requires a month. If 'all', find the latest month in the records
  const currentMonth = useMemo(() => {
    const m = parseInt(filters.month);
    if (!isNaN(m)) return m;
    
    const yr = currentYear;
    const availableMonths = (records || [])
      .filter(r => parseInt(r.ano) === yr)
      .map(r => parseInt(r.mes))
      .filter(m => !isNaN(m));
    
    return availableMonths.length > 0 ? Math.max(...availableMonths) : new Date().getMonth() + 1;
  }, [filters.month, records, currentYear]);

  // 2. Build Matrices and Store Detail
  const matrixData = useMemo(() => {
    if (!records || records.length === 0) return { matrixLY: {}, matrixTY: {}, brands: [], months: [], storesDetail: [] };

    const years = [previousYear, currentYear];
    const monthsArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // Group records by Ano, Mes, Competidor, Codigo
    // structure: data[year][month][storeKey] = sales
    const data = { [previousYear]: {}, [currentYear]: {} };
    const brandNames = new Set();

    records.forEach(r => {
      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr)) return;
      if (isNaN(ms)) return;

      if (!data[yr][ms]) data[yr][ms] = {};
      
      const brand = r.competidor?.toUpperCase() || 'OTRO';
      brandNames.add(brand);
      const storeKey = `${brand}||${r.codigo_tienda || r.local}`;
      
      if (!data[yr][ms][storeKey]) {
        data[yr][ms][storeKey] = { brand, name: r.local, code: r.codigo_tienda, sales: 0 };
      }
      data[yr][ms][storeKey].sales += (parseFloat(r.transacciones_diferencial || r.transacciones) || 0);
    });

    const brandsSorted = Array.from(brandNames).sort();
    
    // We only want 'Same Stores': stores that have sales > 0 in BOTH yr and yr-1 for a GIVEN month
    const matrix = { [previousYear]: {}, [currentYear]: {} };
    const storesMatchingCurrentMonth = [];

    brandsSorted.forEach(brand => {
      matrix[previousYear][brand] = {};
      matrix[currentYear][brand] = {};
      
      monthsArray.forEach(m => {
        const lyStores = data[previousYear][m] || {};
        const tyStores = data[currentYear][m] || {};
        
        let sumLY = 0;
        let sumTY = 0;

        Object.keys(tyStores).forEach(key => {
          if (tyStores[key].brand === brand) {
            const tyVal = tyStores[key].sales;
            const lyVal = lyStores[key]?.sales || 0;

            if (tyVal > 0 && lyVal > 0) {
              sumTY += tyVal;
              sumLY += lyVal;
              
              if (m === currentMonth) {
                storesMatchingCurrentMonth.push({
                  brand,
                  name: tyStores[key].name,
                  code: tyStores[key].code,
                  salesTY: tyVal,
                  salesLY: lyVal,
                  growth: ((tyVal / lyVal) - 1) * 100
                });
              }
            }
          }
        });
        
        matrix[previousYear][brand][m] = sumLY;
        matrix[currentYear][brand][m] = sumTY;
      });
    });

    return {
      matrixLY: matrix[previousYear],
      matrixTY: matrix[currentYear],
      brands: brandsSorted,
      months: monthsArray,
      storesDetail: storesMatchingCurrentMonth.sort((a,b) => b.salesTY - a.salesTY)
    };
  }, [records, currentYear, previousYear, currentMonth]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : Math.round(num);
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            Same Store Sales (SSTX) <span className="text-[10px] bg-accent-orange text-white px-2 py-0.5 rounded not-italic">V2.0</span>
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-1">
            Matriz Comparativa {currentYear} vs {previousYear} | Solo Tiendas con Coincidencia
          </p>
        </div>
      </div>

      {/* Current Year Matrix */}
      <div className="pwa-card overflow-hidden border-orange-500/20 shadow-xl">
         <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">{currentYear} - REAL (SSTX)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Marca</th>
                     {matrixData.months.map(m => (
                       <th key={m} className={`px-4 py-4 text-right text-[10px] font-black uppercase ${m === currentMonth ? 'text-accent-orange bg-orange-500/5' : 'text-slate-500 dark:text-white/40'}`}>
                         {monthNames[m-1]}
                       </th>
                     ))}
                     <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-accent-orange bg-orange-500/5">Total</th>
                  </tr>
               </thead>
               <tbody>
                  {matrixData.brands.map(brand => {
                    const rowData = matrixData.matrixTY[brand];
                    const totalRow = Object.values(rowData).reduce((a, b) => a + b, 0);
                    if (totalRow === 0) return null;
                    return (
                      <tr key={brand} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-[11px] font-black italic uppercase text-slate-700 dark:text-white/80">{brand}</td>
                        {matrixData.months.map(m => (
                          <td key={m} className={`px-4 py-4 text-right text-[10px] font-bold ${m === currentMonth ? 'text-slate-900 dark:text-white font-black bg-orange-500/5' : 'text-slate-400 dark:text-white/30'}`}>
                            {rowData[m] > 0 ? kFormatter(rowData[m]) : '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right text-[11px] font-black italic text-accent-orange bg-orange-500/5">
                          {kFormatter(totalRow)}
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Previous Year Matrix */}
      <div className="pwa-card overflow-hidden border-slate-300 dark:border-white/10 opacity-80">
         <div className="bg-slate-700 dark:bg-slate-800 px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest">{previousYear} - BASE (SSTX)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                     <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Marca</th>
                     {matrixData.months.map(m => (
                       <th key={m} className={`px-4 py-4 text-right text-[10px] font-black uppercase ${m === currentMonth ? 'text-slate-900 dark:text-white/80 bg-slate-500/5' : 'text-slate-500 dark:text-white/40'}`}>
                         {monthNames[m-1]}
                       </th>
                     ))}
                     <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-900 dark:text-white/80 bg-slate-500/5">Total</th>
                  </tr>
               </thead>
               <tbody>
                  {matrixData.brands.map(brand => {
                    const rowData = matrixData.matrixLY[brand];
                    const totalRow = Object.values(rowData).reduce((a, b) => a + b, 0);
                    if (totalRow === 0) return null;
                    return (
                      <tr key={brand} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-[11px] font-black italic uppercase text-slate-500 dark:text-white/40">{brand}</td>
                        {matrixData.months.map(m => (
                          <td key={m} className={`px-4 py-4 text-right text-[10px] font-bold ${m === currentMonth ? 'text-slate-600 dark:text-white/50 bg-slate-500/5' : 'text-slate-400 dark:text-white/20'}`}>
                            {rowData[m] > 0 ? kFormatter(rowData[m]) : '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right text-[11px] font-black italic text-slate-600 dark:text-white/50 bg-slate-500/5">
                          {kFormatter(totalRow)}
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Store Level Detail */}
      <div className="pwa-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white">
            Detalle por Local - Matcheo {fullMonthNames[currentMonth-1]}
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {matrixData.storesDetail.length} locales activos en ambos periodos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-white/[0.01]">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Marca</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Tienda</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{previousYear}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{currentYear}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Crecimiento</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.storesDetail.map(store => (
                <tr key={store.brand + store.code + store.name} className="border-t border-slate-100 dark:border-white/[0.02] hover:bg-slate-200/20 dark:hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-3 text-[10px] font-black italic text-accent-orange uppercase">{store.brand}</td>
                  <td className="px-6 py-3 text-[10px] font-bold text-slate-600 dark:text-white/60 uppercase">{store.name}</td>
                  <td className="px-6 py-3 text-right text-[10px] font-medium text-slate-500 dark:text-white/40">{kFormatter(store.salesLY)}</td>
                  <td className="px-6 py-3 text-right text-[10px] font-black text-slate-900 dark:text-white">{kFormatter(store.salesTY)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {store.growth >= 0 ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-500" />}
                      <span className={`text-[11px] font-black ${store.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {store.growth.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SSTXDashboard;
