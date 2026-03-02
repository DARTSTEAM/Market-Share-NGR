import re

content_1 = """1: import React, { useState, useEffect } from 'react';
2: import { motion, AnimatePresence } from 'framer-motion';
3: import { Moon, Sun, TrendingUp, BarChart2, ShieldAlert, Award, PieChart as PieChartIcon, Activity } from 'lucide-react';
4: import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
5: 
6: const CustomSelect = ({ label, options, selected, onChange, borderRight, alignRight = false, width = "w-24" }) => {
7:   const [isOpen, setIsOpen] = useState(false);
8: 
9:   return (
10:     <div
11:       className={`flex flex-col gap-1 ${width} relative outline-none ${borderRight ? 'border-r border-slate-300 dark:border-white/10 pr-6 mr-2' : ''} ${alignRight ? 'items-end' : ''}`}
12:       tabIndex={0}
13:       onBlur={(e) => {
14:         if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
15:       }}
16:     >
17:       <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${alignRight ? 'text-slate-500 dark:text-white/40' : 'text-accent-orange opacity-80'}`}>{label}</span>
18:       <div
19:         className={`flex items-center justify-between text-slate-800 dark:text-white text-sm font-black cursor-pointer hover:text-accent-orange transition-colors ${alignRight ? 'bg-white dark:bg-white/5 px-3 py-1 rounded-md border border-slate-300 dark:border-white/10 shadow-sm dark:shadow-none' : ''}`}
20:         onClick={() => setIsOpen(!isOpen)}
21:       >
22:         <span>{options.find(o => o.value === selected)?.label || 'Select'}</span>
23:         <span className={`text-[8px] ml-2 transition-transform duration-300 opacity-50 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
24:       </div>
25: 
26:       <AnimatePresence>
27:         {isOpen && (
28:           <motion.div
29:             initial={{ opacity: 0, scale: 0.95, y: 10 }}
30:             animate={{ opacity: 1, scale: 1, y: 0 }}
31:             exit={{ opacity: 0, scale: 0.95, y: 10 }}
32:             transition={{ duration: 0.15 }}
33:             className="absolute top-full left-0 mt-4 w-full min-w-[140px] bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-[100] p-1.5"
34:           >
35:             {options.map((option) => (
36:               <div
37:                 key={option.value}
38:                 className={`px-3 py-2 text-sm font-bold cursor-pointer transition-all rounded-xl flex items-center justify-between mb-0.5 last:mb-0 ${selected === option.value
39:                   ? 'bg-accent-orange text-white shadow-md'
40:                   : 'text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
41:                   }`}
42:                 onClick={() => {
43:                   onChange(option.value);
44:                   setIsOpen(false);
45:                 }}
46:               >
47:                 {option.label}
48:                 {selected === option.value && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
49:               </div>
50:             ))}
51:           </motion.div>
52:         )}
53:       </AnimatePresence>
54:     </div>
55:   );
56: };
57: 
58: const trendData = [
59:   { name: 'Jan 1', tickets: 4000 },
60:   { name: 'Jan 7', tickets: 3000 },
61:   { name: 'Jan 14', tickets: 2000 },
62:   { name: 'Jan 21', tickets: 2780 },
63:   { name: 'Jan 28', tickets: 1890 },
64:   { name: 'Feb 4', tickets: 2390 },
65:   { name: 'Feb 11', tickets: 3490 },
66: ];
67: 
68: const shareData = [
69:   { name: 'KFC', value: 850, color: '#ef4444' },
70:   { name: 'Bembos', value: 450, color: '#2563eb' },
71:   { name: 'Pizza Hut', value: 410, color: '#ff7e4b' },
72:   { name: "McD's", value: 380, color: '#eab308' },
73:   { name: 'Burger King', value: 320, color: '#e4a861' },
74:   { name: 'Popeyes', value: 210, color: '#ea580c' },
75: ];
76: 
77: const MetricCard = ({ title, value, previousPeriodValue = 0, delay = 0, icon: Icon }) => (
78:   <motion.div
79:     initial={{ opacity: 0, y: 20 }}
80:     animate={{ opacity: 1, y: 0 }}
81:     transition={{ delay, duration: 0.6, ease: "easeOut" }}
82:     whileHover={{ y: -4, scale: 1.02 }}
83:     className="pwa-card p-6 flex flex-col gap-4 relative overflow-hidden group"
84:   >
85:     <div className="absolute -inset-x-full top-0 h-[2px] bg-gradient-to-r from-transparent via-accent-orange/50 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
86:     <div className="flex justify-between items-start">
87:       <p className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest leading-tight">{title}</p>
88:       {Icon && <Icon size={14} className="text-accent-orange opacity-80" />}
89:     </div>
90:     <div className="flex flex-col items-center justify-center relative z-10 py-2">
91:       <motion.p
92:         initial={{ scale: 0.8 }}
93:         animate={{ scale: 1 }}
94:         transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
95:         className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-white/60 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] pb-2 pr-2 leading-tight"
96:       >
97:         {value}
98:       </motion.p>
99:     </div>
100:     <div className="border-t border-slate-300 dark:border-white/10 pt-3 mt-auto flex justify-between items-center text-[9px] uppercase font-bold text-slate-500 dark:text-white/30">
101:       <span>VS PP</span>
102:       <span className={previousPeriodValue > 0 ? "text-accent-lemon drop-shadow-sm" : ""}>{previousPeriodValue}</span>
103:     </div>
104:   </motion.div>
105: );
106: 
107: const ChartBar = ({ label, value, max, color = "bg-accent-orange", delay = 0 }) => {
108:   const percentage = Math.max(5, (value / max) * 100);
109: 
110:   return (
111:     <div className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer relative">
112:       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
113:         <div className="px-3 py-1.5 bg-white dark:bg-black/80 backdrop-blur-md rounded border border-slate-200 dark:border-white/10 text-xs font-black uppercase whitespace-nowrap shadow-xl text-slate-900 dark:text-white">
114:           {new Intl.NumberFormat('en-US').format(value)} Tickets
115:         </div>
116:       </div>
117:       <div className="w-full flex justify-center items-end flex-1 min-h-[150px] relative">
118:         <motion.div
119:           initial={{ height: 0 }}
120:           animate={{ height: `${percentage}%` }}
121:           transition={{ duration: 1.2, delay, type: "spring", stiffness: 50, damping: 15 }}
122:           className={`w-[80%] max-w-[40px] ${color} rounded-t-lg shadow-lg dark:shadow-[0_0_30px_rgba(255,126,75,0.1)] group-hover:brightness-110 dark:group-hover:brightness-125 transition-all relative overflow-hidden`}
123:         >
124:           <div className="absolute inset-0 bg-gradient-to-b from-white/30 dark:from-white/20 to-transparent" />
125:         </motion.div>
126:       </div>
127:       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center">{label}</span>
128:     </div>
129:   );
130: };
131: 
132: export default function App() {
133:   const [isLoaded, setIsLoaded] = useState(false);
134:   const [theme, setTheme] = useState('dark');
135:   const [period, setPeriod] = useState("1");
136:   const [year, setYear] = useState("2026");
137: 
138:   // Table Filters State
139:   const [competitorFilter, setCompetitorFilter] = useState("all");
140:   const [localFilter, setLocalFilter] = useState("all");
141:   const [sortBy, setSortBy] = useState("ventas");
142: 
143:   useEffect(() => {
144:     setIsLoaded(true);
145:     // Verificar si hay tema guardado o preferencia de sistema
146:     const savedTheme = localStorage.getItem('theme');
147:     const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
148: 
149:     if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
150:       setTheme('dark');
151:       document.documentElement.classList.add('dark');
152:     } else {
153:       setTheme('light');
154:       document.documentElement.classList.remove('dark');
155:     }
156:   }, []);
157: 
158:   const toggleTheme = () => {
159:     if (theme === 'dark') {
160:       document.documentElement.classList.remove('dark');
161:       localStorage.setItem('theme', 'light');
162:       setTheme('light');
163:     } else {
164:       document.documentElement.classList.add('dark');
165:       localStorage.setItem('theme', 'dark');
166:       setTheme('dark');
167:     }
168:   };
169: 
170:   return (
171:     <div className="min-h-screen relative p-6 md:p-12 text-slate-900 dark:text-white overflow-x-hidden selection:bg-accent-orange/30">
172:       <div className="pwa-mesh">
173:         <div className="mesh-orb-1 mix-blend-multiply dark:mix-blend-screen" />
174:         <div className="mesh-orb-2 mix-blend-multiply dark:mix-blend-screen" />
175:       </div>
176: 
177:       <div className="max-w-7xl mx-auto space-y-12 relative z-10">
178:         <motion.header
179:           initial={{ opacity: 0, y: -20 }}
180:           animate={{ opacity: 1, y: 0 }}
181:           transition={{ duration: 0.8 }}
182:           className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-300 dark:border-white/10 pb-6 relative"
183:         >
184:           <div className="flex items-center gap-6">
185:             <motion.div
186:               whileHover={{ rotate: 180, scale: 1.1 }}
187:               transition={{ duration: 0.4 }}
188:               className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-lg dark:shadow-[0_0_30px_rgba(255,126,75,0.15)] relative group cursor-pointer"
189:             >
190:               <div className="absolute inset-0 bg-accent-orange/10 dark:bg-accent-orange/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
191:               <img src="/favicon.png" alt="NGR Logo" className="w-10 h-10 object-contain relative z-10 dark:brightness-110" />
192:             </motion.div>
193:             <div className="flex flex-col">
194:               <span className="text-[10px] text-accent-orange font-black uppercase tracking-[0.3em] mb-1">NGR Intelligence Suite</span>
195:               <h1 className="pwa-title !text-5xl md:!text-6xl text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-white/70">
196:                 Market Share
197:               </h1>
198:             </div>
199:           </div>
200:           <div className="flex gap-4 items-center">"""

content_2 = """201:             {/* Theme Toggle */}
202:             <button
203:               onClick={toggleTheme}
204:               className="p-3 bg-white/50 dark:bg-white/[0.02] rounded-2xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm hover:scale-105 transition-all text-slate-600 dark:text-white/80 hover:text-accent-orange dark:hover:text-accent-lemon"
205:               aria-label="Toggle Theme"
206:             >
207:               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
208:             </button>
209: 
210:             <div className="flex gap-4 bg-white/50 dark:bg-white/[0.02] p-4 rounded-3xl border border-slate-300 dark:border-white/5 backdrop-blur-md shadow-sm">
211:               <CustomSelect
212:                 label="Periodo"
213:                 options={[{ value: "1", label: "Enero" }, { value: "2", label: "Febrero" }]}
214:                 selected={period}
215:                 onChange={setPeriod}
216:                 borderRight
217:               />
218:               <CustomSelect
219:                 label="Year"
220:                 options={[{ value: "2026", label: "2026" }]}
221:                 selected={year}
222:                 onChange={setYear}
223:               />
224:             </div>
225:           </div>
226:         </motion.header>
227: 
228:         {isLoaded && (
229:           <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
230:             <MetricCard title="Tickets totales" value="1.45M" previousPeriodValue="+12%" delay={0.1} icon={TrendingUp} />
231:             <MetricCard title="Locales analizados" value="142" previousPeriodValue="+5" delay={0.2} icon={Award} />
232:             <MetricCard title="Cajas sin registro" value="18" previousPeriodValue="-3" delay={0.3} icon={ShieldAlert} />
233:             <MetricCard title="Cajas analizadas" value="426" previousPeriodValue="+15" delay={0.4} icon={BarChart2} />
234:           </section>
235:         )}
236: 
237:         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
238:           <motion.section
239:             initial={{ opacity: 0, x: -20 }}
240:             animate={{ opacity: 1, x: 0 }}
241:             transition={{ delay: 0.5, duration: 0.8 }}
242:             className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 flex flex-col shadow-xl"
243:           >
244:             <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
245:               <h2 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Market Split</h2>
246:               <div className="flex gap-2 items-center px-3 py-1 rounded-full bg-accent-orange/10 dark:bg-accent-orange/20 border border-accent-orange/30">
247:                 <div className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse shadow-[0_0_8px_rgba(255,94,0,0.8)]" />
248:                 <span className="text-[8px] font-black uppercase tracking-widest text-accent-orange">Live</span>
249:               </div>
250:             </div>
251: 
252:             <div className="flex items-end justify-around w-full flex-1 mt-6 gap-2 relative h-[250px]">
253:               <div className="absolute top-[30%] w-full border-t border-dashed border-slate-300 dark:border-white/10 z-0">
254:                 <span className="absolute -top-3 left-0 text-[8px] font-black text-slate-400 dark:text-white/20">500K</span>
255:               </div>
256:               <ChartBar label="KFC" value={850000} max={900000} color="bg-red-500" delay={0.5} />
257:               <ChartBar label="Bembos" value={450000} max={900000} color="bg-blue-600" delay={0.6} />
258:               <ChartBar label="PZ Hut" value={410000} max={900000} color="bg-accent-orange" delay={0.7} />
259:               <ChartBar label="McD's" value={380000} max={900000} color="bg-yellow-500" delay={0.8} />
260:               <ChartBar label="BK" value={320000} max={900000} color="bg-[#e4a861]" delay={0.9} />
261:               <ChartBar label="Popeyes" value={210000} max={900000} color="bg-orange-600" delay={1.0} />
262:             </div>
263:           </motion.section>
264: 
265:           <motion.section
266:             initial={{ opacity: 0, y: 20 }}
267:             animate={{ opacity: 1, y: 0 }}
268:             transition={{ delay: 0.6, duration: 0.8 }}
269:             className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl flex flex-col"
270:           >
271:             <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
272:               <div className="flex items-center gap-2">
273:                 <Activity size={16} className="text-accent-blue" />
274:                 <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Tickets Timeline</h3>
275:               </div>
276:             </div>
277:             <div className="flex-1 w-full -ml-4 mt-6 h-[250px]">
278:               <ResponsiveContainer width="100%" height="100%">
279:                 <AreaChart data={trendData}>
280:                   <defs>
281:                     <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
282:                       <stop offset="5%" stopColor="#0070f3" stopOpacity={0.8} />
283:                       <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
284:                     </linearGradient>
285:                   </defs>
286:                   <XAxis dataKey="name" stroke={theme === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"} fontSize={10} tick={{ fill: theme === 'dark' ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }} />
287:                   <Tooltip
288:                     contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
289:                     itemStyle={{ color: '#0070f3' }}
290:                   />
291:                   <Area type="monotone" dataKey="tickets" stroke="#0070f3" fillOpacity={1} fill="url(#colorTickets)" />
292:                 </AreaChart>
293:               </ResponsiveContainer>
294:             </div>
295:           </motion.section>
296: 
297:           <motion.section
298:             initial={{ opacity: 0, x: 20 }}
299:             animate={{ opacity: 1, x: 0 }}
300:             transition={{ delay: 0.7, duration: 0.8 }}
301:             className="lg:col-span-4 pwa-card p-6 border-slate-300 dark:border-white/5 shadow-xl flex flex-col"
302:           >
303:             <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/10 pb-4">
304:               <div className="flex items-center gap-2">
305:                 <PieChartIcon size={16} className="text-accent-orange" />
306:                 <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-900 dark:text-white/90">Share Overview</h3>
307:               </div>
308:             </div>
309:             <div className="flex-1 w-full flex items-center justify-center mt-6 h-[250px]">
310:               <ResponsiveContainer width="100%" height="100%">
311:                 <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
312:                   <Pie
313:                     data={shareData}
314:                     cx="50%"
315:                     cy="50%"
316:                     innerRadius="50%"
317:                     outerRadius="75%"
318:                     paddingAngle={3}
319:                     dataKey="value"
320:                     stroke="none"
321:                   >
322:                     {shareData.map((entry, index) => (
323:                       <Cell key={`cell-${index}`} fill={entry.color} />
324:                     ))}
325:                   </Pie>
326:                   <Tooltip
327:                     contentStyle={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'bold' }}
328:                     itemStyle={{ color: theme === 'dark' ? '#fff' : '#1e293b' }}
329:                   />
330:                 </PieChart>
331:               </ResponsiveContainer>
332:             </div>
333:           </motion.section>
334: 
335:           <motion.section
336:             initial={{ opacity: 0, y: 20 }}
337:             animate={{ opacity: 1, y: 0 }}
338:             transition={{ delay: 0.7, duration: 0.8 }}
339:             className="lg:col-span-12 pwa-card border-slate-300 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] flex flex-col overflow-hidden shadow-xl"
340:           >
341:             <div className="p-6 border-b border-slate-300 dark:border-white/10 flex flex-wrap gap-4 justify-end bg-gradient-to-r from-transparent to-black/[0.02] dark:to-white/[0.01]">
342:               <CustomSelect
343:                 label="Competidor"
344:                 options={[
345:                   { value: "all", label: "All" },
346:                   { value: "kfc", label: "KFC" },
347:                   { value: "bembos", label: "Bembos" },
348:                   { value: "pizza_hut", label: "Pizza Hut" },
349:                 ]}
350:                 selected={competitorFilter}
351:                 onChange={setCompetitorFilter}
352:                 alignRight
353:                 width="w-32"
354:               />
355:               <CustomSelect
356:                 label="Local"
357:                 options={[
358:                   { value: "all", label: "All" },
359:                   { value: "jockey", label: "Jockey Plaza" },
360:                   { value: "camacho", label: "Camacho" },
361:                 ]}
362:                 selected={localFilter}
363:                 onChange={setLocalFilter}
364:                 alignRight
365:                 width="w-32"
366:               />
367:               <CustomSelect
368:                 label="Ordenar por"
369:                 options={[
370:                   { value: "ventas", label: "Ventas" },
371:                   { value: "local", label: "Local" },
372:                   { value: "competidor", label: "Competidor" },
373:                 ]}
374:                 selected={sortBy}
375:                 onChange={setSortBy}
376:                 alignRight
377:                 width="w-32"
378:               />
379:             </div>
380: 
381:             <div className="overflow-x-auto flex-1 custom-scrollbar">
382:               <table className="w-full text-left whitespace-nowrap">
383:                 <thead className="bg-[#f0f3f8] dark:bg-white/5 border-b border-slate-300 dark:border-white/10 text-slate-500 dark:text-white/50 font-black text-[9px] uppercase tracking-[0.2em]">
384:                   <tr>
385:                     <th className="px-6 py-5 rounded-tl-xl text-center">Competidor</th>
386:                     <th className="px-6 py-5">Local</th>
387:                     <th className="px-6 py-5 text-right">Caja</th>
388:                     <th className="px-6 py-5 text-right">Reg.</th>
389:                     <th className="px-6 py-5 text-right">No Reg.</th>
390:                     <th className="px-6 py-5 text-right rounded-tr-xl text-accent-orange drop-shadow-sm dark:drop-shadow-[0_0_8px_rgba(255,126,75,0.4)]">Ventas Periodo</th>
391:                   </tr>
392:                 </thead>
393:                 <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs text-slate-700 dark:text-white/80 font-medium">
394:                   <motion.tr
395:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
396:                     className="bg-gradient-to-r from-accent-orange/10 dark:from-accent-orange/20 to-transparent font-black text-slate-900 dark:text-white group"
397:                   >
398:                     <td className="px-6 py-5 text-accent-orange tracking-widest uppercase text-[10px] text-center">Totales</td>
399:                     <td className="px-6 py-5 text-lg opacity-80 italic">142</td>
400:                     <td className="px-6 py-5 text-right opacity-50">426</td>"""

content_3 = """401:                     <td className="px-6 py-5 text-right opacity-50">408</td>
402:                     <td className="px-6 py-5 text-right text-red-600 dark:text-accent-lemon drop-shadow-sm">18</td>
403:                     <td className="px-6 py-5 text-right text-xl text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] italic">S/ 48,290,120</td>
404:                   </motion.tr>
405:                   <motion.tr
406:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}
407:                     className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
408:                   >
409:                     <td className="px-6 py-5 text-center">
410:                       <span className="font-black text-[10px] tracking-widest text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 inline-block w-24">KFC</span>
411:                     </td>
412:                     <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px]">Jockey Plaza FC</td>
413:                     <td className="px-6 py-5 text-right opacity-50 font-mono">6</td>
414:                     <td className="px-6 py-5 text-right font-mono">6</td>
415:                     <td className="px-6 py-5 text-right font-mono text-white/20">0</td>
416:                     <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ 1,420,500</td>
417:                   </motion.tr>
418:                   <motion.tr
419:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}
420:                     className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
421:                   >
422:                     <td className="px-6 py-5 text-center">
423:                       <span className="font-black text-[10px] tracking-widest text-[#ff3300] bg-[#ff3300]/10 px-3 py-1.5 rounded-full border border-[#ff3300]/20 inline-block w-24">PIZZA HUT</span>
424:                     </td>
425:                     <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px]">PHO3 CAMACHO</td>
426:                     <td className="px-6 py-5 text-right opacity-50 font-mono">4</td>
427:                     <td className="px-6 py-5 text-right font-mono">3</td>
428:                     <td className="px-6 py-5 text-right font-mono text-red-500 dark:text-accent-pink font-bold">1</td>
429:                     <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ 231,939</td>
430:                   </motion.tr>
431:                   <motion.tr
432:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}
433:                     className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
434:                   >
435:                     <td className="px-6 py-5 text-center">
436:                       <span className="font-black text-[10px] tracking-widest text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 inline-block w-24">BEMBOS</span>
437:                     </td>
438:                     <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px]">Real Plaza Salaverry</td>
439:                     <td className="px-6 py-5 text-right opacity-50 font-mono">5</td>
440:                     <td className="px-6 py-5 text-right font-mono">4</td>
441:                     <td className="px-6 py-5 text-right font-mono text-red-500 dark:text-accent-pink font-bold">1</td>
442:                     <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ 580,240</td>
443:                   </motion.tr>
444:                   <motion.tr
445:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
446:                     className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
447:                   >
448:                     <td className="px-6 py-5 text-center">
449:                       <span className="font-black text-[10px] tracking-widest text-[#e4a861] bg-[#e4a861]/10 px-3 py-1.5 rounded-full border border-[#e4a861]/20 inline-block w-24">BURGER KING</span>
450:                     </td>
451:                     <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px]">Larcomar</td>
452:                     <td className="px-6 py-5 text-right opacity-50 font-mono">3</td>
453:                     <td className="px-6 py-5 text-right font-mono">3</td>
454:                     <td className="px-6 py-5 text-right font-mono text-white/20">0</td>
455:                     <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ 310,400</td>
456:                   </motion.tr>
457:                   <motion.tr
458:                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}
459:                     className="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
460:                   >
461:                     <td className="px-6 py-5 text-center">
462:                       <span className="font-black text-[10px] tracking-widest text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-full border border-orange-500/20 inline-block w-24">POPEYES</span>
463:                     </td>
464:                     <td className="px-6 py-5 text-slate-600 dark:text-white/60 font-bold uppercase text-[10px]">Plaza Norte</td>
465:                     <td className="px-6 py-5 text-right opacity-50 font-mono">4</td>
466:                     <td className="px-6 py-5 text-right font-mono">2</td>
467:                     <td className="px-6 py-5 text-right font-mono text-red-500 dark:text-accent-pink font-bold">2</td>
468:                     <td className="px-6 py-5 text-right font-black text-accent-orange/90 font-mono text-sm">S/ 295,120</td>
469:                   </motion.tr>
470:                 </tbody>
471:               </table>
472:             </div>
473:           </motion.section>
474:         </div>
475:       </div>
476:     </div>
477:   );
478: }
479: """

full_content = content_1 + "\n" + content_2 + "\n" + content_3

# Remove prefix "<number>: "
cleaned = re.sub(r'^\d+:\s', '', full_content, flags=re.MULTILINE)

with open('src/App.jsx', 'w') as f:
    f.write(cleaned)
