import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../config/database.js';
import * as ferramentaService from '../services/ferramentaService.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

// Prefixo isola os dados deste arquivo dos demais (ver ferramentaService.test.ts,
// que usa ZZTESTE_API05_) — tudo criado aqui é removido no afterAll.
const PREFIXO = 'ZZTESTE_API07_';

describe('ferramentaService — API-07 (criar/editar/status/baixa)', () => {
  let grupoId: number;
  let outroGrupoId: number;
  let colaboradorId: number;
  let usuarioId: number;
  let ferramentaId: number;
  let ferramentaIndisponivelId: number;
  let ocorrenciaId: number;

  beforeAll(async () => {
    const grupos = await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 2');
    grupoId = grupos.rows[0].id;
    outroGrupoId = grupos.rows[1]?.id ?? grupoId;
    colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores LIMIT 1')).rows[0].id;
    usuarioId = (await query<{ id: number }>('SELECT id FROM usuarios LIMIT 1')).rows[0].id;

    const ferramenta = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste API-07', 'Makita', 'X1', $2)
       RETURNING id`,
      [`${PREFIXO}Parafusadeira`, grupoId]
    );
    ferramentaId = ferramenta.rows[0].id;

    const ferramentaIndisponivel = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, status, motivo_indisponivel)
       VALUES ($1, 'ferramenta de teste indisponivel', 'Bosch', 'Y2', $2, 'indisponivel', 'avaria')
       RETURNING id`,
      [`${PREFIXO}Esmerilhadeira`, grupoId]
    );
    ferramentaIndisponivelId = ferramentaIndisponivel.rows[0].id;

    const ocorrencia = await query<{ id: number }>(
      `INSERT INTO ocorrencias (ferramenta_id, colaborador_id, tipo, descricao, status, registrada_por)
       VALUES ($1, $2, 'AVARIA', 'ocorrencia de teste API-07', 'em_reparo', $3)
       RETURNING id`,
      [ferramentaIndisponivelId, colaboradorId, usuarioId]
    );
    ocorrenciaId = ocorrencia.rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM auditoria WHERE tabela = $1 AND registro_id = ANY($2)', [
      'ferramentas',
      [ferramentaId, ferramentaIndisponivelId],
    ]);
    await query('DELETE FROM ocorrencias WHERE id = $1', [ocorrenciaId]);
    await query('DELETE FROM ferramentas WHERE id = ANY($1)', [[ferramentaId, ferramentaIndisponivelId]]);
  });

  describe('atualizar', () => {
    it('atualiza somente os campos informados, mantendo os demais', async () => {
      const atualizada = await ferramentaService.atualizar(ferramentaId, { localizacao: 'Prateleira B2' });
      expect(atualizada.localizacao).toBe('Prateleira B2');
      expect(atualizada.nome).toBe(`${PREFIXO}Parafusadeira`);
      expect(atualizada.marca).toBe('Makita');
    });

    it('atualiza múltiplos campos de uma vez', async () => {
      const atualizada = await ferramentaService.atualizar(ferramentaId, {
        nome: `${PREFIXO}Parafusadeira de Impacto`,
        grupoId: outroGrupoId,
      });
      expect(atualizada.nome).toBe(`${PREFIXO}Parafusadeira de Impacto`);
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
});
