import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

app.post('/api/update-ticket', async (req, res) => {
    const { filename, ticket, importe, fecha, caja, local, competidor, codigoTienda } = req.body;

    if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
    }

    try {
        const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID}.${process.env.BIGQUERY_DATASET_ID}.facturas_v2\`
      SET 
        numero_de_ticket = @ticket,
        importe_total = @importe,
        fecha = @fecha,
        numero_de_caja = @caja,
        local = @local,
        competidor = @competidor,
        codigo_tienda = @codigoTienda
      WHERE filename = @filename
    `;

        const options = {
            query: query,
            params: {
                ticket: ticket || '',
                importe: parseFloat(importe) || 0,
                fecha: fecha || '',
                caja: caja || '',
                local: local || '',
                competidor: competidor || '',
                codigoTienda: codigoTienda || '',
                filename: filename
            }
        };

        console.log(`Executing update for filename: ${filename}`);
        const [job] = await bigquery.createQueryJob(options);
        const [rows] = await job.getQueryResults();

        res.json({ success: true, message: 'Ticket updated in BigQuery', details: rows });

        // Trigger background refresh of local data
        console.log('Triggering background data refresh...');
        exec('npm run fetch && node process_csv.cjs', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error in background refresh: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Refresh stderr: ${stderr}`);
            }
            console.log(`Background refresh completed: ${stdout}`);
        });
    } catch (error) {
        console.error('Error updating BigQuery:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Local BQ Proxy server running at http://localhost:${port}`);
});
