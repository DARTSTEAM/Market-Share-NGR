CREATE OR REPLACE TABLE FUNCTION `hike-agentic-playground.ngr.calcular_diferencia_tickets_gemini`(start_date_param DATE)
AS
WITH
PuntosCompartidosSummary AS (
  SELECT
    TRIM(TiendTO_PC) AS pc_key,
    STRING_AGG(DISTINCT TRIM(Marca) ORDER BY TRIM(Marca)) AS marcas_en_pc,
    COUNT(DISTINCT TRIM(Marca)) AS n_marcas_en_pc
  FROM `hike-agentic-playground.ngr.tiendas_v2`
  WHERE PC = 'SI'
    AND TiendTO_PC IS NOT NULL
    AND TRIM(TiendTO_PC) NOT IN ('-', '', 'NO')
  GROUP BY TRIM(TiendTO_PC)
),
DatosEstandarizados AS (
  SELECT
    UPPER(TRIM(competidor)) AS competidor,
    REGEXP_REPLACE(UPPER(TRIM(codigo_tienda)), r'\s', '') AS codigo_tienda,
    REGEXP_REPLACE(UPPER(TRIM(local)), r'\.\s+', '.') AS local,
    CAST(numero_de_caja AS STRING) AS caja,
    fecha, hora,
    numero_de_ticket AS id_boleta,
    filename,
    fecha_carga
  FROM `hike-agentic-playground.ngr.facturas_v2`
),
DominosData AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY competidor, codigo_tienda ORDER BY fecha) AS dia_id
  FROM DatosEstandarizados WHERE competidor = 'DOMINOS'
),
RestoData AS (
  SELECT *, DENSE_RANK() OVER (PARTITION BY competidor, codigo_tienda, caja ORDER BY fecha) AS dia_id
  FROM DatosEstandarizados WHERE competidor != 'DOMINOS'
),
RegistrosNumeradosPorDia AS (
  SELECT * FROM DominosData UNION ALL SELECT * FROM RestoData
),
CierreDeCadaDia AS (
  SELECT * FROM (
    SELECT *,
      DATETIME(fecha, hora) AS fecha_y_hora_registro,
      SAFE_CAST(REGEXP_EXTRACT(id_boleta, r'(\d+)$') AS INT64) AS correlativo_ticket,
      CASE WHEN EXTRACT(HOUR FROM DATETIME(fecha, hora)) < 14 THEN 1 ELSE 2 END AS ac,
      ROW_NUMBER() OVER (
        PARTITION BY competidor, dia_id,
          codigo_tienda,
          CASE WHEN competidor != 'DOMINOS' THEN caja END
        ORDER BY DATETIME(fecha, hora) DESC, fecha_carga DESC
      ) as rn_dia
    FROM RegistrosNumeradosPorDia
  )
  WHERE rn_dia = 1
),
JoinConAnterior AS (
  SELECT
    actual.competidor, actual.codigo_tienda, actual.local, actual.caja,
    actual.correlativo_ticket AS ticket_actual,
    anterior.correlativo_ticket AS ticket_anterior,
    actual.fecha_y_hora_registro,
    anterior.fecha_y_hora_registro AS fecha_anterior,
    actual.filename AS filename_actual,
    anterior.filename AS filename_anterior,
    actual.ac AS ac_actual, anterior.ac AS ac_anterior,
    CASE
      WHEN actual.local IS NULL OR TRIM(actual.local) = '' THEN 'ALERTA_SIN_LOCAL'
      WHEN (actual.caja IS NULL OR TRIM(actual.caja) = '') AND actual.competidor != 'DOMINOS' THEN 'ALERTA_SIN_CAJA'
      ELSE 'OK'
    END AS status_validacion
  FROM CierreDeCadaDia AS actual
  LEFT JOIN CierreDeCadaDia AS anterior
    ON actual.competidor = anterior.competidor AND actual.dia_id = anterior.dia_id + 1
    AND (
      (actual.competidor = 'DOMINOS' AND actual.codigo_tienda = anterior.codigo_tienda)
      OR (actual.competidor != 'DOMINOS' AND actual.codigo_tienda = anterior.codigo_tienda AND actual.caja = anterior.caja)
    )
  WHERE CAST(actual.fecha_y_hora_registro AS DATE) >= start_date_param
    AND CAST(actual.fecha_y_hora_registro AS DATE) <= CURRENT_DATE()
),
CalculoFinal AS (
  SELECT *,
    CASE
      WHEN status_validacion != 'OK' THEN 0
      WHEN fecha_anterior IS NULL OR CAST(fecha_anterior AS DATE) < DATE_SUB(CAST(fecha_y_hora_registro AS DATE), INTERVAL 4 MONTH) THEN ticket_actual
      WHEN ticket_actual < ticket_anterior * 0.9 THEN ticket_actual
      ELSE GREATEST(ticket_actual - ticket_anterior, 0)
    END AS transacciones_diferencial,
    CASE
      WHEN fecha_anterior IS NOT NULL AND CAST(fecha_anterior AS DATE) >= DATE_SUB(CAST(fecha_y_hora_registro AS DATE), INTERVAL 4 MONTH) THEN
        DATE_DIFF(CAST(fecha_y_hora_registro AS DATE), CAST(fecha_anterior AS DATE), DAY) +
        CASE
          WHEN ac_actual = ac_anterior THEN 0
          WHEN ac_anterior = 1 AND ac_actual = 2 THEN 1
          WHEN ac_anterior = 2 AND ac_actual = 1 THEN -1
          ELSE 0
        END
      ELSE NULL
    END AS delta_dias
  FROM JoinConAnterior
),
ResultadoFinal AS (
  SELECT *,
    CASE
      WHEN status_validacion != 'OK' THEN status_validacion
      WHEN fecha_anterior IS NULL OR CAST(fecha_anterior AS DATE) < DATE_SUB(CAST(fecha_y_hora_registro AS DATE), INTERVAL 4 MONTH) THEN 'SIN_HISTORIAL'
      WHEN ticket_actual < ticket_anterior * 0.9 THEN 'REINICIO_TICKETS'
      WHEN DATE_DIFF(CAST(fecha_y_hora_registro AS DATE), CAST(fecha_anterior AS DATE), DAY) > 40 THEN 'HISTORIAL_ANTIGUO'
      WHEN transacciones_diferencial > 20000 THEN 'REVISAR_TRANSACCIONES_ALTAS'
      ELSE 'OK'
    END AS status_busqueda
  FROM CalculoFinal
),
JoinConTiendas AS (
  SELECT
    rf.*,
    COALESCE(t1.Region,   t2.Region,   t3.Region)   AS region,
    COALESCE(t1.Distrito, t2.Distrito, t3.Distrito)  AS distrito,
    NULLIF(TRIM(COALESCE(
      IF(t1.PC = 'SI', t1.TiendTO_PC, NULL),
      IF(t2.PC = 'SI', t2.TiendTO_PC, NULL),
      IF(t3.PC = 'SI', t3.TiendTO_PC, NULL)
    )), '-') AS punto_compartido,
    NULLIF(TRIM(COALESCE(
      IF(t1.CC_Puntos_Compartidos = 'SI', t1.TiendTO_Centro_Comercial, NULL),
      IF(t2.CC_Puntos_Compartidos = 'SI', t2.TiendTO_Centro_Comercial, NULL),
      IF(t3.CC_Puntos_Compartidos = 'SI', t3.TiendTO_Centro_Comercial, NULL)
    )), '-') AS cc_punto_compartido,
    NULLIF(TRIM(COALESCE(t1.Grupos_CC, t2.Grupos_CC, t3.Grupos_CC)), '-') AS grupos_cc,
    NULLIF(TRIM(COALESCE(t1.Grupo, t2.Grupo, t3.Grupo)), '-') AS grupo_tienda
  FROM ResultadoFinal AS rf
  LEFT JOIN `hike-agentic-playground.ngr.tiendas_v2` AS t1
    ON UPPER(REGEXP_REPLACE(rf.codigo_tienda, r'\s', '')) = UPPER(REGEXP_REPLACE(t1.Codigo_tienda, r'\s', ''))
  LEFT JOIN `hike-agentic-playground.ngr.tiendas_v2` AS t2
    ON t1.Codigo_tienda IS NULL
    AND UPPER(TRIM(rf.competidor)) = UPPER(TRIM(t2.Marca))
    AND rf.local = REGEXP_REPLACE(UPPER(TRIM(t2.Tienda_nombre)), r'\.\s+', '.')
  LEFT JOIN `hike-agentic-playground.ngr.tiendas_v2` AS t3
    ON t1.Codigo_tienda IS NULL AND t2.Marca IS NULL
    AND REGEXP_REPLACE(UPPER(rf.competidor),  r'[^A-Z0-9]', '') = REGEXP_REPLACE(UPPER(t3.Marca), r'[^A-Z0-9]', '')
    AND SAFE_CAST(REGEXP_EXTRACT(rf.codigo_tienda,  r'\d+') AS INT64) IS NOT NULL
    AND SAFE_CAST(REGEXP_EXTRACT(t3.Codigo_tienda, r'\d+') AS INT64) IS NOT NULL
    AND SAFE_CAST(REGEXP_EXTRACT(rf.codigo_tienda,  r'\d+') AS INT64) = SAFE_CAST(REGEXP_EXTRACT(t3.Codigo_tienda, r'\d+') AS INT64)
),
JoinConPC AS (
  SELECT
    jt.*,
    pcs.marcas_en_pc,
    pcs.n_marcas_en_pc
  FROM JoinConTiendas AS jt
  LEFT JOIN PuntosCompartidosSummary AS pcs
    ON TRIM(jt.punto_compartido) = pcs.pc_key
    AND jt.punto_compartido IS NOT NULL
)
SELECT
  CASE
    WHEN EXTRACT(DAY FROM fecha_y_hora_registro) <= 14 THEN EXTRACT(MONTH FROM DATE_SUB(fecha_y_hora_registro, INTERVAL 1 MONTH))
    ELSE EXTRACT(MONTH FROM fecha_y_hora_registro)
  END AS mes,
  CASE
    WHEN EXTRACT(DAY FROM fecha_y_hora_registro) <= 14 THEN EXTRACT(YEAR FROM DATE_SUB(fecha_y_hora_registro, INTERVAL 1 MONTH))
    ELSE EXTRACT(YEAR FROM fecha_y_hora_registro)
  END AS ano,
  competidor, codigo_tienda, local, caja, status_busqueda,
  transacciones_diferencial, ticket_actual, ticket_anterior,
  fecha_y_hora_registro, fecha_anterior,
  ac_actual AS ac, filename_actual, filename_anterior, delta_dias,
  ROUND(SAFE_DIVIDE(transacciones_diferencial, delta_dias), 0) AS promedio_transacciones_diarias,
  region, distrito,
  punto_compartido,
  cc_punto_compartido,
  grupos_cc,
  marcas_en_pc,
  n_marcas_en_pc,
  grupo_tienda
FROM JoinConPC;
