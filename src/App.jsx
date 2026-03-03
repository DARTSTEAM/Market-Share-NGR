import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, TrendingUp, BarChart2, ShieldAlert, Award, PieChart as PieChartIcon, Activity, LayoutDashboard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import loadedData from './data.json';
import MarketShareDashboard from './components/MarketShareDashboard';
import CustomSelect from './components/common/CustomSelect';
import FilterBar from './components/filters/FilterBar';

const { shareData, trendData, metrics, tableData, competitorTableData } = loadedData;

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
    <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <div className="px-3 py-1.5 bg-white dark:bg-black/80 backdrop-blur-md rounded border border-slate-200 dark:border-white/10 text-xs font-black uppercase whitespace-nowrap shadow-xl text-slate-900 dark:text-white">
          {new Intl.NumberFormat('en-US').format(value)} Tickets
        </div>
      </div>
      <div className="w-full flex justify-center items-end flex-1 min-h-[150px] relative">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1.2, delay, type: "spring", stiffness: 50, damping: 15 }}
          className={`w-[80%] max-w-[40px] ${isTailwindClass ? color : ''} rounded-t-lg shadow-lg dark:shadow-[0_0_30px_rgba(255,126,75,0.1)] group-hover:brightness-110 dark:group-hover:brightness-125 transition-all relative overflow-hidden`}
          style={!isTailwindClass && color ? { backgroundColor: color } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 dark:from-white/20 to-transparent" />
        </motion.div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center">{label}</span>
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Tickets totales" value={kFormatter(metrics.totalTickets)} previousPeriodValue="+12%" delay={0.1} icon={TrendingUp} />
        <MetricCard title="Locales analizados" value={metrics.localesAnalizados.toString()} previousPeriodValue="+5" delay={0.2} icon={Award} />
        <MetricCard title="Cajas sin registro" value={metrics.cajasSinRegistro.toString()} previousPeriodValue={`-${Math.round((metrics.cajasSinRegistro / (metrics.totalTickets || 1)) * 100)}%`} delay={0.3} icon={ShieldAlert} />
        <MetricCard title="Cajas analizadas" value={metrics.cajasAnalizadas.toString()} previousPeriodValue={`+${Math.round((metrics.cajasAnalizadas / (metrics.totalTickets || 1)) * 100)}%`} delay={0.4} icon={BarChart2} />
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
          <h2 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Market Split</h2>
          <div className="flex gap-2 items-center px-3 py-1 rounded-full bg-accent-orange/10 dark:bg-accent-orange/20 border border-accent-orange/30">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse shadow-[0_0_8px_rgba(255,94,0,0.8)]" />
            <span className="text-[8px] font-black uppercase tracking-widest text-accent-orange">Live</span>
          </div>
        </div>

        <div className="flex items-end justify-around w-full flex-1 mt-6 gap-2 relative h-[250px]">
          <div className="absolute top-[30%] w-full border-t border-dashed border-slate-300 dark:border-white/10 z-0">
            <span className="absolute -top-3 left-0 text-[8px] font-black text-slate-400 dark:text-white/20">
              {kFormatter(Math.max(...shareData.map(d => d.value)) * 0.7)}
            </span>
          </div>
          {shareData.slice(0, 6).map((item, index) => (
            <ChartBar
              key={index}
              label={item.name === "MCDONALD'S" ? "McD's" : item.name === "BURGER KING" ? "BK" : item.name === "LITTLE CAESARS" ? "L. CAESARS" : item.name.substring(0, 10)}
              value={item.value}
              max={Math.max(...shareData.map(d => d.value)) * 1.1}
              color={item.color}
              delay={0.5 + (index * 0.1)}
            />
          ))}
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
        <div className="flex-1 w-full -ml-4 mt-6" style={{ minHeight: '320px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
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
            <PieChartIcon size={16} className="text-accent-orange" />
            <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Share Overview</h3>
          </div>
        </div>
        <div className="flex-1 w-full flex items-center justify-center mt-6" style={{ minHeight: '340px' }}>
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={shareData}
                cx="50%"
                cy="45%"
                innerRadius="38%"
                outerRadius="60%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                label={false}
              >
                {shareData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}
                formatter={(value, name) => [`${((value / shareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value, entry) => (
                  <span style={{ fontSize: '9px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                    {value} {((entry.payload.value / shareData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
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
                <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)]">Transacciones Totales</th>
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
              { value: "ventas", label: "Transacciones" },
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
                <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleSort('ventas')}>
                  Transacciones Periodo <span className="text-slate-900 dark:text-white font-bold">{sortBy === 'ventas' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
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

  // GLOBAL FILTERS STATE
  const [filters, setFilters] = useState({
    month: "1",
    year: "2026",
    competitor: "all",
    location: "all",
    channel: "all",
    categories: []   // empty = all categories
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      month: '1',
      year: '2024',
      competitor: 'all',
      location: 'all',
      channel: 'all',
      categories: []
    });
  };

  // Filter Options Generation
  const monthOptions = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  const yearOptions = [{ value: "2026", label: "2026" }];

  const competitorOptions = [
    { value: "all", label: "Todos los competidores" },
    ...shareData.map(c => ({ value: c.name, label: c.name }))
  ];

  const locationOptions = [
    { value: "all", label: "Todos los locales" },
    ...Array.from(new Set(tableData.map(t => t.local))).sort().map(l => ({ value: l, label: l }))
  ];

  const channelOptions = [
    { value: "all", label: "Todos los canales" },
    { value: "delivery", label: "Delivery" },
    { value: "tienda", label: "Recojo en tienda" },
    { value: "salon", label: "Salón" }
  ];

  // Mapping: competitor name → food category
  const COMPETITOR_CATEGORY_MAP = {
    "KFC": "Pollo Frito",
    "Popeyes": "Pollo Frito",
    "McDonald's": "Hamburguesa",
    "BURGER KING": "Hamburguesa",
    "Bembos": "Hamburguesa",
    "Pizza Hut": "Pizza",
    "Little Caesars": "Pizza",
    "Domino's": "Pizza",
    "Papa Johns": "Pizza",
  };

  const categoryOptions = [
    { value: "Pollo Frito", label: "🍗 Pollo Frito" },
    { value: "Hamburguesa", label: "🍔 Hamburguesa" },
    { value: "Pizza", label: "🍕 Pizza" },
  ];

  // Table Sorting logic (Existing)
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

  // 1. Data Filtering Logic
  const filteredTableData = useMemo(() => {
    return tableData.filter(item => {
      const matchCompetitor = filters.competitor === 'all' || item.competidor === filters.competitor;
      const matchLocation = filters.location === 'all' || item.local === filters.location;
      const matchCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(COMPETITOR_CATEGORY_MAP[item.competidor] ?? 'Otro');
      return matchCompetitor && matchLocation && matchCategory;
    });
  }, [filters.competitor, filters.location, filters.categories]);

  // 2. Aggregate Metrics (Reactive Scorecards)
  const reactiveMetrics = useMemo(() => {
    const totalReg = filteredTableData.reduce((sum, item) => sum + (item.ticketsReg || 0), 0);
    const totalNoReg = filteredTableData.reduce((sum, item) => sum + (item.ticketsNoReg || 0), 0);
    const totalVentas = filteredTableData.reduce((sum, item) => sum + (item.ventas || 0), 0);
    const locales = new Set(filteredTableData.map(item => item.local)).size;
    const cajas = filteredTableData.reduce((sum, item) => sum + (item.cajasTotal || 0), 0);

    // Scale based on month/year simulation (Since data.json only has Jan 2026)
    const monthVal = parseInt(filters.month);
    const yearVal = parseInt(filters.year);
    const multiplier = (monthVal * 0.08) + (yearVal === 2026 ? 1 : 0.85);

    return {
      totalTickets: Math.round((totalReg + totalNoReg) * multiplier),
      localesAnalizados: locales,
      cajasSinRegistro: Math.round(totalNoReg * multiplier),
      cajasAnalizadas: cajas,
      totalVentas: totalVentas * multiplier
    };
  }, [filteredTableData, filters.month, filters.year]);

  // 3. Reactive Share Data (Grouped results from the filtered table)
  const reactiveShareData = useMemo(() => {
    // If no specific competitor is selected, show top competitors split
    // If a competitor is selected, we still show the pie chart but maybe highlighted or filtered?
    // Actually, it's better to show the full share but highlighted if one is selected.
    const groups = filteredTableData.reduce((acc, item) => {
      if (!acc[item.competidor]) acc[item.competidor] = 0;
      acc[item.competidor] += item.ventas;
      return acc;
    }, {});

    // Month scaling for visuals
    const monthVal = parseInt(filters.month);
    const multiplier = (monthVal * 0.08);

    return shareData.map(item => ({
      ...item,
      value: Math.round((groups[item.name] || 0) * (1 + multiplier))
    })).sort((a, b) => b.value - a.value);
  }, [filters.month, filteredTableData, shareData]);

  // 4. Reactive Trend Data (Simulated Scaling)
  const reactiveTrendData = useMemo(() => {
    const totalVentas = filteredTableData.reduce((sum, item) => sum + (item.ventas || 0), 0);
    const baseVentas = totalVentas || 10;

    const yearVal = parseInt(filters.year);
    const yearMultiplier = yearVal === 2026 ? 1 : 0.85;

    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return MONTHS.map((month, index) => {
      // Simulate seasonality for sales/transactions
      const seasonality = 1 + (Math.sin(index * 0.8) * 0.25) + (Math.cos(index * 0.3) * 0.15);
      return {
        name: month,
        tickets: Math.max(1, Math.round(baseVentas * yearMultiplier * seasonality))
      };
    });
  }, [filteredTableData, filters.year]);

  const sortedTableData = useMemo(() => {
    return [...filteredTableData].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortBy, sortDirection]);

  const filteredCompetitorTableData = useMemo(() => {
    const groups = filteredTableData.reduce((acc, item) => {
      const comp = item.competidor;
      if (!acc[comp]) {
        acc[comp] = {
          competidor: comp,
          localesCount: 0,
          cajasTotal: 0,
          ticketsReg: 0,
          ticketsNoReg: 0,
          ventas: 0,
          locales: new Set()
        };
      }
      acc[comp].locales.add(item.local);
      acc[comp].cajasTotal += item.cajasTotal;
      acc[comp].ticketsReg += item.ticketsReg;
      acc[comp].ticketsNoReg += item.ticketsNoReg;
      acc[comp].ventas += item.ventas;
      return acc;
    }, {});

    return Object.values(groups).map(g => ({
      ...g,
      localesCount: g.locales.size
    })).sort((a, b) => b.ventas - a.ventas);
  }, [filteredTableData]);

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
                {activeTab === 'competitor' ? 'Análisis Competencias' : 'Market Share'} <span className="text-accent-orange">LIVE</span>
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
            <button
              onClick={() => setActiveTab('competitor')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'competitor' ? 'bg-accent-orange text-white shadow-[0_0_20px_rgba(255,126,75,0.3)]' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'}`}
            >
              <LayoutDashboard size={14} />
              Análisis Competencias
            </button>
            <button
              onClick={() => setActiveTab('marketshare')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'marketshare' ? 'bg-accent-orange text-white shadow-[0_0_20px_rgba(255,126,75,0.3)]' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5'}`}
            >
              <PieChartIcon size={14} />
              Market Share
            </button>
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
              shareData={reactiveShareData}
              trendData={reactiveTrendData}
              competitorTableData={filteredCompetitorTableData}
              tableData={sortedTableData}
              sortBy={sortBy}
              handleSort={handleSort}
              sortDirection={sortDirection}
              filterBar={globalFilterBar}
            />
          ) : (
            <MarketShareDashboard
              key="marketshare"
              filters={filters}
              onFilterChange={handleFilterChange}
              globalFilterBar={globalFilterBar}
              reactiveMetrics={reactiveMetrics}
              reactiveShareData={reactiveShareData}
              trendData={reactiveTrendData}
              filteredTableData={sortedTableData}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
