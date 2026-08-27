import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, getClient } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('🔄 Iniciando execução das migrations no PostgreSQL...');

  const migrationPath = path.resolve(__dirname, '../db/migrations/0001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await getClient();

  try {
    await client.query('BEGIN');
    console.log(`📄 Executando: 0001_init.sql`);
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migrations executadas com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao executar migrations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
