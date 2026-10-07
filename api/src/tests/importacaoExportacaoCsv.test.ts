import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

// Importação/exportação genéricas (/v1/importacoes/:recurso e /v1/exportacoes/:recurso).
// O caso detalhado de ferramentas fica em importacaoFerramentas.test.ts.
const PREFIXO = 'ZZTESTE_CSV_';
// matrículas altas para não colidir com o seed (0001 a 0053)
const MATRICULAS = ['9971', '9972', '9973', '0974'];
const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });

const importar = (recurso: string, corpo: string, papel = 'admin') =>
  request(app)
    .post(`/v1/importacoes/${recurso}`)
    .set('Authorization', `Bearer ${token(papel)}`)
    .set('Content-Type', 'text/csv')
    .send(corpo);

const baixar = (caminho: string, papel = 'admin') =>
  request(app).get(`/v1${caminho}`).set('Authorization', `Bearer ${token(papel)}`).buffer(true).parse((res, cb) => {
    const partes: Buffer[] = [];
    res.on('data', (p: Buffer) => partes.push(p));
    res.on('end', () => cb(null, Buffer.concat(partes).toString('utf8')));
  });

describe('importação de cadastros por CSV', () => {
  let setorId: number;
  const SETOR = `${PREFIXO}Setor`;

  beforeAll(async () => {
    setorId = (await query('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [SETOR])).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM colaboradores WHERE matricula = ANY($1)', [MATRICULAS]);
    await query('DELETE FROM grupos_ferramentas WHERE nome ILIKE $1', [`${PREFIXO}%`]);
    await query('DELETE FROM setores WHERE nome ILIKE $1', [`${PREFIXO}%`]);
  });

  it('colaboradores: completa zeros da matrícula, grava criado_por do JWT e ignora matrícula repetida', async () => {
    const csv = [
      'Matrícula;Nome;Setor',
      `9971;${PREFIXO}Ana;${SETOR}`,
      `974;${PREFIXO}Bruno;${SETOR.toLowerCase()}`, // Excel tirou o zero: vira 0974
      `9971;${PREFIXO}Outra Ana;${SETOR}`,
      `12345;${PREFIXO}Carla;${SETOR}`,
      `9972;${PREFIXO}Davi;Setor que não existe`,
      `0001;${PREFIXO}Já existe no seed;${SETOR}`,
    ].join('\n');

    const res = await importar('colaboradores', csv, 'manutencao');

    expect(res.status).toBe(200);
    expect(res.body.data.resumo).toEqual({ total_linhas: 6, aceitas: 2, rejeitadas: 2, ignoradas: 2 });
    expect(res.body.data.aceitas.map((a: any) => a.matricula)).toEqual(['9971', '0974']);
    expect(res.body.data.rejeitadas.map((r: any) => [r.linha, r.motivos])).toEqual([
      [5, ['Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999)']],
      [6, ['Setor "Setor que não existe" não cadastrado']],
    ]);
    expect(res.body.data.ignoradas[0]).toMatchObject({ linha: 4, motivo: 'Repetida no arquivo (mesma da linha 2)' });
    expect(res.body.data.ignoradas[1].motivo).toMatch(/^Matrícula já cadastrada para /);

    const { rows } = await query('SELECT matricula, setor_id, criado_por FROM colaboradores WHERE matricula = ANY($1) ORDER BY matricula', [MATRICULAS]);
    expect(rows).toEqual([
      { matricula: '0974', setor_id: setorId, criado_por: 1 },
      { matricula: '9971', setor_id: setorId, criado_por: 1 },
    ]);
  });

  it('categorias e setores: só nome, sem duplicar ignorando maiúsculas, e só o admin importa', async () => {
    const csv = ['nome', `${PREFIXO}Pneumáticas`, `${PREFIXO.toLowerCase()}pneumáticas`, 'Ferramentas Manuais'].join('\n');

    expect((await importar('categorias', csv, 'manutencao')).status).toBe(403);
    expect((await importar('setores', csv, 'manutencao')).status).toBe(403);

    const res = await importar('categorias', csv);
    expect(res.status).toBe(200);
    expect(res.body.data.resumo).toEqual({ total_linhas: 3, aceitas: 1, rejeitadas: 0, ignoradas: 2 });
    expect(res.body.data.ignoradas.map((i: any) => i.motivo)).toEqual([
      'Repetida no arquivo (mesma da linha 2)',
      'Já cadastrado como "Ferramentas Manuais"',
    ]);

    const setores = await importar('setores', `nome\n${PREFIXO}Caldeiraria\n${SETOR}`);
    expect(setores.body.data.resumo).toMatchObject({ aceitas: 1, ignoradas: 1 });
  });

  it('400 para recurso desconhecido e para cabeçalho sem as colunas do recurso', async () => {
    const desconhecido = await importar('emprestimos', 'nome\nx');
    expect(desconhecido.status).toBe(400);
    expect(desconhecido.body.error.details[0].message).toMatch(/ferramentas, colaboradores, categorias, setores/);

    const semSetor = await importar('colaboradores', 'matricula;nome\n9973;x');
    expect(semSetor.status).toBe(400);
    expect(semSetor.body.error.message).toMatch(/ausente\(s\) no cabeçalho: setor/);
  });

  it('GET /modelo devolve o CSV de exemplo de cada recurso, que pode ser reimportado', async () => {
    const res = await baixar('/importacoes/colaboradores/modelo');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/modelo-colaboradores\.csv/);
    expect(res.body).toBe('﻿"matricula";"nome";"setor"\r\n"0123";"Nome Sobrenome";"Manutenção Geral"\r\n');

    expect((await baixar('/importacoes/categorias/modelo', 'manutencao')).status).toBe(403);
  });
});

describe('GET /v1/exportacoes/:recurso', () => {
  let ferramentaId: number;

  beforeAll(async () => {
    const grupoId = (await query("SELECT id FROM grupos_ferramentas WHERE nome = 'Ferramentas Manuais'")).rows[0].id;
    ferramentaId = (
      await query('INSERT INTO ferramentas (nome, grupo_id, marca) VALUES ($1, $2, $3) RETURNING id', [
        `${PREFIXO}Martelo "pena"`,
        grupoId,
        '=HYPERLINK("x")',
      ])
    ).rows[0].id;

    // um empréstimo já devolvido, com horários fixos, para conferir o formato das datas
    const colab = (await query("SELECT id, setor_id FROM colaboradores WHERE matricula = '0002'")).rows[0];
    const emprestimoId = (
      await query(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, data_retirada, previsao_devolucao)
         VALUES ($1, $2, $3, 1, '2026-09-30T14:05:00-03:00', '2026-10-02T17:00:00-03:00') RETURNING id`,
        [ferramentaId, colab.id, colab.setor_id]
      )
    ).rows[0].id;
    await query(
      `UPDATE emprestimos SET data_devolucao = '2026-10-01T09:30:00-03:00', condicao_devolucao = 'ok', usuario_devolucao_id = 1
       WHERE id = $1`,
      [emprestimoId]
    );
  });

  afterAll(async () => {
    await query('DELETE FROM emprestimos WHERE ferramenta_id = $1', [ferramentaId]);
    await query('DELETE FROM ferramentas WHERE id = $1', [ferramentaId]);
  });

  it('ferramentas: cabeçalho do modelo de importação, aspas escapadas e fórmula neutralizada', async () => {
    const res = await baixar('/exportacoes/ferramentas', 'manutencao');

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="ferramentas-\d{4}-\d{2}-\d{2}\.csv"/);
    const linhas = res.body.split('\r\n');
    expect(linhas[0]).toBe('﻿"codigo";"nome";"categoria";"marca";"modelo";"setor";"localizacao";"descricao";"status"');
    const minha = linhas.find((l: string) => l.includes(PREFIXO));
    expect(minha).toContain(`"${PREFIXO}Martelo ""pena""";"Ferramentas Manuais";"'=HYPERLINK(""x"")"`);
    expect(minha).toMatch(/"Disponível"$/);
  });

  it('o arquivo exportado volta pela importação sem duplicar nada', async () => {
    const exportado = await baixar('/exportacoes/setores');
    const res = await importar('setores', exportado.body);
    expect(res.status).toBe(200);
    expect(res.body.data.resumo.aceitas).toBe(0);
    expect(res.body.data.resumo.ignoradas).toBe(res.body.data.resumo.total_linhas);
  });

  it('emprestimos: colunas da tela de histórico e filtros da listagem', async () => {
    const res = await baixar('/exportacoes/emprestimos?situacao=devolvido');
    expect(res.status).toBe(200);
    const [cabecalho, ...corpo] = res.body.trimEnd().split('\r\n');
    expect(cabecalho).toBe('﻿"Ferramenta";"Código";"Colaborador";"Matrícula";"Setor";"Retirada";"Previsão";"Devolução";"Situação"');
    for (const linha of corpo) expect(linha).toMatch(/"Devolvido"$/);
    const codigo = (await query('SELECT codigo_identificacao FROM ferramentas WHERE id = $1', [ferramentaId])).rows[0].codigo_identificacao;
    expect(corpo.find((l: string) => l.includes(PREFIXO))).toMatch(
      new RegExp(`^"${PREFIXO}Martelo ""pena""";"${String(codigo).padStart(6, '0')}";".+";"0002";".+";"30/09/2026 14:05";"02/10/2026";"01/10/2026 09:30";"Devolvido"$`)
    );

    const emAberto = await baixar('/exportacoes/emprestimos?situacao=em_aberto');
    expect(emAberto.body).not.toContain(PREFIXO);
    expect((await baixar('/exportacoes/emprestimos?situacao=perdido')).status).toBe(400);
  });

  it('400 para recurso desconhecido, 401 sem token e 403 para consulta', async () => {
    expect((await baixar('/exportacoes/usuarios')).status).toBe(400);
    expect((await request(app).get('/v1/exportacoes/setores')).status).toBe(401);
    expect((await baixar('/exportacoes/setores', 'consulta')).status).toBe(403);
  });
});
