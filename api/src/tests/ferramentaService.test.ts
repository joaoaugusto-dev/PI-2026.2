import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../config/database.js';
import * as ferramentaService from '../services/ferramentaService.js';
import { NotFoundError } from '../utils/errors.js';

// Prefixo isola os dados criados por este arquivo dos dados de seed, para não
// depender do conteúdo de db/seed.sql (que pode mudar) e não sujar o banco de
// dev — tudo criado aqui é removido no afterAll.
const PREFIXO = 'ZZTESTE_API05_';

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
