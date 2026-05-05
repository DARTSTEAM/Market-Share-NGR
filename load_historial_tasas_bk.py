#!/usr/bin/env python3
"""
ETL: Carga historial de tasas de cajas BURGER KING desde CSV a BigQuery.
Tabla destino: hike-agentic-playground.ngr.historial_tasas (APPEND)
"""
import csv
import json
import os
import sys
import re
from collections import defaultdict

# ── Configuración ─────────────────────────────────────────────────────────────
CSV_PATH = '/Users/bautiballatore/Downloads/BK HISTORICO CAJAS(CAJAS DETALLE SEP 25).csv'
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
    """'BK 02' → 'BURGER KING'"""
    c = codigo_tienda.strip().split()[0].upper() if codigo_tienda.strip() else ''
    if c == 'BK': return 'BURGER KING'
    return c

def parse_local(tienda: str) -> str:
    """'BK 02 - LARCO' → 'LARCO'"""
    return tienda.split(' - ', 1)[1].strip() if ' - ' in tienda else tienda.strip()

def parse_codigo_tienda(tienda: str) -> str:
    """'BK 02 - LARCO' → 'BK 02'"""
    return tienda.split(' - ', 1)[0].strip() if ' - ' in tienda else tienda.strip()

def clean_caja(caja_txt: str) -> str:
    """'99 K' or '99 D' -> '99'"""
    caja_txt = caja_txt.strip()
    # Si empieza con 99 y sigue K o D, devolvemos 99
    if re.match(r'^99\s*[KD]$', caja_txt, re.I):
        return '99'
    return caja_txt

# ── Agregación ────────────────────────────────────────────────────────────────
# Usamos un dict para sumar 99 K + 99 D
agg = defaultdict(float)
meta = {} # Para guardar los datos base de cada clave (tienda, ano, mes, caja)

errors = []
rows_processed = 0

print(f"Leyendo CSV: {CSV_PATH}")

try:
    with open(CSV_PATH, encoding='latin-1', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        for i, raw in enumerate(reader, 1):
            row = {k.strip(): (v or '').strip() for k, v in raw.items() if k}
            
            tienda_raw = row.get('Tienda - Salón', '').strip()
            if not tienda_raw: continue
            
            ano_txt = row.get('AÑO', '').strip()
            periodo = row.get('Periodo', '').strip()
            atributo = row.get('Atributo', '').strip()
            valor_txt = row.get('Valor', '').strip()
            
            # Mes desde periodo (ej: "Set 2025")
            mes_txt = periodo.split()[0] if periodo else ''
            mes = MES_NUM.get(mes_txt.capitalize())
            
            if mes is None:
                errors.append(f"Fila {i}: mes desconocido '{mes_txt}' en periodo '{periodo}'")
                continue
            
            try:
                ano = int(ano_txt)
            except ValueError:
                errors.append(f"Fila {i}: año inválido '{ano_txt}'")
                continue
            
            try:
                valor = float(valor_txt.replace(',', '.')) if valor_txt else 0.0
            except ValueError:
                errors.append(f"Fila {i}: valor inválido '{valor_txt}'")
                continue
                
            caja = clean_caja(atributo)
            codigo_tienda = parse_codigo_tienda(tienda_raw)
            
            # Clave para agregación
            key = (codigo_tienda, ano, mes, caja)
            
            if key not in meta:
                meta[key] = {
                    'tienda':        tienda_raw,
                    'codigo_tienda': codigo_tienda,
                    'competidor':    parse_competidor(codigo_tienda),
                    'local':         parse_local(tienda_raw),
                    'mes':           mes,
                    'mes_texto':     mes_txt.capitalize(),
                    'ano':           ano,
                    'caja':          caja,
                }
            
            agg[key] += valor
            rows_processed += 1

except FileNotFoundError:
    print(f"ERROR: Archivo no encontrado: {CSV_PATH}")
    sys.exit(1)

# Convertir a formato BigQuery
final_rows = []
for key, total_valor in agg.items():
    row = meta[key]
    row['trx_promedio'] = round(total_valor, 2)
    final_rows.append(row)

print(f"✓ Procesadas {rows_processed} filas. Resultaron {len(final_rows)} registros únicos tras agrupar cajas.")
if errors:
    print(f"⚠ Encontrados {len(errors)} errores:")
    for e in errors[:5]: print(f"  - {e}")

if not final_rows:
    print("ERROR: No hay datos para cargar.")
    sys.exit(1)

# ── Carga a BigQuery ───────────────────────────────────────────────────────────
try:
    from google.cloud import bigquery
except ImportError:
    print("\nERROR: google-cloud-bigquery no instalado.")
    sys.exit(1)

client    = bigquery.Client(project=PROJECT)
table_ref = f"{PROJECT}.{DATASET}.{TABLE}"

schema = [
    bigquery.SchemaField('tienda',        'STRING'),
    bigquery.SchemaField('codigo_tienda', 'STRING'),
    bigquery.SchemaField('competidor',    'STRING'),
    bigquery.SchemaField('local',         'STRING'),
    bigquery.SchemaField('mes',           'INT64'),
    bigquery.SchemaField('mes_texto',     'STRING'),
    bigquery.SchemaField('ano',           'INT64'),
    bigquery.SchemaField('caja',          'STRING'),
    bigquery.SchemaField('trx_promedio',  'FLOAT64'),
]

# Configuración de carga (APPEND)
job_config = bigquery.LoadJobConfig(
    schema=schema,
    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
)

# Opcional: Podríamos borrar primero los registros de BK para evitar duplicados si re-ejecutamos
# pero por ahora haremos append simple como se pidió.
print(f"\nCargando {len(final_rows)} filas a {table_ref} (APPEND)...")
job = client.load_table_from_json(final_rows, table_ref, job_config=job_config)
job.result()

print(f"✓ Carga completada con éxito.")
