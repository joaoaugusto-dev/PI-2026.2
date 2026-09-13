import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { env } from '../src/config/env.js';
import { pool, getClient } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists() {
  const adminClient = new pg.Client({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: 'postgres',
    ssl: env.db.ssl,
  });

  try {
    await adminClient.connect();
    const checkDb = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [env.db.database]
    );

    if (checkDb.rows.length === 0) {
      console.log(`📦 Banco de dados "${env.db.database}" não encontrado. Criando automaticamente...`);
      await adminClient.query(`CREATE DATABASE "${env.db.database}"`);
      console.log(`✅ Banco de dados "${env.db.database}" criado com sucesso!`);
    }
  } catch (err) {
    // Se não for possível verificar pelo banco default (ex: restrições de permissão), prossegue
  } finally {
    await adminClient.end().catch(() => {});
  }
}

async function runMigration() {
  console.log('🔄 Iniciando execução das migrations no PostgreSQL...');

  await ensureDatabaseExists();

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

