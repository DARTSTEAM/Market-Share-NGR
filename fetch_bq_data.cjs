require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

async function fetchBigQueryData() {
  const bqOptions = {
    projectId: process.env.BIGQUERY_PROJECT_ID,
  };
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    bqOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const bigquery = new BigQuery(bqOptions);

  const queryRecords = `
    -- Registros de rutina Gemini (status = OK / ERROR / etc.)
    SELECT
      competidor,
      codigo_tienda,
      local,
      caja,
      status_busqueda,
      transacciones_diferencial,
      ticket_actual,
      ticket_anterior,
      fecha_y_hora_registro,
      fecha_anterior,
      filename_actual,
      filename_anterior,
      delta_dias,
      ac,
      promedio_transacciones_diarias,
      CAST(mes AS STRING) AS mes,
      CAST(ano AS STRING) AS ano
    FROM \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET_ID}.calcular_diferencia_tickets_gemini\`('2024-01-01')

    UNION ALL

    -- Registros históricos de cajas (2022-2026)
    SELECT
      UPPER(competidor)                    AS competidor,
      codigo_tienda,
      UPPER(local)                         AS local,
      caja,
      'HISTORIAL'                          AS status_busqueda,
      trx_promedio                         AS transacciones_diferencial,
      0                                    AS ticket_actual,
      0                                    AS ticket_anterior,
      DATE(ano, mes, 1)                    AS fecha_y_hora_registro,
      NULL                                 AS fecha_anterior,
      ''                                   AS filename_actual,
      ''                                   AS filename_anterior,
      0                                    AS delta_dias,
      0                                    AS ac,
      trx_promedio                         AS promedio_transacciones_diarias,
      CAST(mes AS STRING)                  AS mes,
      CAST(ano AS STRING)                  AS ano
    FROM \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET_ID}.historial_tasas\`
  `;

  const queryTickets = `
    SELECT
      competidor,
      codigo_tienda,
      local,
      canal_de_venta,
      importe_total,
      numero_de_ticket,
      numero_de_caja,
      fecha,
      hora,
      filename,
      fecha_carga
    FROM \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET_ID}.facturas_v2\`
    ORDER BY fecha DESC, hora DESC
    LIMIT 1000
  `;

  console.log('Fetching routine records from BigQuery...');
  const [jobRecords] = await bigquery.createQueryJob({ query: queryRecords });
  const [rowsRecords] = await jobRecords.getQueryResults();
  console.log(`Fetched ${rowsRecords.length} records.`);

  console.log('Fetching raw tickets from BigQuery...');
  const [jobTickets] = await bigquery.createQueryJob({ query: queryTickets });
  const [rowsTickets] = await jobTickets.getQueryResults();
  console.log(`Fetched ${rowsTickets.length} tickets.`);

  // 1. Process Records CSV
  const csvRecordsData = rowsRecords.map(row => ({
    competidor: row.competidor || 'Desconocido',
    codigo_tienda: row.codigo_tienda || '',
    local: row.local || 'Desconocido',
    numero_de_caja: row.caja || '',
    status_busqueda: row.status_busqueda || '',
    transacciones_diferencial: row.transacciones_diferencial || 0,
    ticket_actual: row.ticket_actual || 0,
    ticket_anterior: row.ticket_anterior || 0,
    fecha: row.fecha_y_hora_registro ? row.fecha_y_hora_registro.value : '',
    fecha_anterior: row.fecha_anterior ? row.fecha_anterior.value : '',
    filename_actual: row.filename_actual || '',
    filename_anterior: row.filename_anterior || '',
    delta_dias: row.delta_dias || 0,
    ac: row.ac || 0,
    promedio_transacciones_diarias: row.promedio_transacciones_diarias || 0,
    mes: row.mes || '',
    ano: row.ano || ''
  }));

  const headerRecords = ['competidor', 'codigo_tienda', 'local', 'numero_de_caja', 'status_busqueda', 'transacciones_diferencial', 'ticket_actual', 'ticket_anterior', 'fecha', 'fecha_anterior', 'filename_actual', 'filename_anterior', 'delta_dias', 'ac', 'promedio_transacciones_diarias', 'mes', 'ano'];
  const csvRecordsContent = [
    headerRecords.join(','),
    ...csvRecordsData.map(row => headerRecords.map(fieldName => JSON.stringify(row[fieldName])).join(','))
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, 'public', 'data.csv'), csvRecordsContent);
  console.log(`Saved ${csvRecordsData.length} records to public/data.csv`);

  // 2. Process Tickets CSV
  const csvTicketsData = rowsTickets.map(row => ({
    competidor: row.competidor || '',
    codigo_tienda: row.codigo_tienda || '',
    local: row.local || '',
    canal_de_venta: row.canal_de_venta || '',
    importe_total: row.importe_total || 0,
    numero_de_ticket: row.numero_de_ticket || '',
    numero_de_caja: row.numero_de_caja || '',
    fecha: row.fecha ? row.fecha.value : '',
    hora: row.hora || '',
    filename: row.filename || '',
    fecha_carga: row.fecha_carga ? row.fecha_carga.value : ''
  }));

  const headerTickets = ['competidor', 'codigo_tienda', 'local', 'canal_de_venta', 'importe_total', 'numero_de_ticket', 'numero_de_caja', 'fecha', 'hora', 'filename', 'fecha_carga'];
  const csvTicketsContent = [
    headerTickets.join(','),
    ...csvTicketsData.map(row => headerTickets.map(fieldName => JSON.stringify(row[fieldName])).join(','))
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, 'public', 'tickets.csv'), csvTicketsContent);
  console.log(`Saved ${csvTicketsData.length} tickets to public/tickets.csv`);
}

fetchBigQueryData().catch(console.error);
