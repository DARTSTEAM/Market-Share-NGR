const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const csvPath = path.join(__dirname, 'public', 'data.csv');
const jsonPath = path.join(__dirname, 'src', 'data.json');

const content = fs.readFileSync(csvPath, 'utf8');

Papa.parse(content, {
  header: true,
  skipEmptyLines: true,
  complete: function (results) {
    const data = results.data;

    // Calculate metrics
    let totalTickets = data.length;
    let locales = new Set();
    let cajasSinRegistro = 0;
    let cajasAnalizadas = 0;

    let competidorMap = {};
    let localMap = {};
    let timelineMap = {};

    data.forEach(row => {
      let comp = row.competidor || 'Desconocido';
      if (comp.trim() === 'null') comp = 'Desconocido';
      let local = row.local || 'Desconocido';
      if (local.trim() === 'null') local = 'Desconocido';
      const total = parseFloat(row.importe_total) || 0;
      const fecha = row.fecha;

      locales.add(local);

      // Caja
      if (!row.numero_de_caja || row.numero_de_caja.trim() === '' || row.numero_de_caja === 'null') {
        cajasSinRegistro++;
      } else {
        cajasAnalizadas++;
      }

      // Competidor Share (By Tickets)
      competidorMap[comp] = (competidorMap[comp] || 0) + 1;

      // Local
      const key = `${comp} - ${local}`;
      if (!localMap[key]) {
        localMap[key] = {
          competidor: comp,
          local: local,
          cajas: new Set(),
          ticketsReg: 0,
          ticketsNoReg: 0,
          ventas: 0
        };
      }

      if (row.numero_de_caja && row.numero_de_caja !== 'null') {
        localMap[key].cajas.add(row.numero_de_caja);
        localMap[key].ticketsReg++;
      } else {
        localMap[key].ticketsNoReg++;
      }
      localMap[key].ventas += total;

      // Timeline (By Tickets)
      const dateRegex = /^202[4-6]-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (fecha && dateRegex.test(fecha)) {
        // Just valid standard dates
        timelineMap[fecha] = (timelineMap[fecha] || 0) + 1;
      }
    });

    // Formatting Share
    const colorMap = {
      'KFC': '#ef4444',
      'BEMBOS': '#2563eb',
      'PIZZA HUT': '#ff7e4b',
      "MCDONALD'S": '#eab308',
      'BURGER KING': '#e4a861',
      'LITTLE CAESARS': '#ea580c',
      "DOMINO'S": '#3b82f6',
    };

    let shareData = Object.entries(competidorMap).map(([name, val]) => {
      let upper = name.toUpperCase();
      let color = colorMap[upper] || '#' + Math.floor(Math.random() * 16777215).toString(16);
      return {
        name,
        value: val,
        color
      };
    }).sort((a, b) => b.value - a.value);

    // Formatting Timeline
    let sortedDates = Object.keys(timelineMap).sort();
    let trendData = sortedDates.map(date => ({
      name: date.substring(5), // Make it shorter like MM-DD
      tickets: timelineMap[date]
    })).slice(-15); // Last 15 days

    // Formatting Table
    let tableData = Object.values(localMap).map(v => ({
      competidor: v.competidor,
      local: v.local,
      cajasTotal: Math.max(1, v.cajas.size),
      ticketsReg: v.ticketsReg,
      ticketsNoReg: v.ticketsNoReg,
      ventas: Math.round(v.ventas)
    })).sort((a, b) => b.ventas - a.ventas);

    let totalVentas = tableData.reduce((acc, v) => acc + v.ventas, 0);

    // Grouping by Competitor for the aggregate table
    let competitorTableMap = {};
    Object.values(localMap).forEach(v => {
      let comp = v.competidor;
      if (!competitorTableMap[comp]) {
        competitorTableMap[comp] = {
          competidor: comp,
          localesCount: 0,
          cajasTotal: 0,
          ticketsReg: 0,
          ticketsNoReg: 0,
          ventas: 0
        };
      }
      competitorTableMap[comp].localesCount += 1;
      competitorTableMap[comp].cajasTotal += Math.max(1, v.cajas.size);
      competitorTableMap[comp].ticketsReg += v.ticketsReg;
      competitorTableMap[comp].ticketsNoReg += v.ticketsNoReg;
      competitorTableMap[comp].ventas += v.ventas;
    });
    let competitorTableData = Object.values(competitorTableMap).map(v => ({
      ...v,
      ventas: Math.round(v.ventas)
    })).sort((a, b) => b.ventas - a.ventas);

    const output = {
      metrics: {
        totalTickets,
        localesAnalizados: locales.size,
        cajasSinRegistro,
        cajasAnalizadas,
        totalVentas
      },
      shareData,
      trendData,
      tableData,
      competitorTableData
    };

    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
    console.log("data.json generated successfully.");
  }
});
