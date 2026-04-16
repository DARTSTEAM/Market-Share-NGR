import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, BarChart3, AlertCircle } from 'lucide-react';

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
      // Excluir WANTA según pedido del usuario
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
            // Solo tiendas que existen en ambos años para ese mes
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

  // Determine active month for comparison
  const selectedMonthIdx = useMemo(() => {
    const fromFilter = parseInt(filters.month);
    if (!isNaN(fromFilter) && fromFilter > 0) return fromFilter;
    return matrixData.latestMonthWithData;
  }, [filters.month, matrixData.latestMonthWithData]);

  // Extract Detail for active month
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
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : Math.round(num);
  };

  const currentMonthTotal = matrixData.totals[selectedMonthIdx] || { ty: 0, ly: 0, growth: 0 };
  const hasDataForSelectedMonth = currentMonthTotal.ty > 0 && currentMonthTotal.ly > 0;

  return (
    <div className="space-y-12">
      {/* 1. Matrix View */}
      <div className="pwa-card overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
           <h3 className="text-xs font-black text-white italic uppercase tracking-widest">Variación SSTX (%) por Mes</h3>
           <div className="flex gap-2">
             <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-black uppercase">KPI: Growth</span>
           </div>
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
                    const data = matrixData.matrix[brand][m];
                    const hasSales = data.ty > 0 && data.ly > 0;
                    return (
                      <td key={m} className={`px-4 py-4 text-right text-[10px] font-black ${hasSales ? (data.growth >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-slate-300 dark:text-white/10'}`}>
                        {hasSales ? `${data.growth >= 0 ? '+' : ''}${data.growth.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-100/50 dark:bg-white/[0.05] font-black">
                <td className="px-6 py-5 text-[11px] font-black italic uppercase text-slate-900 dark:text-white">TOTAL MERCADO (%)</td>
                {matrixData.months.map(m => {
                   const hasSales = matrixData.totals[m].ly > 0 && matrixData.totals[m].ty > 0;
                   return (
                    <td key={m} className={`px-4 py-5 text-right text-[11px] font-black ${hasSales ? (matrixData.totals[m].growth >= 0 ? 'text-emerald-500' : 'text-red-500') : 'text-slate-300'}`}>
                      {hasSales ? (matrixData.totals[m].growth >= 0 ? '+' : '') + matrixData.totals[m].growth.toFixed(1) + '%' : '-'}
                    </td>
                   );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning if no data for month */}
      {!hasDataForSelectedMonth && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 flex items-center gap-4">
           <AlertCircle className="text-orange-500" size={24} />
           <div>
              <p className="text-sm font-black text-orange-600 uppercase tracking-tight">Sin coincidencias para {fullMonthNames[selectedMonthIdx-1]} {currentYear}</p>
              <p className="text-[10px] text-orange-500/80 font-bold uppercase">No hay registros suficientes en este mes para realizar una comparativa Same Store Sales. Intente con un mes anterior.</p>
           </div>
        </div>
      )}

      {/* 2. Brand Summary Detail Table (Unified) */}
      {hasDataForSelectedMonth && (
        <div className="pwa-card overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-white/10">
             <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Resumen Comparativo - {fullMonthNames[selectedMonthIdx-1]}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Marca</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Ventas {previousYear} (LY)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-500 dark:text-white/40">Ventas {currentYear} (TY)</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-accent-orange">Variación (%)</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.brands.map(brand => {
                  const data = matrixData.matrix[brand][selectedMonthIdx];
                  if (data.ty === 0 || data.ly === 0) return null;
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
                <tr className="bg-orange-500/10 font-black">
                  <td className="px-6 py-6 text-[12px] font-black italic uppercase text-orange-600 dark:text-orange-400">TOTAL CONSOLIDADO</td>
                  <td className="px-6 py-6 text-right text-[12px] text-slate-500/50">{kFormatter(currentMonthTotal.ly)}</td>
                  <td className="px-6 py-6 text-right text-[12px] text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</td>
                  <td className={`px-6 py-6 text-right text-[12px] ${currentMonthTotal.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {currentMonthTotal.growth >= 0 ? '+' : ''}{currentMonthTotal.growth.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Detailed Store Table */}
      {hasDataForSelectedMonth && (
        <div className="pwa-card overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white">
              Detalle por Local (Tiendas Existentes en ambos periodos)
            </h3>
            <div className="grid grid-cols-3 gap-8 mt-4">
               <div className="border-l-2 border-orange-500 pl-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base de Tiendas</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{storesDetail.length}</p>
               </div>
               <div className="border-l-2 border-orange-500 pl-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volumen Total Mes</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">{kFormatter(currentMonthTotal.ty)}</p>
               </div>
               <div className="border-l-2 border-orange-500 pl-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Matcheado</p>
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
                {storesDetail.map(store => (
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
      )}
    </div>
  );
};

export default SSTXDashboard;
