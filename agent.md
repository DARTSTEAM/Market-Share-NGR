# Fundamental Rules for Market Share NGR

These rules define the data sources for the different tabs in the application and must be followed for any future modifications.

## 1. Market Share Tab
- **Primary Source**: BigQuery routine `bigquery-388915.ngr.calcular_diferencia_tickets_gemini`.
- **Filtering**: ONLY include records where `status_busqueda='OK'`.
- **Scope**: All metrics (Transactions, Market Share %, Evolution) and tables in this tab must exclusively reflect processed data that passed the audit.

## 2. Análisis Competencias Tab
- **Ticket/Amount Metrics**: Use `facturas_v2` dataset to report total business volume (Tickets Totales, Importe Total).
- **Audit Metrics**: Use the full routine `calcular_diferencia_tickets_gemini` (including errors) for audit tracking:
    - **Cajas Cerradas**: Total records filtered by specific period/filters.
    - **Cajas con Error**: Records where `status_busqueda != 'OK'`.
- **Tables**: Should show full routine data to allow managers to identify and fix specific store/POS errors.

## 3. Tickets Tab
- **Source**: Directly reflects `facturas_v2` for raw invoice auditing and consistency checking against the routine data.
