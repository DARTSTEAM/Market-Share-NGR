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

// ── Activity Log ────────────────────────────────────────────────────────────
let activityLogTableReady = false;
async function ensureActivityLogTable() {
    if (activityLogTableReady) return;
    const Q = `
        CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET_ID}.activity_log\` (
            id             STRING,
            evento         STRING,
            descripcion    STRING,
            usuario        STRING,
            usuario_nombre STRING,
            metadata       STRING,
            timestamp      TIMESTAMP
        )
    `;
    const [job] = await bigquery.createQueryJob({ query: Q });
    await job.getQueryResults();
    activityLogTableReady = true;
}

async function appendLog(evento, descripcion, usuario, usuario_nombre, metadata = {}) {
    try {
        await ensureActivityLogTable();
        const INSERT_Q = `
            INSERT INTO \`${PROJECT_ID}.${DATASET_ID}.activity_log\`
            (id, evento, descripcion, usuario, usuario_nombre, metadata, timestamp)
            VALUES (GENERATE_UUID(), @evento, @descripcion, @usuario, @usuario_nombre, @metadata, CURRENT_TIMESTAMP())
        `;
        const [job] = await bigquery.createQueryJob({
            query: INSERT_Q,
            params: {
                evento,
                descripcion,
                usuario:        usuario || 'desconocido',
                usuario_nombre: usuario_nombre || usuario || 'desconocido',
                metadata:       JSON.stringify(metadata),
            },
        });
        await job.getQueryResults();
    } catch(e) {
        console.warn('[appendLog] Failed:', e.message);
    }
}

// GET /api/activity-log
app.get('/api/activity-log', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '300'), 500);
    try {
        await ensureActivityLogTable();
        const [rows] = await bigquery.query({
            query: `SELECT id, evento, descripcion, usuario, usuario_nombre, metadata, timestamp
                    FROM \`${PROJECT_ID}.${DATASET_ID}.activity_log\`
                    ORDER BY timestamp DESC
                    LIMIT @limit`,
            params: { limit },
            types: { limit: 'INT64' },
        });
        res.json({ logs: rows });
    } catch(err) {
        console.error('[/api/activity-log GET] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/activity-log  (client-side events: login, etc.)
app.post('/api/activity-log', async (req, res) => {
    const { evento, descripcion, usuario, usuario_nombre, metadata } = req.body;
    if (!evento) return res.status(400).json({ error: 'evento es requerido' });
    await appendLog(evento, descripcion || '', usuario, usuario_nombre, metadata || {});
    res.json({ success: true });
});

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

  -- Estimaciones manuales APROBADAS: reemplazan a generar_estimaciones_mensuales
  -- Solo se incluyen en el dashboard las que fueron explícitamente aprobadas
  SELECT
    competidor,
    codigo_tienda,
    local,
    CAST(NULL AS STRING)                                      AS caja,
    CONCAT('ESTIMADO-', IFNULL(metodo, 'MANUAL'))             AS status_busqueda,
    CAST(ROUND(trx_diarias * 30) AS INT64)                    AS transacciones_diferencial,
    CAST(NULL AS INT64)                                       AS ticket_actual,
    CAST(NULL AS INT64)                                       AS ticket_anterior,
    DATETIME(updated_at)                                      AS fecha_y_hora_registro,
    CAST(NULL AS DATETIME)                                    AS fecha_anterior,
    CAST(NULL AS STRING)                                      AS filename_actual,
    CAST(NULL AS STRING)                                      AS filename_anterior,
    CAST(30 AS INT64)                                         AS delta_dias,
    CAST(NULL AS INT64)                                       AS ac,
    trx_diarias                                               AS promedio_transacciones_diarias,
    mes,
    ano,
    CAST(NULL AS STRING)                                      AS region,
    CAST(NULL AS STRING)                                      AS distrito,
    CAST(NULL AS STRING)                                      AS punto_compartido,
    CAST(NULL AS STRING)                                      AS cc_punto_compartido,
    CAST(NULL AS STRING)                                      AS grupos_cc,
    CAST(NULL AS STRING)                                      AS marcas_en_pc,
    CAST(NULL AS INT64)                                       AS n_marcas_en_pc
  FROM \`${PROJECT_ID}.${DATASET_ID}.estimaciones_manuales\`
  WHERE aprobado = TRUE

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
    const { filename, ticket, importe, fecha, caja, local, competidor, codigoTienda, usuario, usuario_nombre } = req.body;

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
        appendLog('TICKET_CORREGIDO', `Ticket corregido: ${local || codigoTienda} · Caja ${caja} · $${importe}`, usuario, usuario_nombre, { filename, ticket, importe, caja, local, competidor, codigoTienda }).catch(() => {});
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

// GET /api/estimation-matrix
// Devuelve la matriz pivot (local × mes × caja) con tipo REAL/HISTORIAL/ESTIMADO/MANUAL/GAP
// Query param: competidor (opcional)
const cacheMatrix = { data: null, fetchedAt: null };
const MATRIX_TTL_MS = 10 * 60 * 1000; // 10 min

app.get('/api/estimation-matrix', async (req, res) => {
    const { competidor } = req.query;
    try {
        const isStale = !cacheMatrix.fetchedAt || (Date.now() - new Date(cacheMatrix.fetchedAt).getTime()) > MATRIX_TTL_MS;
        if (isStale || !cacheMatrix.data) {
            console.log('[/api/estimation-matrix] Building from BigQuery...');
            const CUTOFF = '2025-11-30'; // fin del historial

            // 1. Datos reales (post-cutoff)
            // Normalizar caja con REGEXP_EXTRACT para obtener solo el número
            // (el TVF puede devolver '001', '1', 'Caja 1', o vacío)
            const Q_REAL = `
                SELECT
                    competidor,
                    REPLACE(codigo_tienda, ' ', '') AS codigo_tienda,
                    local,
                    CAST(SAFE_CAST(REGEXP_EXTRACT(caja, r'^0*(\\d+)') AS INT64) AS STRING) AS caja,
                    mes,
                    ano,
                    ROUND(AVG(COALESCE(CAST(promedio_transacciones_diarias AS FLOAT64), 0)), 1) AS tasa,
                    MAX(status_busqueda) as status_busqueda
                FROM \`${PROJECT_ID}.${DATASET_ID}.calcular_diferencia_tickets_gemini\`('2024-01-01')
                WHERE status_busqueda IN ('OK', 'SIN_HISTORIAL')
                  AND DATE(fecha_y_hora_registro) > '${CUTOFF}'
                  AND REGEXP_CONTAINS(caja, r'\\d')
                GROUP BY 1,2,3,4,5,6
            `;
            // 2. Historial hasta NOVIEMBRE 2025 inclusive
            const Q_HIST = `
                SELECT
                    h.competidor,
                    REPLACE(h.codigo_tienda, ' ', '') AS codigo_tienda,
                    h.local,
                    CAST(SAFE_CAST(REGEXP_EXTRACT(h.caja, r'(\\d+)') AS INT64) AS STRING) AS caja_num,
                    h.mes,
                    h.ano,
                    ROUND(h.trx_promedio, 1) AS tasa,
                    'OK' as status_busqueda
                FROM \`${PROJECT_ID}.${DATASET_ID}.historial_tasas\` h
                WHERE h.trx_promedio > 0
                  AND (h.ano < 2025 OR (h.ano = 2025 AND h.mes <= 11))
            `;
            // 3. Estimaciones manuales (APROBADAS y PENDIENTES) — fuente única de estimados
            const Q_EST = `
                SELECT
                    competidor,
                    REPLACE(codigo_tienda, ' ', '') AS codigo_tienda,
                    local,
                    CAST(SAFE_CAST(REGEXP_EXTRACT(caja, r'^0*(\\d+)') AS INT64) AS STRING) AS caja,
                    mes,
                    ano,
                    ROUND(trx_diarias, 1) AS tasa,
                    IF(aprobado, 'APROBADO', 'PENDIENTE') AS tipo_manual
                FROM \`${PROJECT_ID}.${DATASET_ID}.estimaciones_manuales\`
                WHERE caja IS NOT NULL AND REGEXP_CONTAINS(caja, r'\\d')
            `;
            const runQ = async (q) => {
                try {
                    const [job] = await bigquery.createQueryJob({ query: q });
                    const [rows] = await job.getQueryResults();
                    return rows;
                } catch(e) {
                    console.warn('[estimation-matrix] query failed (maybe table missing):', e.message.slice(0, 100));
                    return [];
                }
            };

            const [rowsReal, rowsHist, rowsEst] = await Promise.all([
                runQ(Q_REAL), runQ(Q_HIST), runQ(Q_EST)
            ]);

            // Armar estructura plana
            // Q_EST ahora devuelve APROBADO o PENDIENTE según el campo tipo_manual
            // rowsMan ya no se usa (está integrado en Q_EST)
            const allRows = [
                ...rowsReal.map(r => ({ ...r, tipo: 'REAL' })),
                ...rowsHist.map(r => ({ ...r, caja: r.caja_num, tipo: 'HISTORIAL' })),
                ...rowsEst.map(r => ({ ...r, tipo: r.tipo_manual || 'PENDIENTE', status_busqueda: 'OK' })),
            ];

            // Deduplicar: prioridad REAL > APROBADO > PENDIENTE > HISTORIAL
            const PRIO = { REAL: 5, APROBADO: 4, PENDIENTE: 3, HISTORIAL: 2 };
            const cellMap = {}; // `codigo_tienda||caja||ano-mm` → row
            for (const r of allRows) {
                const ano = r.ano?.value ?? r.ano;
                const mes = r.mes?.value ?? r.mes;
                const mk = `${ano}-${String(mes).padStart(2,'0')}`;
                const cajaStr = String(r.caja?.value ?? r.caja ?? '');
                
                // FILTRAR COLUMNA "TOTAL" (que aparecía por error en la UI)
                if (!cajaStr || cajaStr.toLowerCase() === 'total') continue;

                const k = `${r.codigo_tienda}||${cajaStr}||${mk}`;
                if (!cellMap[k] || PRIO[r.tipo] > PRIO[cellMap[k].tipo]) {
                    const tasa = parseFloat(r.tasa?.value ?? r.tasa ?? 0);
                    cellMap[k] = {
                        key:           k,
                        codigo_tienda: r.codigo_tienda,
                        local:         r.local,
                        competidor:    r.competidor,
                        caja:          cajaStr,
                        mes:           parseInt(mes),
                        ano:           parseInt(ano),
                        mk,
                        tasa,
                        tipo:          r.tipo,
                        status_busqueda: r.status_busqueda || 'OK'
                    };
                }
            }

            // Determinar ventana de meses: desde el mes más antiguo en los datos hasta el mes actual
            const now = new Date();
            const currentMk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Encontrar el mes más antiguo con datos
            let minMk = currentMk;
            for (const r of allRows) {
                const ano = parseInt(r.ano?.value ?? r.ano ?? 0);
                const mes = parseInt(r.mes?.value ?? r.mes ?? 0);
                if (!ano || !mes) continue;
                const mk = `${ano}-${String(mes).padStart(2, '0')}`;
                if (mk < minMk) minMk = mk;
            }

            // Generar todos los meses entre minMk y el mes actual
            const mesesSorted = [];
            {
                let [a, m] = minMk.split('-').map(Number);
                const [ca, cm] = [now.getFullYear(), now.getMonth() + 1];
                while (a < ca || (a === ca && m <= cm)) {
                    mesesSorted.push(`${a}-${String(m).padStart(2, '0')}`);
                    m += 1;
                    if (m > 12) { m = 1; a += 1; }
                }
            }

            // Agrupar por local — ahora incluye toda la ventana histórica
            const localMap = {};
            for (const cell of Object.values(cellMap)) {
                if (!mesesSorted.includes(cell.mk)) continue;
                const lk = cell.codigo_tienda;
                if (!localMap[lk]) {
                    localMap[lk] = {
                        codigo_tienda: cell.codigo_tienda,
                        local:         cell.local,
                        competidor:    cell.competidor,
                        cajas:         new Set(),
                        celdas:        {},
                    };
                }
                localMap[lk].cajas.add(cell.caja);
                localMap[lk].celdas[`${cell.caja}||${cell.mk}`] = cell;
            }

            // Calcular caída % por caja (mes actual vs mes anterior en la ventana)
            for (const local of Object.values(localMap)) {
                for (const caja of local.cajas) {
                    for (let i = 1; i < mesesSorted.length; i++) {
                        const mk  = mesesSorted[i];
                        const mkp = mesesSorted[i-1];
                        const curr = local.celdas[`${caja}||${mk}`];
                        const prev = local.celdas[`${caja}||${mkp}`];
                        if (curr && prev && prev.tasa > 0) {
                            curr.caida_pct = ((curr.tasa - prev.tasa) / prev.tasa) * 100;
                        }
                    }
                }
                local.cajas = [...local.cajas].sort((a, b) => {
                    const na = parseInt(a) || 0;
                    const nb = parseInt(b) || 0;
                    return na - nb;
                });
            }

            // ── Detección de RETORNO: caja que reaparece tras 4+ meses de hiatus ──
            // Una celda REAL se marca como RETORNO si tiene 4+ meses consecutivos sin
            // datos previos (sin importar si la tasa es mayor, menor o igual a la previa).
            // También se marca si la caja nunca tuvo historial en la ventana (caja nueva
            // que aparece por primera vez en datos recientes).
            // El frontend muestra estas celdas con badge naranja y abre el panel de
            // estimación para que el usuario aplique Estimación Local.
            for (const local of Object.values(localMap)) {
                for (const caja of local.cajas) {
                    for (let i = 0; i < mesesSorted.length; i++) {
                        const mk   = mesesSorted[i];
                        const cell = local.celdas[`${caja}||${mk}`];
                        // 1. Si no hay ticket, no hay nada que evaluar como retorno.
                        // 2. Si BigQuery ya nos dijo que el registro es 'OK' (tiene historial coherente),
                        //    no lo marcamos como alarma de retorno.
                        if (!cell || cell.tipo !== 'REAL' || cell.status_busqueda === 'OK') continue;

                        // Buscar hacia atrás el último mes activo y contar meses vacíos consecutivos
                        let gapCount = 0;
                        let lastActiveTasa = null;
                        for (let j = i - 1; j >= 0; j--) {
                            const prevMk   = mesesSorted[j];
                            const prevCell = local.celdas[`${caja}||${prevMk}`];
                            // Si no hay celda o la tasa es 0/negativa en el pasado, lo contamos como gap
                            if (!prevCell || prevCell.tipo === 'GAP' || !prevCell.tasa || prevCell.tasa <= 0) {
                                gapCount++;
                            } else {
                                // Encontré el último mes con actividad
                                lastActiveTasa = prevCell.tasa;
                                break;
                            }
                        }

                        // Hiatus de 4+ meses → RETORNO (sin importar si la tasa es mayor o menor)
                        // También aplica si nunca hubo datos previos en la ventana (lastActiveTasa === null
                        // y gapCount > 0, es decir, la caja apareció "de la nada" en medio de la ventana).
                        const esHiatus  = gapCount >= 4;
                        const esNueva   = lastActiveTasa === null && gapCount > 0;

                        if (esHiatus || esNueva) {
                            cell.tipo                = 'RETORNO';
                            cell.retorno_tasa_previa = lastActiveTasa; // null → sin historial previo
                            cell.retorno_meses_gap   = gapCount;
                        }
                    }
                }
            }

            // ── Meses de rutina ──────────────────────────────────────────────────────
            const CUTOFF_KEY = 202511; // ano*100 + mes > 202511 → desde Dic 2025 inclusive
            const mesesRutina = mesesSorted.filter(mk => {
                const [a, m] = mk.split('-');
                return parseInt(a) * 100 + parseInt(m) > CUTOFF_KEY;
            });

            // ── Inject cajas from cajas_config that have no data yet ──────────────────
            // Cajas con manual=true y sin datos reales → tipo 'CAJA_NUEVA' (filtrable)
            // Cajas con manual=false y sin datos reales → tipo 'GAP' normal
            try {
                const [cajasRows] = await bigquery.query({
                    query: `SELECT REPLACE(codigo_tienda, ' ', '') AS codigo_tienda, caja, local, competidor, status, manual
                            FROM \`${PROJECT_ID}.${DATASET_ID}.cajas_config\`
                            WHERE status != 'DISCONTINUADA'`,
                });
                for (const cfg of cajasRows) {
                    const ct        = cfg.codigo_tienda;
                    const caja      = String(cfg.caja);
                    if (!caja || caja.toLowerCase() === 'total') continue;
                    const tipoNueva = cfg.manual ? 'CAJA_NUEVA' : 'GAP';
                    if (localMap[ct]) {
                        const cajaSet = new Set(localMap[ct].cajas);
                        if (!cajaSet.has(caja)) {
                            localMap[ct].cajas.push(caja);
                            for (const mk of mesesRutina) {
                                const ck = `${caja}||${mk}`;
                                if (!localMap[ct].celdas[ck]) {
                                    const [ano, mes] = mk.split('-');
                                    localMap[ct].celdas[ck] = {
                                        key:           `${ct}||${caja}||${mk}`,
                                        codigo_tienda: ct,
                                        local:         localMap[ct].local,
                                        competidor:    localMap[ct].competidor,
                                        caja,
                                        mes:           parseInt(mes),
                                        ano:           parseInt(ano),
                                        mk,
                                        tasa:          null,
                                        tipo:          tipoNueva,
                                    };
                                }
                            }
                        }
                    } else if (cfg.local && cfg.competidor) {
                        localMap[ct] = {
                            codigo_tienda: ct,
                            local:         cfg.local,
                            competidor:    cfg.competidor,
                            cajas:         [caja],
                            celdas:        {},
                        };
                        for (const mk of mesesRutina) {
                            const [ano, mes] = mk.split('-');
                            localMap[ct].celdas[`${caja}||${mk}`] = {
                                key:           `${ct}||${caja}||${mk}`,
                                codigo_tienda: ct,
                                local:         cfg.local,
                                competidor:    cfg.competidor,
                                caja,
                                mes:           parseInt(mes),
                                ano:           parseInt(ano),
                                mk,
                                tasa:          null,
                                tipo:          tipoNueva,
                            };
                        }
                    }
                }
                // Re-sort cajas after injection
                for (const local of Object.values(localMap)) {
                    if (Array.isArray(local.cajas)) {
                        local.cajas = [...new Set(local.cajas)].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
                    }
                }
            } catch(e) {
                console.warn('[estimation-matrix] cajas_config inject failed:', e.message.slice(0, 100));
            }

            // ── GAP detection: para cajas ya existentes sin datos en meses de rutina ──
            for (const local of Object.values(localMap)) {
                for (const caja of local.cajas) {
                    for (const mk of mesesRutina) {
                        const ck = `${caja}||${mk}`;
                        if (!local.celdas[ck]) {
                            // No hay dato en este mes de rutina → GAP
                            const [ano, mes] = mk.split('-');
                            local.celdas[ck] = {
                                key:          `${local.codigo_tienda}||${caja}||${mk}`,
                                codigo_tienda: local.codigo_tienda,
                                local:         local.local,
                                competidor:    local.competidor,
                                caja,
                                mes:           parseInt(mes),
                                ano:           parseInt(ano),
                                mk,
                                tasa:          null,
                                tipo:          'GAP',
                            };
                        }
                    }
                }
            }

            cacheMatrix.data = {
                meses:   mesesSorted,
                locales: Object.values(localMap).sort((a,b) => a.competidor.localeCompare(b.competidor) || a.local.localeCompare(b.local)),
            };
            cacheMatrix.fetchedAt = new Date().toISOString();

            const totalGaps = Object.values(localMap).reduce((acc, l) =>
                acc + Object.values(l.celdas).filter(c => c.tipo === 'GAP').length, 0);
            console.log(`[/api/estimation-matrix] Built: ${cacheMatrix.data.locales.length} locales, ${mesesSorted.length} meses, ${totalGaps} GAPs detectados.`);
        }

        let { locales, meses: mesesAll } = cacheMatrix.data;
        if (competidor) {
            locales = locales.filter(l => l.competidor === competidor);
        }
        res.json({ locales, meses: mesesAll, fetchedAt: cacheMatrix.fetchedAt });
    } catch (err) {
        console.error('[/api/estimation-matrix] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/refresh-matrix — invalida el caché de la matriz para forzar una reconstrucción
app.post('/api/refresh-matrix', (req, res) => {
    cacheMatrix.fetchedAt = null;
    cacheMatrix.data = null;
    console.log('[/api/refresh-matrix] Cache invalidated — next GET will rebuild.');
    res.json({ success: true, message: 'Matrix cache cleared' });
});

// POST /api/save-estimation — MERGE una estimación manual a BigQuery
app.post('/api/save-estimation', async (req, res) => {
    const { codigo_tienda, local, competidor, caja, mes, ano, trx_diarias, metodo, aprobado, usuario, usuario_nombre } = req.body;
    if (!codigo_tienda || !caja || !mes || !ano || trx_diarias == null) {
        return res.status(400).json({ error: 'codigo_tienda, caja, mes, ano, trx_diarias son requeridos' });
    }
    try {
        // Ensure table exists (with aprobado field)
        const CREATE_Q = `
            CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET_ID}.estimaciones_manuales\` (
                codigo_tienda STRING,
                local         STRING,
                competidor    STRING,
                caja          STRING,
                mes           INT64,
                ano           INT64,
                trx_diarias   FLOAT64,
                metodo        STRING,
                aprobado      BOOL,
                usuario       STRING,
                usuario_nombre STRING,
                updated_at    TIMESTAMP
            )
        `;
        await bigquery.createQueryJob({ query: CREATE_Q }).then(([j]) => j.getQueryResults());

        // Migrate: add columns that may be missing in pre-existing table (BigQuery DDL is idempotent-ish)
        // We try silently — BQ returns an error if column already exists, which we ignore.
        try {
            const ALTER_Q = `ALTER TABLE \`${PROJECT_ID}.${DATASET_ID}.estimaciones_manuales\`
                ADD COLUMN IF NOT EXISTS aprobado BOOL,
                ADD COLUMN IF NOT EXISTS usuario_nombre STRING`;
            await bigquery.createQueryJob({ query: ALTER_Q }).then(([j]) => j.getQueryResults());
        } catch(_) { /* column already exists — fine */ }

        // MERGE (upsert) — incluye campo aprobado
        const MERGE_Q = `
            MERGE \`${PROJECT_ID}.${DATASET_ID}.estimaciones_manuales\` T
            USING (SELECT
                @codigo_tienda  AS codigo_tienda,
                @local          AS local,
                @competidor     AS competidor,
                @caja           AS caja,
                @mes            AS mes,
                @ano            AS ano,
                @trx_diarias    AS trx_diarias,
                @metodo         AS metodo,
                @aprobado       AS aprobado,
                @usuario        AS usuario,
                @usuario_nombre AS usuario_nombre
            ) S
            ON T.codigo_tienda = S.codigo_tienda
               AND T.caja = S.caja
               AND T.mes  = S.mes
               AND T.ano  = S.ano
            WHEN MATCHED THEN UPDATE SET
                trx_diarias    = S.trx_diarias,
                metodo         = S.metodo,
                aprobado       = S.aprobado,
                local          = S.local,
                competidor     = S.competidor,
                usuario        = S.usuario,
                usuario_nombre = S.usuario_nombre,
                updated_at     = CURRENT_TIMESTAMP()
            WHEN NOT MATCHED THEN INSERT
                (codigo_tienda, local, competidor, caja, mes, ano, trx_diarias, metodo, aprobado, usuario, usuario_nombre, updated_at)
                VALUES (S.codigo_tienda, S.local, S.competidor, S.caja, S.mes, S.ano, S.trx_diarias, S.metodo, S.aprobado, S.usuario, S.usuario_nombre, CURRENT_TIMESTAMP())
        `;
        const aprobadoBool = aprobado === true || aprobado === 'true';
        const [job] = await bigquery.createQueryJob({
            query: MERGE_Q,
            params: {
                codigo_tienda,
                local:          local || '',
                competidor:     competidor || '',
                caja:           String(caja),
                mes:            parseInt(mes),
                ano:            parseInt(ano),
                trx_diarias:    parseFloat(trx_diarias),
                metodo:         metodo || 'IGUAL_ANTERIOR',
                aprobado:       aprobadoBool,
                usuario:        usuario        || 'dashboard',
                usuario_nombre: usuario_nombre || 'Dashboard',
            },
            types: { mes: 'INT64', ano: 'INT64', trx_diarias: 'FLOAT64', aprobado: 'BOOL' },
        });
        await job.getQueryResults();

        // Invalidate matrix cache so next fetch picks up the manual
        cacheMatrix.fetchedAt = null;

        const aprobadoLabel = aprobadoBool ? 'APROBADA' : 'PENDIENTE';
        appendLog(
            aprobadoBool ? 'ESTIMACION_APROBADA' : 'ESTIMACION_GUARDADA',
            `Estimación ${aprobadoLabel}: ${local || codigo_tienda} · Caja ${caja} · ${mes}/${ano} → ${trx_diarias} tx/día (${metodo || 'manual'})`,
            usuario, usuario_nombre, { codigo_tienda, caja, mes, ano, trx_diarias, metodo, aprobado: aprobadoBool }
        ).catch(() => {});
        console.log(`[/api/save-estimation] Saved: ${codigo_tienda} caja=${caja} ${mes}/${ano} → ${trx_diarias} tx/día (${metodo}) by ${usuario || 'dashboard'}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[/api/save-estimation] Error:', err.message);
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
                UNION ALL
                -- Meses estimados anteriores (chaining) dentro de la ventana rolling
                SELECT
                  g.mes, g.ano,
                  g.fecha_estimacion AS fecha_lectura,
                  CAST(g.trx_diarias_estimadas AS INT64) AS tasa,
                  'ESTIMADO' AS tipo
                FROM \`${PROJECT_ID}.${DATASET_ID}.generar_estimaciones_mensuales\`('2024-01-01') g
                WHERE g.codigo_tienda = @codigo_tienda
                  AND g.fecha_estimacion >= DATE_SUB(DATE(@ano_gap, @mes_gap, 1), INTERVAL 6 MONTH)
                  AND g.fecha_estimacion <  DATE(@ano_gap, @mes_gap, 1)
                  AND NOT EXISTS (SELECT 1 FROM lect_tienda  lt  WHERE lt.mes  = g.mes AND lt.ano  = g.ano)
                  AND NOT EXISTS (SELECT 1 FROM hist_matched hm2 WHERE hm2.mes = g.mes AND hm2.ano = g.ano)
              )
            SELECT mes, ano, tasa, tipo
            FROM lect_ext
            WHERE fecha_lectura >= DATE_SUB(DATE(@ano_gap, @mes_gap, 1), INTERVAL 6 MONTH)
              AND fecha_lectura <  DATE(@ano_gap, @mes_gap, 1)
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

// ── CAJAS CONFIG ──────────────────────────────────────────────────────────────
// Table: ngr.cajas_config (codigo_tienda, caja, local, competidor, status, updated_at)
// status values: 'ACTIVA' | 'DISCONTINUADA' | 'SIN_ALARMAS'
//
// ACTIVA        → normal (default)
// DISCONTINUADA → no aparece en alarmas ni en estimaciones, y se oculta
// SIN_ALARMAS   → aparece en el dashboard pero no genera alarmas pulsantes

const CAJAS_CONFIG_ENSURE = `
    CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET_ID}.cajas_config\` (
        codigo_tienda STRING,
        caja          STRING,
        local         STRING,
        competidor    STRING,
        status        STRING,
        notas         STRING,
        usuario       STRING,
        updated_at    TIMESTAMP
    )
`;

// Ensure table + manual column at startup (best-effort)
bigquery.createQueryJob({ query: CAJAS_CONFIG_ENSURE })
    .then(([j]) => j.getQueryResults())
    .then(() => bigquery.createQueryJob({
        query: `ALTER TABLE \`${PROJECT_ID}.${DATASET_ID}.cajas_config\` ADD COLUMN IF NOT EXISTS manual BOOL`
    }))
    .then(([j]) => j.getQueryResults())
    // Fix: silenced cajas (via matrix bell) should always be manual=FALSE
    .then(() => bigquery.createQueryJob({
        query: `UPDATE \`${PROJECT_ID}.${DATASET_ID}.cajas_config\` SET manual = FALSE WHERE status = 'SIN_ALARMAS' AND (manual IS TRUE OR manual IS NULL)`
    }))
    .then(([j]) => j.getQueryResults())
    // Also fix NULL ACTIVA rows that were not manually added (they have no transaction data to identify, so leave for future)
    .then(() => { cajasConfigCache.fetchedAt = null; })
    .catch(e => console.warn('[startup] cajas_config setup:', e.message.slice(0, 80)));

// Cache for cajas config (short TTL)
let cajasConfigCache = { data: null, fetchedAt: null };
const CAJAS_TTL = 2 * 60 * 1000; // 2 min

async function getCajasConfig(force = false) {
    const age = cajasConfigCache.fetchedAt ? Date.now() - new Date(cajasConfigCache.fetchedAt).getTime() : Infinity;
    if (force || age > CAJAS_TTL || !cajasConfigCache.data) {
        const [job] = await bigquery.createQueryJob({
            query: `SELECT codigo_tienda, caja, local, competidor, status, notas, usuario, IFNULL(manual, false) AS manual, updated_at FROM \`${PROJECT_ID}.${DATASET_ID}.cajas_config\` ORDER BY competidor, local, caja`
        });
        const [rows] = await job.getQueryResults();
        cajasConfigCache.data = rows.map(r => ({
            codigo_tienda: r.codigo_tienda || '',
            caja:          r.caja || '',
            local:         r.local || '',
            competidor:    r.competidor || '',
            status:        r.status || 'ACTIVA',
            notas:         r.notas || '',
            usuario:       r.usuario || '',
            manual:        r.manual === true,
            updated_at:    r.updated_at?.value || '',
        }));
        cajasConfigCache.fetchedAt = new Date().toISOString();
    }
    return cajasConfigCache.data;
}

// GET /api/cajas-config
app.get('/api/cajas-config', async (req, res) => {
    try {
        const data = await getCajasConfig();
        res.json({ cajas: data, fetchedAt: cajasConfigCache.fetchedAt });
    } catch (err) {
        console.error('[/api/cajas-config GET] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cajas-config — upsert status for a caja
app.post('/api/cajas-config', async (req, res) => {
    const { codigo_tienda, caja, local, competidor, status, notas, usuario, manual } = req.body;
    if (!codigo_tienda || !caja || !status) {
        return res.status(400).json({ error: 'codigo_tienda, caja, status son requeridos' });
    }
    const validStatuses = ['ACTIVA', 'DISCONTINUADA', 'SIN_ALARMAS'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status debe ser uno de: ${validStatuses.join(', ')}` });
    }
    try {
        const MERGE_Q = `
            MERGE \`${PROJECT_ID}.${DATASET_ID}.cajas_config\` T
            USING (SELECT
                @codigo_tienda AS codigo_tienda,
                @caja          AS caja,
                @local         AS local,
                @competidor    AS competidor,
                @status        AS status,
                @notas         AS notas,
                @usuario       AS usuario
            ) S
            ON T.codigo_tienda = S.codigo_tienda AND T.caja = S.caja
            WHEN MATCHED THEN UPDATE SET
                status     = S.status,
                notas      = S.notas,
                local      = S.local,
                competidor = S.competidor,
                usuario    = S.usuario,
                manual     = ${manual !== undefined ? String(Boolean(manual)) : 'T.manual'},
                updated_at = CURRENT_TIMESTAMP()
            WHEN NOT MATCHED THEN INSERT
                (codigo_tienda, caja, local, competidor, status, notas, usuario, manual, updated_at)
                VALUES (S.codigo_tienda, S.caja, S.local, S.competidor, S.status, S.notas, S.usuario, FALSE, CURRENT_TIMESTAMP())
        `;
        const [job] = await bigquery.createQueryJob({
            query: MERGE_Q,
            params: {
                codigo_tienda, caja: String(caja),
                local: local || '', competidor: competidor || '',
                status, notas: notas || '', usuario: usuario || 'dashboard',
            },
        });
        await job.getQueryResults();
        cajasConfigCache.fetchedAt = null; // invalidate
        cache.fetchedAt = null;            // invalidate main cache so alarms update
        const cajaLabel = caja === '__LOCAL__' ? 'local completo' : `caja ${caja}`;
        const statusLabel = status === 'SIN_ALARMAS' ? 'silenciada' : status === 'ACTIVA' ? 'reactivada' : status;
        appendLog('CAJA_CONFIGURADA', `Alarma ${statusLabel}: ${local || codigo_tienda} · ${cajaLabel}`, usuario, '', { codigo_tienda, caja, local, competidor, status }).catch(() => {});
        console.log(`[/api/cajas-config] Updated: ${codigo_tienda} caja=${caja} → ${status}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[/api/cajas-config POST] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/add-caja — registers a brand new caja (defaults to ACTIVA)
app.post('/api/add-caja', async (req, res) => {
    const { codigo_tienda, caja, local, competidor, notas, usuario } = req.body;
    if (!codigo_tienda || !caja) {
        return res.status(400).json({ error: 'codigo_tienda y caja son requeridos' });
    }
    try {
        // Check if already exists
        const CHECK_Q = `
            SELECT COUNT(*) AS cnt
            FROM \`${PROJECT_ID}.${DATASET_ID}.cajas_config\`
            WHERE codigo_tienda = @codigo_tienda AND caja = @caja
        `;
        const [cj] = await bigquery.createQueryJob({ query: CHECK_Q, params: { codigo_tienda, caja: String(caja) } });
        const [checkRows] = await cj.getQueryResults();
        if ((checkRows[0]?.cnt ?? 0) > 0) {
            return res.status(409).json({ error: 'Esa caja ya existe para ese código de tienda' });
        }

        const INSERT_Q = `
            INSERT INTO \`${PROJECT_ID}.${DATASET_ID}.cajas_config\`
                (codigo_tienda, caja, local, competidor, status, notas, usuario, manual, updated_at)
            VALUES (@codigo_tienda, @caja, @local, @competidor, 'ACTIVA', @notas, @usuario, TRUE, CURRENT_TIMESTAMP())
        `;
        const [job] = await bigquery.createQueryJob({
            query: INSERT_Q,
            params: {
                codigo_tienda, caja: String(caja),
                local: local || '', competidor: competidor || '',
                notas: notas || '', usuario: usuario || 'dashboard',
            },
        });
        await job.getQueryResults();
        cajasConfigCache.fetchedAt = null;
        cacheMatrix.fetchedAt = null; // force matrix rebuild so new caja appears immediately
        appendLog('CAJA_AGREGADA', `Caja agregada: ${local || codigo_tienda} · Caja ${caja}`, usuario, '', { codigo_tienda, caja, local, competidor }).catch(() => {});
        console.log(`[/api/add-caja] Added: ${codigo_tienda} caja=${caja} (${local})`);
        res.json({ success: true });
    } catch (err) {
        console.error('[/api/add-caja] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/cajas-config — permanently remove a caja registration
app.delete('/api/cajas-config', async (req, res) => {
    const { codigo_tienda, caja, usuario } = req.body;
    if (!codigo_tienda || !caja) {
        return res.status(400).json({ error: 'codigo_tienda y caja son requeridos' });
    }
    try {
        const DEL_Q = `
            DELETE FROM \`${PROJECT_ID}.${DATASET_ID}.cajas_config\`
            WHERE codigo_tienda = @codigo_tienda AND caja = @caja
        `;
        const [job] = await bigquery.createQueryJob({
            query: DEL_Q,
            params: { codigo_tienda, caja: String(caja) },
        });
        await job.getQueryResults();
        cajasConfigCache.fetchedAt = null;
        cacheMatrix.fetchedAt = null;
        appendLog('CAJA_ELIMINADA', `Caja eliminada: ${codigo_tienda} · Caja ${caja}`, usuario, '', { codigo_tienda, caja }).catch(() => {});
        console.log(`[/api/cajas-config DELETE] Removed: ${codigo_tienda} caja=${caja}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[/api/cajas-config DELETE] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

let revisadasCache = { data: null, fetchedAt: null };
const REVISADAS_TTL = 2 * 60 * 1000; // 2 min

async function ensureRevisadasTable() {
    const CREATE_Q = `
        CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET_ID}.alarmas_revisadas\` (
            codigo_tienda  STRING,
            caja           STRING,
            mes            INT64,
            ano            INT64,
            revisado_por   STRING,
            revisado_at    TIMESTAMP
        )
    `;
    const [job] = await bigquery.createQueryJob({ query: CREATE_Q });
    await job.getQueryResults();
}

// GET /api/alarmas-revisadas
app.get('/api/alarmas-revisadas', async (req, res) => {
    const now = Date.now();
    if (revisadasCache.data && now - revisadasCache.fetchedAt < REVISADAS_TTL) {
        return res.json({ revisadas: revisadasCache.data });
    }
    try {
        await ensureRevisadasTable();
        const [rows] = await bigquery.query({
            query: `SELECT codigo_tienda, caja, mes, ano, revisado_por, revisado_at
                    FROM \`${PROJECT_ID}.${DATASET_ID}.alarmas_revisadas\`
                    ORDER BY revisado_at DESC`,
        });
        revisadasCache = { data: rows, fetchedAt: now };
        res.json({ revisadas: rows });
    } catch (err) {
        console.error('[/api/alarmas-revisadas GET] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/alarmas-revisadas — insert or delete (toggle)
app.post('/api/alarmas-revisadas', async (req, res) => {
    const { codigo_tienda, caja, mes, ano, revisado_por, accion } = req.body;
    if (!codigo_tienda || !caja || !mes || !ano) {
        return res.status(400).json({ error: 'codigo_tienda, caja, mes, ano son requeridos' });
    }
    try {
        await ensureRevisadasTable();
        if (accion === 'QUITAR') {
            // Eliminar revisión
            const DEL_Q = `
                DELETE FROM \`${PROJECT_ID}.${DATASET_ID}.alarmas_revisadas\`
                WHERE codigo_tienda = @codigo_tienda
                  AND caja = @caja
                  AND mes  = @mes
                  AND ano  = @ano
            `;
            const [job] = await bigquery.createQueryJob({
                query: DEL_Q,
                params: { codigo_tienda, caja: String(caja), mes: parseInt(mes), ano: parseInt(ano) },
                types: { mes: 'INT64', ano: 'INT64' },
            });
            await job.getQueryResults();
        } else {
            // Upsert revisión
            const MERGE_Q = `
                MERGE \`${PROJECT_ID}.${DATASET_ID}.alarmas_revisadas\` T
                USING (SELECT
                    @codigo_tienda AS codigo_tienda,
                    @caja          AS caja,
                    @mes           AS mes,
                    @ano           AS ano,
                    @revisado_por  AS revisado_por
                ) S
                ON T.codigo_tienda = S.codigo_tienda
                   AND T.caja = S.caja
                   AND T.mes  = S.mes
                   AND T.ano  = S.ano
                WHEN MATCHED THEN UPDATE SET
                    revisado_por = S.revisado_por,
                    revisado_at  = CURRENT_TIMESTAMP()
                WHEN NOT MATCHED THEN INSERT
                    (codigo_tienda, caja, mes, ano, revisado_por, revisado_at)
                    VALUES (S.codigo_tienda, S.caja, S.mes, S.ano, S.revisado_por, CURRENT_TIMESTAMP())
            `;
            const [job] = await bigquery.createQueryJob({
                query: MERGE_Q,
                params: { codigo_tienda, caja: String(caja), mes: parseInt(mes), ano: parseInt(ano), revisado_por: revisado_por || 'dashboard' },
                types: { mes: 'INT64', ano: 'INT64' },
            });
            await job.getQueryResults();
        }
        revisadasCache.fetchedAt = null;
        const revLabel = accion === 'QUITAR' ? 'Revisión quitada' : 'Alarma marcada revisada';
        appendLog('ALARMA_REVISADA', `${revLabel}: ${codigo_tienda} · Caja ${caja} · ${mes}/${ano}`, revisado_por, '', { codigo_tienda, caja, mes, ano, accion }).catch(() => {});
        console.log(`[/api/alarmas-revisadas] ${accion || 'MARCAR'}: ${codigo_tienda} caja=${caja} ${mes}/${ano}`);
        res.json({ success: true });
    } catch (err) {
        console.error('[/api/alarmas-revisadas POST] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── /api/ngr-locales ─────────────────────────────────────────────────────────
// Devuelve histórico NGR (locales propios): POPEYES, Bembos, Papa Johns, CHINAWOK
const cacheNGR = { data: null, fetchedAt: null };
const NGR_TTL_MS = 30 * 60 * 1000; // 30 min

app.get('/api/ngr-locales', async (req, res) => {
    try {
        const isStale = !cacheNGR.fetchedAt || (Date.now() - new Date(cacheNGR.fetchedAt).getTime()) > NGR_TTL_MS;
        if (isStale || !cacheNGR.data) {
            console.log('[/api/ngr-locales] Fetching from BigQuery...');
            const [rows] = await bigquery.query(`
                SELECT
                    marca, local, store_num, codigo_interno,
                    distrito, zona, region, formato, categoria,
                    estado, es_sss, punto_compartido,
                    ano, mes, mes_texto, dias_mes,
                    trx_total, trx_promedio
                FROM \`${PROJECT_ID}.${DATASET_ID}.historial_ngr\`
                WHERE trx_total > 0
                ORDER BY marca, local, ano, mes
            `);
            cacheNGR.data = rows.map(r => ({
                marca:            r.marca || '',
                local:            r.local || '',
                store_num:        r.store_num || '',
                codigo_interno:   r.codigo_interno || '',
                distrito:         r.distrito || '',
                zona:             r.zona || '',
                region:           r.region || '',
                formato:          r.formato || '',
                categoria:        r.categoria || '',
                estado:           r.estado || '',
                es_sss:           !!r.es_sss,
                punto_compartido: r.punto_compartido || '',
                ano:              Number(r.ano),
                mes:              Number(r.mes),
                mes_texto:        r.mes_texto || '',
                dias_mes:         Number(r.dias_mes),
                trx_total:        Number(r.trx_total),
                trx_promedio:     Number(r.trx_promedio),
            }));
            cacheNGR.fetchedAt = new Date().toISOString();
            console.log(`[/api/ngr-locales] Loaded ${cacheNGR.data.length} rows.`);
        }
        res.json({ locales: cacheNGR.data, fetchedAt: cacheNGR.fetchedAt });
    } catch (err) {
        console.error('[/api/ngr-locales] Error:', err.message);
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
