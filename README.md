# 📊 NGR Market Share - Dashboard de Inteligencia Competitiva

Plataforma unificada para el monitoreo de cuota de mercado, análisis de puntos compartidos y validación de estimaciones para el grupo NGR (Bembos, ChinaWok, Papa Johns, Popeyes, etc.).

---

## 🏗 Arquitectura del Sistema

El proyecto opera bajo un modelo de **Frontend-Relay**:

1.  **Frontend**: Single Page Application (SPA) construida con **React + Vite + Tailwind CSS**.
2.  **Backend (Proxy)**: Servidor Node.js desplegado en **Google Cloud Run** que actúa como puente seguro hacia **BigQuery**. Evita exponer credenciales de GCP en el navegador.
3.  **Data Warehouse**: La "Fuente de Verdad" reside en BigQuery (`bigquery-388915`).

### 🔗 Enlaces Clave
- **Producción**: [ngr-market-share.web.app](https://ngr-market-share.web.app/)
- **API Proxy**: `https://ngr-proxy-server-gvxb4rjzvq-uc.a.run.app`

---

## 📂 Módulos del Dashboard

### 1. Market Share (Tab Principal)
- **Propósito**: Visualizar la cuota de mercado por marca y su evolución mensual.
- **Lógica**: Utiliza la rutina `calcular_diferencia_tickets_gemini`. Filtra estrictamente por `status_busqueda = 'OK'` para asegurar que solo los datos validados afecten los porcentajes.

### 2. Puntos Compartidos (Intersection Analysis)
- **Propósito**: Ver dónde coinciden marcas de NGR con competidores (ej. Food Courts).
- **Funcionalidad única**: 
    - **Agrupación**: Permite agrupar la data por Marca, Categoría (Fast Food, Pizza) o Propiedad (NGR vs Competencia).
    - **Detail Panel**: Al clickear un punto, muestra qué tiendas específicas están compitiendo ahí con sus KPIs de transacciones promedio.
- **Dato Crítico**: Cruza la data de competencia histórica con `ngrLocales` (datos internos) en tiempo real.

### 3. Estimaciones
- **Propósito**: Comparar las predicciones de ventas históricas contra la realidad validada por auditoría.
- **Alarmas inteligentes**:
    - `Caja Nueva`: Marcada manualmente por usuarios para seguimiento.
    - `Retorno Caja`: Detecta locales que no operaban hace 4+ meses y han regresado.

---

## ⚙️ Desarrollo y Operación

### 🛠 Configuración Local
1.  `npm install`
2.  `npm run dev` (El frontend apunta automáticamente al proxy de producción).

### 🚀 Despliegue
- **Frontend**: `firebase deploy --only hosting:ngr_dashboard`
- **Backend**: Desplegado vía contenedor a Cloud Run.

---

## 🧠 Guía para el Programador (o Agente AI)

### ⚠️ El "Gotcha" de las Fechas
- **Filtros (UI)**: El estado `filters.month` usa un índice **0-11** (Enero = "0", Febrero = "1") para ser compatible con `new Date().getMonth()`.
- **Datos (BigQuery/JSON)**: El campo `mes` en los registros es **1-12** (Enero = 1).
- **Lógica de Cruce**: Siempre verificar si se requiere un `+1` o `-1` al comparar meses entre los filtros y los datos de NGR/Competencia. 

### 🔄 Flujo de Datos en Puntos Compartidos
La agregación ocurre en el cliente (`useMemo`) dentro de `PuntosCompartidosDashboard.jsx`. 
- Se agrupa por el campo `punto_compartido` o `cc_nombre`.
- Si `showNGR` está activo, se inyectan los registros de `ngrLocales` en la misma tubería de procesamiento, añadiendo el sufijo ` (NGR)` a la marca.

### 🛠 Deduplicación
Existe una lógica de limpieza de locales duplicados que prioriza registros con `codigo_tienda` si las transacciones son idénticas, para evitar ruido visual en los dashboards de detalle.

---

## 📈 Herramientas de Scripting
El repositorio contiene varios scripts en Python (`load_historial_*.py`) usados para poblar BigQuery inicialmente con datos históricos de marcas específicas.

---

*Desarrollado para NGR Intelligence por el equipo de Advanced Agentic Coding.*
