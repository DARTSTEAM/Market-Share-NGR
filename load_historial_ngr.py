#!/usr/bin/env python3
"""
ETL: Carga histórico de locales propios NGR → ngr.historial_ngr
CSV: HISTÓRICO NGR(Hoja1).csv
Marcas: POPEYES, Bembos, Papa Johns, CHINAWOK

Ejecutar:  python3 load_historial_ngr.py [--dry-run]
"""
import csv
import re
import sys
from collections import Counter

# ── Configuración ──────────────────────────────────────────────────────────────
CSV_PATH = '/Users/bautiballatore/Downloads/HISTÓRICO NGR(Hoja1).csv'
PROJECT  = 'hike-agentic-playground'
DATASET  = 'ngr'
TABLE    = 'historial_ngr'
DRY_RUN  = '--dry-run' in sys.argv

# ── Mapeo de meses ─────────────────────────────────────────────────────────────
MES_NUM = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Setiembre': 9, 'Octubre': 10,
    'Noviembre': 11, 'Diciembre': 12,
}

# ── Regex para parsear nombre de tienda ───────────────────────────────────────
# '406-(5100)Centro Cívico'  → store_num='406', cod_int='5100', local='Centro Cívico'
# '206-(2100) Monterrico'   → store_num='206', cod_int='2100', local='Monterrico'
TIENDA_RE = re.compile(r'^(\d+)-\((\w+)\)\s*(.*)')

def parse_tienda(t):
    t = (t or '').strip()
    m = TIENDA_RE.match(t)
    if m:
        return m.group(1), m.group(2), m.group(3).strip()
    return None, None, t  # fallback

def parse_trx(raw):
    """'6.099' (punto = miles) → 6099"""
    raw = (raw or '').strip()
    if not raw or raw == '0':
        return 0
    return int(raw.replace('.', '').replace(',', ''))

def parse_prom(raw):
    """'206,6774194' (coma = decimal) → 206.677"""
    raw = (raw or '').strip()
    if not raw or raw == '0':
        return 0.0
    return float(raw.replace('.', '').replace(',', '.'))

def normalizar_estado(e):
    return (e or '').strip().upper()

def es_sss(val):
    return (val or '').strip().upper() == 'SSS'

# ── Parsing con AGREGACIÓN ────────────────────────────────────────────────────
# Agrupamos por (store_num, marca, ano, mes) y SUMAMOS las trx
# porque cada combinación tienda/mes puede tener 2-3 filas (canales/turnos)
agg    = {}  # key → dict con datos base + acumuladores
errors = []
skipped_empty = 0

with open(CSV_PATH, encoding='latin-1', newline='') as f:
    reader = csv.DictReader(f, delimiter=';')
    for i, raw in enumerate(reader, 1):
        row = {k.strip(): (v or '').strip() for k, v in raw.items() if k}

        marca   = row.get('Marca', '').strip()
        tienda  = row.get('Tienda', '').strip()
        mes_txt = row.get('Mes', '').strip()
        ano_txt = row.get('Año', '').strip()

        if not marca or not tienda:
            skipped_empty += 1
            continue

        mes = MES_NUM.get(mes_txt)
        if mes is None:
            errors.append(f"Fila {i}: mes desconocido '{mes_txt}'")
            continue

        try:
            ano = int(ano_txt)
        except ValueError:
            errors.append(f"Fila {i}: año inválido '{ano_txt}'")
            continue

        store_num, cod_interno, local = parse_tienda(tienda)
        if not store_num:
            errors.append(f"Fila {i}: formato de tienda no reconocido '{tienda}'")
            continue

        try:
            trx_total = parse_trx(row.get('Suma de Trx totales', '0'))
            trx_prom  = parse_prom(row.get('Promedio diario', '0'))
        except (ValueError, AttributeError) as e:
            errors.append(f"Fila {i}: error TRX ({e})")
            continue

        try:
            dias = int(row.get('Dias x mes', '30') or '30')
        except ValueError:
            dias = 30

        key = (store_num.upper(), marca.upper(), ano, mes)

        if key not in agg:
            # Primera fila de este grupo: guardamos los metadatos
            agg[key] = {
                'tienda':          tienda,
                'store_num':       store_num,
                'codigo_interno':  cod_interno,
                'marca':           marca,
                'local':           local,
                'distrito':        row.get('Distrito', ''),
                'zona':            row.get('Zona', ''),
                'region':          row.get('Región', '').strip(),
                'formato':         row.get('Formato', ''),
                'categoria':       row.get('Categoria', ''),
                'estado':          normalizar_estado(row.get('Estado', '')),
                'es_sss':          es_sss(row.get('SSS', '')),
                'punto_compartido': row.get('Puntos Compartidos', '').strip().upper() == 'SI',
                'ano':             ano,
                'mes':             mes,
                'mes_texto':       mes_txt,
                'dias_mes':        dias,
                '_trx_acum':       0,   # acumulador de trx_total
                '_prom_acum':      0.0, # acumulador de promedio diario (suma directa de la columna)
            }

        # Sumamos las trx y el promedio diario de todas las filas del grupo
        agg[key]['_trx_acum']  += trx_total
        agg[key]['_prom_acum'] += trx_prom

# Convertir acumuladores a filas finales
rows = []
for key, rec in agg.items():
    trx_total = rec.pop('_trx_acum')
    prom_acum = rec.pop('_prom_acum')
    rec['trx_total']    = trx_total
    rec['trx_promedio'] = round(prom_acum, 2)  # suma directa de la columna CSV
    rows.append(rec)

# ── Reporte de parsing ─────────────────────────────────────────────────────────
print(f"✓ Parseadas {len(rows)} filas válidas")
print(f"  {skipped_empty} filas vacías/sin marca ignoradas")
print(f"  {len(errors)} errores/duplicados")
if errors[:10]:
    for e in errors[:10]: print("   ", e)

print(f"\nFilas por marca:")
for marca, n in sorted(Counter(r['marca'] for r in rows).items()):
    tiendas_u = len(set(r['store_num'] for r in rows if r['marca'] == marca))
    print(f"  {marca}: {n} filas, {tiendas_u} tiendas")

print(f"\nFilas por año:")
for ano, n in sorted(Counter(r['ano'] for r in rows).items()):
    print(f"  {ano}: {n}")

pc_rows = [r for r in rows if r['punto_compartido']]
print(f"\nCon Punto Compartido = SI: {len(pc_rows)} filas "
      f"({len(set(r['store_num'] for r in pc_rows))} tiendas únicas)")

print(f"\nMuestra (primeras 3):")
for r in rows[:3]:
    print(f"  {r['marca']} | {r['store_num']}-{r['codigo_interno']} {r['local']} | "
          f"{r['mes_texto']} {r['ano']} | trx={r['trx_total']} prom={r['trx_promedio']} "
          f"| PC={r['punto_compartido']} | {r['formato']} | {r['zona']}")

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
    # Identificación
    bigquery.SchemaField('tienda',          'STRING',  description='Nombre completo ej: 406-(5100)Centro Cívico'),
    bigquery.SchemaField('store_num',       'STRING',  description='Número de tienda ej: 406'),
    bigquery.SchemaField('codigo_interno',  'STRING',  description='Código interno ej: 5100'),
    bigquery.SchemaField('marca',           'STRING',  description='POPEYES / Bembos / Papa Johns / CHINAWOK'),
    bigquery.SchemaField('local',           'STRING',  description='Nombre del local ej: Centro Cívico'),
    # Geografía
    bigquery.SchemaField('distrito',        'STRING'),
    bigquery.SchemaField('zona',            'STRING',  description='Oeste / Norte / Sur / Este / Provincia / Callao / Centro / Movil'),
    bigquery.SchemaField('region',          'STRING',  description='Lima / Provincia'),
    # Atributos
    bigquery.SchemaField('formato',         'STRING',  description='Food Court / In Line / Freestanding / Dark Kitchen / etc.'),
    bigquery.SchemaField('categoria',       'STRING',  description='Pollo Frito / Hamburguesas / Pizzas / Chifas'),
    bigquery.SchemaField('estado',          'STRING',  description='ACTIVA / CLAUSURADA / NO ACTIVA / NUEVA'),
    bigquery.SchemaField('es_sss',          'BOOL',    description='True si SSS = Same Store Sales'),
    bigquery.SchemaField('punto_compartido','BOOL',    description='True si comparte ubicación con competidor'),
    # Tiempo
    bigquery.SchemaField('ano',             'INT64'),
    bigquery.SchemaField('mes',             'INT64',   description='1-12'),
    bigquery.SchemaField('mes_texto',       'STRING'),
    bigquery.SchemaField('dias_mes',        'INT64',   description='Días de operación en el mes'),
    # Transacciones
    bigquery.SchemaField('trx_total',       'INT64',   description='Total de transacciones del mes'),
    bigquery.SchemaField('trx_promedio',    'FLOAT64', description='Promedio diario de transacciones'),
]

# Verificar si ya existe la tabla
try:
    existing_table = client.get_table(table_ref)
    existing_rows  = existing_table.num_rows
    print(f"\n⚠️  La tabla {TABLE} ya existe con {existing_rows} filas.")
    ans = input("¿Reemplazar (WRITE_TRUNCATE)? [s/N]: ").strip().lower()
    if ans != 's':
        print("Cancelado.")
        sys.exit(0)
    write_disp = bigquery.WriteDisposition.WRITE_TRUNCATE
    print(f"  → Reemplazando tabla completa.")
except Exception:
    write_disp = bigquery.WriteDisposition.WRITE_TRUNCATE
    print(f"\nTabla {TABLE} no existe. Creando nueva.")

job_config = bigquery.LoadJobConfig(
    schema=schema,
    write_disposition=write_disp,
)

print(f"\nCargando {len(rows)} filas en {table_ref}…")
job = client.load_table_from_json(rows, table_ref, job_config=job_config)
job.result()

loaded = client.get_table(table_ref)
print(f"✓ {table_ref} ahora tiene {loaded.num_rows} filas totales")

# Estado final por marca
print("\nResumen final en BigQuery:")
for r in client.query(f"""
    SELECT marca,
           COUNT(*) as filas,
           COUNT(DISTINCT store_num) as tiendas,
           MIN(ano) as desde,
           MAX(ano) as hasta,
           COUNTIF(punto_compartido) as en_pc
    FROM `{table_ref}`
    GROUP BY marca
    ORDER BY marca
""").result():
    print(f"  {r['marca']}: {r['filas']} filas | {r['tiendas']} tiendas | "
          f"{r['desde']}-{r['hasta']} | {r['en_pc']} filas en PC")
