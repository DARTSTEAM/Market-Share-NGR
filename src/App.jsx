import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, TrendingUp, TrendingDown, BarChart2, ShieldAlert, Award, PieChart as PieChartIcon, Activity, LayoutDashboard, GitCompare, Ticket, DollarSign, CheckCircle2, XCircle, Users, RefreshCw, MapPin, ClipboardEdit } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import MarketShareDashboard from './components/MarketShareDashboard';
import ComparativosDashboard from './components/ComparativosDashboard';
import TicketsDashboard from './components/TicketsDashboard';
import AlarmasDashboard from './components/AlarmasDashboard';
import EstimacionesDashboard from './components/EstimacionesDashboard';
import ActivityLogDashboard from './components/ActivityLogDashboard';
import ClientesDashboard from './components/ClientesDashboard';
import PuntosCompartidosDashboard from './components/PuntosCompartidosDashboard';
import SSTXDashboard from './components/SSTXDashboard';
import CustomSelect from './components/common/CustomSelect';
import FilterBar from './components/filters/FilterBar';

const COMPETITOR_TO_CATEGORY = {
  // Competition brands
  'KFC': 'Pollo Frito',
  'MCDONALD\'S': 'Hamburguesa',
  'MCDONALDS': 'Hamburguesa',
  'BEMBOS': 'Hamburguesa',
  'BURGER KING': 'Hamburguesa',
  'DOMINOS': 'Pizza',
  'DOMINO\'S': 'Pizza',
  'LITTLE CAESARS': 'Pizza',
  'PIZZA HUT': 'Pizza',
  // NGR own brands
  'POPEYES':    'Pollo Frito',
  'Bembos':     'Hamburguesa',
  'Papa Johns': 'Pizza',
  'PAPA JOHNS': 'Pizza',
  'CHINAWOK':   'Chifas',
};

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://ngr-proxy-server-966549276703.us-central1.run.app';

// Corte temporal: HISTORIAL cubre hasta este mes inclusive; OK rutina desde el mes siguiente
// Formato: { ano: number, mes: number }  → Nov 2025 (HISTORIAL: 2022–Nov 2025 | OK: Dic 2025+)
const HISTORIAL_CUTOFF = { ano: 2025, mes: 11 };
const CUTOFF_KEY = HISTORIAL_CUTOFF.ano * 100 + HISTORIAL_CUTOFF.mes; // 202511

// Helper de filtro para evitar solapamiento entre HISTORIAL y OK
const recordInScope = (r) => {
  const key = parseInt(r.ano || 0) * 100 + parseInt(r.mes || 0);
  if (r.status_busqueda === 'HISTORIAL') return key <= CUTOFF_KEY; // historico <= Nov 2025
  if (r.status_busqueda === 'OK')        return key >  CUTOFF_KEY; // rutina   >= Dic 2025
  if (r.status_busqueda?.startsWith('ESTIMADO-')) return key > CUTOFF_KEY; // estimados como OK
  return false;
};

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
            key: comp.name,
            label: comp.name === "McDonald's" ? "McD's" : comp.name === 'Burger King' ? 'BK' : comp.name === 'Little Caesars' ? 'L. CAE' : comp.name.substring(0, 8),
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

// Records and tickets start empty — loaded from the BQ server on mount

const kFormatter = (num) => {
  if (Math.abs(num) > 999999) return Math.sign(num) * ((Math.abs(num) / 1000000).toFixed(1)) + 'M';
  if (Math.abs(num) > 999) return Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k';
  return Math.sign(num) * Math.abs(num);
};

// Removed redundant COMPETITOR_TO_CATEGORY redeclaration if any

export default function App({ user, onSignOut }) {
  const [activeCategory, setActiveCategory] = useState('marketshare');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]); // [{id, label, status}]
  const [alarmsRefreshing, setAlarmsRefreshing] = useState(false);
  const refreshTimer = useRef(null);

  // Use state for data to make it reactive to updates
  const [records, setRecords] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [cajasConfig, setCajasConfig] = useState([]);        // [{codigo_tienda, caja, status, ...}]
  const [alarmasRevisadas, setAlarmasRevisadas] = useState([]); // [{codigo_tienda, caja, mes, ano, ...}]

  // NGR own-store data (loaded once from /api/ngr-locales)
  const [ngrLocales, setNgrLocales] = useState([]);
  const [includeNGR] = useState(true);

  // Log de login (se ejecuta una vez cuando el usuario está disponible)
  const loginLoggedRef = useRef(false);
  useEffect(() => {
    if (user && !loginLoggedRef.current) {
      loginLoggedRef.current = true;
      fetch(`${API_BASE_URL}/api/activity-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento:         'LOGIN',
          descripcion:    `Ingresó al dashboard: ${user.displayName || user.email}`,
          usuario:        user.email,
          usuario_nombre: user.displayName || user.email,
          metadata:       {},
        }),
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [dataRes, cajasRes, revisadasRes, ngrRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/data`),
          fetch(`${API_BASE_URL}/api/cajas-config`).catch(() => null),
          fetch(`${API_BASE_URL}/api/alarmas-revisadas`).catch(() => null),
          fetch(`${API_BASE_URL}/api/ngr-locales`).catch(() => null),
        ]);
        if (dataRes.ok) {
          const data = await dataRes.json();
          if (data.records) {
            // Normalización para evitar duplicados como "KFC07" y "KFC 07"
            const normalized = data.records.map(r => ({
              ...r,
              codigo_tienda: String(r.codigo_tienda || '').replace(/\s+/g, '').toUpperCase(),
              local: String(r.local || '').trim().toUpperCase()
            }));
            setRecords(normalized);
          }
          if (data.tickets) setTickets(data.tickets);
        }
        if (cajasRes?.ok) {
          const cajasData = await cajasRes.json();
          if (cajasData.cajas) setCajasConfig(cajasData.cajas);
        }
        if (revisadasRes?.ok) {
          const rev = await revisadasRes.json();
          if (rev.revisadas) setAlarmasRevisadas(rev.revisadas);
        }
        if (ngrRes?.ok) {
          const ngr = await ngrRes.json();
          if (ngr.locales) setNgrLocales(ngr.locales);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchInitialData();
  }, []);

  const handleRefreshData = async () => {
    try {
      setIsRefreshingData(true);
      setNotification({ type: 'info', message: 'Actualizando datos desde BigQuery...' });
      const response = await fetch(`${API_BASE_URL}/api/refresh`, { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        // After refresh the data is in the server cache; re-fetch /api/data to get it
        const dr = await fetch(`${API_BASE_URL}/api/data`);
        if (dr.ok) {
          const fresh = await dr.json();
          if (fresh.records) {
            const normalized = fresh.records.map(r => ({
              ...r,
              codigo_tienda: String(r.codigo_tienda || '').replace(/\s+/g, '').toUpperCase(),
              local: String(r.local || '').trim().toUpperCase()
            }));
            setRecords(normalized);
          }
          if (fresh.tickets) setTickets(fresh.tickets);
        }
        setNotification({ type: 'success', message: `¡Datos actualizados correctamente!` });
      } else {
        throw new Error(result.error || 'Error al refrescar');
      }
    } catch (err) {
      setNotification({ type: 'error', message: `Error: ${err.message}` });
    } finally {
      setIsRefreshingData(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleUpdateTicket = (ticketData) => {
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const label = ticketData.local || ticketData.originalFilename || 'Ticket';

    // 1. Optimistic removal — alarm disappears immediately
    const targetFilename = ticketData.filename || ticketData.originalFilename;
    setRecords(prev => prev.filter(r =>
      r.filename_actual !== targetFilename && r.filename_anterior !== targetFilename
    ));
    setTickets(prev => prev.map(t =>
      t.filename === targetFilename || t.filename === ticketData.originalFilename
        ? { ...t, ticket: ticketData.ticket, importe: ticketData.importe, fecha: ticketData.fecha,
            numero_de_caja: ticketData.caja, caja: ticketData.caja,
            local: ticketData.local, competidor: ticketData.competidor,
            codigo_tienda: ticketData.codigoTienda, codigoTienda: ticketData.codigoTienda,
            filename: ticketData.filename, mes: ticketData.mes, ano: ticketData.ano }
        : t
    ));

    // 2. Add to sync queue
    setSyncQueue(prev => [...prev, { id: syncId, label, status: 'syncing' }]);

    // 3. Fire BQ update in background
    fetch(`${API_BASE_URL}/api/update-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: ticketData.filename,
        originalFilename: ticketData.originalFilename,
        ticket: ticketData.ticket,
        importe: ticketData.importe,
        fecha: ticketData.fecha,
        caja: ticketData.caja,
        local: ticketData.local,
        competidor: ticketData.competidor,
        codigoTienda: ticketData.codigoTienda,
        mes: ticketData.mes,
        ano: ticketData.ano
      })
    })
    .then(r => r.json())
    .then(result => {
      const status = result.success ? 'done' : 'error';
      setSyncQueue(prev => prev.map(s => s.id === syncId ? { ...s, status } : s));
      if (result.success) scheduleAlarmsRefresh();
      // Auto-remove after 3.5s
      setTimeout(() => setSyncQueue(prev => prev.filter(s => s.id !== syncId)), 3500);
    })
    .catch(() => {
      setSyncQueue(prev => prev.map(s => s.id === syncId ? { ...s, status: 'error' } : s));
      setTimeout(() => setSyncQueue(prev => prev.filter(s => s.id !== syncId)), 4000);
    });
  };

  // After a successful BQ update, debounce a background alarms refresh
  const scheduleAlarmsRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setAlarmsRefreshing(true);
    refreshTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/data`);
        if (res.ok) {
          const data = await res.json();
          if (data.records) setRecords(data.records);
          if (data.tickets) setTickets(data.tickets);
        }
      } catch (e) {
        console.warn('Background refresh failed:', e);
      } finally {
        setAlarmsRefreshing(false);
      }
    }, 2000); // wait 2s after last sync before fetching
  };


  // Derive filter options from raw records
  const monthsArr = useMemo(() => {
    const unique = new Set();
    records.forEach(rec => {
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
  }, [records]);

  const yearsArr = useMemo(() => {
    const unique = new Set();
    records.forEach(rec => {
      if (rec.ano) {
        const y = parseInt(rec.ano);
        if (!isNaN(y)) unique.add(y);
      } else if (rec.fecha) {
        const d = new Date(rec.fecha);
        unique.add(d.getFullYear());
      }
    });
    return Array.from(unique).sort((a, b) => b - a);
  }, [records]);

  const competitorsArr = useMemo(() => {
    return Array.from(new Set(records.map(r => r.competidor))).filter(Boolean).sort();
  }, [records]);

  const allLocales = useMemo(() => {
    return Array.from(new Set(records.map(r => r.local))).filter(Boolean).sort();
  }, [records]);

  // Filter state
  const [filters, setFilters] = useState({
    month: [],
    year: [],
    competitor: [],
    local: [],
    codigoTienda: [],
    category: [],
    channel: [],
    region: [],
    distrito: [],
    zona: []
  });

  // Derived Options for FilterBar
  const monthOptions = useMemo(() => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return monthsArr.map(m => ({ value: m.toString(), label: months[m] }));
  }, [monthsArr]);

  const yearOptions = useMemo(() => {
    return yearsArr.map(y => ({ value: y.toString(), label: y.toString() }));
  }, [yearsArr]);

  const competitorOptions = useMemo(() => {
    const filteredComps = filters.category.length === 0
      ? competitorsArr
      : competitorsArr.filter(c => filters.category.includes(COMPETITOR_TO_CATEGORY[c]));

    const competitorItems = filteredComps.map(c => ({ value: c, label: c }));

    // NGR own brands — plain name as value so filtering works correctly
    const NGR_BRANDS = ['POPEYES', 'Bembos', 'Papa Johns', 'CHINAWOK'];
    const ngrItems = NGR_BRANDS
      .filter(b => !filteredComps.some(c => c.toUpperCase() === b.toUpperCase()))
      .map(b => ({ value: b, label: `${b} (propio)` }));

    return [...competitorItems, ...ngrItems];
  }, [competitorsArr, filters.category]);

  const latestYear = useMemo(() => {
    return yearsArr.length > 0 ? yearsArr[0].toString() : "all";
  }, [yearsArr]);

  // Set default year if not set
  useEffect(() => {
    if (latestYear !== 'all' && filters.year.length === 0) {
      setFilters(prev => ({ ...prev, year: [latestYear] }));
    }
  }, [latestYear, filters.year.length]);

  // Location options filtered by competitor
  const locationOptions = useMemo(() => {
    let filteredRecordsForLocs = records;
    if (filters.category.length > 0) {
      filteredRecordsForLocs = filteredRecordsForLocs.filter(r => filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]));
    }
    if (filters.competitor.length > 0) {
      filteredRecordsForLocs = filteredRecordsForLocs.filter(r => filters.competitor.includes(r.competidor));
    }

    // Get unique store name + code combinations
    const storesMap = new Map();
    filteredRecordsForLocs.forEach(r => {
      if (r.local && r.local.toUpperCase() !== 'DESCONOCIDO') {
        const code = r.codigo_tienda || r.cod_tienda || 'S/C';
        const key = `${code} – ${r.local}`;
        storesMap.set(r.local, key);
      }
    });

    const sortedLocals = Array.from(storesMap.keys()).sort();
    return sortedLocals.map(local => ({
      value: local,
      label: storesMap.get(local)
    }));
  }, [filters.competitor, filters.category, records]);

  const codigoTiendaOptions = useMemo(() => {
    let filtered = records;
    if (filters.category.length > 0) {
      filtered = filtered.filter(r => filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]));
    }
    if (filters.competitor.length > 0) {
      filtered = filtered.filter(r => filters.competitor.includes(r.competidor));
    }
    if (filters.local.length > 0) {
      filtered = filtered.filter(r => filters.local.includes(r.local));
    }
    // Get unique code + name combinations
    const codesMap = new Map();
    filtered.forEach(r => {
      const code = r.codigo_tienda || r.cod_tienda;
      if (code) {
        const name = r.local || 'S/N';
        codesMap.set(code, `${code} – ${name}`);
      }
    });

    const sortedCodes = Array.from(codesMap.keys()).sort();
    return sortedCodes.map(code => ({
      value: code,
      label: codesMap.get(code)
    }));
  }, [records, filters.category, filters.competitor, filters.local]);

  const regionOptions = useMemo(() => {
    let filtered = records;
    if (filters.category.length > 0) filtered = filtered.filter(r => filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]));
    if (filters.competitor.length > 0) filtered = filtered.filter(r => filters.competitor.includes(r.competidor));
    const vals = Array.from(new Set(filtered.map(r => r.region).filter(v => v && v.toUpperCase() !== 'DESCONOCIDO'))).sort();
    return vals.map(v => ({ value: v, label: v }));
  }, [records, filters.category, filters.competitor]);

  const distritoOptions = useMemo(() => {
    let filtered = records;
    if (filters.category.length > 0) filtered = filtered.filter(r => filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]));
    if (filters.competitor.length > 0) filtered = filtered.filter(r => filters.competitor.includes(r.competidor));
    if (filters.region.length > 0) filtered = filtered.filter(r => filters.region.includes(r.region));
    const vals = Array.from(new Set(filtered.map(r => r.distrito).filter(v => v && v.toUpperCase() !== 'DESCONOCIDO'))).sort();
    return vals.map(v => ({ value: v, label: v }));
  }, [records, filters.category, filters.competitor, filters.region]);

  const zonaOptions = useMemo(() => {
    let filtered = records;
    if (filters.category.length > 0) filtered = filtered.filter(r => filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]));
    if (filters.competitor.length > 0) filtered = filtered.filter(r => filters.competitor.includes(r.competidor));
    if (filters.region.length > 0) filtered = filtered.filter(r => filters.region.includes(r.region));
    if (filters.distrito.length > 0) filtered = filtered.filter(r => filters.distrito.includes(r.distrito));
    const vals = Array.from(new Set(filtered.map(r => r.zona).filter(v => v && v.toUpperCase() !== 'DESCONOCIDO'))).sort();
    return vals.map(v => ({ value: v, label: v }));
  }, [records, filters.category, filters.competitor, filters.region, filters.distrito]);

  const channelOptions = [
    { value: 'all', label: 'Todos los Canales' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'tienda', label: 'Tienda' },
    { value: 'salon', label: 'Salón' }
  ];

  const categoryOptions = [
    { value: "Pollo Frito", label: "🍗 Pollo Frito" },
    { value: "Hamburguesa", label: "🍔 Hamburguesa" },
    { value: "Pizza",       label: "🍕 Pizza" },
    { value: "Chifas",      label: "🥡 Chifas" },
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Cascade resets (if multi-select makes sense to reset dependents)
      if (key === 'category' && JSON.stringify(value) !== JSON.stringify(prev.category)) {
        newFilters.competitor = [];
        newFilters.local = [];
        newFilters.codigoTienda = [];
        newFilters.region = [];
        newFilters.distrito = [];
        newFilters.zona = [];
      }
      if (key === 'competitor' && JSON.stringify(value) !== JSON.stringify(prev.competitor)) {
        newFilters.local = [];
        newFilters.codigoTienda = [];
        newFilters.region = [];
        newFilters.distrito = [];
        newFilters.zona = [];
      }
      if (key === 'local' && JSON.stringify(value) !== JSON.stringify(prev.local)) {
        newFilters.codigoTienda = [];
      }
      if (key === 'region' && JSON.stringify(value) !== JSON.stringify(prev.region)) {
        newFilters.distrito = [];
        newFilters.zona = [];
      }
      if (key === 'distrito' && JSON.stringify(value) !== JSON.stringify(prev.distrito)) {
        newFilters.zona = [];
      }
      return newFilters;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      month: [],
      year: latestYear !== 'all' ? [latestYear] : [],
      competitor: [],
      local: [],
      codigoTienda: [],
      category: [],
      channel: [],
      region: [],
      distrito: [],
      zona: []
    });
  };

  // NGR own brands — these come from ngrLocales not from records pipeline
  const NGR_OWN_BRANDS = useMemo(() => new Set(['POPEYES', 'Bembos', 'Papa Johns', 'CHINAWOK']), []);
  const isNGRFilter = filters.competitor.length > 0 && filters.competitor.some(c => NGR_OWN_BRANDS.has(c));

  // Map ngrLocales to competition-record format so the filter pipeline works transparently
  const ngrMappedRecords = useMemo(() => {
    if (!ngrLocales.length) return [];
    return ngrLocales.map(r => ({
      competidor:       r.marca,
      local:            r.local,
      transacciones:    r.trx_total,
      promedio:         r.trx_promedio,
      mes:              String(r.mes),
      ano:              String(r.ano),
      region:           r.region  || '',
      distrito:         r.distrito || '',
      zona:             r.zona    || '',
      punto_compartido: r.punto_compartido ? r.local : null,
      status_busqueda:  'HISTORIAL',
      caja:             null,
      codigo_tienda:    r.store_num || '',
      _isNGR:           true,
    }));
  }, [ngrLocales]);

  // 1. Core Data Filtering
  // Source = records + ngrMappedRecords merged, so NGR brands flow through
  // the same category/competitor filter pipeline as competitor brands.
  const filteredRecords = useMemo(() => {
    // Determine the base source:
    // - If ALL selected competitors are NGR → use only ngrMappedRecords
    // - Otherwise, combine records + ngrMappedRecords so NGR brands
    //   are included when they match the active filters (category, etc.)
    const selectedAreNGR = filters.competitor.length > 0 && filters.competitor.every(c => NGR_OWN_BRANDS.has(c));
    const sourceRecords = selectedAreNGR ? ngrMappedRecords : [...records, ...ngrMappedRecords];

    return sourceRecords.filter(rec => {
      let mMatch = filters.month.length === 0;
      let yMatch = filters.year.length === 0;

      if (!mMatch) {
        let recMonthStr = '';
        if (rec.mes) recMonthStr = (parseInt(rec.mes) - 1).toString();
        else if (rec.fecha) recMonthStr = new Date(rec.fecha).getMonth().toString();
        mMatch = filters.month.includes(recMonthStr);
      }
      if (!yMatch) {
        let recYearStr = '';
        if (rec.ano) recYearStr = rec.ano.toString();
        else if (rec.fecha) recYearStr = new Date(rec.fecha).getFullYear().toString();
        yMatch = filters.year.includes(recYearStr);
      }

      const cMatch = filters.competitor.length === 0 || filters.competitor.includes(rec.competidor);
      const lMatch = filters.local.length === 0 || filters.local.includes(rec.local);
      const ctMatch = filters.codigoTienda.length === 0 || filters.codigoTienda.includes(rec.codigo_tienda);
      const catMatch = filters.category.length === 0 || filters.category.includes(COMPETITOR_TO_CATEGORY[rec.competidor]);
      const rMatch = filters.region.length === 0 || filters.region.includes(rec.region);
      const dMatch = filters.distrito.length === 0 || filters.distrito.includes(rec.distrito);
      const zMatch = filters.zona.length === 0 || filters.zona.includes(rec.zona);
      const chMatch = filters.channel.length === 0 || filters.channel.includes(rec.canal);

      return mMatch && yMatch && cMatch && lMatch && ctMatch && catMatch && rMatch && dMatch && zMatch && chMatch;
    });
  }, [records, ngrMappedRecords, filters]);

  // 1b. Market Share Specific Filtering (status OK + HISTORIAL, sin solapamiento)
  // NGR records (_isNGR) always pass — they are valid by construction.
  const marketShareRecords = useMemo(() => {
    if (isNGRFilter) return filteredRecords; // NGR-only filter: skip scope check
    return filteredRecords.filter(r => r._isNGR || recordInScope(r));
  }, [filteredRecords, isNGRFilter]);

  // 1b2. Puntos Compartidos evolution records — last 12 months, ignores date filter
  const pcEvolutionRecords = useMemo(() => {
    const now = new Date();
    const cutoffAno = now.getFullYear();
    const cutoffMes = now.getMonth() + 1; // 1-12
    // Compute key 12 months back
    const cutoffKeyMin = (() => {
      let y = cutoffAno;
      let m = cutoffMes - 12;
      if (m <= 0) { m += 12; y -= 1; }
      return y * 100 + m;
    })();
    return records.filter(r => {
      if (!recordInScope(r)) return false;
      if (!r.punto_compartido) return false;
      // Only apply non-date filters
      const cMatch = filters.competitor.length === 0 || filters.competitor.includes(r.competidor);
      const catMatch = filters.category.length === 0 || filters.category.includes(COMPETITOR_TO_CATEGORY[r.competidor]);
      const rMatch = filters.region.length === 0 || filters.region.includes(r.region);
      const dMatch = filters.distrito.length === 0 || filters.distrito.includes(r.distrito);
      const zMatch = filters.zona.length === 0 || filters.zona.includes(r.zona);
      if (!cMatch || !catMatch || !rMatch || !dMatch || !zMatch) return false;
      // Last 12 months window
      const key = parseInt(r.ano || 0) * 100 + parseInt(r.mes || 0);
      return key >= cutoffKeyMin;
    });
  }, [records, filters.competitor, filters.category, filters.region, filters.distrito, filters.zona]);

  // 1c. Core Tickets Filtering (facturas_v2)
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const cMatch = filters.competitor.length === 0 || filters.competitor.includes(t.competidor);
      const lMatch = filters.local.length === 0 || filters.local.includes(t.local);
      const ctMatch = filters.codigoTienda.length === 0 || filters.codigoTienda.includes(t.codigo_tienda);
      const catMatch = filters.category.length === 0 || filters.category.includes(COMPETITOR_TO_CATEGORY[t.competidor]);
      const rMatch = filters.region.length === 0 || filters.region.includes(t.region);
      const dMatch = filters.distrito.length === 0 || filters.distrito.includes(t.distrito);
      const zMatch = filters.zona.length === 0 || filters.zona.includes(t.zona);

      return cMatch && lMatch && ctMatch && catMatch && rMatch && dMatch && zMatch;
    });
  }, [tickets, filters]);

  // 2. Reactive Metrics
  const reactiveMetrics = useMemo(() => {
    const totalTransactions = marketShareRecords.reduce((sum, r) => sum + (parseFloat(r.transacciones) || 0), 0);
    const totalDailyAvg = marketShareRecords.reduce((sum, r) => sum + (parseFloat(r.promedio) || 0), 0);

    // Tickets from facturas_v2
    const filteredTicketsCount = filteredTickets.length;
    const totalImporteCount = filteredTickets.reduce((sum, t) => sum + (parseFloat(t.importe) || 0), 0);
    const ticketsSinLocalCount = tickets.filter(t => {
      const matchesComp = filters.competitor.length === 0 || filters.competitor.includes(t.competidor);
      return matchesComp && (!t.local || t.local === 'DESCONOCIDO' || t.local === 'Desconocido');
    }).length;

    // Routine Stats
    const routineStats = filteredRecords.reduce((acc, r) => {
      if (r.status_busqueda === 'OK')        acc.cerradas++;
      else if (r.status_busqueda !== 'HISTORIAL' && !r.status_busqueda?.startsWith('ESTIMADO-')) acc.conError++;
      return acc;
    }, { cerradas: 0, conError: 0 });

    const localesAnalizados = new Set(filteredRecords.map(r => r.local).filter(Boolean)).size;
    const cajasAnalizadas   = new Set(filteredRecords.map(r => `${r.local}||${r.caja ?? ''}`)).size;

    const cajasConAlarma = new Set(
      filteredRecords
        .filter(r =>
          r.status_busqueda !== 'OK' &&
          r.status_busqueda !== 'HISTORIAL' &&
          !r.status_busqueda?.startsWith('ESTIMADO-')
        )
        .map(r => `${r.local}||${r.caja ?? ''}`)
    ).size;

    // ── Month-over-Month variation (sliding window) ──
    // Uses r.promedio (already daily avg) — no extra computation needed
    const byMonth = {};
    marketShareRecords.forEach(r => {
      if (!r.mes || !r.ano) return;
      const k = `${parseInt(r.ano)}-${String(parseInt(r.mes)).padStart(2,'0')}`;
      byMonth[k] = (byMonth[k] || 0) + (parseFloat(r.promedio) || 0);
    });
    const allMonthKeys = Object.keys(byMonth).sort();

    // MoM per local (uses promedio already on r.promedio)
    const localsByMonth = {};
    marketShareRecords.forEach(r => {
      if (!r.mes || !r.ano) return;
      const k = `${parseInt(r.ano)}-${String(parseInt(r.mes)).padStart(2,'0')}`;
      if (!localsByMonth[k]) localsByMonth[k] = { prom: 0, locals: new Set() };
      localsByMonth[k].prom += (parseFloat(r.promedio) || 0);
      localsByMonth[k].locals.add(r.local);
    });

    // Sliding window: selected months vs same N months before
    const selMonths  = filters.month; // ['0','1',...] 0-indexed
    const selYears   = filters.year;  // ['2025',...]
    let momDailyAvg  = null;
    let momPerLocal  = null;

    if (selMonths.length > 0 && selYears.length > 0) {
      const selYear = parseInt(selYears[0]);
      const N = selMonths.length;
      // 1-indexed month numbers for selected period
      const selNums = selMonths.map(m => parseInt(m) + 1).sort((a, b) => a - b);
      // Current window sum
      let curSum = 0;
      selNums.forEach(m => {
        const k = `${selYear}-${String(m).padStart(2,'0')}`;
        curSum += byMonth[k] || 0;
      });
      // Previous window: N months before the earliest selected month
      const earliestM = selNums[0];
      let prevSum = 0;
      let curSumLocal = 0; let prevSumLocal = 0;
      let curLocals = new Set(); let prevLocals = new Set();
      for (let i = 0; i < N; i++) {
        // Current period per-local
        const cm = selNums[i];
        const ck = `${selYear}-${String(cm).padStart(2,'0')}`;
        if (localsByMonth[ck]) {
          curSumLocal += localsByMonth[ck].prom;
          localsByMonth[ck].locals.forEach(l => curLocals.add(l));
        }
        // Previous period
        let pm = earliestM - N + i;
        let py = selYear;
        if (pm <= 0) { pm += 12; py -= 1; }
        const pk = `${py}-${String(pm).padStart(2,'0')}`;
        prevSum += byMonth[pk] || 0;
        if (localsByMonth[pk]) {
          prevSumLocal += localsByMonth[pk].prom;
          localsByMonth[pk].locals.forEach(l => prevLocals.add(l));
        }
      }
      if (prevSum > 0) momDailyAvg = ((curSum - prevSum) / prevSum) * 100;
      if (prevLocals.size > 0 && curLocals.size > 0) {
        const curAvg  = curSumLocal  / curLocals.size;
        const prevAvg = prevSumLocal / prevLocals.size;
        if (prevAvg > 0) momPerLocal = ((curAvg - prevAvg) / prevAvg) * 100;
      }
    } else {
      // No month filter: compare last 2 available months from data
      if (allMonthKeys.length >= 2) {
        const cur  = byMonth[allMonthKeys[allMonthKeys.length - 1]];
        const prev = byMonth[allMonthKeys[allMonthKeys.length - 2]];
        if (prev > 0) momDailyAvg = ((cur - prev) / prev) * 100;
        const curM  = localsByMonth[allMonthKeys[allMonthKeys.length - 1]];
        const prevM = localsByMonth[allMonthKeys[allMonthKeys.length - 2]];
        if (curM && prevM && prevM.locals.size > 0) {
          const curAvg  = curM.prom  / curM.locals.size;
          const prevAvg = prevM.prom / prevM.locals.size;
          if (prevAvg > 0) momPerLocal = ((curAvg - prevAvg) / prevAvg) * 100;
        }
      }
    }

    return {
      totalVentas: totalTransactions,
      totalTickets: filteredTicketsCount,
      totalImporte: totalImporteCount,
      ticketsSinLocal: ticketsSinLocalCount,
      cajasCerradas: routineStats.cerradas,
      cajasConError: routineStats.conError,
      totalTransDailyAvg: totalDailyAvg,
      avgTransPerLocal: totalTransactions / (new Set(marketShareRecords.map(r => r.local)).size || 1),
      localesAnalizados,
      cajasAnalizadas,
      cajasSinRegistro: cajasConAlarma,
      momDailyAvg,
      momPerLocal,
    };
  }, [filteredRecords, marketShareRecords, filteredTickets, tickets, filters.competitor, filters.month, filters.year]);

  // 3. Reactive Share Data (Exclusive for Market Share)
  // When includeNGR=true, NGR brands are added to the share pool.
  // NGR records are excluded from the competitor loop to avoid double-counting.
  const reactiveShareDataRoutine = useMemo(() => {
    // --- Competitor totals — use r.promedio (daily avg, already computed) ---
    const totalsByComp = {};
    marketShareRecords.forEach(r => {
      if (r._isNGR) return;
      if (!totalsByComp[r.competidor]) totalsByComp[r.competidor] = 0;
      totalsByComp[r.competidor] += (parseFloat(r.promedio) || 0);
    });

    // --- Optional: add NGR brands — use r.trx_promedio (daily avg, already computed) ---
    if (includeNGR && ngrLocales.length > 0) {
      // Match EXACT year-month combinations present in marketShareRecords (competitors only)
      const periodSet = new Set(
        marketShareRecords
          .filter(r => !r._isNGR && r.ano && r.mes)
          .map(r => `${Number(r.ano)}-${Number(r.mes)}`)
      );

      ngrLocales
        .filter(r => {
          if (!periodSet.has(`${r.ano}-${r.mes}`)) return false;
          if (filters.category.length > 0 && !filters.category.includes(COMPETITOR_TO_CATEGORY[r.marca])) return false;
          if (filters.competitor.length > 0 && !filters.competitor.includes(r.marca)) return false;
          return true;
        })
        .forEach(r => {
          if (!totalsByComp[r.marca]) totalsByComp[r.marca] = 0;
          totalsByComp[r.marca] += (r.trx_promedio || 0);
        });
    }

    const BRAND_COLORS = {
      'KFC':            '#E4002B',
      'MCDONALDS':      '#FFC72C',
      "MCDONALD'S":     '#FFC72C',
      'BURGER KING':    '#FF8C00',
      'DOMINOS':        '#006491',
      "DOMINO'S":       '#006491',
      'PIZZA HUT':      '#EE3A24',
      'LITTLE CAESARS': '#6D1F7E',
      "LITTLE CAESAR'S":'#6D1F7E',
      'WANTA':          '#00B4A0',
      'POPEYES':        '#F26522',
      'SUBWAY':         '#009B48',
      // NGR own brands
      'Bembos':         '#CC1F1F',
      'BEMBOS':         '#CC1F1F',
      'Papa Johns':     '#007743',
      'PAPA JOHNS':     '#007743',
      'CHINAWOK':       '#F0A500',
    };
    const FALLBACK = ['#64748b','#94a3b8','#475569','#6366f1','#0ea5e9','#14b8a6'];
    let fallbackIdx = 0;

    return Object.entries(totalsByComp)
      .map(([name, value]) => {
        const key = name?.toUpperCase().trim();
        const color = BRAND_COLORS[name] || BRAND_COLORS[key] || FALLBACK[fallbackIdx++ % FALLBACK.length];
        return { name, value, color, isNGR: !!(includeNGR && ['POPEYES','Bembos','Papa Johns','CHINAWOK'].includes(name)) };
      })
      .sort((a, b) => b.value - a.value);
  }, [marketShareRecords, includeNGR, ngrLocales, filters]);

  // 3b. Reactive Share Data (For Competitor Analysis - based on facturas_v2)
  const reactiveShareDataTickets = useMemo(() => {
    const totalsByComp = {};
    filteredTickets.forEach(t => {
      if (!totalsByComp[t.competidor]) totalsByComp[t.competidor] = 0;
      totalsByComp[t.competidor] += 1;
    });

    const BRAND_COLORS = {
      'KFC':           '#E4002B',
      'MCDONALDS':     '#FFC72C',
      "MCDONALD'S":    '#FFC72C',
      'BURGER KING':   '#FF8C00',
      'DOMINOS':       '#006491',
      "DOMINO'S":      '#006491',
      'PIZZA HUT':     '#EE3A24',
      'LITTLE CAESARS':  '#6D1F7E',
      "LITTLE CAESAR'S": '#6D1F7E',
      'WANTA':         '#00B4A0',
      'POPEYES':       '#F26522',
      'SUBWAY':        '#009B48',
    };
    const FALLBACK = ['#64748b','#94a3b8','#475569','#6366f1','#0ea5e9','#14b8a6'];
    let fallbackIdx = 0;

    return Object.entries(totalsByComp)
      .map(([name, value]) => {
        const key = name?.toUpperCase().trim();
        const color = BRAND_COLORS[key] || FALLBACK[fallbackIdx++ % FALLBACK.length];
        return { name, value, color };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTickets]);

  // 4. Reactive Trend Data (Market Share - OK records + HISTORIAL overlay)
  const reactiveTrendDataRoutine = useMemo(() => {
    // OK records by month: sum trx + sum promedio — competitors only (NGR handled separately below)
    const okData = {};
    const okProm = {};
    marketShareRecords.forEach(r => {
      if (!r.mes || !r.ano) return;
      if (r._isNGR) return; // NGR added separately via ngrData to avoid double-counting
      const key = `${parseInt(r.ano)}-${String(parseInt(r.mes)).padStart(2, '0')}`;
      okData[key] = (okData[key] || 0) + (parseFloat(r.transacciones) || 0);
      okProm[key] = (okProm[key] || 0) + (parseFloat(r.promedio) || 0);
    });

    // HISTORIAL records by month: sum trx + sum promedio
    const histData = {};
    const histProm = {};
    filteredRecords
      .filter(r => r.status_busqueda === 'HISTORIAL' && (parseInt(r.ano) * 100 + parseInt(r.mes)) <= CUTOFF_KEY)
      .forEach(r => {
        if (!r.mes || !r.ano) return;
        const key = `${parseInt(r.ano)}-${String(parseInt(r.mes)).padStart(2, '0')}`;
        histData[key] = (histData[key] || 0) + (parseFloat(r.transacciones) || 0);
        histProm[key] = (histProm[key] || 0) + (parseFloat(r.promedio) || 0);
      });

    const allKeys = [...new Set([...Object.keys(okData), ...Object.keys(histData)])].sort();

    // When includeNGR: compute NGR avg daily trx by month (trx_promedio, same metric as competition)
    const ngrData = {};
    if (includeNGR && ngrLocales.length > 0) {
      const periodSet = new Set(
        [...Object.keys(okData), ...Object.keys(histData)]
      );
      ngrLocales.forEach(r => {
        const key = `${r.ano}-${String(r.mes).padStart(2, '0')}`;
        if (!periodSet.size || periodSet.has(key)) {
          // Use trx_promedio (daily avg) to match the promedio field used for competition
          ngrData[key] = (ngrData[key] || 0) + (r.trx_promedio || 0);
        }
      });
    }

    return allKeys.map(key => ({
      name:          key,
      tickets:       okData[key]    ?? null,
      historial:     histData[key]  ?? null,
      promedio:      okProm[key]    ?? null,
      historialProm: histProm[key]  ?? null,
      ngrTrx:        ngrData[key]   ?? null,  // NGR trx total for that month
    }));
  }, [marketShareRecords, filteredRecords, includeNGR, ngrLocales]);


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

  // 5. Reactive Table Data (Market Share View - OK + ESTIMADO)
  const aggregatedTableDataRoutine = useMemo(() => {
    const localMap = {};
    marketShareRecords.forEach(r => {
      const isEst = r.status_busqueda?.startsWith('ESTIMADO-');
      // For estimados (no caja): key by local only so they merge into one row per store
      const rowKey = isEst
        ? `${r.competidor}||${r.local}||ESTIMADO`
        : `${r.local}||${r.caja ?? ''}`;
      if (!localMap[rowKey]) {
        localMap[rowKey] = {
          competidor: r.competidor,
          codigo_tienda: r.codigo_tienda || '',
          local: r.local,
          caja: isEst ? '' : (r.caja || '-'),
          ventas: 0,
          uniqueTicketsCount: 0,
          cajasTotal: new Set(),
          ticketsReg: 0,
          ticketsNoReg: 0,
          ticket_anterior: r.ticket_actual || '-',
          fecha_anterior: r.fecha_y_hora_registro || '-',
          delta_dias: r.delta_dias || 0,
          ac: r.ac || 0,
          promedioDiario: 0,
          isEstimado: isEst,
          confianza: isEst ? r.status_busqueda.replace('ESTIMADO-', '') : null,
        };
      }
      const trans = parseFloat(r.transacciones) || 0;
      localMap[rowKey].ventas += trans;
      localMap[rowKey].uniqueTicketsCount += 1;
      localMap[rowKey].cajasTotal.add(r.caja);
      localMap[rowKey].ticketsReg += 1;
      localMap[rowKey].promedioDiario += (parseFloat(r.promedio) || 0);
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
      const rowKey = `${r.local}||${r.caja ?? ''}`;
      if (!localMap[rowKey]) {
        localMap[rowKey] = {
          competidor: r.competidor,
          codigo_tienda: r.codigo_tienda || '',
          local: r.local,
          caja: r.caja || '-',
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
      localMap[rowKey].ventas += trans;
      localMap[rowKey].uniqueTicketsCount += 1;
      localMap[rowKey].cajasTotal.add(r.caja);
      localMap[rowKey].ticketsReg += 1;
      localMap[rowKey].promedioDiario += (parseFloat(r.promedio) || 0);
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
      codigoTiendaOptions={codigoTiendaOptions}
      channelOptions={channelOptions}
      categoryOptions={categoryOptions}
      regionOptions={regionOptions}
      distritoOptions={distritoOptions}
      zonaOptions={zonaOptions}
    />
  );

  // Merge NGR records into competition records for Clientes tab
  const recordsWithNGR = useMemo(() => {
    if (!ngrMappedRecords.length) return records;
    return [...records, ...ngrMappedRecords];
  }, [records, ngrMappedRecords]);

  return (
    <div className="min-h-screen relative p-6 md:p-12 text-slate-900 dark:text-white overflow-x-hidden selection:bg-accent-orange/30">
      <div className="pwa-mesh">
        <div className="mesh-orb-1 " />
        <div className="mesh-orb-2 " />
      </div>

      <main className="max-w-7xl mx-auto space-y-8 relative">
        {/* Notification Overlay */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
            >
              <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${notification.type === 'success'
                ? 'bg-emerald-500/90 border-emerald-400 text-white'
                : notification.type === 'info'
                  ? 'bg-blue-500/90 border-blue-400 text-white'
                  : 'bg-red-500/90 border-red-400 text-white'
                }`}>
                {notification.type === 'success' ? <CheckCircle2 size={18} /> :
                  notification.type === 'info' ? <Activity size={18} className="animate-pulse" /> :
                    <XCircle size={18} />}
                <span className="text-sm font-black uppercase tracking-tighter">{notification.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6 border-b border-slate-300 dark:border-white/10 pb-6 relative"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
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
                <h1 className="pwa-title !text-4xl md:!text-5xl text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-white/70">
                  {activeCategory === 'competitor' ? 'Análisis Competencias' :
                    activeCategory === 'marketshare' ? (
                      activeSubTab === 'comparativos' ? 'Comparativos' :
                      activeSubTab === 'puntos_compartidos' ? 'Puntos Compartidos' :
                      'Market Share'
                    ) :
                    activeCategory === 'tickets' ? (activeSubTab === 'alarmas' ? 'Alarmas' : 'Tickets') :
                      activeCategory === 'clientes' ? 'Evolución por Categoría' :
                        'Dashboard'} <span className="text-accent-orange">LIVE</span>
                </h1>
              </div>
            </div>

            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={handleRefreshData}
                disabled={isRefreshingData}
                title="Actualizar datos desde BigQuery"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isRefreshingData
                  ? 'bg-slate-100 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:scale-105'
                  }`}
              >
                <RefreshCw size={13} className={isRefreshingData ? 'animate-spin' : ''} />
                {isRefreshingData ? 'Actualizando...' : 'Actualizar BQ'}
              </button>
              <button
                onClick={toggleTheme}
                className="p-3 bg-white/50 dark:bg-white/[0.02] rounded-2xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-white/80 hover:text-accent-orange dark:hover:text-accent-lemon"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              {activeCategory !== 'tickets' && activeCategory !== 'estimaciones' && globalFilterBar}

              {/* ── User avatar + logout ── */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
                  {user.photoURL
                    ? <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border-2 border-orange-400/40" />
                    : <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400 font-black text-xs">{user.displayName?.[0] ?? '?'}</div>
                  }
                  <div className="hidden lg:flex flex-col leading-tight">
                    <span className="text-[10px] font-black text-slate-700 dark:text-white/80 truncate max-w-[120px]">{user.displayName}</span>
                    <span className="text-[8px] text-slate-400 truncate max-w-[120px]">{user.email}</span>
                  </div>
                  <button
                    onClick={onSignOut}
                    title="Cerrar sesión"
                    className="ml-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 hover:border-red-400/30 transition-all"
                  >
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Integrated Navbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
            <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
              {
                [
                  { id: 'marketshare',  icon: PieChartIcon,   label: 'Market Share' },
                  { id: 'sstx',         icon: GitCompare,     label: 'SSTX' },
                  { id: 'tickets',      icon: Ticket,         label: 'Tickets' },
                  { id: 'alarmas',      icon: ShieldAlert,    label: 'Alarmas' },
                  { id: 'clientes',     icon: Users,          label: 'Clientes' },
                  { id: 'estimaciones', icon: ClipboardEdit,  label: 'Estimaciones' },
                  { id: 'actividad',    icon: Activity,       label: 'Actividad' },
                ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id === 'marketshare') setActiveSubTab('marketshare');
                    else setActiveSubTab('');
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeCategory === cat.id ? 'bg-accent-orange text-white shadow-lg' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}
                >
                  <cat.icon size={13} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* De-emphasized Competitor Link */}
            <button
              onClick={() => {
                setActiveCategory('competitor');
                setActiveSubTab('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${activeCategory === 'competitor' ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/40'}`}
            >
              <LayoutDashboard size={12} />
              Análisis Competencias
            </button>
          </div>
        </motion.header>

        {/* Floating Sub-tabs Bar */}
        <AnimatePresence>
          {(activeCategory === 'marketshare') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-center -mt-4 mb-4"
            >
              <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl flex gap-1.5 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-black/5">
                {(activeCategory === 'marketshare' ? [
                  { id: 'marketshare',       icon: PieChartIcon, label: 'Market Share' },
                  { id: 'puntos_compartidos', icon: MapPin,        label: 'Puntos Compartidos' },
                  { id: 'comparativos',       icon: GitCompare,    label: 'Comparativos' },
                ] : activeCategory === 'tickets' ? [
                  { id: 'tickets', icon: Ticket, label: 'Tickets' },
                  { id: 'alarmas', icon: ShieldAlert, label: 'Alarmas' },
                ] : []).map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubTab(sub.id)}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${activeSubTab === sub.id ? 'bg-white dark:bg-white/10 text-accent-orange shadow-md scale-[1.02]' : 'text-slate-400 dark:text-white/20 hover:text-slate-600 dark:hover:text-white/60 hover:bg-white/50 dark:hover:bg-white/5'}`}
                  >
                    <sub.icon size={14} />
                    {sub.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <AnimatePresence mode="wait">
          {activeCategory === 'estimaciones' ? (
            <EstimacionesDashboard
              key="estimaciones"
              user={user}
              cajasConfig={cajasConfig}
              onCajasConfigChange={setCajasConfig}
              alarmasRevisadas={alarmasRevisadas}
              onAlarmasRevisadasChange={setAlarmasRevisadas}
            />
          ) : activeCategory === 'actividad' ? (
            <ActivityLogDashboard key="actividad" user={user} />
          ) : activeCategory === 'clientes' ? (
            <ClientesDashboard
              key="clientes"
              records={recordsWithNGR}
              competitorToCategory={COMPETITOR_TO_CATEGORY}
              ngrLocales={ngrLocales}
              filters={filters}
            />
          ) : activeCategory === 'competitor' ? (
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
          ) : activeCategory === 'sstx' ? (
            <SSTXDashboard
              key="sstx"
              records={records}
              filters={filters}
              globalFilterBar={globalFilterBar}
            />
          ) : activeCategory === 'marketshare' ? (
            activeSubTab === 'comparativos' ? (
              <ComparativosDashboard
                key="comparativos"
                shareData={reactiveShareDataRoutine}
                tableData={sortedTableDataRoutine}
                metrics={reactiveMetrics}
                theme={theme}
              />
            ) : activeSubTab === 'puntos_compartidos' ? (
              <PuntosCompartidosDashboard
                key="puntos_compartidos"
                allRecords={marketShareRecords}
                evolutionRecords={pcEvolutionRecords}
                shareData={reactiveShareDataRoutine}
                ngrLocales={ngrLocales}
                filters={filters}
              />
            ) : (
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
                includeNGR={includeNGR}
              />
            )
          ) : activeCategory === 'alarmas' ? (
            <AlarmasDashboard
              key="alarmas"
              user={user}
              records={records}
              tickets={tickets}
              cajasConfig={cajasConfig}
              onCajasConfigChange={setCajasConfig}
              alarmasRevisadas={alarmasRevisadas}
              onAlarmasRevisadasChange={setAlarmasRevisadas}
              onUpdateTicket={handleUpdateTicket}
              isRefreshing={isRefreshing}
            />
          ) : activeCategory === 'tickets' ? (
            activeSubTab === 'alarmas' ? (
              <AlarmasDashboard
                key="tickets-alarmas"
                user={user}
                records={records}
                tickets={tickets}
                cajasConfig={cajasConfig}
                onCajasConfigChange={setCajasConfig}
                alarmasRevisadas={alarmasRevisadas}
                onAlarmasRevisadasChange={setAlarmasRevisadas}
                onUpdateTicket={handleUpdateTicket}
                isRefreshing={isRefreshing}
              />
            ) : (
              <TicketsDashboard
                key="tickets"
                tickets={tickets}
                records={records}
                shareData={reactiveShareDataTickets}
                globalFilters={filters}
                onFilterChange={setFilters}
                onUpdateTicket={handleUpdateTicket}
                isRefreshing={isRefreshing}
              />
            )
          ) : null}
        </AnimatePresence>

        {/* ── Sync Indicator (bottom-right floating) ── */}
        <AnimatePresence>
          {(syncQueue.length > 0 || alarmsRefreshing) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end"
            >
              {syncQueue.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-3 min-w-[240px] max-w-[300px]"
                >
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: item.status === 'done' ? '#dcfce7' : item.status === 'error' ? '#fee2e2' : '#eff6ff' }}>
                      {item.status === 'done' && (
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {item.status === 'error' && (
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {item.status === 'syncing' && (
                        <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                        </svg>
                      )}
                    </div>
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">{item.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.status === 'syncing' ? 'Sincronizando con BigQuery...' : item.status === 'done' ? 'Guardado ✓' : 'Error al guardar'}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2.5 h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                    {item.status === 'syncing' ? (
                      <div className="h-full rounded-full bg-blue-500 animate-[indeterminate_1.4s_ease-in-out_infinite]"
                        style={{ width: '40%', animationName: 'indeterminate' }} />
                    ) : (
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: '100%', background: item.status === 'done' ? '#22c55e' : '#ef4444' }} />
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Alarms refresh chip */}
              <AnimatePresence>
                {alarmsRefreshing && (
                  <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl px-4 py-2.5 min-w-[240px] flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Recalculando alarmas...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
