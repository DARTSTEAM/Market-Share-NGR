export const COMPETITORS = [
  { id: 'mcdonalds', name: "McDonald's", category: 'Hamburguesas', color: '#FFBC0D' },
  { id: 'bk', name: 'Burger King', category: 'Hamburguesas', color: '#F5EBDC' },
  { id: 'bembos', name: 'Bembos', category: 'Hamburguesas', color: '#00529B' },
  { id: 'pizzahut', name: 'Pizza Hut', category: 'Pizzas', color: '#EE3124' },
  { id: 'littlecae', name: 'Little Caesars', category: 'Pizzas', color: '#FF6600' },
  { id: 'dominos', name: "Domino's", category: 'Pizzas', color: '#006491' },
  { id: 'papajohns', name: 'Papa Johns', category: 'Pizzas', color: '#007837' },
  { id: 'kfc', name: 'KFC', category: 'Pollo', color: '#E4002B' },
  { id: 'popeyes', name: 'Popeyes', category: 'Pollo', color: '#FF7900' },
];

export const CATEGORIES = ['Hamburguesas', 'Pizzas', 'Pollo'];
export const CHANNELS = ['Delivery', 'Drive-Thru', 'Salón'];

export const generateMockData = () => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // KPI Data
  const kpis = {
    ventasTotales: 1254380,
    promedioDiario: 41812,
    crecimiento: 12.5,
  };

  // Monthly Evolution
  const evolution = months.map(month => {
    const dataPoint = { month };
    COMPETITORS.forEach(comp => {
      dataPoint[comp.id] = Math.floor(Math.random() * 50000) + 20000;
    });
    return dataPoint;
  });

  // Mix by Channel
  const channelMix = COMPETITORS.map(comp => ({
    name: comp.name,
    Delivery: Math.floor(Math.random() * 40) + 20,
    'Drive-Thru': Math.floor(Math.random() * 30) + 10,
    'Salón': 0, // Calculated later to sum to 100
  })).map(comp => {
    comp['Salón'] = 100 - comp.Delivery - comp['Drive-Thru'];
    return comp;
  });

  // Ticket Split — values sum to 2400
  const ticketAlloc = [720, 480, 432, 312, 240, 216, 0, 0, 0]; // 9 competitors, last 3 = 0 (clipped at top-6)
  const marketShare = COMPETITORS.map((comp, i) => ({
    name: comp.name,
    value: ticketAlloc[i] ?? 0,
    color: comp.color,
  }));


  // Audit Table Data
  const tableData = [];
  COMPETITORS.forEach(comp => {
    for (let i = 1; i <= 3; i++) {
      const totalTrans = Math.floor(Math.random() * 5000) + 1000;
      tableData.push({
        id: `${comp.id}-loc-${i}`,
        competidor: comp.name,
        local: `${comp.name} - Sede ${i}`,
        caja: `Caja ${Math.floor(Math.random() * 5) + 1}`,
        canal: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
        transacciones: totalTrans,
        promDiario: Math.floor(totalTrans / 30),
        ac: Math.floor(Math.random() * 3) - 1, // -1, 0, 1
        historial: [
          '2026-03-02 14:20',
          '2026-03-02 12:15',
          '2026-03-01 19:45'
        ]
      });
    }
  });

  return { kpis, evolution, channelMix, marketShare, tableData };
};
