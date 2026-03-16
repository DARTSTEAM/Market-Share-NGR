import express from 'express';
import cors from 'cors';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const bqOptions = {
    projectId: process.env.BIGQUERY_PROJECT_ID,
};
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    bqOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const bigquery = new BigQuery(bqOptions);

// Endpoint to fetch current data
app.get('/api/data', (req, res) => {
    try {
        const dataJsonPath = path.join(__dirname, '..', 'src', 'data.json');
        if (fs.existsSync(dataJsonPath)) {
            const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
            res.json(data);
        } else {
            res.status(404).json({ error: 'Data file not found' });
        }
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ error: error.message });
    }
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
        await job.getQueryResults();

        // Trigger background refresh of local data and WAIT for it
        console.log('Triggering data refresh...');

        const refreshPromise = new Promise((resolve, reject) => {
            exec('npm run fetch && node process_csv.cjs', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error in refresh: ${error.message}`);
                    return reject(error);
                }
                console.log(`Refresh completed: ${stdout}`);
                resolve();
            });
        });

        await refreshPromise;

        // Read the updated data.json
        const dataJsonPath = path.join(__dirname, '..', 'src', 'data.json');
        const updatedData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));

        res.json({
            success: true,
            message: 'Ticket updated and data refreshed',
            data: updatedData
        });

    } catch (error) {
        console.error('Error updating BigQuery or refreshing:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to manually refresh data from BigQuery
app.post('/api/refresh', (req, res) => {
    console.log('Manual refresh triggered...');
    exec('npm run fetch && node process_csv.cjs', { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error in refresh: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
        console.log(`Refresh completed: ${stdout}`);
        try {
            const dataJsonPath = path.join(__dirname, '..', 'src', 'data.json');
            const updatedData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
            res.json({ success: true, message: 'Data refreshed from BigQuery', data: updatedData });
        } catch (readErr) {
            res.status(500).json({ error: readErr.message });
        }
    });
});

app.listen(port, () => {
    console.log(`Local BQ Proxy server running at http://localhost:${port}`);
});
