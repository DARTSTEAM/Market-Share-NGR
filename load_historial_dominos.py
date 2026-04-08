#!/usr/bin/env python3
"""
ETL: Carga historial de transacciones Dominos → historial_tasas
CSV: HISTORICO DE TIENDAS _ LC & DMN(DOMINOS).csv
Columnas CSV: Marca;Tienda;Año;Mes;Promedio diario

Schema destino (igual que KFC/PH):
  tienda, codigo_tienda, competidor, local, mes, mes_texto, ano, caja, trx_promedio

Ejecutar:  python3 load_historial_dominos.py [--dry-run]
"""
import csv
import sys
from collections import Counter

# ── Configuración ──────────────────────────────────────────────────────────────
CSV_PATH = '/Users/bautiballatore/Organizado/Trabajo/Market-Share-NGR/HISTORICO DE TIENDAS _ LC & DMN(DOMINOS).csv'
PROJECT  = 'hike-agentic-playground'
DATASET  = 'ngr'
TABLE    = 'historial_tasas'
DRY_RUN  = '--dry-run' in sys.argv

# ── Mapeo de meses ─────────────────────────────────────────────────────────────
MES_NUM = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Setiembre': 9, 'Octubre': 10,
    'Noviembre': 11, 'Diciembre': 12,
    'Ene': 1, 'Feb': 2, 'Mar': 3, 'Abr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Ago': 8, 'Sep': 9, 'Set': 9, 'Oct': 10, 'Nov': 11, 'Dic': 12,
}

# ── Parseo del CSV ─────────────────────────────────────────────────────────────
rows   = []
errors = []
seen   = set()  # dedup por (codigo_tienda, ano, mes)

with open(CSV_PATH, encoding='latin-1', newline='') as f:
    reader = csv.DictReader(f, delimiter=';')
    for i, raw in enumerate(reader, 1):
        row = {k.strip(): (v or '').strip() for k, v in raw.items()}

        marca   = row.get('Marca', '')
        tienda  = row.get('Tienda', '')
        mes_txt = row.get('Mes', '')
        trx_txt = row.get('Promedio diario', '')

        # Año tolerando encodings rotos
        ano_txt = ''
        for k in ['Año', 'A\xf1o', 'AÑO', 'Ano']:
            if k in row and row[k]:
                ano_txt = row[k]
                break

        if not tienda or 'DOMINO' not in marca.upper():
            continue

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

        # Parsear codigo_tienda y local  →  'DMN 624 - BARRANCO'
        if ' - ' in tienda:
            codigo_tienda = tienda.split(' - ', 1)[0].strip()   # 'DMN 624'
            local         = tienda.split(' - ', 1)[1].strip()   # 'BARRANCO'
        else:
            codigo_tienda = tienda.strip()
            local         = tienda.strip()

        # Deduplicación
        key = (codigo_tienda.upper(), ano, mes)
        if key in seen:
            errors.append(f"Fila {i}: duplicado ignorado {key}")
            continue
        seen.add(key)

        rows.append({
            'tienda':        tienda,           # 'DMN 624 - BARRANCO'
            'codigo_tienda': codigo_tienda,    # 'DMN 624'
            'competidor':    'DOMINOS',
            'local':         local,            # 'BARRANCO'
            'mes':           mes,
            'mes_texto':     mes_txt,
            'ano':           ano,
            'caja':          '',               # Dominos no tiene caja
            'trx_promedio':  trx,
        })

print(f"✓ Parseadas {len(rows)} filas  |  {len(errors)} errores/duplicados")
if errors[:10]:
    for e in errors[:10]:
        print("   ", e)

print(f"\nMuestra (primeras 5):")
for r in rows[:5]:
    print(f"  {r['codigo_tienda']}  local={r['local']}  {r['mes_texto']} {r['ano']}  trx={r['trx_promedio']}")

by_year = Counter(r['ano'] for r in rows)
print("\nFilas por año:")
for y in sorted(by_year):
    print(f"  {y}: {by_year[y]}")

if not rows:
    print("ERROR: Sin filas válidas.")
    sys.exit(1)

if DRY_RUN:
    print("\n[DRY RUN] No se tocó BigQuery.")
    sys.exit(0)

# ── BigQuery ───────────────────────────────────────────────────────────────────
try:
    from google.cloud import bigquery
except ImportError:
    print("ERROR: pip install google-cloud-bigquery")
    sys.exit(1)

client    = bigquery.Client(project=PROJECT)
table_ref = f"{PROJECT}.{DATASET}.{TABLE}"

schema = [
    bigquery.SchemaField('tienda',        'STRING',  description='Nombre completo (ej: DMN 624 - BARRANCO)'),
    bigquery.SchemaField('codigo_tienda', 'STRING',  description='Código corto (ej: DMN 624)'),
    bigquery.SchemaField('competidor',    'STRING',  description='Cadena (DOMINOS)'),
    bigquery.SchemaField('local',         'STRING',  description='Nombre del local (ej: BARRANCO)'),
    bigquery.SchemaField('mes',           'INT64',   description='Mes numérico 1-12'),
    bigquery.SchemaField('mes_texto',     'STRING',  description='Mes en texto (Enero, Febrero…)'),
    bigquery.SchemaField('ano',           'INT64',   description='Año (ej: 2023)'),
    bigquery.SchemaField('caja',          'STRING',  description='Vacío para Dominos'),
    bigquery.SchemaField('trx_promedio',  'FLOAT64', description='Promedio diario de transacciones'),
]

# Verificar si ya hay datos de DOMINOS en historial_tasas
existing = list(client.query(f"""
    SELECT COUNT(*) as n FROM `{table_ref}` WHERE competidor = 'DOMINOS'
""").result())[0]['n']

if existing > 0:
    print(f"\n⚠️  Ya existen {existing} filas de DOMINOS en {TABLE}.")
    ans = input("¿Borrar y recargar? [s/N]: ").strip().lower()
    if ans != 's':
        print("Cancelado.")
        sys.exit(0)
    client.query(f"DELETE FROM `{table_ref}` WHERE competidor = 'DOMINOS'").result()
    print(f"  ✓ Eliminadas {existing} filas previas de DOMINOS.")

# APPEND → no toca KFC ni PH
job_config = bigquery.LoadJobConfig(
    schema=schema,
    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
)

print(f"\nCargando {len(rows)} filas en {table_ref}…")
job = client.load_table_from_json(rows, table_ref, job_config=job_config)
job.result()

loaded = client.get_table(table_ref)
print(f"✓ {table_ref} ahora tiene {loaded.num_rows} filas totales")

# Estado final
for r in client.query(f"""
    SELECT competidor, COUNT(*) as n, MIN(ano) as desde, MAX(ano) as hasta
    FROM `{table_ref}` GROUP BY competidor ORDER BY competidor
""").result():
    print(f"  {r['competidor']}: {r['n']} filas  ({r['desde']} - {r['hasta']})")
