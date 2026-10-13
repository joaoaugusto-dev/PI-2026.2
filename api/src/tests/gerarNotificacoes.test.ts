import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../config/database.js';

// fn_gerar_notificacoes() (migration 0006), a mesma que o servidor chama na subida e a cada 30 min.
const PREFIXO = 'ZZTESTE_GERAR_NOTIF_';

describe('fn_gerar_notificacoes', () => {
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    const grupoId = (await query<{ id: number }>('SELECT id FROM grupos_ferramentas ORDER BY id LIMIT 1')).rows[0].id;
    const setorId = (await query<{ id: number }>('SELECT id FROM setores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    const colaboradorId = (await query<{ id: number }>('SELECT id FROM colaboradores WHERE ativo = true ORDER BY id LIMIT 1')).rows[0].id;
    const usuarioId = (await query<{ id: number }>("SELECT id FROM usuarios WHERE ativo = true ORDER BY id LIMIT 1")).rows[0].id;
    const casos: Record<string, string> = { hoje: '0 days', atrasada: '-2 days', futura: '3 days' };
    for (const [nome, delta] of Object.entries(casos)) {
      const f = await query<{ id: number }>('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${PREFIXO}${nome}`, grupoId]);
      await query(
        `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, previsao_devolucao, usuario_retirada_id)
         VALUES ($1, $2, $3, NOW() + $4::interval, $5)`,
        [f.rows[0].id, colaboradorId, setorId, delta, usuarioId]
      );
      ids[nome] = f.rows[0].id;
    }
  });

  afterAll(async () => {
    const ferramentas = 'SELECT id FROM ferramentas WHERE nome LIKE $1';
    await query('DELETE FROM notificacoes WHERE mensagem LIKE $1', [`${PREFIXO}%`]);
    await query(`DELETE FROM emprestimos WHERE ferramenta_id IN (${ferramentas})`, [`${PREFIXO}%`]);
    await query('DELETE FROM ferramentas WHERE nome LIKE $1', [`${PREFIXO}%`]);
  });

  const doTeste = async () =>
    (await query<{ tipo: string; usuario_id: number | null; link: string }>(
      'SELECT tipo, usuario_id, link FROM notificacoes WHERE mensagem LIKE $1 ORDER BY id',
      [`${PREFIXO}%`]
    )).rows;

  it('gera devolucao_hoje e atraso para a equipe, e nada para prazo futuro', async () => {
    await query('SELECT fn_gerar_notificacoes()');
    const geradas = await doTeste();
    expect(geradas).toHaveLength(2);
    expect(geradas.every((n) => n.usuario_id === null)).toBe(true);
    const porLink = (id: number) => geradas.find((n) => n.link.startsWith(`/ferramentas/${id}?`))?.tipo;
    expect(porLink(ids.hoje)).toBe('devolucao_hoje');
    expect(porLink(ids.atrasada)).toBe('atraso');
    expect(porLink(ids.futura)).toBeUndefined();
  });

  it('é idempotente: rodar de novo (como o servidor faz a cada 30 min) não duplica', async () => {
    await query('SELECT fn_gerar_notificacoes()');
    await query('SELECT fn_gerar_notificacoes()');
    expect(await doTeste()).toHaveLength(2);
  });
});
