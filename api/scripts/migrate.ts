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
    console.warn(
      `⚠️  Não foi possível verificar/criar o banco "${env.db.database}" pelo banco padrão "postgres": ${(err as Error).message}`
    );
  } finally {
    await adminClient.end().catch(() => { });
  }
}

async function runMigration() {
  console.log('🔄 Iniciando execução das migrations no PostgreSQL...');

  await ensureDatabaseExists();

  const migrationsDir = path.resolve(__dirname, '../db/migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = await getClient();

  try {
    // 1. Garante que a tabela de histórico de migrations existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
    `);

    // 2. Consulta quais migrations já foram aplicadas
    const appliedResult = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedSet = new Set(appliedResult.rows.map((r) => r.version));

    // 3. Filtra apenas as migrations pendentes
    const pendingFiles = migrationFiles.filter((file) => !appliedSet.has(file));

    if (pendingFiles.length === 0) {
      console.log('✅ Nenhuma migration pendente. O banco de dados já está atualizado!');
      return;
    }

    console.log(`📋 ${pendingFiles.length} migration(s) pendente(s) encontrada(s).`);

    // 4. Executa cada migration pendente dentro de uma transação
    await client.query('BEGIN');
    for (const file of pendingFiles) {
      console.log(`📄 Executando migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, executed_at) VALUES ($1, NOW())',
        [file]
      );
      console.log(`  └─ ✅ Concluída: ${file}`);
    }
    await client.query('COMMIT');
    console.log('✅ Todas as migrations pendentes foram aplicadas com sucesso!');
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

