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

  -- Gaps estimados: meses sin medición estimados por generar_estimaciones_mensuales
  SELECT
    competidor,
    codigo_tienda,
    local,
    CAST(NULL AS STRING)                     AS caja,
    CONCAT('ESTIMADO-', metodo_estimacion)   AS status_busqueda,
    trx_totales_estimadas                    AS transacciones_diferencial,
    CAST(NULL AS INT64)                      AS ticket_actual,
    CAST(NULL AS INT64)                      AS ticket_anterior,
    DATETIME(fecha_estimacion)               AS fecha_y_hora_registro,
    CAST(fecha_anterior AS DATETIME)         AS fecha_anterior,
    CAST(NULL AS STRING)                     AS filename_actual,
    CAST(NULL AS STRING)                     AS filename_anterior,
    delta_dias,
    CAST(NULL AS INT64)                      AS ac,
    trx_diarias_estimadas                    AS promedio_transacciones_diarias,
    mes,
    ano,
    CAST(NULL AS STRING)                     AS region,
    CAST(NULL AS STRING)                     AS distrito,
    CAST(NULL AS STRING)                     AS punto_compartido,
    CAST(NULL AS STRING)                     AS cc_punto_compartido,
    CAST(NULL AS STRING)                     AS grupos_cc,
    CAST(NULL AS STRING)                     AS marcas_en_pc,
    CAST(NULL AS INT64)                      AS n_marcas_en_pc
  FROM \`${PROJECT_ID}.${DATASET_ID}.generar_estimaciones_mensuales\`('2024-01-01')
  WHERE metodo_estimacion != 'INSUFICIENTE_DATA'

  UNION ALL

  -- Datos históricos 2022-2025 (archivo de campo, status = 'HISTORIAL')
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
        ticket: t.numero_de_ticket || '',
        importe: t.importe_total ?? 0,
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

    const t0 = Date.now();
    const ts = (label) => console.log(`[update-ticket] ${label} — +${Date.now() - t0}ms`);

    try {
        ts(`START — filename: ${filename}`);

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

        ts('createQueryJob — about to submit');
        const [job] = await bigquery.createQueryJob(options);
        ts(`createQueryJob — done, job.id=${job.id}`);

        await job.getQueryResults();
        ts('getQueryResults — done');

        // Invalidate cache so next /api/data call returns fresh data
        cache.fetchedAt = null;
        ts('DONE — sending response');
        res.json({ success: true, message: 'Ticket updated in BigQuery' });
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
            // Nueva TVF ya devuelve una fila por local+mes — no se necesita GROUP BY
            const QUERY_GAPS = `
                SELECT
                    competidor,
                    local,
                    codigo_tienda,
                    mes,
                    ano,
                    fecha_anterior,
                    fecha_estimacion,
                    delta_dias,
                    trx_diarias_estimadas,
                    trx_totales_estimadas,
                    metodo_estimacion
                FROM \`${PROJECT_ID}.${DATASET_ID}.generar_estimaciones_mensuales\`('2024-01-01')
                WHERE metodo_estimacion != 'INSUFICIENTE_DATA'
                ORDER BY trx_totales_estimadas DESC
            `;
            const [job] = await bigquery.createQueryJob({ query: QUERY_GAPS });
            const [rows] = await job.getQueryResults();
            cacheGaps.data = rows.map(r => ({
                competidor:            r.competidor || '',
                local:                 r.local || '',
                codigo_tienda:         r.codigo_tienda || '',
                mes:                   r.mes ?? '',
                ano:                   r.ano ?? '',
                fecha_anterior:        r.fecha_anterior?.value || r.fecha_anterior || '',
                fecha_estimacion:      r.fecha_estimacion?.value || r.fecha_estimacion || '',
                delta_dias:            r.delta_dias ?? 0,
                trx_diarias_estimadas: r.trx_diarias_estimadas ?? 0,
                trx_totales_estimadas: r.trx_totales_estimadas ?? 0,
                metodo:                r.metodo_estimacion || '',
            }));
            cacheGaps.fetchedAt = new Date().toISOString();
            console.log(`[/api/gaps] Fetched ${cacheGaps.data.length} gaps (agrupados por local).`);
        }
        res.json({ gaps: cacheGaps.data, fetchedAt: cacheGaps.fetchedAt });
    } catch (err) {
        console.error('[/api/gaps] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/gap-lookup — Devuelve los meses usados en el rolling para un gap específico
// Params: codigo_tienda, mes (int), ano (int)
app.get('/api/gap-lookup', async (req, res) => {
    const { codigo_tienda, mes, ano } = req.query;
    if (!codigo_tienda || !mes || !ano) {
        return res.status(400).json({ error: 'codigo_tienda, mes, ano son requeridos' });
    }
    const mesInt = parseInt(mes, 10);
    const anoInt = parseInt(ano, 10);
    try {
        const QUERY = `
            WITH
              lect_caja_raw AS (
                SELECT codigo_tienda, caja, mes, ano,
                  MAX(DATE(fecha_y_hora_registro))                               AS fecha_lectura,
                  ROUND(AVG(CAST(promedio_transacciones_diarias AS FLOAT64)), 0) AS tasa_caja,
                  CAST(SAFE_CAST(REGEXP_EXTRACT(caja, r'^0*(\\d+)') AS INT64) AS STRING) AS caja_num
                FROM \`${PROJECT_ID}.${DATASET_ID}.calcular_diferencia_tickets_gemini\`('2024-01-01')
                WHERE status_busqueda = 'OK'
                  AND CAST(promedio_transacciones_diarias AS FLOAT64) > 0
                  AND CAST(promedio_transacciones_diarias AS FLOAT64) < 2000
                  AND delta_dias BETWEEN 10 AND 45
                  AND codigo_tienda = @codigo_tienda
                GROUP BY 1, 2, 3, 4
              ),
              lect_tienda AS (
                SELECT codigo_tienda, mes, ano,
                  MAX(fecha_lectura) AS fecha_lectura,
                  SUM(tasa_caja)     AS tasa_total
                FROM lect_caja_raw
                GROUP BY 1, 2, 3
              ),
              scanner_nums AS (
                SELECT DISTINCT caja_num FROM lect_caja_raw
              ),
              hist_matched AS (
                SELECT h.mes, h.ano,
                  LAST_DAY(DATE(h.ano, h.mes, 1)) AS fecha_lectura,
                  ROUND(SUM(h.trx_promedio), 0)   AS tasa_total
                FROM \`${PROJECT_ID}.${DATASET_ID}.historial_tasas\` h
                JOIN scanner_nums
                  ON CAST(SAFE_CAST(REGEXP_EXTRACT(h.caja, r'(\\d+)') AS INT64) AS STRING) = scanner_nums.caja_num
                WHERE h.codigo_tienda = @codigo_tienda
                  AND h.trx_promedio > 0 AND h.trx_promedio < 2000
                GROUP BY 1, 2, 3
              ),
              lect_ext AS (
                SELECT mes, ano, fecha_lectura, CAST(tasa_total AS INT64) AS tasa, 'REAL' AS tipo
                FROM lect_tienda
                UNION ALL
                SELECT hm.mes, hm.ano, hm.fecha_lectura, CAST(hm.tasa_total AS INT64) AS tasa, 'HISTORIAL'
                FROM hist_matched hm
                WHERE NOT EXISTS (
                  SELECT 1 FROM lect_tienda lt WHERE lt.mes = hm.mes AND lt.ano = hm.ano
                )
              )
            SELECT mes, ano, tasa, tipo
            FROM lect_ext
            WHERE fecha_lectura >= DATE_SUB(DATE(@ano_gap, @mes_gap, 1), INTERVAL 6 MONTH)
              AND fecha_lectura < DATE(@ano_gap, @mes_gap, 1)
            ORDER BY ano, mes
        `;
        const [job] = await bigquery.createQueryJob({
            query: QUERY,
            params: { codigo_tienda, mes_gap: mesInt, ano_gap: anoInt },
            types:  { mes_gap: 'INT64', ano_gap: 'INT64' },
        });
        const [rows] = await job.getQueryResults();
        const puntos = rows.map(r => ({
            mes: r.mes, ano: r.ano, tasa: r.tasa, tipo: r.tipo,
        }));
        const promedio = puntos.length
            ? Math.round(puntos.reduce((s, p) => s + (p.tasa || 0), 0) / puntos.length)
            : 0;
        res.json({ puntos, promedio });
    } catch (err) {
        console.error('[/api/gap-lookup] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/gap-detail — delegates entirely to BigQuery TVF detalle_estimacion
// La lógica de cascada (A→C→D→G) y la fuente de datos viven en BigQuery.
app.get('/api/gap-detail', async (req, res) => {
    const { codigo_tienda, caja, mes, ano } = req.query;
    if (!codigo_tienda || !mes || !ano) {
        return res.status(400).json({ error: 'codigo_tienda, mes, ano are required' });
    }
    try {
        const q = `
            SELECT
                ano, mes, mes_texto, caja_fuente, valor,
                metodo, fecha_lectura, delta_dias, subtipo,
                metodo_ganador, promedio_metodo, es_fuente_activa
            FROM \`${PROJECT_ID}.${DATASET_ID}.detalle_estimacion\`(
                @codigo_tienda,
                @caja,
                CAST(@mes AS INT64),
                CAST(@ano AS INT64)
            )
        `;
        const [job] = await bigquery.createQueryJob({
            query: q,
            params: { codigo_tienda, caja: caja || '', mes: String(mes), ano: String(ano) },
        });
        const [rows] = await job.getQueryResults();

        const metodo_ganador = rows[0]?.metodo_ganador || 'INSUFICIENTE_DATA';
        const promedio       = rows[0]?.promedio_metodo ?? null;

        res.json({
            metodo:          metodo_ganador,
            promedio_metodo: promedio,
            rows: rows.map(r => ({
                ano:              r.ano ?? '',
                mes:              r.mes ?? '',
                mes_texto:        r.mes_texto || '',
                caja_fuente:      r.caja_fuente || '',
                valor:            r.valor ?? null,
                metodo:           r.metodo || '',
                fecha_lectura:    r.fecha_lectura?.value || r.fecha_lectura || '',
                delta_dias:       r.delta_dias ?? null,
                subtipo:          r.subtipo || '',
                es_fuente_activa: r.es_fuente_activa ?? false,
            })),
        });
    } catch (err) {
        console.error('[/api/gap-detail] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/local-gap-detail — desglose por caja de un local+mes+ano agrupado
app.get('/api/local-gap-detail', async (req, res) => {
    const { codigo_tienda, mes, ano } = req.query;
    if (!codigo_tienda || !mes || !ano) {
        return res.status(400).json({ error: 'codigo_tienda, mes, ano are required' });
    }
    try {
        const q = `
            SELECT
                caja,
                fecha_anterior,
                fecha_estimacion,
                delta_dias,
                trx_diarias_estimadas,
                trx_totales_estimadas,
                metodo_estimacion
            FROM \`${PROJECT_ID}.${DATASET_ID}.generar_estimaciones_mensuales\`('2024-01-01')
            WHERE codigo_tienda = @codigo_tienda
              AND mes  = CAST(@mes AS INT64)
              AND ano  = CAST(@ano AS INT64)
              AND metodo_estimacion != 'INSUFICIENTE_DATA'
            ORDER BY trx_totales_estimadas DESC
        `;
        const [job] = await bigquery.createQueryJob({
            query: q,
            params: { codigo_tienda, mes: String(mes), ano: String(ano) },
        });
        const [rows] = await job.getQueryResults();

        res.json({
            cajas: rows.map(r => ({
                caja:                  r.caja || '',
                fecha_anterior:        r.fecha_anterior?.value || r.fecha_anterior || '',
                fecha_estimacion:      r.fecha_estimacion?.value || r.fecha_estimacion || '',
                delta_dias:            r.delta_dias ?? 0,
                trx_diarias_estimadas: r.trx_diarias_estimadas ?? 0,
                trx_totales_estimadas: r.trx_totales_estimadas ?? 0,
                metodo:                r.metodo_estimacion || '',
            })),
            total: rows.reduce((s, r) => s + (r.trx_totales_estimadas ?? 0), 0),
        });
    } catch (err) {
        console.error('[/api/local-gap-detail] Error:', err.message);
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
