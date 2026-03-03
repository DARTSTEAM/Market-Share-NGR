import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, TrendingUp, BarChart2, ShieldAlert, Award, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import loadedData from './data.json';

const { shareData, trendData, metrics, tableData, competitorTableData } = loadedData;

const kFormatter = (num) => {
  if (Math.abs(num) > 999999) return Math.sign(num) * ((Math.abs(num) / 1000000).toFixed(1)) + 'M';
  if (Math.abs(num) > 999) return Math.sign(num) * ((Math.abs(num) / 1000).toFixed(1)) + 'k';
  return Math.sign(num) * Math.abs(num);
};

const CustomSelect = ({ label, options, selected, onChange, borderRight, alignRight = false, width = "w-24" }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`flex flex-col gap-1 ${width} relative outline-none ${borderRight ? 'border-r border-slate-300 dark:border-white/10 pr-6 mr-2' : ''} ${alignRight ? 'items-end' : ''}`}
      tabIndex={0}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
      }}
    >
      <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${alignRight ? 'text-slate-500 dark:text-white/40' : 'text-accent-orange opacity-80'}`}>{label}</span>
      <div
        className={`flex items-center justify-between text-slate-800 dark:text-white text-sm font-black cursor-pointer hover:text-accent-orange transition-colors ${alignRight ? 'bg-white dark:bg-white/5 px-3 py-1 rounded-md border border-slate-300 dark:border-white/10 shadow-sm dark:shadow-none' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{options.find(o => o.value === selected)?.label || 'Select'}</span>
        <span className={`text-[8px] ml-2 transition-transform duration-300 opacity-50 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-4 w-full min-w-[140px] bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-[100] p-1.5"
          >
            {options.map((option) => (
              <div
                key={option.value}
                className={`px-3 py-2 text-sm font-bold cursor-pointer transition-all rounded-xl flex items-center justify-between mb-0.5 last:mb-0 ${selected === option.value
                  ? 'bg-accent-orange text-white shadow-md'
                  : 'text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
                {selected === option.value && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Dynamic data loaded from JSON

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

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [period, setPeriod] = useState("1");
  const [year, setYear] = useState("2026");

  // Table Filters State
  const [competitorFilter, setCompetitorFilter] = useState("all");
  const [localFilter, setLocalFilter] = useState("all");
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

  const sortedData = [...tableData].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    setIsLoaded(true);
    // Verificar si hay tema guardado o preferencia de sistema
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

  return (
    <div className="min-h-screen relative p-6 md:p-12 text-slate-900 dark:text-white overflow-x-hidden selection:bg-accent-orange/30">
      <div className="pwa-mesh">
        <div className="mesh-orb-1 mix-blend-multiply dark:mix-blend-screen" />
        <div className="mesh-orb-2 mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-300 dark:border-white/10 pb-6 relative"
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
                Market Share
              </h1>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-3 bg-white/50 dark:bg-white/[0.02] rounded-2xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-white/80 hover:text-accent-orange dark:hover:text-accent-lemon"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex gap-4 bg-white/50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm">
              <CustomSelect
                label="Periodo"
                options={[{ value: "1", label: "Enero" }, { value: "2", label: "Febrero" }]}
                selected={period}
                onChange={setPeriod}
                borderRight
              />
              <CustomSelect
                label="Year"
                options={[{ value: "2026", label: "2026" }]}
                selected={year}
                onChange={setYear}
              />
            </div>
          </div>
        </motion.header>

        {isLoaded && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Tickets totales" value={kFormatter(metrics.totalTickets)} previousPeriodValue="+12%" delay={0.1} icon={TrendingUp} />
            <MetricCard title="Locales analizados" value={metrics.localesAnalizados.toString()} previousPeriodValue="+5" delay={0.2} icon={Award} />
            <MetricCard title="Cajas sin registro" value={metrics.cajasSinRegistro.toString()} previousPeriodValue={`-${Math.round((metrics.cajasSinRegistro / metrics.totalTickets) * 100)}%`} delay={0.3} icon={ShieldAlert} />
            <MetricCard title="Cajas analizadas" value={metrics.cajasAnalizadas.toString()} previousPeriodValue={`+${Math.round((metrics.cajasAnalizadas / metrics.totalTickets) * 100)}%`} delay={0.4} icon={BarChart2} />
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
                <h2 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Tendencia de Tickets</h2>
              </div>
            </div>
            <div className="flex-1 w-full -ml-4 mt-6 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
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
            <div className="flex-1 w-full flex items-center justify-center mt-6 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={shareData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="75%"
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {shareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}
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
                    <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)]">Ventas Totales</th>
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
                        <td className={`px-6 py-5 text-right font-mono ${row.ticketsNoReg > 0 ? 'text-red-500 dark:text-accent-pink font-bold' : 'text-white/20'}`}>{row.ticketsNoReg}</td>
                        <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(row.ventas)}</td>
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
            <div className="p-6 border-b border-slate-300 dark:border-white/10 flex flex-wrap gap-4 justify-end bg-gradient-to-r from-transparent to-black/[0.02] dark:to-white/[0.01]">
              <CustomSelect
                label="Competidor"
                options={[
                  { value: "all", label: "All" },
                  { value: "kfc", label: "KFC" },
                  { value: "bembos", label: "Bembos" },
                  { value: "pizza_hut", label: "Pizza Hut" },
                ]}
                selected={competitorFilter}
                onChange={setCompetitorFilter}
                alignRight
                width="w-32"
              />
              <CustomSelect
                label="Local"
                options={[
                  { value: "all", label: "All" },
                  { value: "jockey", label: "Jockey Plaza" },
                  { value: "camacho", label: "Camacho" },
                ]}
                selected={localFilter}
                onChange={setLocalFilter}
                alignRight
                width="w-32"
              />
              <CustomSelect
                label="Ordenar por"
                options={[
                  { value: "ventas", label: "Ventas" },
                  { value: "local", label: "Local" },
                  { value: "competidor", label: "Competidor" },
                ]}
                selected={sortBy}
                onChange={setSortBy}
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
                      Ventas Periodo <span className="text-white font-bold">{sortBy === 'ventas' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</span>
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
                    <td className="px-6 py-5 text-right text-xl text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic">S/ {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(metrics.totalVentas)}</td>
                  </motion.tr>
                  {sortedData.map((row, index) => {
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
                        <td className={`px-6 py-5 text-right font-mono ${row.ticketsNoReg > 0 ? 'text-red-500 dark:text-accent-pink font-bold' : 'text-white/20'}`}>{row.ticketsNoReg}</td>
                        <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(row.ventas)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
