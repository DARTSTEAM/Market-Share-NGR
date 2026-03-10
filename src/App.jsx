import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, TrendingUp, BarChart2, ShieldAlert, Award, PieChart as PieChartIcon, Activity, LayoutDashboard, GitCompare, Ticket, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import loadedData from './data.json';
import MarketShareDashboard from './components/MarketShareDashboard';
import ComparativosDashboard from './components/ComparativosDashboard';
import TicketsDashboard from './components/TicketsDashboard';
import CustomSelect from './components/common/CustomSelect';
import FilterBar from './components/filters/FilterBar';

const { records: allRecords = [], tickets: allTickets = [] } = loadedData;

const kFormatter = (num) => {
  if (Math.abs(num) > 999999) return Math.sign(num) * ((Math.abs(num) / 1000000).toFixed(1)) + 'M';
  if (Math.abs(num) > 999) return Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k';
  return Math.sign(num) * Math.abs(num);
};

// CustomSelect was extracted to src/components/common/CustomSelect.jsx

const MetricCard = ({ title, value, previousPeriodValue = 0, delay = 0, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6, ease: "easeOut" }}
    whileHover={{ y: -4, scale: 1.02 }}
    className="pwa-card p-6 flex flex-col gap-4 relative overflow-hidden group"
  >
    <div className="absolute -inset-x-full top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-orange/50 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
    <div className="flex justify-between items-start">
      <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest leading-tight">{title}</p>
      {Icon && <Icon size={14} className="text-accent-orange opacity-80" />}
    </div>
    <div className="flex flex-col items-center justify-center relative z-10 py-2">
      <motion.p
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
        className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/60 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] pb-2 pr-2 leading-tight"
      >
        {value}
      </motion.p>
    </div>
    <div className="border-t border-slate-300 dark:border-white/10 pt-3 mt-auto flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 dark:text-white/30">
      <span>VS PP</span>
      <span className={previousPeriodValue > 0 ? "text-accent-lemon drop-shadow-sm" : ""}>{previousPeriodValue}</span>
    </div>
  </motion.div>
);

const ChartBar = ({ label, value, max, color = "", delay = 0 }) => {
  const percentage = Math.max(5, (value / max) * 100);
  const isTailwindClass = color.startsWith('bg-');

  return (
    <div className="flex-1 flex flex-col group cursor-pointer min-w-0">
      {/* ── Bar zone: flex-1 so all columns are the same height ── */}
      <div className="relative flex-1 flex justify-center items-end">
        {/* Tooltip */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div className="px-3 py-1.5 bg-white dark:bg-black/80 backdrop-blur-md rounded border border-slate-200 dark:border-white/10 text-xs font-black uppercase whitespace-nowrap shadow-xl text-slate-900 dark:text-white">
            {new Intl.NumberFormat('en-US').format(value)} Tickets
          </div>
        </div>
        {/* Bar — anchored to bottom of this zone */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1.2, delay, type: "spring", stiffness: 50, damping: 15 }}
          className={`w-4/5 ${isTailwindClass ? color : ''} rounded-t-lg shadow-lg dark:shadow-[0_0_30px_rgba(255,126,75,0.1)] group-hover:brightness-110 dark:group-hover:brightness-125 transition-all relative overflow-hidden`}
          style={!isTailwindClass && color ? { backgroundColor: color } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 dark:from-white/20 to-transparent" />
        </motion.div>
      </div>
      {/* ── Label zone: fixed height, bottom of column ── */}
      <div className="h-10 shrink-0 flex items-end justify-center px-1 pb-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
          {label}
        </span>
      </div>
    </div>
  );
};

const CompetitorAnalysis = ({
  theme,
  toggleTheme,
  isLoaded,
  metrics,
  shareData,
  trendData,
  competitorTableData,
  tableData,
  sortBy,
  handleSort,
  sortDirection,
  filterBar
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-12"
  >
    {/* Header removed from here, now in App */}

    {isLoaded && (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard title="Tickets Totales" value={kFormatter(metrics.totalTickets)} previousPeriodValue="+12%" delay={0.1} icon={TrendingUp} />
        <MetricCard title="Importe Total" value={new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(metrics.totalImporte)} previousPeriodValue="+8%" delay={0.2} icon={DollarSign} />
        <MetricCard title="Tickets sin local" value={metrics.ticketsSinLocal.toString()} previousPeriodValue={`-${Math.round((metrics.ticketsSinLocal / (metrics.totalTickets || 1)) * 100)}%`} delay={0.3} icon={ShieldAlert} />
        <MetricCard title="Cajas cerradas" value={metrics.cajasCerradas.toString()} previousPeriodValue={`+${Math.round((metrics.cajasCerradas / (metrics.totalTickets || 1)) * 100)}%`} delay={0.4} icon={BarChart2} />
        <MetricCard title="Cajas con Error" value={metrics.cajasConError.toString()} previousPeriodValue="!" delay={0.5} icon={ShieldAlert} />
      </section>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <motion.section
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 flex flex-col shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
          <h2 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Ticket Split</h2>
          <div className="flex gap-2 items-center px-3 py-1 rounded-full bg-accent-orange/10 dark:bg-accent-orange/20 border border-accent-orange/30">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse shadow-[0_0_8px_rgba(255,94,0,0.8)]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-accent-orange">Live</span>
          </div>
        </div>

        {/* Chart area: grows to fill remaining card space */}
        <div className="flex flex-1 mt-4 gap-1 min-h-0">
          {/* Y-axis labels + gridlines column */}
          <div className="relative flex flex-col justify-between pb-10 pr-2 shrink-0 w-8">
            {[100, 75, 50, 25].map((pct) => {
              const maxVal = Math.max(...shareData.map(d => d.value)) * 1.1;
              return (
                <span key={pct} className="text-[8px] font-black text-slate-400 dark:text-white/20 text-right leading-none">
                  {kFormatter(maxVal * pct / 100)}
                </span>
              );
            })}
          </div>

          {/* Bars + gridlines */}
          <div className="relative flex-1 flex flex-col min-h-0">
            {/* Gridlines: positioned in the bar area only (above the h-10 label zone) */}
            <div className="absolute inset-x-0 bottom-10 top-0 pointer-events-none z-0">
              {[0, 25, 50, 75].map((pct) => (
                <div
                  key={pct}
                  className="absolute w-full border-t border-dashed border-slate-200 dark:border-white/[0.06]"
                  style={{ bottom: `${pct}%` }}
                />
              ))}
              {/* Solid baseline */}
              <div className="absolute bottom-0 w-full border-t-2 border-slate-300 dark:border-white/10" />
            </div>

            {/* Bars row */}
            <div className="relative flex-1 flex items-stretch gap-1 z-10 min-h-0">
              {[...shareData].sort((a, b) => b.value - a.value).slice(0, 6).map((item, index) => (
                <ChartBar
                  key={index}
                  label={item.name === "MCDONALD'S" ? "McD's" : item.name === "BURGER KING" ? "BK" : item.name === "LITTLE CAESARS" ? "L. CAE" : item.name.substring(0, 10)}
                  value={item.value}
                  max={Math.max(...shareData.map(d => d.value)) * 1.1}
                  color={item.color}
                  delay={0.5 + (index * 0.1)}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-accent-blue" />
            <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Evolución de Tickets</h3>
          </div>
        </div>
        <div className="flex-1 w-full mt-6" style={{ minHeight: '320px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0070f3" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke={theme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} fontSize={10} tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
              <Tooltip
                contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                itemStyle={{ color: '#0070f3' }}
              />
              <Area type="monotone" dataKey="tickets" stroke="#0070f3" fillOpacity={1} fill="url(#colorTickets)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-accent-orange" />
            <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Share Overview</h3>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/20">Últimos 6 meses</span>
        </div>
        {(() => {
          const ROLLING_MONTHS = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'];
          const seeds = [0.85, 0.92, 1.0, 1.08, 0.97, 1.05];
          const sorted = [...shareData].sort((a, b) => b.value - a.value).filter(d => d.value > 0);
          const total = sorted.reduce((s, d) => s + d.value, 0);
          const rollingData = ROLLING_MONTHS.map((month, mi) => {
            const entry = { month };
            sorted.forEach(comp => {
              const shortName = comp.name === "McDonald's" ? "McD's"
                : comp.name === 'Burger King' ? 'BK'
                  : comp.name === 'Little Caesars' ? 'L. CAE'
                    : comp.name.substring(0, 8);
              entry[shortName] = Math.round((comp.value / total) * 2400 * seeds[mi] * (0.92 + (comp.name.charCodeAt(0) % 7) * 0.02));
            });
            return entry;
          });
          const bars = sorted.map(comp => ({
            key: comp.name === "McDonald's" ? "McD's" : comp.name === 'Burger King' ? 'BK' : comp.name === 'Little Caesars' ? 'L. CAE' : comp.name.substring(0, 8),
            color: comp.color,
          }));
          return (
            <div className="flex-1 w-full mt-4" style={{ minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rollingData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap="28%" barGap={0}>
                  <XAxis dataKey="month" stroke="transparent" tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)', fontSize: 9, fontWeight: 900 }} />
                  <YAxis stroke="transparent" tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)', fontSize: 8 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.85)' : '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontWeight: 'bold' }}
                    cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ paddingTop: '12px' }}
                    formatter={(value) => (
                      <span style={{ fontSize: '8px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                        {value}
                      </span>
                    )}
                  />
                  {bars.map(b => (
                    <Bar key={b.key} dataKey={b.key} stackId="a" fill={b.color} radius={bars.indexOf(b) === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.8 }}
        className="lg:col-span-12 pwa-card border-slate-300 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] flex flex-col overflow-hidden shadow-xl"
      >
        <div className="p-6 border-b border-slate-300 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-transparent to-black/[0.02] dark:to-white/[0.01]">
          <h2 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Resumen por Competidor</h2>
        </div>

        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#f0f3f8] dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/50 font-black text-[9px] uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-5 rounded-tl-xl text-center">Competidor</th>
                <th className="px-6 py-5 text-right">Locales</th>
                <th className="px-6 py-5 text-right">Caja</th>
                <th className="px-6 py-5 text-right">Reg.</th>
                <th className="px-6 py-5 text-right">No Reg.</th>
                <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)]">Tickets Totales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs text-slate-700 dark:text-white/80 font-medium">
              {competitorTableData.map((row, index) => {
                const findColor = shareData.find(s => s.name === row.competidor)?.color || '#94a3b8';
                return (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + (index * 0.05) }}
                    className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full border inline-block w-32 truncate" style={{ color: findColor, backgroundColor: `${findColor}15`, borderColor: `${findColor}30` }}>
                        {row.competidor}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-mono text-sm opacity-80">{row.localesCount}</td>
                    <td className="px-6 py-5 text-right opacity-50 font-mono">{row.cajasTotal}</td>
                    <td className="px-6 py-5 text-right font-mono">{row.ticketsReg}</td>
                    <td className={`px-6 py-5 text-right font-mono ${row.ticketsNoReg > 0 ? 'text-red-500 dark:text-accent-pink font-bold' : 'text-slate-400 dark:text-white/20'}`}>{row.ticketsNoReg}</td>
                    <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(row.ventas)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="lg:col-span-12 pwa-card border-slate-300 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] flex flex-col overflow-hidden shadow-xl"
      >
        <div className="p-6 border-b border-slate-300 dark:border-white/10 flex justify-end bg-gradient-to-r from-transparent to-black/[0.02] dark:to-white/[0.01]">
          <CustomSelect
            label="Ordenar por"
            options={[
              { value: "ventas", label: "Tickets" },
              { value: "local", label: "Local" },
              { value: "competidor", label: "Competidor" },
            ]}
            selected={sortBy}
            onChange={handleSort}
            alignRight
            width="w-32"
          />
        </div>

        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#f0f3f8] dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/50 font-black text-[9px] uppercase tracking-[0.2em]">
              <tr>
                <th className="px-6 py-5 rounded-tl-xl text-center cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('competidor')}>
                  Competidor <span className="text-accent-orange font-bold">{sortBy === 'competidor' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('local')}>
                  Local <span className="text-accent-orange font-bold">{sortBy === 'local' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('cajasTotal')}>
                  Caja <span className="text-accent-orange font-bold">{sortBy === 'cajasTotal' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('ticketsReg')}>
                  Reg. <span className="text-accent-orange font-bold">{sortBy === 'ticketsReg' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('ticketsNoReg')}>
                  No Reg. <span className="text-accent-orange font-bold">{sortBy === 'ticketsNoReg' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('ticket_anterior')}>
                  T. Ant. <span className="text-accent-orange font-bold">{sortBy === 'ticket_anterior' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('fecha_anterior')}>
                  F. Ant. <span className="text-accent-orange font-bold">{sortBy === 'fecha_anterior' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('delta_dias')}>
                  Delta <span className="text-accent-orange font-bold">{sortBy === 'delta_dias' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('ac')}>
                  AC <span className="text-accent-orange font-bold">{sortBy === 'ac' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('promedioDiario')}>
                  Prom. <span className="text-accent-orange font-bold">{sortBy === 'promedioDiario' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors" onClick={() => handleSort('uniqueTicketsCount')}>
                  T. Únicos <span className="text-accent-orange font-bold">{sortBy === 'uniqueTicketsCount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
                <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleSort('ventas')}>
                  Transas <span className="text-slate-900 dark:text-white font-bold">{sortBy === 'ventas' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs text-slate-700 dark:text-white/80 font-medium">
              <motion.tr
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
                className="bg-gradient-to-r from-accent-orange/10 dark:from-accent-orange/20 to-transparent font-black text-slate-900 dark:text-white group"
              >
                <td className="px-6 py-5 text-accent-orange tracking-widest uppercase text-[10px] text-center">Totales</td>
                <td className="px-6 py-5 text-lg opacity-80 italic">{metrics.localesAnalizados} Locales</td>
                <td className="px-6 py-5 text-right opacity-50">{metrics.totalTickets}</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">{metrics.cajasAnalizadas}</td>
                <td className="px-6 py-5 text-right text-red-600 dark:text-accent-lemon font-mono drop-shadow-sm">{metrics.cajasSinRegistro}</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">-</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">-</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">-</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">-</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">-</td>
                <td className="px-6 py-5 text-right opacity-50 font-mono">{metrics.totalTickets}</td>
                <td className="px-6 py-5 text-right text-xl text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metrics.totalVentas)}</td>
              </motion.tr>
              {tableData.map((row, index) => {
                const findColor = shareData.find(s => s.name === row.competidor)?.color || '#94a3b8';
                return (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 + (index * 0.05) }}
                    className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-5 text-center">
                      <span className="font-black text-[10px] tracking-widest px-3 py-1.5 rounded-full border inline-block w-32 truncate" style={{ color: findColor, backgroundColor: `${findColor}15`, borderColor: `${findColor}30` }}>
                        {row.competidor}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px] truncate max-w-[150px] whitespace-normal leading-tight h-10 overflow-hidden break-words" title={row.local}>{row.local}</td>
                    <td className="px-6 py-5 text-right opacity-50 font-mono">{row.cajasTotal}</td>
                    <td className="px-6 py-5 text-right font-mono">{row.ticketsReg}</td>
                    <td className={`px-6 py-5 text-right font-mono ${row.ticketsNoReg > 0 ? 'text-red-500 dark:text-accent-pink font-bold' : 'text-slate-400 dark:text-white/20'}`}>{row.ticketsNoReg}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.ticket_anterior}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.fecha_anterior}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.delta_dias}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.ac}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.promedioDiario}</td>
                    <td className="px-6 py-5 text-right font-mono text-slate-400">{row.uniqueTicketsCount}</td>
                    <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(row.ventas)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('competitor');
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Derive filter options from raw records
  const monthsArr = useMemo(() => {
    const unique = new Set();
    allRecords.forEach(rec => {
      if (rec.mes) {
        // rec.mes is 1-12 from BQ. We want 0-11 for the selector mapping
        const m = parseInt(rec.mes) - 1;
        if (!isNaN(m)) unique.add(m);
      } else if (rec.fecha) {
        const d = new Date(rec.fecha);
        unique.add(d.getMonth());
      }
    });
    return Array.from(unique).sort((a, b) => a - b);
  }, []);

  const yearsArr = useMemo(() => {
    const unique = new Set();
    allRecords.forEach(rec => {
      if (rec.ano) {
        const y = parseInt(rec.ano);
        if (!isNaN(y)) unique.add(y);
      } else if (rec.fecha) {
        const d = new Date(rec.fecha);
        unique.add(d.getFullYear());
      }
    });
    return Array.from(unique).sort((a, b) => b - a);
  }, []);

  const competitorsArr = useMemo(() => {
    return Array.from(new Set(allRecords.map(r => r.competidor))).filter(Boolean).sort();
  }, []);

  const allLocales = useMemo(() => {
    return Array.from(new Set(allRecords.map(r => r.local))).filter(Boolean).sort();
  }, []);

  // Filter state
  const [filters, setFilters] = useState({
    month: 'all',
    year: 'all',
    competitor: 'all',
    local: 'all',
    category: 'all',
    channel: 'all'
  });

  // Derived Options for FilterBar
  const monthOptions = useMemo(() => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return [
      { value: 'all', label: 'Todos los Meses' },
      ...monthsArr.map(m => ({ value: m.toString(), label: months[m] }))
    ];
  }, [monthsArr]);

  const yearOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos los Años' },
      ...yearsArr.map(y => ({ value: y.toString(), label: y.toString() }))
    ];
  }, [yearsArr]);

  const competitorOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todos los Competidores' },
      ...competitorsArr.map(c => ({ value: c, label: c }))
    ];
  }, [competitorsArr]);

  const latestYear = useMemo(() => {
    return yearsArr.length > 0 ? yearsArr[0].toString() : "all";
  }, [yearsArr]);

  // Set default year if not set
  useEffect(() => {
    if (latestYear !== 'all' && filters.year === 'all') {
      setFilters(prev => ({ ...prev, year: latestYear }));
    }
  }, [latestYear]);

  // Location options filtered by competitor
  const locationOptions = useMemo(() => {
    const baseOptions = [{ value: "all", label: "Todos los locales" }];
    const filteredLocs = filters.competitor === 'all'
      ? allLocales
      : Array.from(new Set(allRecords.filter(r => r.competidor === filters.competitor).map(r => r.local))).filter(Boolean).sort();

    return [...baseOptions, ...filteredLocs.map(l => ({ value: l, label: l }))];
  }, [filters.competitor, allLocales]);

  const channelOptions = [
    { value: 'all', label: 'Todos los Canales' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'tienda', label: 'Tienda' },
    { value: 'salon', label: 'Salón' }
  ];

  const categoryOptions = [
    { value: "all", label: "Todas las Categorias" },
    { value: "Pollo Frito", label: "🍗 Pollo Frito" },
    { value: "Hamburguesa", label: "🍔 Hamburguesa" },
    { value: "Pizza", label: "🍕 Pizza" },
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      if (key === 'competitor' && value !== prev.competitor) {
        newFilters.local = 'all';
      }
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      month: "all",
      year: latestYear,
      competitor: "all",
      local: "all",
      category: "all",
      channel: "all"
    });
  };

  // 1. Core Data Filtering (Full routine for auditing)
  const filteredRecords = useMemo(() => {
    return allRecords.filter(rec => {
      // Prioritize mes/ano columns if present
      let mMatch = filters.month === 'all';
      let yMatch = filters.year === 'all';

      if (!mMatch) {
        if (rec.mes) {
          mMatch = (parseInt(rec.mes) - 1).toString() === filters.month;
        } else if (rec.fecha) {
          mMatch = new Date(rec.fecha).getMonth().toString() === filters.month;
        }
      }

      if (!yMatch) {
        if (rec.ano) {
          yMatch = rec.ano.toString() === filters.year;
        } else if (rec.fecha) {
          yMatch = new Date(rec.fecha).getFullYear().toString() === filters.year;
        }
      }

      const cMatch = filters.competitor === 'all' || rec.competidor === filters.competitor;
      const lMatch = filters.local === 'all' || rec.local === filters.local;
      return mMatch && yMatch && cMatch && lMatch;
    });
  }, [allRecords, filters]);

  // 1b. Market Share Specific Filtering (Only status_busqueda === 'OK')
  const marketShareRecords = useMemo(() => {
    return filteredRecords.filter(r => r.status_busqueda === 'OK');
  }, [filteredRecords]);

  // 1c. Core Tickets Filtering (facturas_v2)
  const filteredTickets = useMemo(() => {
    return allTickets.filter(t => {
      const cMatch = filters.competitor === 'all' || t.competidor === filters.competitor;
      const lMatch = filters.local === 'all' || t.local === filters.local;
      return cMatch && lMatch;
    });
  }, [allTickets, filters]);

  // 2. Reactive Metrics
  const reactiveMetrics = useMemo(() => {
    const totalTransactions = marketShareRecords.reduce((sum, r) => sum + (parseFloat(r.transacciones) || 0), 0);
    const totalDailyAvg = marketShareRecords.reduce((sum, r) => sum + (parseFloat(r.promedio) || 0), 0);

    // Tickets from facturas_v2 (Filtered specifically for this tab if needed, but here simple match)
    const filteredTicketsCount = filteredTickets.length;
    const totalImporteCount = filteredTickets.reduce((sum, t) => sum + (parseFloat(t.importe) || 0), 0);
    const ticketsSinLocalCount = allTickets.filter(t => {
      const matchesComp = filters.competitor === 'all' || t.competidor === filters.competitor;
      return matchesComp && (!t.local || t.local === 'DESCONOCIDO' || t.local === 'Desconocido');
    }).length;

    // Routine Stats - Always use full filteredRecords to show audit health
    const routineStats = filteredRecords.reduce((acc, r) => {
      if (r.status_busqueda === 'OK') acc.cerradas++;
      else acc.conError++;
      return acc;
    }, { cerradas: 0, conError: 0 });

    return {
      totalVentas: totalTransactions,
      totalTickets: filteredTicketsCount,
      totalImporte: totalImporteCount,
      ticketsSinLocal: ticketsSinLocalCount,
      cajasCerradas: routineStats.cerradas,
      cajasConError: routineStats.conError,
      totalTransDailyAvg: totalDailyAvg,
      avgTransPerLocal: totalTransactions / (new Set(marketShareRecords.map(r => r.local)).size || 1)
    };
  }, [filteredRecords, marketShareRecords, filteredTickets, allTickets, filters.competitor]);

  // 3. Reactive Share Data (Exclusive for Market Share - based on Routine OK)
  const reactiveShareDataRoutine = useMemo(() => {
    const totalsByComp = {};
    marketShareRecords.forEach(r => {
      if (!totalsByComp[r.competidor]) totalsByComp[r.competidor] = 0;
      totalsByComp[r.competidor] += (parseFloat(r.transacciones) || 0);
    });

    const palette = ['#ff5e00', '#0070f3', '#ccff00', '#7000f3', '#00f3a0'];
    return Object.entries(totalsByComp).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [marketShareRecords]);

  // 3b. Reactive Share Data (For Competitor Analysis - based on facturas_v2)
  const reactiveShareDataTickets = useMemo(() => {
    const totalsByComp = {};
    filteredTickets.forEach(t => {
      if (!totalsByComp[t.competidor]) totalsByComp[t.competidor] = 0;
      totalsByComp[t.competidor] += 1; // Count of tickets
    });

    const palette = ['#ff5e00', '#0070f3', '#ccff00', '#7000f3', '#00f3a0'];
    return Object.entries(totalsByComp).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  // 4. Reactive Trend Data (Exclusive for Market Share - based on Routine OK)
  const reactiveTrendDataRoutine = useMemo(() => {
    const monthlyData = marketShareRecords.reduce((acc, r) => {
      let y, m;
      if (r.mes && r.ano) {
        y = r.ano;
        m = r.mes.padStart(2, '0');
      } else {
        const date = new Date(r.fecha);
        y = date.getFullYear();
        m = (date.getMonth() + 1).toString().padStart(2, '0');
      }
      const key = `${y}-${m}`;
      acc[key] = (acc[key] || 0) + (parseFloat(r.transacciones) || 0);
      return acc;
    }, {});

    const sortedKeys = Object.keys(monthlyData).sort();
    return sortedKeys.map(key => ({
      name: key, // e.g., "2025-12"
      tickets: monthlyData[key]
    })).slice(-12); // Show last 12 months
  }, [marketShareRecords]);

  // 4b. Reactive Trend Data (For Competitor Analysis - based on facturas_v2)
  const reactiveTrendDataTickets = useMemo(() => {
    const timeline = filteredTickets.reduce((acc, t) => {
      const date = t.fecha || 'Unknown';
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(timeline)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, val]) => ({
        name: date.substring(5),
        tickets: val
      })).slice(-15);
  }, [filteredTickets]);

  // 5. Reactive Table Data (Market Share View - OK only)
  const aggregatedTableDataRoutine = useMemo(() => {
    const localMap = {};
    marketShareRecords.forEach(r => {
      if (!localMap[r.local]) {
        localMap[r.local] = {
          competidor: r.competidor,
          codigo_tienda: r.codigo_tienda || '',
          local: r.local,
          ventas: 0,
          uniqueTicketsCount: 0,
          cajasTotal: new Set(),
          ticketsReg: 0,
          ticketsNoReg: 0,
          ticket_anterior: r.ticket_actual || '-',
          fecha_anterior: r.fecha_y_hora_registro || '-',
          delta_dias: r.delta_dias || 0,
          ac: r.ac || 0,
          promedioDiario: 0
        };
      }
      const trans = parseFloat(r.transacciones) || 0;
      localMap[r.local].ventas += trans;
      localMap[r.local].uniqueTicketsCount += 1;
      localMap[r.local].cajasTotal.add(r.caja);
      localMap[r.local].ticketsReg += 1;
      localMap[r.local].promedioDiario += (parseFloat(r.promedio) || 0);
    });

    return Object.values(localMap).map(l => ({
      ...l,
      cajasTotal: l.cajasTotal.size
    }));
  }, [marketShareRecords]);

  // 5b. Reactive Table Data (Competitor Analysis View - Full Routine for auditing)
  const aggregatedTableDataFull = useMemo(() => {
    const localMap = {};
    filteredRecords.forEach(r => {
      if (!localMap[r.local]) {
        localMap[r.local] = {
          competidor: r.competidor,
          codigo_tienda: r.codigo_tienda || '',
          local: r.local,
          ventas: 0,
          uniqueTicketsCount: 0,
          cajasTotal: new Set(),
          ticketsReg: 0,
          ticketsNoReg: 0,
          ticket_anterior: r.ticket_actual || '-',
          fecha_anterior: r.fecha_y_hora_registro || '-',
          delta_dias: r.delta_dias || 0,
          ac: r.ac || 0,
          promedioDiario: 0
        };
      }
      const trans = parseFloat(r.transacciones) || 0;
      localMap[r.local].ventas += trans;
      localMap[r.local].uniqueTicketsCount += 1;
      localMap[r.local].cajasTotal.add(r.caja);
      localMap[r.local].ticketsReg += 1;
      localMap[r.local].promedioDiario += (parseFloat(r.promedio) || 0);
    });

    return Object.values(localMap).map(l => ({
      ...l,
      cajasTotal: l.cajasTotal.size
    }));
  }, [filteredRecords]);

  // 6. Reactive Competitor Table (Market Share View - OK only)
  const filteredCompetitorTableDataRoutine = useMemo(() => {
    const groups = marketShareRecords.reduce((acc, r) => {
      if (!acc[r.competidor]) {
        acc[r.competidor] = {
          competidor: r.competidor,
          locales: new Set(),
          cajas: new Set(),
          ventas: 0,
          ticketsReg: 0
        };
      }
      acc[r.competidor].locales.add(r.local);
      acc[r.competidor].cajas.add(`${r.local}-${r.caja}`);
      acc[r.competidor].ventas += (parseFloat(r.transacciones) || 0);
      acc[r.competidor].ticketsReg += 1;
      return acc;
    }, {});

    return Object.values(groups).map(g => ({
      competidor: g.competidor,
      localesCount: g.locales.size,
      cajasTotal: g.cajas.size,
      ticketsReg: g.ticketsReg,
      ticketsNoReg: 0,
      ventas: Math.round(g.ventas)
    })).sort((a, b) => b.ventas - a.ventas);
  }, [marketShareRecords]);

  // 6b. Reactive Competitor Table (Competitor Analysis View - Full Routine)
  const filteredCompetitorTableDataFull = useMemo(() => {
    const groups = filteredRecords.reduce((acc, r) => {
      if (!acc[r.competidor]) {
        acc[r.competidor] = {
          competidor: r.competidor,
          locales: new Set(),
          cajas: new Set(),
          ventas: 0,
          ticketsReg: 0
        };
      }
      acc[r.competidor].locales.add(r.local);
      acc[r.competidor].cajas.add(`${r.local}-${r.caja}`);
      acc[r.competidor].ventas += (parseFloat(r.transacciones) || 0);
      acc[r.competidor].ticketsReg += 1;
      return acc;
    }, {});

    return Object.values(groups).map(g => ({
      competidor: g.competidor,
      localesCount: g.locales.size,
      cajasTotal: g.cajas.size,
      ticketsReg: g.ticketsReg,
      ticketsNoReg: 0,
      ventas: Math.round(g.ventas)
    })).sort((a, b) => b.ventas - a.ventas);
  }, [filteredRecords]);

  // UI Sorting Logic
  const [sortBy, setSortBy] = useState("ventas");
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection(column === 'competidor' || column === 'local' ? 'asc' : 'desc');
    }
  };

  const sortedTableDataRoutine = useMemo(() => {
    return [...aggregatedTableDataRoutine].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [aggregatedTableDataRoutine, sortBy, sortDirection]);

  const sortedTableDataFull = useMemo(() => {
    return [...aggregatedTableDataFull].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [aggregatedTableDataFull, sortBy, sortDirection]);

  // Theme Logic
  useEffect(() => {
    setIsLoaded(true);
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  const globalFilterBar = (
    <FilterBar
      filters={filters}
      onFilterChange={handleFilterChange}
      onReset={handleResetFilters}
      monthOptions={monthOptions}
      yearOptions={yearOptions}
      competitorOptions={competitorOptions}
      locationOptions={locationOptions}
      channelOptions={channelOptions}
      categoryOptions={categoryOptions}
    />
  );

  return (
    <div className="min-h-screen relative p-6 md:p-12 text-slate-900 dark:text-white overflow-x-hidden selection:bg-accent-orange/30">
      <div className="pwa-mesh">
        <div className="mesh-orb-1 " />
        <div className="mesh-orb-2 " />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Persistent Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-300 dark:border-white/10 pb-6 relative"
        >
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-lg dark:shadow-[0_0_30px_rgba(255,126,75,0.15)] relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-accent-orange/10 dark:bg-accent-orange/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/favicon.png" alt="NGR Logo" className="w-10 h-10 object-contain relative z-10 dark:brightness-110" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-[10px] text-accent-orange font-black uppercase tracking-[0.3em] mb-1">NGR Intelligence Suite</span>
              <h1 className="pwa-title !text-5xl md:!text-6xl text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-white/70">
                {activeTab === 'competitor' ? 'Análisis Competencias' : activeTab === 'marketshare' ? 'Market Share' : activeTab === 'tickets' ? 'Tickets' : 'Comparativos'} <span className="text-accent-orange">LIVE</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <button
              onClick={toggleTheme}
              className="p-3 bg-white/50 dark:bg-white/[0.02] rounded-2xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-white/80 hover:text-accent-orange dark:hover:text-accent-lemon"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {globalFilterBar}
          </div>
        </motion.header>

        {/* Navigation Tabs */}
        <nav className="flex justify-center mb-8">
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-300 dark:border-white/10 p-1.5 rounded-2xl flex gap-1 shadow-sm">
            {[
              { id: 'competitor', icon: LayoutDashboard, label: 'Análisis Competencias' },
              { id: 'marketshare', icon: PieChartIcon, label: 'Market Share' },
              { id: 'tickets', icon: Ticket, label: 'Tickets' },
              { id: 'comparativos', icon: GitCompare, label: 'Comparativos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-accent-orange text-white shadow-[0_0_20px_rgba(255,126,75,0.3)]' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'}`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <AnimatePresence mode="wait">
          {activeTab === 'competitor' ? (
            <CompetitorAnalysis
              key="competitor"
              theme={theme}
              toggleTheme={toggleTheme}
              isLoaded={isLoaded}
              metrics={reactiveMetrics}
              shareData={reactiveShareDataTickets}
              trendData={reactiveTrendDataTickets}
              competitorTableData={filteredCompetitorTableDataFull}
              tableData={sortedTableDataFull}
              sortBy={sortBy}
              handleSort={handleSort}
              sortDirection={sortDirection}
              filterBar={globalFilterBar}
            />
          ) : activeTab === 'marketshare' ? (
            <MarketShareDashboard
              key="marketshare"
              filters={filters}
              onFilterChange={handleFilterChange}
              globalFilterBar={globalFilterBar}
              reactiveMetrics={reactiveMetrics}
              shareData={reactiveShareDataRoutine}
              trendData={reactiveTrendDataRoutine}
              filteredTableData={sortedTableDataRoutine}
              allRecords={marketShareRecords}
            />
          ) : activeTab === 'tickets' ? (
            <TicketsDashboard
              key="tickets"
              tickets={allTickets}
              records={allRecords}
              shareData={reactiveShareDataTickets}
              globalFilters={filters}
              onFilterChange={setFilters}
            />
          ) : (
            <ComparativosDashboard
              key="comparativos"
              shareData={reactiveShareDataRoutine}
              tableData={sortedTableDataRoutine}
              metrics={reactiveMetrics}
              theme={theme}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
