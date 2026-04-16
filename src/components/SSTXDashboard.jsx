import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Store, BarChart3, ArrowBigUp, ArrowBigDown, Maximize2, Minimize2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LineChart, Line } from 'recharts';

const SSTXDashboard = ({ records, filters, globalFilterBar }) => {
  const [expandedBrand, setExpandedBrand] = useState(null);

  // 1. Identify periods
  const currentYear = parseInt(filters.year) || new Date().getFullYear();
  
  // Hande the month: SSTX requires a month. If 'all', find the latest month in the records
  const currentMonth = useMemo(() => {
    const m = parseInt(filters.month);
    if (!isNaN(m)) return m;
    
    // Fallback: Latest month in records for the current year
    const yr = currentYear;
    const availableMonths = records
      .filter(r => parseInt(r.ano) === yr)
      .map(r => parseInt(r.mes))
      .filter(m => !isNaN(m));
    
    return availableMonths.length > 0 ? Math.max(...availableMonths) : new Date().getMonth() + 1;
  }, [filters.month, records, currentYear]);

  const previousYear = currentYear - 1;

  // 2. Filter records for both periods
  const sstxStats = useMemo(() => {
    if (!records || records.length === 0) return { brands: [], totalGrowth: 0, sameStoresCount: 0 };

    // Get current month records
    const currentRecords = records.filter(r => 
      parseInt(r.ano) === currentYear && 
      parseInt(r.mes) === currentMonth
    );

    // Get previous year same month records
    const previousRecords = records.filter(r => 
      parseInt(r.ano) === previousYear && 
      parseInt(r.mes) === currentMonth
    );

    // Group by store and brand
    const currentStores = currentRecords.reduce((acc, r) => {
      const key = `${r.competidor}-${r.codigo_tienda || r.local}`;
      if (!acc[key]) acc[key] = { brand: r.competidor, store: r.local, code: r.codigo_tienda, sales: 0 };
      acc[key].sales += (parseFloat(r.transacciones) || 0);
      return acc;
    }, {});

    const previousStores = previousRecords.reduce((acc, r) => {
      const key = `${r.competidor}-${r.codigo_tienda || r.local}`;
      if (!acc[key]) acc[key] = { sales: 0 };
      acc[key].sales += (parseFloat(r.transacciones) || 0);
      return acc;
    }, {});

    // Intersect: Only stores present in BOTH with positive sales
    const sameStoreKeys = Object.keys(currentStores).filter(key => 
      currentStores[key].sales > 0 &&
      previousStores[key] && 
      previousStores[key].sales > 0
    );
    
    // Group results by brand
    const brandStats = {};
    let totalSalesLY = 0;
    let totalSalesTY = 0;

    sameStoreKeys.forEach(key => {
      const current = currentStores[key];
      const previous = previousStores[key];
      const brand = current.brand;

      if (!brandStats[brand]) {
        brandStats[brand] = {
          name: brand,
          salesTY: 0,
          salesLY: 0,
          stores: [],
          storeCount: 0
        };
      }

      brandStats[brand].salesTY += current.sales;
      brandStats[brand].salesLY += previous.sales;
      brandStats[brand].storeCount += 1;
      brandStats[brand].stores.push({
        name: current.store,
        code: current.code,
        salesTY: current.sales,
        salesLY: previous.sales,
        growth: ((current.sales / previous.sales) - 1) * 100
      });

      totalSalesTY += current.sales;
      totalSalesLY += previous.sales;
    });

    const brandsArray = Object.values(brandStats).map(b => ({
      ...b,
      growth: ((b.salesTY / b.salesLY) - 1) * 100
    })).sort((a, b) => b.growth - a.growth);

    return {
      brands: brandsArray,
      totalSalesTY,
      totalSalesLY,
      totalGrowth: ((totalSalesTY / totalSalesLY) - 1) * 100,
      sameStoresCount: sameStoreKeys.length
    };
  }, [records, currentYear, currentMonth, previousYear]);

  const kFormatter = (num) => {
    return Math.abs(num) > 999 ? (num/1000).toFixed(1) + 'k' : num;
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
            Same Store Sales (SSTX)
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest mt-1">
            Comparativa {currentMonth}/{currentYear} vs {currentMonth}/{previousYear} | {sstxStats.sameStoresCount} Tiendas Activas en ambos periodos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pwa-card p-6 flex flex-col gap-2">
           <div className="flex justify-between items-start">
             <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                <BarChart3 className="text-accent-orange" size={20} />
             </div>
             <div className={`px-2 py-1 rounded-full text-[10px] font-black ${sstxStats.totalGrowth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {sstxStats.totalGrowth >= 0 ? '+' : ''}{sstxStats.totalGrowth.toFixed(1)}%
             </div>
           </div>
           <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mt-2">Crecimiento Total SSTX</p>
           <p className="text-4xl font-black italic text-slate-900 dark:text-white">{sstxStats.totalGrowth.toFixed(1)}%</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="pwa-card p-6 flex flex-col gap-2">
           <div className="flex justify-between items-start">
             <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                <Store className="text-accent-orange" size={20} />
             </div>
           </div>
           <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mt-2">Tiendas en Base</p>
           <p className="text-4xl font-black italic text-slate-900 dark:text-white">{sstxStats.sameStoresCount}</p>
           <p className="text-[9px] text-slate-400 dark:text-white/20 font-bold uppercase">Excluye aperturas/cierres recientes</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="pwa-card p-6 flex flex-col gap-2">
           <div className="flex justify-between items-start">
             <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg">
                <TrendingUp className="text-accent-orange" size={20} />
             </div>
           </div>
           <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mt-2">Tickets SSTX (Este Año)</p>
           <p className="text-4xl font-black italic text-slate-900 dark:text-white">{kFormatter(sstxStats.totalSalesTY)}</p>
           <p className="text-[9px] text-slate-400 dark:text-white/20 font-bold uppercase">vs {kFormatter(sstxStats.totalSalesLY)} el año anterior</p>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="pwa-card p-6">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white/80 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
            Crecimiento por Marca (%)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sstxStats.brands} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(val) => [`${val.toFixed(1)}%`, 'Crecimiento']}
                />
                <Bar dataKey="growth" radius={[0, 4, 4, 0]}>
                  {sstxStats.brands.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pwa-card p-6">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white/80 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
            Volumen Tickets SSTX
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sstxStats.brands}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }} />
                <Bar name="Año Anterior" dataKey="salesLY" fill="#64748b" opacity={0.3} radius={[4, 4, 0, 0]} />
                <Bar name="Este Año" dataKey="salesTY" fill="#ff7e4b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Drilldown */}
      <div className="pwa-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-black italic uppercase tracking-widest text-slate-900 dark:text-white">
            Detalle por Tienda
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {sstxStats.sameStoresCount} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-white/[0.01]">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Marca</th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Tienda</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{currentYear - 1}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">{currentYear}</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/30">Crecimiento</th>
              </tr>
            </thead>
            <tbody>
              {sstxStats.brands.map(brand => (
                <React.Fragment key={brand.name}>
                  {/* Brand Row */}
                  <tr className="border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03]">
                    <td className="px-6 py-4 text-[11px] font-black italic text-accent-orange uppercase tracking-widest">{brand.name}</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase">{brand.storeCount} tiendas activas</td>
                    <td className="px-6 py-4 text-right text-[11px] font-black text-slate-400 dark:text-white/40">{kFormatter(brand.salesLY)}</td>
                    <td className="px-6 py-4 text-right text-[11px] font-black text-slate-900 dark:text-white">{kFormatter(brand.salesTY)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-[11px] font-black ${brand.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                         {brand.growth >= 0 ? '+' : ''}{brand.growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  {/* Detailed Store Rows (Visible if expanded or just a few) */}
                  {[...brand.stores].sort((a,b) => b.growth - a.growth).slice(0, 5).map(store => (
                    <tr key={store.code || store.name} className="border-t border-slate-100 dark:border-white/[0.02] hover:bg-slate-200/20 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-3"></td>
                      <td className="px-6 py-3 text-[10px] font-bold text-slate-600 dark:text-white/60 uppercase">{store.name}</td>
                      <td className="px-6 py-3 text-right text-[10px] font-medium text-slate-400 dark:text-white/30">{kFormatter(store.salesLY)}</td>
                      <td className="px-6 py-3 text-right text-[10px] font-black text-slate-700 dark:text-white/60">{kFormatter(store.salesTY)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {store.growth >= 0 ? <TrendingUp size={10} className="text-emerald-500" /> : <TrendingDown size={10} className="text-red-500" />}
                          <span className={`text-[10px] font-bold ${store.growth >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                            {store.growth.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {brand.stores.length > 5 && (
                    <tr className="border-t border-slate-100 dark:border-white/[0.02]">
                       <td colSpan={5} className="px-6 py-2 text-center text-[8px] font-black text-slate-400 dark:text-white/20 uppercase">
                          ... y {brand.stores.length - 5} tiendas más
                       </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SSTXDashboard;
