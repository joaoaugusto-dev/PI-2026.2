import { describe, it, expect } from 'vitest';
import { getClient, query } from '../config/database.js';

// Auditoria de 09/10/2026: com as conexões derrubadas no meio da carga (Postgres reiniciando, rede piscando),
// um cliente emprestado por getClient() emitia 'error' sem ouvinte e o processo da API caía.
describe('pool de conexões', () => {
  it('conexão emprestada que cai não derruba o processo e o pool volta a atender', async () => {
    const client = await getClient();
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    await query('SELECT pg_terminate_backend($1)', [rows[0].pid]);
    await new Promise((r) => setTimeout(r, 200)); // o 'error' chega pelo socket logo depois

    await expect(client.query('SELECT 1')).rejects.toThrow();
    client.release(true);

    const depois = await query<{ ok: number }>('SELECT 1 AS ok');
    expect(depois.rows[0].ok).toBe(1);
  });
});
