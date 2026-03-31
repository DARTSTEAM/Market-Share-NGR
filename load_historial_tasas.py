#!/usr/bin/env python3
"""
ETL: Carga historial de tasas de cajas KFC desde CSV a BigQuery.
Tabla destino: hike-agentic-playground.ngr.historial_tasas
"""
import csv
import json
import os
import sys

# ── Configuración ─────────────────────────────────────────────────────────────
CSV_PATH = '/Users/bautiballatore/Organizado/Trabajo/Market-Share-NGR/HISTORICO DE CAJAS _ KFC (2022 - 2026)(HISTORICO CAJAS).csv'
PROJECT  = 'hike-agentic-playground'
DATASET  = 'ngr'
TABLE    = 'historial_tasas'

# ── Mapeo de meses español ─────────────────────────────────────────────────────
MES_NUM = {
    'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4,
    'May': 5, 'Jun': 6, 'Jul': 7, 'Ago': 8,
    'Sep': 9, 'Set': 9, 'Oct': 10, 'Nov': 11, 'Dic': 12
}

def parse_competidor(codigo_tienda: str) -> str:
    """'KFC 03' → 'KFC'"""
    return codigo_tienda.strip().split()[0] if codigo_tienda.strip() else ''

def parse_local(tienda: str) -> str:
    """'KFC 03 - AVIACION' → 'AVIACION', sin match → tienda completa"""
    return tienda.split(' - ', 1)[1].strip() if ' - ' in tienda else tienda.strip()

def find_col(row: dict, candidates: list) -> str:
    """Busca el valor de la primera columna que exista en el dict."""
    for c in candidates:
        if c in row:
            return row[c]
    return ''

# ── Parseo del CSV ─────────────────────────────────────────────────────────────
rows   = []
errors = []

with open(CSV_PATH, encoding='latin-1', newline='') as f:
    reader = csv.DictReader(f, delimiter=';')
    # Normaliza los nombres de columna (strip + upper para comparar)
    for i, raw in enumerate(reader, 1):
        row = {k.strip(): v for k, v in raw.items()}  # strip whitespace from keys

        tienda        = row.get('TIENDA', '').strip()
        codigo_tienda = row.get('CODIGO TIENDA', '').strip()
        mes_txt       = row.get('MES', '').strip()
        caja          = row.get('CAJA', '').strip()
        trx_txt       = row.get('TRX PROMEDIO', '').strip()

        # AÑO puede venir con encoding roto (latin-1 BOM)
        ano_txt = find_col(row, ['AÑO', 'A\xd1O', 'AÃ±O', 'ANO', 'A?O', 'AO'])
        ano_txt = ano_txt.strip() if ano_txt else ''

        # Mes → número
        mes = MES_NUM.get(mes_txt)
        if mes is None:
            errors.append(f"Fila {i}: mes desconocido '{mes_txt}'")
            continue

        # Año
        try:
            ano = int(ano_txt)
        except ValueError:
            errors.append(f"Fila {i}: año inválido '{ano_txt}'")
            continue

        # TRX
        try:
            trx = float(trx_txt.replace(',', '.')) if trx_txt else None
        except ValueError:
            errors.append(f"Fila {i}: trx inválida '{trx_txt}'")
            continue

        rows.append({
            'tienda':        tienda,
            'codigo_tienda': codigo_tienda,
            'competidor':    parse_competidor(codigo_tienda),
            'local':         parse_local(tienda),
            'mes':           mes,
            'mes_texto':     mes_txt,
            'ano':           ano,
            'caja':          caja,
            'trx_promedio':  trx,
        })

print(f"✓ Parseadas {len(rows)} filas  |  {len(errors)} errores")
if errors:
    print("  Primeros errores:")
    for e in errors[:10]:
        print("   ", e)

if not rows:
    print("ERROR: No hay filas válidas para cargar.")
    sys.exit(1)

# ── Muestra de las primeras filas ──────────────────────────────────────────────
print("\nMuestra (primeras 3):")
for r in rows[:3]:
    print(" ", r)

# ── Carga a BigQuery ───────────────────────────────────────────────────────────
try:
    from google.cloud import bigquery
except ImportError:
    print("\nERROR: google-cloud-bigquery no instalado.")
    print("Ejecutá:  pip install google-cloud-bigquery")
    sys.exit(1)

client    = bigquery.Client(project=PROJECT)
table_ref = f"{PROJECT}.{DATASET}.{TABLE}"

schema = [
    bigquery.SchemaField('tienda',        'STRING',  description='Nombre completo del local (ej: KFC 03 - AVIACION)'),
    bigquery.SchemaField('codigo_tienda', 'STRING',  description='Código corto (ej: KFC 03)'),
    bigquery.SchemaField('competidor',    'STRING',  description='Cadena (ej: KFC)'),
    bigquery.SchemaField('local',         'STRING',  description='Nombre del local (ej: AVIACION)'),
    bigquery.SchemaField('mes',           'INT64',   description='Mes numérico 1-12'),
    bigquery.SchemaField('mes_texto',     'STRING',  description='Mes texto abreviado (Ene, Feb…)'),
    bigquery.SchemaField('ano',           'INT64',   description='Año (ej: 2022)'),
    bigquery.SchemaField('caja',          'STRING',  description='Tal como viene en el Excel (ej: Caja 2, Caja 99 D)'),
    bigquery.SchemaField('trx_promedio',  'FLOAT64', description='Promedio diario de transacciones'),
]

job_config = bigquery.LoadJobConfig(
    schema=schema,
    write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
)

print(f"\nCargando {len(rows)} filas a {table_ref}…")
job = client.load_table_from_json(rows, table_ref, job_config=job_config)
job.result()  # espera a que termine

loaded = client.get_table(table_ref)
print(f"✓ Cargadas {loaded.num_rows} filas en {table_ref}")
print(f"  Última modificación: {loaded.modified}")
