import { BigQuery } from '@google-cloud/bigquery';
const bigquery = new BigQuery({ projectId: 'hike-agentic-playground' });
const DATASET = 'ngr';

async function run() {
  const tables = ['cajas_config', 'estimaciones_manuales', 'historial_tasas'];
  for (const table of tables) {
    console.log(`Normalizing ${table}...`);
    const q = `
      UPDATE \`hike-agentic-playground.${DATASET}.${table}\`
      SET caja = COALESCE(CAST(SAFE_CAST(REGEXP_EXTRACT(caja, r'(\\d+)') AS INT64) AS STRING), caja)
      WHERE caja IS NOT NULL AND caja != '__LOCAL__'
    `;
    try {
      const [job] = await bigquery.createQueryJob({ query: q });
      await job.getQueryResults();
      console.log(`✓ ${table} normalized.`);
    } catch (e) {
      console.error(`X Error in ${table}:`, e.message);
    }
  }
}
run();
