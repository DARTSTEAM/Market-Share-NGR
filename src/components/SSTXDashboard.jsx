import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, BarChart3, Calculator } from 'lucide-react';

const SSTXDashboard = ({ records, filters }) => {
  // 1. Identify periods
  const currentYear = parseInt(filters.year) || new Date().getFullYear();
  const previousYear = currentYear - 1;
  const selectedMonthIdx = parseInt(filters.month) || (new Date().getMonth() + 1);

  // 2. Build All-Month Metadata and Data Matrices
  const matrixData = useMemo(() => {
    if (!records || records.length === 0) return { matrix: {}, brands: [], months: [], totals: {} };

    const years = [previousYear, currentYear];
    const monthsArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // structure: data[year][month][storeKey] = sales
    const rawData = { [previousYear]: {}, [currentYear]: {} };
    const brandNames = new Set();

    records.forEach(r => {
      const yr = parseInt(r.ano);
      const ms = parseInt(r.mes);
      if (!years.includes(yr)) return;
      if (isNaN(ms)) return;

      if (!rawData[yr][ms]) rawData[yr][ms] = {};
      
      const brand = r.competidor?.toUpperCase() || 'OTRO';
      brandNames.add(brand);
      const storeKey = `${brand}||${r.codigo_tienda || r.local}`;
      
      if (!rawData[yr][ms][storeKey]) {
        rawData[yr][ms][storeKey] = { brand, name: r.local, code: r.codigo_tienda, sales: 0 };
      }
      rawData[yr][ms][storeKey].sales += (parseFloat(r.transacciones_diferencial || r.transacciones) || 0);
    });

    const brandsSorted = Array.from(brandNames).sort();
    
    // Build Matrix: matrix[brand][month] = { ty, ly, growth }
    // Also build Monthly Totals: totals[month] = { ty, ly, growth }
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

    // Calculate growth for totals
    monthsArray.forEach(m => {
      monthlyTotals[m].growth = monthlyTotals[m].ly > 0 ? ((monthlyTotals[m].ty / monthlyTotals[m].ly) - 1) * 100 : 0;
    });

    // Extract Detail for selected month
    const storesDetail = [];
    const lySelected = rawData[previousYear][selectedMonthIdx] || {};
    const tySelected = rawData[currentYear][selectedMonthIdx] || {};

    Object.keys(tySelected).forEach(key => {
      const tyVal = tySelected[key].sales;
      const lyVal = lySelected[key]?.sales || 0;
      if (tyVal > 0 && lyVal > 0) {
        storesDetail.push({
          brand: tySelected[key].brand,
          name: tySelected[key].name,
          code: tySelected[key].code,
          salesTY: tyVal,
          salesLY: lyVal,
          growth: ((tyVal / lyVal) - 1) * 100
        });
      }
    });

    return {
      matrix,
      brands: brandsSorted,
      months: monthsArray,
      totals: monthlyTotals,
      storesDetail: storesDetail.sort((a,b) => b.salesTY - a.salesTY)
    };
  }, [records, currentYear, previousYear, selectedMonthIdx]);

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const fullMonthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const kFormatter = (num) => {
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : Math.round(num);
  };

  const currentMonthTotal = matrixData.totals[selectedMonthIdx] || { ty: 0, ly: 0, growth: 0 };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            Same Store Sales (SSTX) <span className="text-[10px] bg-accent-orange text-white px-2 py-0.5 rounded not-italic">V2.1</span>
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-1">
            Resumen Comparativo de Ventas {currentYear} vs {previousYear}
          </p>
        </div>
      </div>

      {/* 1. Matrix: Variación Porcentual (%) */}
      <div className="pwa-card overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
           <h3 className="text-xs font-black text-white italic uppercase tracking-widest">Variación SSTX (%) por Mes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Marca</th>
                {matrixData.months.map(m => (
                  <th key={m} className={`px-4 py-4 text-right text-[10px] font-black uppercase ${m === selectedMonthIdx ? 'text-accent-orange bg-orange-500/5' : 'text-slate-500 dark:text-white/40'}`}>
                    {monthNames[m-1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => (
                <tr key={brand} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-6 py-4 text-[11px] font-black italic uppercase text-slate-700 dark:text-white/80">{brand}</td>
                  {matrixData.months.map(m => {
                    const val = matrixData.matrix[brand][m].growth;
                    const hasSales = matrixData.matrix[brand][m].ty > 0;
                    return (
                      <td key={m} className={`px-4 py-4 text-right text-[10px] font-black ${hasSales ? (val >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-slate-300 dark:text-white/10'}`}>
                        {hasSales ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-slate-100/50 dark:bg-white/[0.05] font-black">
                <td className="px-6 py-5 text-[11px] font-black italic uppercase text-slate-900 dark:text-white">TOTAL MERCADO</td>
                {matrixData.months.map(m => (
                  <td key={m} className={`px-4 py-5 text-right text-[11px] font-black ${matrixData.totals[m].growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {matrixData.totals[m].ly > 0 ? (matrixData.totals[m].growth >= 0 ? '+' : '') + matrixData.totals[m].growth.toFixed(1) + '%' : '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Brand Summary Table for Selected Month (TY, LY, Var%) */}
      <div className="pwa-card overflow-hidden border-orange-500/30">
        <div className="bg-gradient-to-r from-orange-500 to-orange-700 px-6 py-4 flex justify-between items-center">
           <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Comparativo {fullMonthNames[selectedMonthIdx-1]} {currentYear}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Marca</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-500 dark:text-white/40">{previousYear} (LY)</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-500 dark:text-white/40">{currentYear} (TY)</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-accent-orange">Crecimiento (%)</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.brands.map(brand => {
                const data = matrixData.matrix[brand][selectedMonthIdx];
                if (data.ty === 0 && data.ly === 0) return null;
                return (
                  <tr key={brand} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-[11px] font-black italic uppercase text-slate-700 dark:text-white/80">{brand}</td>
                    <td className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 dark:text-white/30">{kFormatter(data.ly)}</td>
                    <td className="px-6 py-4 text-right text-[11px] font-black text-slate-900 dark:text-white">{kFormatter(data.ty)}</td>
                    <td className={`px-6 py-4 text-right text-[11px] font-black ${data.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {/* Grand Total Row */}
              <tr className="bg-orange-500/10 border-t-2 border-orange-500/50">
                <td className="px-6 py-5 text-[12px] font-black italic uppercase text-orange-600 dark:text-orange-400">TOTALES DEL MES</td>
                <td className="px-6 py-5 text-right text-[12px] font-black text-slate-400 dark:text-white/30">{kFormatter(currentMonthTotal.ly)}</td>
                <td className="px-6 py-5 text-right text-[12px] font-black text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</td>
                <td className={`px-6 py-5 text-right text-[12px] font-black ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Detailed Store Table with Summary at TOP */}
      <div className="pwa-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col gap-1 bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white">
            Detalle por Local - Coincidencias {fullMonthNames[selectedMonthIdx-1]}
          </h3>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tiendas:</span>
              <span className="text-[10px] font-black text-accent-orange">{matrixData.storesDetail.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total TY:</span>
              <span className="text-[10px] font-black text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Growth:</span>
              <span className={`text-[10px] font-black ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
              </span>
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
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Variación</th>
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
