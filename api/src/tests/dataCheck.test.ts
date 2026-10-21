import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import type { PoolClient } from 'pg';
import { getClient, pool, query } from '../config/database.js';
import {
  codigoDeSaida,
  executarVerificacoes,
  IDS_VERIFICACOES,
  type Consultavel,
} from '../services/dataCheckService.js';

const execFileAsync = promisify(execFile);
const P = 'ZZTESTE_DATA_';

// Cada teste força UMA inconsistência dentro de uma transação que termina em ROLLBACK: nada vaza para o banco
// e os testes não dependem de o banco de dev estar "limpo".
let grupoId: number;
let setorId: number;
let usuarioId: number;

beforeAll(async () => {
  grupoId = (await query('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
  setorId = (await query('SELECT id FROM setores ORDER BY id LIMIT 1')).rows[0].id;
  usuarioId = (await query('SELECT id FROM usuarios WHERE ativo ORDER BY id LIMIT 1')).rows[0].id;
});

afterAll(async () => {
  await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${P}%`]);
});

async function total(db: Consultavel, id: string): Promise<number> {
  const [r] = await executarVerificacoes(db, { ids: [id] });
  return r.total;
}

/**
 * Força uma inconsistência numa transação revertida e diz se a verificação `id` aponta o registro criado.
 * `forcar` devolve o marcador (id do registro) que deve aparecer na amostra. Procurar o registro, em vez de
 * comparar totais, evita falso negativo quando outro arquivo de teste grava/apaga linhas parecidas em paralelo.
 */
async function detecta(id: string, forcar: (c: PoolClient) => Promise<number | string>): Promise<boolean> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL lock_timeout = '5s'`);
    const marcador = await forcar(client);
    const [r] = await executarVerificacoes(client, { ids: [id], tamanhoAmostra: 100000 });
    return r.amostra.some((linha) => Object.values(linha).flat().includes(marcador));
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
}

async function ferramenta(c: PoolClient, nome: string, extra = ''): Promise<number> {
  const r = await c.query(`INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id`, [`${P}${nome}`, grupoId]);
  if (extra) await c.query(`UPDATE ferramentas SET ${extra} WHERE id = $1`, [r.rows[0].id]);
  return r.rows[0].id;
}

/** Matrícula é CHECK de 4 dígitos (0001-9999): sorteia uma que ninguém usa. */
async function colaborador(c: PoolClient, ativo = true): Promise<number> {
  const livre = await c.query(
    `SELECT LPAD(n::text, 4, '0') AS m FROM generate_series(1, 9999) n
     WHERE LPAD(n::text, 4, '0') NOT IN (SELECT matricula FROM colaboradores) ORDER BY random() LIMIT 1`
  );
  const r = await c.query(
    `INSERT INTO colaboradores (nome, matricula, setor_id, ativo) VALUES ($1, $2, $3, $4) RETURNING id`,
    [`${P}colab`, livre.rows[0].m, setorId, ativo]
  );
  return r.rows[0].id;
}

async function emprestimo(c: PoolClient, ferramentaId: number, colaboradorId: number, previsao = `NOW() + INTERVAL '3 days'`) {
  const r = await c.query(
    `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
     VALUES ($1, $2, $3, $4, ${previsao}) RETURNING id`,
    [ferramentaId, colaboradorId, setorId, usuarioId]
  );
  return r.rows[0].id as number;
}

describe('data:check — catálogo de verificações', () => {
  it('lista as verificações esperadas e cada uma roda sem falhar', async () => {
    const resultados = await executarVerificacoes();
    expect(resultados.map((r) => r.id)).toEqual(IDS_VERIFICACOES);
    expect(IDS_VERIFICACOES.length).toBeGreaterThanOrEqual(19);
    for (const r of resultados) {
      expect(r.titulo, r.id).not.toMatch(/falha ao executar/);
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.amostra.length).toBeLessThanOrEqual(10);
    }
  });

  it('uma verificação que falha ao executar vira erro e não derruba as outras', async () => {
    const quebrado: Consultavel = {
      query: async (sql: string) => {
        if (sql.includes("f.status = 'em_uso'")) throw new Error('banco indisponível');
        return { rows: [{ total: 0, amostra: [] }] };
      },
    };
    const resultados = await executarVerificacoes(quebrado, { ids: ['EM_USO_SEM_EMPRESTIMO', 'FERRAMENTA_VALOR_NEGATIVO'] });
    expect(resultados).toHaveLength(2);
    expect(resultados[0]).toMatchObject({ id: 'EM_USO_SEM_EMPRESTIMO', gravidade: 'erro', total: 1 });
    expect(resultados[0].titulo).toMatch(/falha ao executar/);
    expect(resultados[0].amostra[0].erro).toBe('banco indisponível');
    expect(resultados[1]).toMatchObject({ id: 'FERRAMENTA_VALOR_NEGATIVO', total: 0 });
  });

  it('só os erros reprovam: aviso com registros mantém a saída 0', () => {
    const base = { id: 'X', titulo: 'x', correcao: 'x', amostra: [] };
    expect(codigoDeSaida([{ ...base, gravidade: 'aviso', total: 5 }])).toBe(0);
    expect(codigoDeSaida([{ ...base, gravidade: 'erro', total: 0 }])).toBe(0);
    expect(codigoDeSaida([{ ...base, gravidade: 'erro', total: 1 }])).toBe(1);
  });
});

describe('data:check — detecta a inconsistência forçada', () => {
  it('EM_USO_SEM_EMPRESTIMO', async () => {
    expect(await detecta('EM_USO_SEM_EMPRESTIMO', (c) => ferramenta(c, 'uso', `status = 'em_uso'`))).toBe(true);
  });

  it('EMPRESTIMO_ABERTO_FERRAMENTA_NAO_EM_USO', async () => {
    const achou = await detecta('EMPRESTIMO_ABERTO_FERRAMENTA_NAO_EM_USO', async (c) => {
      const f = await ferramenta(c, 'aberto');
      const e = await emprestimo(c, f, await colaborador(c));
      await c.query(`UPDATE ferramentas SET status = 'disponivel' WHERE id = $1`, [f]); // a trigger tinha posto em_uso
      return e;
    });
    expect(achou).toBe(true);
  });

  it('INDISPONIVEL_SEM_MOTIVO', async () => {
    expect(await detecta('INDISPONIVEL_SEM_MOTIVO', (c) => ferramenta(c, 'sem-motivo', `status = 'indisponivel'`))).toBe(true);
  });

  it('MOTIVO_COM_STATUS_DIFERENTE', async () => {
    expect(await detecta('MOTIVO_COM_STATUS_DIFERENTE', (c) => ferramenta(c, 'motivo', `motivo_indisponivel = 'avaria'`))).toBe(true);
  });

  it('INDISPONIVEL_SEM_OCORRENCIA_ABERTA', async () => {
    const achou = await detecta('INDISPONIVEL_SEM_OCORRENCIA_ABERTA', (c) =>
      ferramenta(c, 'sem-ocorrencia', `status = 'indisponivel', motivo_indisponivel = 'perda'`)
    );
    expect(achou).toBe(true);
  });

  it('OCORRENCIA_ABERTA_FERRAMENTA_DISPONIVEL', async () => {
    const achou = await detecta('OCORRENCIA_ABERTA_FERRAMENTA_DISPONIVEL', async (c) => {
      const f = await ferramenta(c, 'oc-disponivel');
      const r = await c.query(
        `INSERT INTO ocorrencias (ferramenta_id, tipo, descricao, status, registrada_por) VALUES ($1, 'AVARIA', 'teste', 'aberta', $2) RETURNING id`,
        [f, usuarioId]
      );
      return r.rows[0].id;
    });
    expect(achou).toBe(true);
  });

  it('COLABORADOR_MATRICULA_DUPLICADA roda limpo (UNIQUE + CHECK de 4 dígitos impedem forçar o caso)', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const a = await colaborador(client);
      const m = (await client.query('SELECT matricula FROM colaboradores WHERE id = $1', [a])).rows[0].matricula;
      await expect(
        client.query(`INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3)`, [`${P}colab`, m, setorId])
      ).rejects.toMatchObject({ code: '23505' });
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    expect(await total(pool, 'COLABORADOR_MATRICULA_DUPLICADA')).toBe(0);
  });

  it('FERRAMENTA_CODIGO_DUPLICADO roda limpo (o índice único impede forçar o caso)', async () => {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const f = await ferramenta(client, 'cod1');
      const g = await ferramenta(client, 'cod2');
      await expect(
        client.query(
          `UPDATE ferramentas SET codigo_identificacao = (SELECT codigo_identificacao FROM ferramentas WHERE id = $1) WHERE id = $2`,
          [f, g]
        )
      ).rejects.toMatchObject({ code: '23505' }); // banco barra: a verificação é só defensiva
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    expect(await total(pool, 'FERRAMENTA_CODIGO_DUPLICADO')).toBe(0);
  });

  it('EMPRESTIMO_PREVISAO_ANTES_RETIRADA', async () => {
    const achou = await detecta('EMPRESTIMO_PREVISAO_ANTES_RETIRADA', async (c) => {
      const f = await ferramenta(c, 'prev');
      return emprestimo(c, f, await colaborador(c), `NOW() - INTERVAL '2 days'`);
    });
    expect(achou).toBe(true);
  });

  it('EMPRESTIMO_DEVOLUCAO_ANTES_RETIRADA', async () => {
    const achou = await detecta('EMPRESTIMO_DEVOLUCAO_ANTES_RETIRADA', async (c) => {
      const f = await ferramenta(c, 'dev');
      const e = await emprestimo(c, f, await colaborador(c));
      await c.query(`UPDATE emprestimos SET data_devolucao = data_retirada - INTERVAL '1 day', condicao_devolucao = 'ok' WHERE id = $1`, [e]);
      return e;
    });
    expect(achou).toBe(true);
  });

  it('EMPRESTIMO_DEVOLVIDO_SEM_CONDICAO', async () => {
    const achou = await detecta('EMPRESTIMO_DEVOLVIDO_SEM_CONDICAO', async (c) => {
      const f = await ferramenta(c, 'sem-cond');
      const e = await emprestimo(c, f, await colaborador(c));
      await c.query(`UPDATE emprestimos SET data_devolucao = NOW() WHERE id = $1`, [e]);
      return e;
    });
    expect(achou).toBe(true);
  });

  it('EMPRESTIMO_COLABORADOR_INATIVO_ABERTO', async () => {
    const achou = await detecta('EMPRESTIMO_COLABORADOR_INATIVO_ABERTO', async (c) => {
      const f = await ferramenta(c, 'inativo');
      const colab = await colaborador(c);
      const e = await emprestimo(c, f, colab);
      await c.query(`UPDATE colaboradores SET ativo = FALSE WHERE id = $1`, [colab]);
      return e;
    });
    expect(achou).toBe(true);
  });

  it('FERRAMENTA_SUBGRUPO_FORA_DO_GRUPO', async () => {
    const achou = await detecta('FERRAMENTA_SUBGRUPO_FORA_DO_GRUPO', async (c) => {
      const g1 = (await c.query(`INSERT INTO grupos_ferramentas (nome) VALUES ($1) RETURNING id`, [`${P}g1`])).rows[0].id;
      const g2 = (await c.query(`INSERT INTO grupos_ferramentas (nome) VALUES ($1) RETURNING id`, [`${P}g2`])).rows[0].id;
      const sub = (await c.query(`INSERT INTO subgrupos_ferramentas (grupo_id, nome) VALUES ($1, 'sub') RETURNING id`, [g1])).rows[0].id;
      const f = (
        await c.query(`INSERT INTO ferramentas (nome, grupo_id, subgrupo_id) VALUES ($1, $2, $3) RETURNING id`, [`${P}sub`, g1, sub])
      ).rows[0].id;
      await c.query(`UPDATE subgrupos_ferramentas SET grupo_id = $1 WHERE id = $2`, [g2, sub]); // a trigger só vigia a ferramenta
      return f;
    });
    expect(achou).toBe(true);
  });

  it('FERRAMENTA_VALOR_NEGATIVO', async () => {
    expect(await detecta('FERRAMENTA_VALOR_NEGATIVO', (c) => ferramenta(c, 'valor', `valor_aquisicao = -10`))).toBe(true);
  });

  it('FERRAMENTA_NOME_VAZIO', async () => {
    const achou = await detecta('FERRAMENTA_NOME_VAZIO', async (c) => {
      const f = await ferramenta(c, 'nome');
      await c.query(`UPDATE ferramentas SET nome = '   ' WHERE id = $1`, [f]);
      return f;
    });
    expect(achou).toBe(true);
  });

  it('OCORRENCIA_SEM_COLABORADOR_COM_EMPRESTIMO', async () => {
    const achou = await detecta('OCORRENCIA_SEM_COLABORADOR_COM_EMPRESTIMO', async (c) => {
      const f = await ferramenta(c, 'oc-sem-colab');
      const e = await emprestimo(c, f, await colaborador(c));
      const r = await c.query(
        `INSERT INTO ocorrencias (emprestimo_id, ferramenta_id, tipo, descricao, registrada_por) VALUES ($1, $2, 'AVARIA', 'teste', $3) RETURNING id`,
        [e, f, usuarioId]
      );
      return r.rows[0].id;
    });
    expect(achou).toBe(true);
  });

  it('FOTO_ARQUIVO_INEXISTENTE', async () => {
    const arquivo = `/uploads/${P}nao-existe.webp`;
    const achou = await detecta('FOTO_ARQUIVO_INEXISTENTE', async (c) => {
      await ferramenta(c, 'foto', `foto_url = '${arquivo}'`);
      return arquivo;
    });
    expect(achou).toBe(true);
  });

  it('AUDITORIA_TRIGGER_AUSENTE', async () => {
    const achou = await detecta('AUDITORIA_TRIGGER_AUSENTE', async (c) => {
      await c.query('ALTER TABLE ocorrencias DISABLE TRIGGER trg_auditoria_ocorrencias');
      return 'trg_auditoria_ocorrencias';
    });
    expect(achou).toBe(true);
  });

  it('AUDITORIA_SEM_REGISTRO', async () => {
    const achou = await detecta('AUDITORIA_SEM_REGISTRO', async (c) => {
      await ferramenta(c, 'aud-ancora'); // garante que a auditoria já está em vigor neste banco
      const f = await ferramenta(c, 'aud-sem-registro');
      await c.query(`DELETE FROM auditoria WHERE tabela = 'ferramentas' AND registro_id = $1`, [f]);
      return f;
    });
    expect(achou).toBe(true);
  });

  it('nada vaza: os cenários acima terminaram em ROLLBACK', async () => {
    const r = await query(`SELECT COUNT(*)::int AS n FROM ferramentas WHERE nome LIKE $1`, [`${P}%`]);
    expect(r.rows[0].n).toBe(0);
    const c = await query(`SELECT COUNT(*)::int AS n FROM colaboradores WHERE nome = $1`, [`${P}colab`]);
    expect(c.rows[0].n).toBe(0);
  });
});

describe('data:check — comando (CLI)', () => {
  it('--json imprime os resultados e sai com 0 ou 1 conforme os erros encontrados', async () => {
    const raiz = path.resolve(__dirname, '../..');
    let stdout = '';
    let codigo = 0;
    try {
      ({ stdout } = await execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/data-check.ts', '--json'], { cwd: raiz }));
    } catch (err: any) {
      stdout = err.stdout;
      codigo = err.code;
    }
    const resultados = JSON.parse(stdout);
    expect(resultados.map((r: { id: string }) => r.id)).toEqual(IDS_VERIFICACOES);
    const esperado = resultados.some((r: { gravidade: string; total: number }) => r.gravidade === 'erro' && r.total > 0) ? 1 : 0;
    expect(codigo).toBe(esperado);
  }, 60000);
});
