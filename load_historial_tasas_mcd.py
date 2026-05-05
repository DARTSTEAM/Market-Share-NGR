import pandas as pd
from google.cloud import bigquery
import os

# Configuration
PROJECT_ID = "hike-agentic-playground"
DATASET_ID = "ngr"
TABLE_ID = "historial_tasas"
FILE_PATH = "/Users/bautiballatore/Downloads/HISTORICO DE CAJAS _ MCD(Hoja1).csv"
BRAND_NAME = "MCDONALDS"

# Month mapping
MESES_MAP = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
}

def load_data():
    print(f"Loading data from {FILE_PATH}...")
    
    # Read CSV
    # Using latin-1 because of characters like 'Año' or 'Región' appearing as symbols
    df = pd.read_csv(FILE_PATH, sep=';', encoding='latin-1')
    
    # Clean column names (handle encoding artifacts like 'Año')
    # We'll just strip non-ascii or map based on positions if names are weird
    df.columns = [c.encode('ascii', 'ignore').decode('ascii').strip() for c in df.columns]
    
    # Map cleaned columns
    df = df.rename(columns={
        'Ao': 'ano',
        'cod': 'codigo_tienda',
        'Tienda': 'local',
        'Mes': 'mes_str',
        'Caja': 'caja',
        'Delta': 'trx_promedio'
    })
    
    # Standardize competitor
    df['competidor'] = BRAND_NAME
    
    # Map months
    df['mes'] = df['mes_str'].str.lower().str.strip().map(MESES_MAP)
    
    # Handle missing months
    missing_months = df[df['mes'].isna()]['mes_str'].unique()
    if len(missing_months) > 0:
        print(f"Warning: Missing month mappings for: {missing_months}")
    
    # Convert types
    df['ano'] = pd.to_numeric(df['ano'], errors='coerce')
    df['trx_promedio'] = pd.to_numeric(df['trx_promedio'], errors='coerce').fillna(0)
    
    # Filter columns
    df = df[['competidor', 'codigo_tienda', 'local', 'caja', 'ano', 'mes', 'trx_promedio']]
    
    # Remove rows with null critical data
    df = df.dropna(subset=['codigo_tienda', 'caja', 'ano', 'mes'])
    
    # Convert types to match BigQuery schema
    df['ano'] = df['ano'].astype(int)
    df['mes'] = df['mes'].astype(int)
    df['caja'] = df['caja'].astype(str)
    df['codigo_tienda'] = df['codigo_tienda'].astype(str)
    
    # Aggregate by caja (just in case there are duplicates, though MCD format seems 1:1)
    df_agg = df.groupby(['competidor', 'codigo_tienda', 'local', 'caja', 'ano', 'mes'], as_index=False).agg({
        'trx_promedio': 'sum'
    })
    
    print(f"Prepared {len(df_agg)} rows for loading.")
    
    # BigQuery Client
    client = bigquery.Client(project=PROJECT_ID)
    
    # Check for existing data to avoid duplicates
    print(f"Cleaning existing {BRAND_NAME} data from {TABLE_ID}...")
    delete_query = f"DELETE FROM `{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}` WHERE competidor = '{BRAND_NAME}'"
    client.query(delete_query).result()
    
    # Load to BigQuery
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    job_config = bigquery.LoadJobConfig(
        schema=[
            bigquery.SchemaField("competidor", "STRING"),
            bigquery.SchemaField("codigo_tienda", "STRING"),
            bigquery.SchemaField("local", "STRING"),
            bigquery.SchemaField("caja", "STRING"),
            bigquery.SchemaField("ano", "INTEGER"),
            bigquery.SchemaField("mes", "INTEGER"),
            bigquery.SchemaField("trx_promedio", "FLOAT"),
        ],
        write_disposition="WRITE_APPEND",
    )
    
    job = client.load_table_from_dataframe(df_agg, table_ref, job_config=job_config)
    job.result()  # Wait for the job to complete
    
    print(f"Successfully loaded {len(df_agg)} rows into {TABLE_ID}.")

if __name__ == "__main__":
    load_data()
