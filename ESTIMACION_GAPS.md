# Estimación de Transacciones en Períodos Sin Captura

## Contexto

El pipeline de auditoría de NGR mide las cajas POS de la competencia una vez por mes. Sin embargo, no siempre se logra capturar todas las cajas en el ciclo esperado. Cuando esto ocurre, el sistema de la rutina principal (`calcular_diferencia_tickets_gemini`) hace match con el ciclo inmediatamente anterior disponible y lo marca como **`HISTORIAL_ANTIGUO`**.

Esto produce registros donde el `delta_dias` (días entre mediciones) es mucho mayor de lo esperado (~30 días), típicamente entre 55 y 100 días, indicando que uno o más meses no fueron capturados.

---

## El Problema

Dado un registro con `HISTORIAL_ANTIGUO`:

```
Noviembre 29 ──── [diciembre SIN MEDIR] ──── Febrero 2
 (última medición)                           (medición actual)
       ←──────────── 64 días ────────────────►
```

El `transacciones_diferencial` observado cubre **todo el período** (64 días). Pero queremos saber específicamente cuántas transacciones ocurrieron en el **período no capturado** (el gap de ~34 días correspondiente a diciembre).

---

## Rutina: `estimar_gap_transacciones`

### Ubicación en BigQuery

```
hike-agentic-playground.ngr.estimar_gap_transacciones(start_date DATE)
```

### Cálculo del Gap

```
dias_gap = delta_dias - 30
gap_inicio = fecha_anterior + 30 días
gap_fin    = fecha_actual
mes_gap    = EXTRACT(MONTH FROM gap_inicio)
```

> ⚠️ Si `delta_dias > 60` (`gap_multiple_meses = TRUE`), el gap cubre 2 o más meses. En esta versión se tratan como un bloque único. La desagregación por mes se implementará cuando el historial lo permita.

---

## Métodos de Estimación

### Nivel 1 — ESTACIONAL *(confianza ALTA/MEDIA)*

Usado cuando la caja tiene **≥ 2 registros OK** en el mismo mes calendario en años anteriores.

```
tasa_diaria = AVG(promedio_transacciones_diarias)
              WHERE caja = X AND mes = mes_gap AND status = 'OK'

transacciones_estimadas = tasa_diaria × dias_gap
```

**Ventaja:** Captura estacionalidad. Diciembre históricamente alto → estimación ajustada al alza.

**Disponibilidad actual:** Limitada. El dataset cubre nov-24 a feb-26, por lo que pocos locales tienen 2+ ciclos OK del mismo mes. Se irá activando automáticamente con más historia.

---

### Nivel 2 — PROMEDIO_GLOBAL *(confianza BAJA/MUY_BAJA)*

Usado cuando la caja tiene **≥ 1 registro OK** en cualquier mes, pero no suficiente para el mismo mes.

```
tasa_diaria = AVG(promedio_transacciones_diarias)
              WHERE caja = X AND status = 'OK' (todos los meses disponibles)

transacciones_estimadas = tasa_diaria × dias_gap
```

**Ventaja:** Más robusto que PRO_RATA por usar ciclos limpios (sin arrastre de gap).

---

### Nivel 3 — PRO_RATA *(confianza SIN_HISTORIAL)*

Usado cuando la caja **no tiene ningún registro OK** en el período disponible (siempre fue salteada).

```
tasa_diaria = transacciones_diferencial / delta_dias
              (ya calculado como promedio_transacciones_diarias en el registro actual)

transacciones_estimadas = tasa_diaria × dias_gap
```

**Nota:** Asume que el ritmo del gap fue igual al del período observado completo. Es la estimación más conservadora y menos precisa.

---

## Filtro Anti-Contador

Cajas con contadores de ticket acumulados erróneos (registros de caja con millones de transacciones) son excluidas del historial mediante el filtro:

```sql
CAST(promedio_transacciones_diarias AS FLOAT64) < 2000
```

Ninguna caja real supera ~600 tx/día. El umbral de 2.000 deja un margen amplio.

---

## Rango de Incertidumbre

Cuando hay historial suficiente para calcular una desviación estándar (σ), se reportan rangos:

```
estimacion_baja = (tasa_diaria - 1σ) × dias_gap
estimacion_alta = (tasa_diaria + 1σ) × dias_gap
```

Cuando solo hay una observación (PROMEDIO_GLOBAL con n=1 o PRO_RATA), `estimacion_baja == estimacion_alta` porque no hay σ disponible.

---

## Campos de Salida

| Campo | Descripción |
|---|---|
| `competidor / local / caja / codigo_tienda` | Identidad de la caja |
| `mes / ano / region / distrito` | Período y geografía |
| `dias_gap` | Días estimados del período no capturado |
| `nombre_mes_gap` | Mes calendario del gap |
| `gap_multiple_meses` | `TRUE` si el gap abarca 2+ meses |
| `tasa_diaria_usada` | Tasa diaria aplicada para la estimación |
| `transacciones_estimadas` | **Estimación central** ← campo principal |
| `estimacion_baja / estimacion_alta` | Rango ±1σ (cuando disponible) |
| `metodo_estimacion` | ESTACIONAL / PROMEDIO_GLOBAL / PRO_RATA |
| `confianza` | ALTA / MEDIA / BAJA / MUY_BAJA / SIN_HISTORIAL |
| `n_obs_estacional / n_obs_global` | N de ciclos históricos usados |
| `transacciones_observadas_total` | Tx reales del período largo completo |

---

## Evolución Esperada del Modelo

Con el paso de los meses, la proporción de estimaciones por método mejorará automáticamente:

| Meses de historia | Método predominante | Confianza típica |
|---|---|---|
| 4 meses (actual) | PROMEDIO_GLOBAL / PRO_RATA | MUY_BAJA / SIN_HISTORIAL |
| 12 meses | PROMEDIO_GLOBAL con n≥2 | BAJA |
| 24 meses | ESTACIONAL (mismo mes en 2 años) | MEDIA / ALTA |
| 36+ meses | ESTACIONAL robusto | ALTA |

---

## Ejemplo Real

**BK MERCADERES — Caja 01** (febero 2026)

- Última medición: 29/11/2025
- Medición actual: 02/02/2026
- `delta_dias` = 64 días → `dias_gap` = 34 días (diciembre no capturado)
- Tiene 1 ciclo OK previo con tasa = 79.14 tx/día
- Método: **PROMEDIO_GLOBAL**
- **Estimación: 34 × 79.14 = 2.691 transacciones**

---

## Acceso en el Dashboard

En la solapa **Auditoría → Gaps** del dashboard [ngr-market-share.web.app](https://ngr-market-share.web.app), se puede filtrar por:
- Competidor / Mes del gap / Región
- Confianza / Método de estimación
- Búsqueda libre por local, tienda, caja o distrito
