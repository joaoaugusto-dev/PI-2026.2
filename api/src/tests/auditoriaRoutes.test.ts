import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { assinarToken } from '../utils/tokenJwt.js';
import { env } from '../config/env.js';
import { query, queryComUsuario } from '../config/database.js';

// GET /v1/auditoria (DATA-05): consulta da trilha, só admin.
const PREFIXO = 'ZZTESTE_AUDROTA_';
const token = (papel: string, id = 1) => assinarToken({ id, nome: 'T', papel, matricula: '0001' }, '1h');
const get = (qs = '', papel: string | null = 'admin', id = 1) => {
  const req = request(app).get(`/v1/auditoria${qs}`);
  if (papel) req.set('Authorization', `Bearer ${token(papel, id)}`);
  return req;
};

describe('GET /v1/auditoria', () => {
  let usuarioId: number;
  let ferramentaId: number;

  beforeAll(async () => {
    usuarioId = (await query("SELECT id FROM usuarios WHERE papel = 'admin' AND ativo ORDER BY id LIMIT 1")).rows[0]?.id
      ?? (await query('SELECT id FROM usuarios WHERE ativo ORDER BY id LIMIT 1')).rows[0].id;
    const grupoId = (await query('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const criada = await queryComUsuario<{ id: number }>(
      usuarioId,
      'INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id',
      [`${PREFIXO}Serra`, grupoId]
    );
    ferramentaId = criada.rows[0].id;
    await queryComUsuario(usuarioId, `UPDATE ferramentas SET localizacao = 'Bancada 2' WHERE id = $1`, [ferramentaId]);
  });

  afterAll(async () => {
    await query(`DELETE FROM auditoria WHERE tabela = 'ferramentas' AND registro_id = $1`, [ferramentaId]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
  });

  it('exige token e perfil admin (manutenção e consulta recebem 403)', async () => {
    expect((await get('', null)).status).toBe(401);
    expect((await get('', 'manutencao')).status).toBe(403);
    expect((await get('', 'consulta')).status).toBe(403);
  });

  it('devolve a trilha de um registro, mais recente primeiro, com o nome de quem alterou', async () => {
    const res = await get(`?tabela=ferramentas&registroId=${ferramentaId}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, total: 2 });
    const [recente, antiga] = res.body.data;
    expect(recente).toMatchObject({ operacao: 'UPDATE', registro_id: ferramentaId, usuario_id: usuarioId });
    expect(recente.dados_anteriores).toEqual({ localizacao: null });
    expect(recente.dados_novos).toEqual({ localizacao: 'Bancada 2' });
    expect(recente.usuario_nome).toEqual(expect.any(String));
    expect(antiga.operacao).toBe('INSERT');
  });

  it('filtra por operação, usuário e período, e pagina', async () => {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD de Brasília
    const base = `?tabela=ferramentas&registroId=${ferramentaId}`;
    expect((await get(`${base}&operacao=INSERT`)).body.meta.total).toBe(1);
    expect((await get(`${base}&usuarioId=${usuarioId}`)).body.meta.total).toBe(2);
    expect((await get(`${base}&de=${hoje}&ate=${hoje}`)).body.meta.total).toBe(2);
    expect((await get(`${base}&de=2020-01-01&ate=2020-12-31`)).body.meta.total).toBe(0);
    const pagina = await get(`${base}&limit=1&page=2`);
    expect(pagina.body.data).toHaveLength(1);
    expect(pagina.body.meta).toMatchObject({ page: 2, limit: 1, total: 2 });
  });

  it('recusa filtros inválidos com 400 e detalhe do campo', async () => {
    const invalidos: [string, string][] = [
      ['?tabela=usuarios', 'tabela'],
      ['?registroId=abc', 'registroId'],
      ['?registroId=-3', 'registroId'],
      ['?de=2026-02-30', 'de'],
      ['?de=20/10/2026', 'de'],
      ['?de=2026-10-20&ate=2026-10-01', 'de'],
      ['?limit=0', 'limit'],
    ];
    for (const [qs, campo] of invalidos) {
      const res = await get(qs);
      expect(res.status, qs).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].field, qs).toBe(campo);
    }
  });
});
