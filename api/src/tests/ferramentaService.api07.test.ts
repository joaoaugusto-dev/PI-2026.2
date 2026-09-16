import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../config/database.js';
import * as ferramentaService from '../services/ferramentaService.js';
import { NotFoundError } from '../utils/errors.js';

// Prefixo isola os dados deste arquivo dos demais (ver ferramentaService.test.ts,
// que usa ZZTESTE_API05_) — tudo criado aqui é removido no afterAll.
const PREFIXO = 'ZZTESTE_API07_';

describe('ferramentaService — API-07 (criar/editar/status/baixa)', () => {
  let grupoId: number;
  let outroGrupoId: number;
  let ferramentaId: number;

  beforeAll(async () => {
    const grupos = await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 2');
    grupoId = grupos.rows[0].id;
    outroGrupoId = grupos.rows[1]?.id ?? grupoId;

    const ferramenta = await query<{ id: number }>(
      `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id)
       VALUES ($1, 'ferramenta de teste API-07', 'Makita', 'X1', $2)
       RETURNING id`,
      [`${PREFIXO}Parafusadeira`, grupoId]
    );
    ferramentaId = ferramenta.rows[0].id;
  });

  afterAll(async () => {
    await query('DELETE FROM ferramentas WHERE id = $1', [ferramentaId]);
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
});
