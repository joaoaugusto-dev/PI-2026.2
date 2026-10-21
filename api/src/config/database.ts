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

// pool.on('error') só cobre cliente ocioso: o pg-pool tira o ouvinte enquanto o cliente está emprestado
// (getClient nas transações). Se a conexão cai nessa hora (Postgres reiniciou, rede piscou), o 'error' sem
// ouvinte derrubava o processo inteiro. Com este, a query em voo falha (500), o release descarta o cliente
// quebrado e a API segue atendendo.
pool.on('connect', (client) => {
  client.on('error', (err: Error) => {
    console.error('[DATABASE ERROR] Conexão em uso caiu:', err.message);
  });
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

/**
 * Informa ao banco quem está escrevendo, para a trigger de auditoria (fn_auditoria) gravar `usuario_id`.
 * Vale só até o fim da transação (set_config com is_local = true), então chame logo depois do BEGIN.
 * O id vem sempre do JWT (req.usuario), nunca do corpo da requisição (regra 6).
 */
export async function definirUsuarioAuditoria(client: pg.PoolClient, usuarioId: number | null | undefined): Promise<void> {
  await client.query(`SELECT set_config('app.usuario_id', $1, true)`, [usuarioId == null ? '' : String(usuarioId)]);
}

/**
 * Como `query`, mas numa transação curta que identifica o usuário para a auditoria. Sem `usuarioId`
 * (scripts, testes) cai no `query` comum e a linha de auditoria fica sem usuário.
 */
export async function queryComUsuario<T extends pg.QueryResultRow = any>(
  usuarioId: number | null | undefined,
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  if (usuarioId == null) return query<T>(text, params);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await definirUsuarioAuditoria(client, usuarioId);
    const result = await client.query<T>(text, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

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
    const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return {
      ok: false,
      error: errorMessage,
    };
  }
}
