import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../config/database.js';
import * as ferramentaService from '../services/ferramentaService.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

// Prefixo isola os dados criados por este arquivo dos dados de seed, para não
// depender do conteúdo de db/seed.sql (que pode mudar) e não sujar o banco de
// dev — tudo criado aqui é removido no afterAll.
const PREFIXO = 'ZZTESTE_API05_';

// API-05 e API-07 dividem o mesmo arquivo (em vez de arquivos separados) de
// propósito: fn_gera_codigo_identificacao (trigger BEFORE INSERT em
// ferramentas) não é atômica sob concorrência (SELECT MIN + INSERT), então
// dois arquivos de teste inserindo em `ferramentas` ao mesmo tempo, em
// workers/processos diferentes do Vitest, geram um "duplicar valor da chave
// viola uq_ferramenta_codigo_ativo" esporádico. Dentro de um mesmo arquivo os
// testes rodam sequencialmente, o que evita a corrida sem mexer na trigger
// (fora do escopo da API-07).

describe('ferramentaService', () => {
  let grupoId: number;
  let colaboradorId: number;
  let setorId: number;
  let usuarioId: number;

  let ferramentaComHistoricoId: number;
  let ferramentaComHistoricoCodigo: number;
  let ferramentaSimplesId: number;
  let emprestimoId: number;
  let ocorrenciaId: number;

  beforeAll(async () => {
    grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas LIMIT 1')).rows[0].id;
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores LIMIT 1')).rows[0].id;
    setorId = (await query<{ id: number }>('SELECT id FROM setores LIMIT 1')).rows[0].id;
    usuarioId = (await query<{ id: number }>('SELECT id FROM usuarios LIMIT 1')).rows[0].id;

    const ferramentaComHistorico = await query<{ id: number; codigo_identificacao: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste com historico', 'Makita', 'X1', $2)
       RETURNING id, codigo_identificacao`,
      [`${PREFIXO}Furadeira Makita`, grupoId]
    );
    ferramentaComHistoricoId = ferramentaComHistorico.rows[0].id;
    ferramentaComHistoricoCodigo = ferramentaComHistorico.rows[0].codigo_identificacao;

    const ferramentaSimples = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, status)
       VALUES ($1, 'ferramenta de teste sem historico', 'Bosch', 'Y2', $2, 'em_uso')
       RETURNING id`,
      [`${PREFIXO}Esmerilhadeira Bosch`, grupoId]
    );
    ferramentaSimplesId = ferramentaSimples.rows[0].id;

    const emprestimo = await query<{ id: number }>(
      `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao, data_devolucao, condicao_devolucao, usuario_devolucao_id)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', NOW(), 'ok', $4)
       RETURNING id`,
      [ferramentaComHistoricoId, colaboradorId, setorId, usuarioId]
    );
    emprestimoId = emprestimo.rows[0].id;

    const ocorrencia = await query<{ id: number }>(
      `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, registrada_por)
       VALUES ($1, $2, 'avaria', 'ocorrencia de teste', $3)
       RETURNING id`,
      [ferramentaComHistoricoId, colaboradorId, usuarioId]
    );
    ocorrenciaId = ocorrencia.rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ocorrencias WHERE id = $1', [ocorrenciaId]);
    await query('DELETE FROM emprestimos WHERE id = $1', [emprestimoId]);
    await query('DELETE FROM ferramentas WHERE id = ANY($1)', [[ferramentaComHistoricoId, ferramentaSimplesId]]);
  });

  describe('listar', () => {
    it('filtra por q escapando coringas do ILIKE (% e _ tratados como texto literal)', async () => {
      const { rows } = await ferramentaService.listar({ offset: 0, limit: 50, q: `${PREFIXO}Furadeira` });
      expect(rows.map((f) => f.id)).toContain(ferramentaComHistoricoId);
      expect(rows.map((f) => f.id)).not.toContain(ferramentaSimplesId);
    });

    it('não retorna nada quando o texto de busca não corresponde a nenhuma ferramenta', async () => {
      const { rows } = await ferramentaService.listar({ offset: 0, limit: 50, q: `${PREFIXO}Inexistente` });
      expect(rows).toHaveLength(0);
    });

    it('filtra por status', async () => {
      const { rows } = await ferramentaService.listar({ offset: 0, limit: 50, q: PREFIXO, status: 'em_uso' });
      const ids = rows.map((f) => f.id);
      expect(ids).toContain(ferramentaSimplesId);
      expect(ids).not.toContain(ferramentaComHistoricoId);
    });

    it('filtra por grupoId', async () => {
      const { rows } = await ferramentaService.listar({ offset: 0, limit: 50, q: PREFIXO, grupoId });
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(rows.every((f) => f.grupo_id === grupoId)).toBe(true);
    });

    it('mantém paginação estável (sem repetição/salto de IDs) ao ordenar por status', async () => {
      const pagina1 = await ferramentaService.listar({ offset: 0, limit: 1, q: PREFIXO, sort: 'status' });
      const pagina2 = await ferramentaService.listar({ offset: 1, limit: 1, q: PREFIXO, sort: 'status' });
      expect(pagina1.rows[0].id).not.toBe(pagina2.rows[0].id);
    });
  });

  describe('buscarPorId', () => {
    it('retorna a ferramenta quando o ID existe', async () => {
      const ferramenta = await ferramentaService.buscarPorId(ferramentaComHistoricoId);
      expect(ferramenta.id).toBe(ferramentaComHistoricoId);
    });

    it('lança NotFoundError quando o ID não existe', async () => {
      await expect(ferramentaService.buscarPorId(999999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('buscarPorCodigo', () => {
    it('retorna a ferramenta quando o código de identificação existe', async () => {
      const ferramenta = await ferramentaService.buscarPorCodigo(ferramentaComHistoricoCodigo);
      expect(ferramenta.id).toBe(ferramentaComHistoricoId);
    });

    it('lança NotFoundError quando o código não existe', async () => {
      await expect(ferramentaService.buscarPorCodigo(9999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('historico', () => {
    it('junta empréstimos e ocorrências da ferramenta', async () => {
      const resultado = await ferramentaService.historico(ferramentaComHistoricoId);
      expect(resultado.emprestimos.map((e: any) => e.id)).toContain(emprestimoId);
      expect(resultado.ocorrencias.map((o: any) => o.id)).toContain(ocorrenciaId);
    });

    it('retorna listas vazias para ferramenta sem empréstimos/ocorrências', async () => {
      const resultado = await ferramentaService.historico(ferramentaSimplesId);
      expect(resultado.emprestimos).toHaveLength(0);
      expect(resultado.ocorrencias).toHaveLength(0);
    });

    it('lança NotFoundError quando a ferramenta não existe', async () => {
      await expect(ferramentaService.historico(999999999)).rejects.toThrow(NotFoundError);
    });
  });
});

describe('ferramentaService — API-07 (criar/editar/status/baixa)', () => {
  const PREFIXO_API07 = 'ZZTESTE_API07_';

  let grupoId: number;
  let outroGrupoId: number;
  let setorId: number;
  let colaboradorId: number;
  let usuarioId: number;
  let ferramentaId: number;
  let ferramentaIndisponivelId: number;
  let ferramentaComEmprestimoAbertoId: number;
  let ferramentaParaBaixarId: number;
  let ocorrenciaId: number;
  let emprestimoAbertoId: number;

  beforeAll(async () => {
    const grupos = await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 2');
    grupoId = grupos.rows[0].id;
    outroGrupoId = grupos.rows[1]?.id ?? grupoId;
    setorId = (await query<{ id: number }>('SELECT id FROM setores LIMIT 1')).rows[0].id;
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores LIMIT 1')).rows[0].id;
    usuarioId = (await query<{ id: number }>('SELECT id FROM usuarios LIMIT 1')).rows[0].id;

    const ferramenta = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste API-07', 'Makita', 'X1', $2)
       RETURNING id`,
      [`${PREFIXO_API07}Parafusadeira`, grupoId]
    );
    ferramentaId = ferramenta.rows[0].id;

    const ferramentaIndisponivel = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, status, motivo_indisponivel)
       VALUES ($1, 'ferramenta de teste indisponivel', 'Bosch', 'Y2', $2, 'indisponivel', 'avaria')
       RETURNING id`,
      [`${PREFIXO_API07}Esmerilhadeira`, grupoId]
    );
    ferramentaIndisponivelId = ferramentaIndisponivel.rows[0].id;

    const ocorrencia = await query<{ id: number }>(
      `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, status, registrada_por)
       VALUES ($1, $2, 'AVARIA', 'ocorrencia de teste API-07', 'em_reparo', $3)
       RETURNING id`,
      [ferramentaIndisponivelId, colaboradorId, usuarioId]
    );
    ocorrenciaId = ocorrencia.rows[0].id;

    const ferramentaComEmprestimoAberto = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste com emprestimo aberto', 'Dewalt', 'Z3', $2)
       RETURNING id`,
      [`${PREFIXO_API07}Serra Circular`, grupoId]
    );
    ferramentaComEmprestimoAbertoId = ferramentaComEmprestimoAberto.rows[0].id;

    const emprestimoAberto = await query<{ id: number }>(
      `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day')
       RETURNING id`,
      [ferramentaComEmprestimoAbertoId, colaboradorId, setorId, usuarioId]
    );
    emprestimoAbertoId = emprestimoAberto.rows[0].id;

    const ferramentaParaBaixar = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste para baixa', 'Vonder', 'W4', $2)
       RETURNING id`,
      [`${PREFIXO_API07}Lixadeira`, grupoId]
    );
    ferramentaParaBaixarId = ferramentaParaBaixar.rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM auditoria WHERE tabela = $1 AND registro_id = ANY($2)', [
      'ferramentas',
      [ferramentaId, ferramentaIndisponivelId],
    ]);
    await query('DELETE FROM ocorrencias WHERE id = $1', [ocorrenciaId]);
    await query('DELETE FROM emprestimos WHERE id = $1', [emprestimoAbertoId]);
    await query('DELETE FROM ferramentas WHERE id = ANY($1)', [
      [ferramentaId, ferramentaIndisponivelId, ferramentaComEmprestimoAbertoId, ferramentaParaBaixarId],
    ]);
  });

  describe('atualizar', () => {
    it('atualiza somente os campos informados, mantendo os demais', async () => {
      const atualizada = await ferramentaService.atualizar(ferramentaId, { localizacao: 'Prateleira B2' });
      expect(atualizada.localizacao).toBe('Prateleira B2');
      expect(atualizada.nome).toBe(`${PREFIXO_API07}Parafusadeira`);
      expect(atualizada.marca).toBe('Makita');
    });

    it('atualiza múltiplos campos de uma vez', async () => {
      const atualizada = await ferramentaService.atualizar(ferramentaId, {
        nome: `${PREFIXO_API07}Parafusadeira de Impacto`,
        grupoId: outroGrupoId,
      });
      expect(atualizada.nome).toBe(`${PREFIXO_API07}Parafusadeira de Impacto`);
      expect(atualizada.grupo_id).toBe(outroGrupoId);
    });

    it('lança NotFoundError quando a ferramenta não existe', async () => {
      await expect(ferramentaService.atualizar(999999999, { nome: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('marcarEtiquetaImpressa', () => {
    it('grava a data/hora de impressão sem alterar o status', async () => {
      const antes = await ferramentaService.buscarPorId(ferramentaId);
      expect(antes.etiqueta_impressa_em).toBeNull();

      const depois = await ferramentaService.marcarEtiquetaImpressa(ferramentaId);
      expect(depois.etiqueta_impressa_em).not.toBeNull();
      expect(depois.status).toBe('disponivel');
    });

    it('lança NotFoundError quando a ferramenta não existe', async () => {
      await expect(ferramentaService.marcarEtiquetaImpressa(999999999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('disponibilizar', () => {
    it('tira a ferramenta de indisponivel, registra auditoria e resolve a ocorrência em aberto', async () => {
      const antes = await ferramentaService.buscarPorId(ferramentaIndisponivelId);
      expect(antes.status).toBe('indisponivel');

      const depois = await ferramentaService.disponibilizar(ferramentaIndisponivelId, usuarioId);
      expect(depois.status).toBe('disponivel');
      expect(depois.motivo_indisponivel).toBeNull();

      const auditoria = await query(
        `SELECT * FROM auditoria WHERE tabela = 'ferramentas' AND operacao = 'disponibilizar' AND registro_id = $1`,
        [ferramentaIndisponivelId]
      );
      expect(auditoria.rows).toHaveLength(1);
      expect(auditoria.rows[0].usuario_id).toBe(usuarioId);

      const ocorrencia = await query<{ status: string; resolvida_por: number }>(
        'SELECT status, resolvida_por FROM ocorrencias WHERE id = $1',
        [ocorrenciaId]
      );
      expect(ocorrencia.rows[0].status).toBe('resolvida');
      expect(ocorrencia.rows[0].resolvida_por).toBe(usuarioId);
    });

    it('lança ConflictError ao tentar disponibilizar uma ferramenta que já está disponível', async () => {
      await expect(ferramentaService.disponibilizar(ferramentaIndisponivelId, usuarioId)).rejects.toThrow(
        ConflictError
      );
    });

    it('lança NotFoundError quando a ferramenta não existe', async () => {
      await expect(ferramentaService.disponibilizar(999999999, usuarioId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('baixar', () => {
    it('lança ConflictError quando há empréstimo em aberto para a ferramenta', async () => {
      await expect(ferramentaService.baixar(ferramentaComEmprestimoAbertoId)).rejects.toThrow(ConflictError);
    });

    it('dá baixa lógica (ativo=false, status=indisponivel, motivo=baixada) quando não há empréstimo em aberto', async () => {
      const baixada = await ferramentaService.baixar(ferramentaParaBaixarId);
      expect(baixada.ativo).toBe(false);
      expect(baixada.status).toBe('indisponivel');
      expect(baixada.motivo_indisponivel).toBe('baixada');

      await expect(ferramentaService.buscarPorId(ferramentaParaBaixarId)).rejects.toThrow(NotFoundError);
    });

    it('lança NotFoundError quando a ferramenta não existe', async () => {
      await expect(ferramentaService.baixar(999999999)).rejects.toThrow(NotFoundError);
    });
  });
});
