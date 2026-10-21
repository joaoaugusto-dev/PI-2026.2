import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import app from '../app.js';
import { env } from '../config/env.js';
import { definirUsuarioAuditoria, getClient, query } from '../config/database.js';

// DATA-05: triggers de auditoria (migration 0014) em ferramentas, emprestimos e ocorrencias.
// Os casos de trigger rodam numa transação revertida; o de fluxo pela API grava de verdade e limpa pelo prefixo.
const P = 'ZZTESTE_AUDIT_';

let grupoId: number;
let setorId: number;
let usuarioId: number;
let colaboradorId: number;

beforeAll(async () => {
  grupoId = (await query('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
  setorId = (await query('SELECT id FROM setores WHERE ativo ORDER BY id LIMIT 1')).rows[0].id;
  usuarioId = (await query("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo ORDER BY id LIMIT 1")).rows[0].id;
  colaboradorId = (await query('SELECT id FROM colaboradores WHERE ativo ORDER BY id LIMIT 1')).rows[0].id;
});

async function emTransacao<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    return await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
}

const linhas = async (c: PoolClient, tabela: string, id: number) =>
  (await c.query('SELECT * FROM auditoria WHERE tabela = $1 AND registro_id = $2 ORDER BY id', [tabela, id])).rows;

async function novaFerramenta(c: PoolClient, nome = 'f'): Promise<number> {
  return (await c.query('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${P}${nome}`, grupoId])).rows[0].id;
}

async function novoEmprestimo(c: PoolClient, ferramentaId: number): Promise<number> {
  return (
    await c.query(
      `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '2 days') RETURNING id`,
      [ferramentaId, colaboradorId, setorId, usuarioId]
    )
  ).rows[0].id;
}

describe('auditoria automática — ferramentas', () => {
  it('INSERT grava dados_novos completos e dados_anteriores nulo', () =>
    emTransacao(async (c) => {
      const id = await novaFerramenta(c, 'insert');
      const [l, ...resto] = await linhas(c, 'ferramentas', id);
      expect(resto).toHaveLength(0);
      expect(l.operacao).toBe('INSERT');
      expect(l.dados_anteriores).toBeNull();
      expect(l.dados_novos).toMatchObject({ id, nome: `${P}insert`, grupo_id: grupoId, status: 'disponivel' });
    }));

  it('UPDATE grava só as colunas que mudaram (antes e depois)', () =>
    emTransacao(async (c) => {
      const id = await novaFerramenta(c, 'update');
      await c.query(`UPDATE ferramentas SET localizacao = 'Prateleira 3', marca = 'Bosch', updated_at = NOW() WHERE id = $1`, [id]);
      const l = (await linhas(c, 'ferramentas', id)).find((x) => x.operacao === 'UPDATE')!;
      expect(l.dados_anteriores).toEqual({ localizacao: null, marca: null });
      expect(l.dados_novos).toEqual({ localizacao: 'Prateleira 3', marca: 'Bosch' });
      expect(l.dados_novos).not.toHaveProperty('updated_at');
    }));

  it('UPDATE sem mudança real (ou só de updated_at) não gera linha', () =>
    emTransacao(async (c) => {
      const id = await novaFerramenta(c, 'noop');
      await c.query('UPDATE ferramentas SET updated_at = NOW() WHERE id = $1', [id]);
      await c.query('UPDATE ferramentas SET nome = nome WHERE id = $1', [id]);
      expect((await linhas(c, 'ferramentas', id)).map((x) => x.operacao)).toEqual(['INSERT']);
    }));

  it('DELETE grava dados_anteriores e dados_novos nulo', () =>
    emTransacao(async (c) => {
      const id = await novaFerramenta(c, 'delete');
      await c.query('DELETE FROM ferramentas WHERE id = $1', [id]);
      const l = (await linhas(c, 'ferramentas', id)).find((x) => x.operacao === 'DELETE')!;
      expect(l.dados_novos).toBeNull();
      expect(l.dados_anteriores).toMatchObject({ id, nome: `${P}delete` });
    }));

  it('grava o usuário informado por set_config; sem ele, usuario_id fica nulo', () =>
    emTransacao(async (c) => {
      const semUsuario = await novaFerramenta(c, 'anonimo');
      await definirUsuarioAuditoria(c, usuarioId);
      const comUsuario = await novaFerramenta(c, 'identificada');
      expect((await linhas(c, 'ferramentas', semUsuario))[0].usuario_id).toBeNull();
      expect((await linhas(c, 'ferramentas', comUsuario))[0].usuario_id).toBe(usuarioId);
    }));

  it('rollback não deixa auditoria para trás', async () => {
    let id = 0;
    await emTransacao(async (c) => {
      id = await novaFerramenta(c, 'rollback');
    });
    const r = await query(`SELECT COUNT(*)::int AS n FROM auditoria WHERE tabela = 'ferramentas' AND registro_id = $1`, [id]);
    expect(r.rows[0].n).toBe(0);
  });
});

describe('auditoria automática — emprestimos e ocorrencias', () => {
  it('retirada e devolução com avaria geram linhas nas três tabelas encadeadas pelas triggers', () =>
    emTransacao(async (c) => {
      await definirUsuarioAuditoria(c, usuarioId);
      const f = await novaFerramenta(c, 'avaria');
      const e = await novoEmprestimo(c, f);

      const ins = (await linhas(c, 'emprestimos', e)).filter((x) => x.operacao === 'INSERT');
      expect(ins).toHaveLength(1);
      expect(ins[0].dados_novos).toMatchObject({ ferramenta_id: f, colaborador_id: colaboradorId, data_devolucao: null });
      // a retirada coloca a ferramenta em uso (trigger de status) e isso também é auditado
      const emUso = (await linhas(c, 'ferramentas', f)).find((x) => x.operacao === 'UPDATE')!;
      expect(emUso.dados_anteriores).toEqual({ status: 'disponivel' });
      expect(emUso.dados_novos).toEqual({ status: 'em_uso' });

      await c.query(
        `UPDATE emprestimos SET data_devolucao = NOW(), condicao_devolucao = 'avaria', usuario_devolucao_id = $2 WHERE id = $1`,
        [e, usuarioId]
      );

      const upd = (await linhas(c, 'emprestimos', e)).find((x) => x.operacao === 'UPDATE')!;
      expect(upd.dados_anteriores).toMatchObject({ data_devolucao: null, condicao_devolucao: null });
      expect(upd.dados_novos).toMatchObject({ condicao_devolucao: 'avaria', usuario_devolucao_id: usuarioId });

      const ferr = (await linhas(c, 'ferramentas', f)).filter((x) => x.operacao === 'UPDATE').pop()!;
      expect(ferr.dados_novos).toEqual({ status: 'indisponivel', motivo_indisponivel: 'avaria' });

      const oc = (await c.query('SELECT id FROM ocorrencias WHERE emprestimo_id = $1', [e])).rows[0].id;
      const ocLinhas = await linhas(c, 'ocorrencias', oc);
      expect(ocLinhas.map((x) => x.operacao)).toEqual(['INSERT']);
      expect(ocLinhas[0].dados_novos).toMatchObject({ tipo: 'AVARIA', colaborador_id: colaboradorId, status: 'aberta' });
      expect(ocLinhas[0].usuario_id).toBe(usuarioId);
    }));

  it('UPDATE e DELETE em ocorrencias e emprestimos', () =>
    emTransacao(async (c) => {
      const f = await novaFerramenta(c, 'oc');
      const e = await novoEmprestimo(c, f);
      const oc = (
        await c.query(
          `INSERT INTO ocorrencias (emprestimo_id, ferramenta_id, colaborador_id, tipo, descricao, registrada_por)
           VALUES ($1, $2, $3, 'AVARIA', 'cabo partido', $4) RETURNING id`,
          [e, f, colaboradorId, usuarioId]
        )
      ).rows[0].id;
      await c.query(`UPDATE ocorrencias SET status = 'em_reparo', custo_estimado = 80 WHERE id = $1`, [oc]);
      const u = (await linhas(c, 'ocorrencias', oc)).find((x) => x.operacao === 'UPDATE')!;
      expect(u.dados_anteriores).toEqual({ status: 'aberta', custo_estimado: null });
      expect(u.dados_novos).toEqual({ status: 'em_reparo', custo_estimado: 80 });

      await c.query('DELETE FROM ocorrencias WHERE id = $1', [oc]);
      expect((await linhas(c, 'ocorrencias', oc)).map((x) => x.operacao)).toEqual(['INSERT', 'UPDATE', 'DELETE']);
      await c.query('DELETE FROM emprestimos WHERE id = $1', [e]);
      expect((await linhas(c, 'emprestimos', e)).pop()!.operacao).toBe('DELETE');
    }));
});

describe('auditoria automática — pela API (usuário vem do JWT)', () => {
  let tokenReal: string;
  let ferramentaId = 0;

  beforeAll(() => {
    tokenReal = jwt.sign({ id: usuarioId, nome: 'Manutenção Teste', papel: 'manutencao', matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    const ferramentas = `SELECT id FROM ferramentas WHERE nome LIKE $1`;
    await query(`DELETE FROM auditoria WHERE tabela = 'ocorrencias' AND registro_id IN (SELECT id FROM ocorrencias WHERE ferramenta_id IN (${ferramentas}))`, [`${P}%`]);
    await query(`DELETE FROM auditoria WHERE tabela = 'emprestimos' AND registro_id IN (SELECT id FROM emprestimos WHERE ferramenta_id IN (${ferramentas}))`, [`${P}%`]);
    await query(`DELETE FROM auditoria WHERE tabela = 'ferramentas' AND registro_id IN (${ferramentas})`, [`${P}%`]);
    await query(`DELETE FROM ocorrencias WHERE ferramenta_id IN (${ferramentas})`, [`${P}%`]);
    await query(`DELETE FROM emprestimos WHERE ferramenta_id IN (${ferramentas})`, [`${P}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${P}%`]);
  });

  it('criar ferramenta, retirar e devolver com avaria deixa a trilha completa com o usuário do JWT', async () => {
    const criada = await request(app)
      .post('/v1/ferramentas')
      .set('Authorization', `Bearer ${tokenReal}`)
      .send({ nome: `${P}Esmerilhadeira`, grupoId });
    expect(criada.status).toBe(201);
    ferramentaId = criada.body.data.id;

    const retirada = await request(app)
      .post('/v1/emprestimos')
      .set('Authorization', `Bearer ${tokenReal}`)
      .send({ ferramentaId, colaboradorId, setorDestinoId: setorId, previsaoDevolucao: new Date(Date.now() + 2 * 864e5).toISOString() });
    expect(retirada.status).toBe(201);
    const emprestimoId = retirada.body.data.id;

    const devolucao = await request(app)
      .patch(`/v1/emprestimos/${emprestimoId}/devolucao`)
      .set('Authorization', `Bearer ${tokenReal}`)
      .send({ condicaoDevolucao: 'avaria', observacoesDevolucao: 'disco trincado', usuarioDevolucaoId: 999999 });
    expect(devolucao.status).toBe(200);

    const ocorrenciaId = (await query('SELECT id FROM ocorrencias WHERE emprestimo_id = $1', [emprestimoId])).rows[0].id;
    const trilha = async (tabela: string, id: number) =>
      (await query('SELECT operacao, usuario_id, dados_anteriores, dados_novos FROM auditoria WHERE tabela = $1 AND registro_id = $2 ORDER BY id', [tabela, id])).rows;

    const f = await trilha('ferramentas', ferramentaId);
    expect(f.map((x) => x.operacao)).toEqual(['INSERT', 'UPDATE', 'UPDATE']); // criada, em_uso, indisponivel
    expect(f.every((x) => x.usuario_id === usuarioId)).toBe(true);
    expect(f[2].dados_novos).toEqual({ status: 'indisponivel', motivo_indisponivel: 'avaria' });

    const e = await trilha('emprestimos', emprestimoId);
    expect(e.map((x) => x.operacao)).toEqual(['INSERT', 'UPDATE']);
    expect(e.every((x) => x.usuario_id === usuarioId)).toBe(true); // o 999999 do corpo foi ignorado (regra 6)

    const o = await trilha('ocorrencias', ocorrenciaId);
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ operacao: 'INSERT', usuario_id: usuarioId });
  });

  it('PATCH da ferramenta audita só o campo alterado, com o usuário do JWT', async () => {
    // edição de ferramenta é só do admin (regra 8); authenticate só decodifica o JWT, o id é o do usuário real
    const auth = { Authorization: `Bearer ${jwt.sign({ id: usuarioId, nome: 'Admin Teste', papel: 'admin', matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' })}` };
    const criada = await request(app).post('/v1/ferramentas').set(auth).send({ nome: `${P}Serra`, grupoId });
    const id = criada.body.data.id;

    const res = await request(app).patch(`/v1/ferramentas/${id}`).set(auth).send({ localizacao: 'Armário 7' });
    expect(res.status).toBe(200);

    const l = (
      await query(
        `SELECT operacao, usuario_id, dados_anteriores, dados_novos FROM auditoria
         WHERE tabela = 'ferramentas' AND registro_id = $1 ORDER BY id DESC LIMIT 1`,
        [id]
      )
    ).rows[0];
    expect(l).toMatchObject({ operacao: 'UPDATE', usuario_id: usuarioId });
    expect(l.dados_anteriores).toEqual({ localizacao: null });
    expect(l.dados_novos).toEqual({ localizacao: 'Armário 7' });
  });
});
