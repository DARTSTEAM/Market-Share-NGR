import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID || 'hike-agentic-playground';
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'ngr';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const bqOptions = { projectId: PROJECT_ID };
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    bqOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const bigquery = new BigQuery(bqOptions);

// ── In-memory cache ──────────────────────────────────────────────────────────
let cache = {
    data: null,
    fetchedAt: null,
};

// ── Queries ──────────────────────────────────────────────────────────────────
const QUERY_RECORDS = `
  -- Mediciones actuales del pipeline Gemini
  SELECT
    competidor, codigo_tienda, local, caja, status_busqueda,
    transacciones_diferencial, ticket_actual, ticket_anterior,
    fecha_y_hora_registro, fecha_anterior, filename_actual, filename_anterior,
    delta_dias, ac, promedio_transacciones_diarias, mes, ano,
    region, distrito,
    punto_compartido, cc_punto_compartido, grupos_cc, marcas_en_pc, n_marcas_en_pc
  FROM \`${PROJECT_ID}.${DATASET_ID}.calcular_diferencia_tickets_gemini\`('2024-01-01')

  UNION ALL

  -- Datos históricos 2022-2026 (archivo de campo, status = 'HISTORIAL')
  SELECT
    competidor, codigo_tienda, local, caja, status_busqueda,
    transacciones_diferencial, ticket_actual, ticket_anterior,
    fecha_y_hora_registro, fecha_anterior, filename_actual, filename_anterior,
    delta_dias, ac, promedio_transacciones_diarias, mes, ano,
    region, distrito,
    punto_compartido, cc_punto_compartido, grupos_cc, marcas_en_pc, n_marcas_en_pc
  FROM \`${PROJECT_ID}.${DATASET_ID}.procesar_historial_tasas\`()
`;

const QUERY_TICKETS = `
  SELECT
    competidor, codigo_tienda, local, canal_de_venta, importe_total,
    numero_de_ticket, numero_de_caja, fecha, hora,
    recargo_consumo, monto_tarifario, filename, fecha_carga
  FROM \`${PROJECT_ID}.${DATASET_ID}.facturas_v2\`
  ORDER BY fecha DESC, hora DESC
`;

// ── Core fetch from BigQuery ─────────────────────────────────────────────────
async function fetchFromBigQuery() {
    console.log(`[BQ] Fetching records from ${PROJECT_ID}.${DATASET_ID}...`);

    const [[rowsRecords], [rowsTickets]] = await Promise.all([
        bigquery.createQueryJob({ query: QUERY_RECORDS }).then(([job]) => job.getQueryResults()),
        bigquery.createQueryJob({ query: QUERY_TICKETS }).then(([job]) => job.getQueryResults()),
    ]);

    console.log(`[BQ] Fetched ${rowsRecords.length} records + ${rowsTickets.length} tickets.`);

    const records = rowsRecords.map(r => ({
        competidor: r.competidor || 'Desconocido',
        codigo_tienda: r.codigo_tienda || '',
        local: r.local || 'Desconocido',
        caja: r.caja || '',
        status_busqueda: r.status_busqueda || '',
        transacciones_diferencial: r.transacciones_diferencial ?? 0,
        transacciones: r.transacciones_diferencial ?? 0,
        promedio_transacciones_diarias: r.promedio_transacciones_diarias ?? 0,
        promedio: r.promedio_transacciones_diarias ?? 0,
        ticket_actual: r.ticket_actual ?? 0,
        ticket_anterior: r.ticket_anterior ?? 0,
        fecha: r.fecha_y_hora_registro?.value || '',
        fecha_anterior: r.fecha_anterior?.value || '',
        filename_actual: r.filename_actual || '',
        filename_anterior: r.filename_anterior || '',
        delta_dias: r.delta_dias ?? 0,
        ac: r.ac ?? 0,
        mes: r.mes ?? '',
        ano: r.ano ?? '',
        region: r.region || '',
        distrito: r.distrito || '',
        punto_compartido: r.punto_compartido || null,
        cc_punto_compartido: r.cc_punto_compartido || null,
        grupos_cc: r.grupos_cc || null,
        marcas_en_pc: r.marcas_en_pc || null,
        n_marcas_en_pc: r.n_marcas_en_pc ?? null,
    }));

    const tickets = rowsTickets.map(t => ({
        competidor: t.competidor || '',
        codigo_tienda: t.codigo_tienda || '',
        local: t.local || '',
        region: '',
        distrito: '',
        canal_de_venta: t.canal_de_venta || '',
        // Aliases normalizados para el frontend
        ticket: t.numero_de_ticket || '',
        importe: t.importe_total ?? 0,
        // Campos originales también disponibles
        importe_total: t.importe_total ?? 0,
        numero_de_ticket: t.numero_de_ticket || '',
        numero_de_caja: t.numero_de_caja || '',
        caja: t.numero_de_caja || '',
        fecha: t.fecha?.value || t.fecha || '',
        hora: (typeof t.hora === 'object' && t.hora !== null) ? (t.hora.value || '') : (t.hora || ''),
        recargo_consumo: t.recargo_consumo ?? 0,
        monto_tarifario: t.monto_tarifario ?? 0,
        filename: t.filename || '',
        fecha_carga: t.fecha_carga?.value || '',
    }));

    return { records, tickets, fetchedAt: new Date().toISOString() };
}

// ── Helper: get data from cache or fetch ─────────────────────────────────────
async function getCachedData(forceRefresh = false) {
    const isStale = !cache.fetchedAt || (Date.now() - new Date(cache.fetchedAt).getTime()) > CACHE_TTL_MS;
    if (forceRefresh || isStale || !cache.data) {
        cache.data = await fetchFromBigQuery();
        cache.fetchedAt = cache.data.fetchedAt;
    }
    return cache.data;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/data — serve from cache (auto-refresh if stale)
app.get('/api/data', async (req, res) => {
    try {
        const data = await getCachedData();
        res.json(data);
    } catch (err) {
        console.error('[/api/data] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/refresh — force a fresh fetch from BigQuery
app.post('/api/refresh', async (req, res) => {
    try {
        console.log('[/api/refresh] Manual refresh triggered...');
        const data = await getCachedData(true);
        res.json({ success: true, message: 'Data refreshed from BigQuery', fetchedAt: data.fetchedAt, recordCount: data.records.length, ticketCount: data.tickets.length });
    } catch (err) {
        console.error('[/api/refresh] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/update-ticket — BigQuery DML update
app.post('/api/update-ticket', async (req, res) => {
    const { filename, ticket, importe, fecha, caja, local, competidor, codigoTienda } = req.body;

    if (!filename) return res.status(400).json({ error: 'Filename is required' });

    try {
        const query = `
          UPDATE \`${PROJECT_ID}.${DATASET_ID}.facturas_v2\`
          SET
            numero_de_ticket = @ticket,
            importe_total    = @importe,
            fecha            = @fecha,
            numero_de_caja   = @caja,
            local            = @local,
            competidor       = @competidor,
            codigo_tienda    = @codigoTienda
          WHERE filename = @filename
        `;

        const options = {
            query,
            params: {
                ticket: ticket || '',
                importe: parseFloat(importe) || 0,
                fecha: fecha || '',
                caja: caja || '',
                local: local || '',
                competidor: competidor || '',
                codigoTienda: codigoTienda || '',
                filename,
            },
        };

        console.log(`[/api/update-ticket] Updating filename: ${filename}`);
        const [job] = await bigquery.createQueryJob(options);
        await job.getQueryResults();

        // Force cache refresh after update
        const data = await getCachedData(true);
        res.json({ success: true, message: 'Ticket updated and data refreshed', data });
    } catch (err) {
        console.error('[/api/update-ticket] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/health — for Cloud Run health checks
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        project: PROJECT_ID,
        dataset: DATASET_ID,
        cacheAge: cache.fetchedAt ? `${Math.round((Date.now() - new Date(cache.fetchedAt).getTime()) / 1000)}s` : 'not loaded',
        recordCount: cache.data?.records?.length ?? 0,
    });
});

// GET /api/gaps — gap estimation data (separate cache, lazy)
const cacheGaps = { data: null, fetchedAt: null };
const GAPS_TTL_MS = 60 * 60 * 1000; // 1 hour

app.get('/api/gaps', async (req, res) => {
    try {
        const isStale = !cacheGaps.fetchedAt || (Date.now() - new Date(cacheGaps.fetchedAt).getTime()) > GAPS_TTL_MS;
        if (isStale || !cacheGaps.data) {
            console.log('[/api/gaps] Fetching from BigQuery...');
            const QUERY_GAPS = `
                SELECT
                    competidor, local, caja, codigo_tienda,
                    mes, ano, region, distrito,
                    gap_inicio_estimado, gap_fin_estimado,
                    dias_gap, nombre_mes_gap, gap_multiple_meses,
                    fecha_anterior, fecha_actual, delta_dias,
                    transacciones_observadas_total, tasa_diaria_observada,
                    tasa_diaria_usada, transacciones_gap_estimadas,
                    estimacion_baja, estimacion_alta,
                    metodo_estimacion, confianza,
                    n_obs_estacional, n_obs_global
                FROM \`${PROJECT_ID}.${DATASET_ID}.estimar_gap_transacciones\`('2024-01-01')
                ORDER BY transacciones_gap_estimadas DESC
            `;
            const [job] = await bigquery.createQueryJob({ query: QUERY_GAPS });
            const [rows] = await job.getQueryResults();
            cacheGaps.data = rows.map(r => ({
                competidor:                  r.competidor || '',
                local:                       r.local || '',
                caja:                        r.caja || '',
                codigo_tienda:               r.codigo_tienda || '',
                mes:                         r.mes ?? '',
                ano:                         r.ano ?? '',
                region:                      r.region || '',
                distrito:                    r.distrito || '',
                gap_inicio_estimado:         r.gap_inicio_estimado?.value || r.gap_inicio_estimado || '',
                gap_fin_estimado:            r.gap_fin_estimado?.value || r.gap_fin_estimado || '',
                dias_gap:                    r.dias_gap ?? 0,
                nombre_mes_gap:              r.nombre_mes_gap || '',
                gap_multiple_meses:          r.gap_multiple_meses ?? false,
                fecha_anterior:              r.fecha_anterior?.value || r.fecha_anterior || '',
                fecha_actual:                r.fecha_actual?.value || r.fecha_actual || '',
                delta_dias:                  r.delta_dias ?? 0,
                transacciones_observadas:    r.transacciones_observadas_total ?? 0,
                tasa_diaria_observada:       parseFloat(r.tasa_diaria_observada) || 0,
                tasa_diaria_usada:           parseFloat(r.tasa_diaria_usada) || 0,
                transacciones_estimadas:     r.transacciones_gap_estimadas ?? 0,
                estimacion_baja:             r.estimacion_baja ?? 0,
                estimacion_alta:             r.estimacion_alta ?? 0,
                metodo:                      r.metodo_estimacion || '',
                confianza:                   r.confianza || '',
                n_obs_estacional:            r.n_obs_estacional ?? 0,
                n_obs_global:                r.n_obs_global ?? 0,
            }));
            cacheGaps.fetchedAt = new Date().toISOString();
            console.log(`[/api/gaps] Fetched ${cacheGaps.data.length} gaps.`);
        }
        res.json({ gaps: cacheGaps.data, fetchedAt: cacheGaps.fetchedAt });
    } catch (err) {
        console.error('[/api/gaps] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.listen(port, () => {
    console.log(`NGR Proxy server running at http://localhost:${port}`);
    console.log(`  Project: ${PROJECT_ID} | Dataset: ${DATASET_ID}`);
    console.log(`  Cache TTL: ${CACHE_TTL_MS / 1000}s`);
    // Warm up the cache on startup
    getCachedData().catch(err => console.error('[startup] Cache warm-up failed:', err.message));
});
