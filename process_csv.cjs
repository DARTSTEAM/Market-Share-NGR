const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const csvPath = path.join(__dirname, 'public', 'data.csv');
const ticketsCsvPath = path.join(__dirname, 'public', 'tickets.csv');
const jsonPath = path.join(__dirname, 'src', 'data.json');

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data)
    });
  });
}

async function processData() {
  const recordsRaw = await parseCSV(csvPath);
  const ticketsRaw = await parseCSV(ticketsCsvPath);

  const records = recordsRaw
    .map(row => ({
      competidor: (row.competidor || 'Desconocido').toUpperCase(),
      codigo_tienda: row.codigo_tienda || '',
      local: (row.local || 'Desconocido').toUpperCase(),
      caja: row.numero_de_caja,
      status_busqueda: row.status_busqueda,
      transacciones: parseFloat(row.transacciones_diferencial) || 0,
      ticket_actual: row.ticket_actual,
      ticket_anterior: row.ticket_anterior,
      fecha: row.fecha,
      fecha_anterior: row.fecha_anterior,
      filename_actual: row.filename_actual || '',
      filename_anterior: row.filename_anterior || '',
      delta_dias: parseInt(row.delta_dias) || 0,
      ac: parseInt(row.ac) || 0,
      promedio: parseFloat(row.promedio_transacciones_diarias) || 0,
      mes: row.mes || '',
      ano: row.ano || '',
      region: row.region || '',
      distrito: row.distrito || '',
      zona: row.zona || ''
    }));

  const tickets = ticketsRaw.map(row => ({
    competidor: (row.competidor || '').toUpperCase(),
    codigo_tienda: row.codigo_tienda || '',
    local: (row.local || '').toUpperCase(),
    canal: row.canal_de_venta || '',
    importe: parseFloat(row.importe_total) || 0,
    ticket: row.numero_de_ticket || '',
    caja: row.numero_de_caja || '',
    fecha: row.fecha || '',
    hora: row.hora || '',
    filename: row.filename || '',
    fecha_carga: row.fecha_carga || '',
    region: row.region || '',
    distrito: row.distrito || '',
    zona: row.zona || ''
  }));

  fs.writeFileSync(jsonPath, JSON.stringify({ records, tickets }, null, 2));
  console.log(`data.json generated with ${records.length} records and ${tickets.length} tickets.`);
}

processData().catch(console.error);
