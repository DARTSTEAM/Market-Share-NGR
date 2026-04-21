# Guide for AI Agents (Antigravity/Developer)

## 🏗 System Overview
- **Type**: Competitive Intelligence Dashboard.
- **Backend**: Node.js Proxy on Cloud Run (fetching from BQ).
- **Frontend**: React (Vite).
- **Auth**: Google/Microsoft OAuth (managed in `App.jsx`).

## 📊 Data Mapping
- **Competition**: Records with `is_ngr=false` or from `records` state.
- **NGR**: Records with `is_ngr=true` or from `ngrLocales` state.
- **PC Dashboard**: High complexity. Merges competition and NGR records based on `punto_compartido`.

## ⏱️ Technical Constraints (The "Traps")
1. **Month Offsets**:
   - `filters.month` in UI state is **0-indexed string** ("0" for Jan).
   - Data records (mes) are **1-indexed numbers/strings** (1 for Jan).
   - Logic at `App.jsx` handles this with `parseInt(rec.mes) - 1`.
   - Logic at `PuntosCompartidosDashboard.jsx` handles this with `(parseInt(filters.month) + 1)`.
   - **DO NOT** change this without reviewing both files, as they are currently in sync.

2. **NGR Labels**:
   - For internal differentiation in Puntos Compartidos, NGR brands are suffixed with ` (NGR)`.

3. **Aggregation Logic**:
   - Summary cards must match Detail panel. Always use the central `pcData` or `ngrByPC` grouping logic in `PuntosCompartidosDashboard.jsx`.

## 🚀 Deployment
- Frontend: `firebase deploy --only hosting:ngr_dashboard`
- BigQuery Project: `bigquery-388915`
- Dataset: `ngr`
