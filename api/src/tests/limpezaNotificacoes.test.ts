import { describe, it, expect, afterAll } from 'vitest';
import { query } from '../config/database.js';

// fn_limpar_notificacoes() (migration 0007): só apaga lidas com mais de 30 dias.
const PREFIXO = 'ZZTESTE_API17_LIMPEZA_';

describe('fn_limpar_notificacoes', () => {
  afterAll(async () => {
    await query('DELETE FROM notificacoes WHERE titulo LIKE $1', [`${PREFIXO}%`]);
  });

  it('apaga lida antiga e preserva lida recente e não lida antiga', async () => {
    const inserir = async (nome: string, lida: boolean, dias: number) =>
      (
        await query<{ id: number }>(
          `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, lida, created_at)
           VALUES (NULL, 'sistema', $1, 'm', $2, NOW() - make_interval(days => $3)) RETURNING id`,
          [`${PREFIXO}${nome}`, lida, dias]
        )
      ).rows[0].id;
    const lidaAntiga = await inserir('lida-antiga', true, 31);
    const lidaRecente = await inserir('lida-recente', true, 5);
    const naoLidaAntiga = await inserir('nao-lida-antiga', false, 60);

    await query('SELECT fn_limpar_notificacoes()');

    const restantes = (await query<{ id: number }>('SELECT id FROM notificacoes WHERE id = ANY($1)', [[lidaAntiga, lidaRecente, naoLidaAntiga]])).rows.map((r) => r.id);
    expect(restantes).not.toContain(lidaAntiga);
    expect(restantes).toEqual(expect.arrayContaining([lidaRecente, naoLidaAntiga]));
  });
});
