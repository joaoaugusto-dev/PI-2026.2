import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ssl: env.db.ssl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  console.error('[DATABASE ERROR] Erro inesperado no pool de conexões do PostgreSQL:', err);
});

/**
 * Executa uma query SQL com pool de conexão
 * @param text Consulta SQL parametrizada
 * @param params Parâmetros da query
 */
export const query = <T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> => pool.query<T>(text, params);

/**
 * Obtém um cliente do pool para transações
 */
export const getClient = (): Promise<pg.PoolClient> => pool.connect();

export interface ConnectionTestResult {
  ok: boolean;
  timestamp?: string;
  database?: string;
  error?: string;
}

/**
 * Testa a conexão com o banco de dados
 */
export async function testConnection(): Promise<ConnectionTestResult> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS current_time, current_database() AS db_name');
    client.release();
    return {
      ok: true,
      timestamp: res.rows[0].current_time,
      database: res.rows[0].db_name,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message,
    };
  }
}
