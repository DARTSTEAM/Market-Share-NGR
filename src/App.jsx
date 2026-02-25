import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ title, value, previousPeriodValue = 0 }) => (
  <motion.div whileHover={{ y: -4 }} className="pwa-card p-6 flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1 leading-tight">{title}</p>
    </div>
    <div className="flex flex-col items-center justify-center">
      <p className="text-4xl font-black italic text-white">{value}</p>
    </div>
    <div className="border-t border-white/10 pt-3 mt-2 flex justify-between items-center text-[9px] uppercase font-bold text-white/30">
      <span>VS PP</span>
      <span>{previousPeriodValue}</span>
    </div>
  </motion.div>
);

const ChartBar = ({ label, value, max, color = "bg-accent-orange" }) => {
  const percentage = Math.max(5, (value / max) * 100);

  return (
    <div className="flex flex-col items-center gap-4 flex-1 h-full justify-end">
      <div className="w-full flex justify-center items-end h-[300px]">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`w-3/4 md:w-1/2 ${color} rounded-t-lg shadow-[0_0_20px_rgba(255,126,75,0.2)]`}
        />
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen relative p-6 md:p-12 text-white overflow-x-hidden">
      <div className="pwa-mesh">
        <div className="mesh-orb-1 opacity-20" />
        <div className="mesh-orb-2 opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-accent-orange font-black italic text-lg leading-none">NGR</span>
            </div>
            <h1 className="pwa-title !text-4xl md:!text-6xl text-white/90">Análisis Competencias</h1>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-accent-orange text-[10px] font-black uppercase tracking-widest">Month</span>
              <select className="bg-transparent text-white font-bold outline-none cursor-pointer">
                <option value="1">Enero</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-accent-orange text-[10px] font-black uppercase tracking-widest">Year</span>
              <select className="bg-transparent text-white font-bold outline-none cursor-pointer">
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard title="Tickets totales" value="3" previousPeriodValue="0" />
          <MetricCard title="Locales analizados" value="3" previousPeriodValue="0" />
          <MetricCard title="Cajas que no tienen registro" value="2" previousPeriodValue="0" />
          <MetricCard title="Cajas analizadas" value="0" previousPeriodValue="0" />
        </section>

        <section className="pwa-card p-8 border-white/5 space-y-8">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white/90 border-b-2 border-accent-orange inline-block pb-2">Tickets vendidos por competidor</h2>

          <div className="flex items-end justify-around max-w-2xl mx-auto mt-12 gap-8">
            <ChartBar label="Pizza Hut" value={430000} max={500000} color="bg-accent-orange" />
            <ChartBar label="Burger King" value={100000} max={500000} color="bg-accent-orange/60" />
          </div>
        </section>

        <section className="pwa-card overflow-hidden border-white/5 bg-white/[0.02]">
          <div className="p-6 border-b border-white/10 flex flex-wrap gap-8 justify-around">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-orange">Competidor</span>
              <span className="text-xs font-bold text-white">All</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-orange">Local</span>
              <span className="text-xs font-bold text-white">All</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-orange">Ordenar por</span>
              <span className="text-xs font-bold text-white">Local</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead className="bg-[#5c1313] border-b border-white/10 text-white font-black text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Competidor</th>
                  <th className="px-6 py-4">Local</th>
                  <th className="px-6 py-4">Caja</th>
                  <th className="px-6 py-4">Cajas<br />Registradas</th>
                  <th className="px-6 py-4">Cajas No<br />Registradas</th>
                  <th className="px-6 py-4">Ventas<br />Periodo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/80 font-medium">
                <tr className="bg-accent-orange/20 font-black text-white px-6 py-4">
                  <td className="px-6 py-4 uppercase">Totales</td>
                  <td className="px-6 py-4">3</td>
                  <td className="px-6 py-4">0</td>
                  <td className="px-6 py-4">0</td>
                  <td className="px-6 py-4">3</td>
                  <td className="px-6 py-4 text-accent-lemon">539,203</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-black text-white w-40">PIZZA HUT</td>
                  <td className="px-6 py-4">PHO3 CAMACHO</td>
                  <td className="px-6 py-4">99</td>
                  <td className="px-6 py-4">0</td>
                  <td className="px-6 py-4">1</td>
                  <td className="px-6 py-4 font-bold text-accent-lemon">231,939</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-black text-white w-40">PIZZA HUT</td>
                  <td className="px-6 py-4">CAMACHO</td>
                  <td className="px-6 py-4">99</td>
                  <td className="px-6 py-4">0</td>
                  <td className="px-6 py-4">1</td>
                  <td className="px-6 py-4 font-bold text-accent-lemon">204,086</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
