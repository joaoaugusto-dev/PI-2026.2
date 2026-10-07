import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';
import { converterValor, normalizarCabecalho } from '../validators/importacaoValidator.js';

// o nome é gravado em maiúsculas, então o prefixo de limpeza também
const PREFIXO = 'ZZTESTE_IMPORT_';
const GRUPO = `${PREFIXO}Grupo`;
const SETOR = `${PREFIXO}Setor`;
const token = (papel: string) => jwt.sign({ id: 1, papel }, env.jwt.secret, { expiresIn: '1h' });

const importar = (corpo: string | Buffer | undefined, papel: string | null = 'admin', tipo = 'text/csv') => {
  const req = request(app).post('/v1/importacoes/ferramentas').set('Content-Type', tipo);
  if (papel) req.set('Authorization', `Bearer ${token(papel)}`);
  return req.send(corpo);
};

const ferramentasImportadas = async () =>
  (
    await query(
      `SELECT nome, marca, modelo, localizacao, valor_aquisicao, setor_id, grupo_id, status, codigo_identificacao
       FROM ferramentas WHERE nome LIKE $1 AND ativo = true ORDER BY id`,
      [`${PREFIXO}%`]
    )
  ).rows;

describe('POST /v1/importacoes/ferramentas', () => {
  let grupoId: number;
  let setorId: number;

  beforeAll(async () => {
    grupoId = (await query('INSERT INTO grupos_ferramentas (nome) VALUES ($1) RETURNING id', [GRUPO])).rows[0].id;
    setorId = (await query('INSERT INTO setores (nome) VALUES ($1) RETURNING id', [SETOR])).rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
    await query('DELETE FROM grupos_ferramentas WHERE id = $1', [grupoId]);
    await query('DELETE FROM setores WHERE id = $1', [setorId]);
  });

  // "Pronto quando" da DATA-03: 2 linhas erradas de propósito
  const csvOnda = [
    'nome;categoria;marca;modelo;setor;localizacao;valor',
    `${PREFIXO}Furadeira de impacto;${GRUPO};Bosch;GSB 13;${SETOR};Armário 2;1.234,56`,
    `${PREFIXO}Torquímetro;${GRUPO.toUpperCase()};Gedore;80-360 NM;;;890`,
    `${PREFIXO}Sem categoria;;Irwin;;;;`,
    `  ${PREFIXO}Grifo   24 pol  ;${GRUPO};Irwin;;;Parede;R$ 89,90`,
    `${PREFIXO}Valor ruim;${GRUPO};;;;;12,345`,
  ].join('\r\n');

  it('importa as linhas boas e relata as 2 rejeitadas com o motivo e o número da linha', async () => {
    const res = await importar(csvOnda);

    expect(res.status).toBe(200);
    expect(res.body.data.resumo).toEqual({ total_linhas: 5, aceitas: 3, rejeitadas: 2, ignoradas: 0 });
    expect(res.body.data.rejeitadas).toEqual([
      { linha: 4, motivos: ['Categoria é obrigatória'], dados: { nome: `${PREFIXO}Sem categoria`, marca: 'Irwin' } },
      {
        linha: 6,
        motivos: ['Valor inválido (use o formato 1.234,56)'],
        dados: { nome: `${PREFIXO}Valor ruim`, categoria: GRUPO, valor: '12,345' },
      },
    ]);
    expect(res.body.data.aceitas.map((a: any) => a.linha)).toEqual([2, 3, 5]);
    expect(res.body.data.aceitas[0].codigo_identificacao).toEqual(expect.any(Number));

    const gravadas = await ferramentasImportadas();
    expect(gravadas).toHaveLength(3);
    expect(gravadas[0]).toMatchObject({
      nome: `${PREFIXO}FURADEIRA DE IMPACTO`,
      marca: 'Bosch',
      modelo: 'GSB 13',
      localizacao: 'Armário 2',
      valor_aquisicao: '1234.56',
      setor_id: setorId,
      grupo_id: grupoId,
      status: 'disponivel',
    });
    expect(gravadas[1]).toMatchObject({ nome: `${PREFIXO}TORQUÍMETRO`, valor_aquisicao: '890.00', setor_id: null });
    expect(gravadas[2]).toMatchObject({ nome: `${PREFIXO}GRIFO 24 POL`, valor_aquisicao: '89.90', localizacao: 'Parede' });
  });

  it('reenviar a mesma onda não duplica: as já cadastradas viram ignoradas', async () => {
    const res = await importar(csvOnda);

    expect(res.status).toBe(200);
    expect(res.body.data.resumo).toEqual({ total_linhas: 5, aceitas: 0, rejeitadas: 2, ignoradas: 3 });
    expect(res.body.data.ignoradas[0]).toMatchObject({ linha: 2, motivo: expect.stringMatching(/^Já cadastrada \(código \d+\)$/) });
    expect(await ferramentasImportadas()).toHaveLength(3);
  });

  it('ignora repetida no próprio arquivo, rejeita categoria/setor inexistentes e coluna a mais', async () => {
    const csv = [
      // "Grupo" é apelido aceito de "categoria"
      'Nome,Grupo,Marca,Setor,Observação',
      `${PREFIXO}Chave inglesa,${GRUPO},Extra,,qualquer coisa`,
      `${PREFIXO}CHAVE  INGLESA,${GRUPO},extra,,`,
      `${PREFIXO}Escada,Não existe,,Setor fantasma,`,
      `${PREFIXO}Lixa,${GRUPO},3M,,obs,sobrou`,
      `"${PREFIXO}Paleteira, 2.500 kg",${GRUPO},TM,,`,
    ].join('\n');

    const res = await importar(csv);

    expect(res.status).toBe(200);
    expect(res.body.data.colunas_ignoradas).toEqual(['Observação']);
    expect(res.body.data.resumo).toEqual({ total_linhas: 5, aceitas: 2, rejeitadas: 2, ignoradas: 1 });
    expect(res.body.data.ignoradas).toEqual([
      expect.objectContaining({ linha: 3, motivo: 'Repetida no arquivo (mesma da linha 2)' }),
    ]);
    expect(res.body.data.rejeitadas[0]).toMatchObject({
      linha: 4,
      motivos: ['Categoria "Não existe" não cadastrada', 'Setor "Setor fantasma" não cadastrado'],
    });
    expect(res.body.data.rejeitadas[1].linha).toBe(5);
    expect(res.body.data.rejeitadas[1].motivos[0]).toMatch(/6 colunas e o cabeçalho tem 5/);
    expect(res.body.data.aceitas[1].nome).toBe(`${PREFIXO}PALETEIRA, 2.500 KG`);
  });

  it('lê CSV salvo pelo Excel em Windows-1252 e com BOM em UTF-8', async () => {
    const latin1 = Buffer.from(`nome;categoria;localização\n${PREFIXO}Saca rolamento;${GRUPO};Armário 1\n`, 'latin1');
    const r1 = await importar(latin1, 'admin', 'application/vnd.ms-excel');
    expect(r1.status).toBe(200);
    expect(r1.body.data.resumo.aceitas).toBe(1);

    const bom = Buffer.from(`﻿nome;categoria\n${PREFIXO}Engraxadeira;${GRUPO}\n;;\n`, 'utf8');
    const r2 = await importar(bom, 'manutencao');
    expect(r2.status).toBe(200);
    expect(r2.body.data.resumo).toEqual({ total_linhas: 1, aceitas: 1, rejeitadas: 0, ignoradas: 0 });

    const nomes = (await ferramentasImportadas()).map((f) => [f.nome, f.localizacao]);
    expect(nomes).toContainEqual([`${PREFIXO}SACA ROLAMENTO`, 'Armário 1']);
    expect(nomes).toContainEqual([`${PREFIXO}ENGRAXADEIRA`, null]);
  });

  it('400 para corpo ausente, outro Content-Type, arquivo vazio, só cabeçalho ou sem colunas obrigatórias', async () => {
    expect((await importar(undefined)).status).toBe(400);
    expect((await importar('{"nome":"x"}', 'admin', 'application/json')).status).toBe(400);
    expect((await importar('\n\n')).body.error.message).toBe('O arquivo CSV está vazio');
    expect((await importar('nome;categoria\n')).body.error.message).toMatch(/nenhuma linha além do cabeçalho/);

    const semCategoria = await importar(`nome;marca\n${PREFIXO}x;y`);
    expect(semCategoria.status).toBe(400);
    expect(semCategoria.body.error.message).toMatch(/ausente\(s\) no cabeçalho: categoria/);
  });

  it('400 acima de 5000 linhas e 413 acima de 2 MB', async () => {
    const muitas = ['nome;categoria', ...Array.from({ length: 5001 }, (_, i) => `x${i};y`)].join('\n');
    expect((await importar(muitas)).body.error.message).toMatch(/limite é 5000/);
    expect((await importar(Buffer.alloc(2 * 1024 * 1024 + 1, 'a'))).status).toBe(413);
  });

  it('401 sem token e 403 para consulta', async () => {
    expect((await importar(csvOnda, null)).status).toBe(401);
    expect((await importar(csvOnda, 'consulta')).status).toBe(403);
  });
});

describe('normalização da importação', () => {
  it('converte valor no formato brasileiro', () => {
    expect(converterValor('1.234,56')).toBe(1234.56);
    expect(converterValor('1234,5')).toBe(1234.5);
    expect(converterValor('R$ 1.234.567')).toBe(1234567);
    expect(converterValor('89.90')).toBe(89.9);
    expect(converterValor('0')).toBe(0);
    for (const ruim of ['12,345', '1.23.4', '-5', 'abc', '1,2,3', '']) {
      expect(converterValor(ruim)).toBeNaN();
    }
  });

  it('normaliza o cabeçalho (acento, caixa e espaço)', () => {
    expect(normalizarCabecalho(' Localização ')).toBe('localizacao');
    expect(normalizarCabecalho('Valor Aquisição')).toBe('valor_aquisicao');
    expect(normalizarCabecalho('Descrição')).toBe('descricao');
  });
});
