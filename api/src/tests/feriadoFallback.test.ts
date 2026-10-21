import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { query } from '../config/database.js';
import { gerarFallbackFinsDeSemana, listarPorAno, sincronizarFeriados } from '../services/feriadoService.js';

// Regra 9: feriados da BrasilAPI com cache em tabela e fallback de sábado e domingo. A rede é simulada com um
// fetch falso; o ano 2003 (fora do que o sistema usa) isola o teste do cache de 2026 e 2027.
const ANO = 2003;

const respostaApi = (itens: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => itens,
});

async function limparAno() {
  await query('DELETE FROM feriados WHERE ano = $1', [ANO]);
}

describe('feriados: BrasilAPI, cache e fallback (Regra 9)', () => {
  beforeEach(limparAno);
  afterEach(async () => {
    vi.unstubAllGlobals();
    await limparAno();
  });

  it('BrasilAPI fora do ar (erro de rede): cai no fallback de sábado e domingo, sem erro para quem chama', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND brasilapi.com.br')));
    const r = await listarPorAno(ANO);

    expect(r.fonte).toBe('fallback_fim_de_semana');
    expect(r.feriados).toHaveLength(104); // 52 sábados + 52 domingos de 2003
    expect(r.feriados.every((f) => f.tipo === 'fallback_fim_de_semana')).toBe(true);
    expect(r.feriados.map((f) => f.nome)).toEqual(expect.arrayContaining(['Sábado', 'Domingo']));
    // o fallback não é gravado: não polui o cache com dado que não veio da API
    expect((await query('SELECT COUNT(*)::int AS n FROM feriados WHERE ano = $1', [ANO])).rows[0].n).toBe(0);
  });

  it('BrasilAPI respondendo erro HTTP (503): também cai no fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaApi({}, 503)));
    const r = await listarPorAno(ANO);
    expect(r.fonte).toBe('fallback_fim_de_semana');
  });

  it('fallback traz só fins de semana do ano pedido', () => {
    const lista = gerarFallbackFinsDeSemana(2026);
    expect(lista).toHaveLength(104);
    expect(lista[0]).toMatchObject({ data: '2026-01-03', nome: 'Sábado' }); // 1º sábado de 2026
    expect(lista[1]).toMatchObject({ data: '2026-01-04', nome: 'Domingo' });
    expect(lista.every((f) => f.data.startsWith('2026-'))).toBe(true);
  });

  it('BrasilAPI no ar: grava no cache (upsert) e as leituras seguintes vêm do cache, sem nova chamada', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(
      respostaApi([
        { date: `${ANO}-01-01`, name: 'Confraternização mundial', type: 'national' },
        { date: `${ANO}-04-21`, name: 'Tiradentes', type: 'national' },
      ])
    );
    vi.stubGlobal('fetch', fetchFalso);

    const primeira = await listarPorAno(ANO);
    expect(primeira.fonte).toBe('brasil_api');
    expect(primeira.feriados.map((f) => f.data)).toEqual([`${ANO}-01-01`, `${ANO}-04-21`]);

    const segunda = await listarPorAno(ANO);
    expect(segunda.fonte).toBe('cache');
    expect(segunda.feriados).toHaveLength(2);
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    // sincronizar de novo atualiza o nome sem duplicar a data (ON CONFLICT (data))
    fetchFalso.mockResolvedValue(respostaApi([{ date: `${ANO}-04-21`, name: 'Tiradentes (nome novo)', type: 'national' }]));
    await sincronizarFeriados(ANO);
    const linhas = (await query('SELECT nome FROM feriados WHERE data = $1', [`${ANO}-04-21`])).rows;
    expect(linhas).toEqual([{ nome: 'Tiradentes (nome novo)' }]);
  });

  it('falha de BANCO ao gravar não é mascarada como "API fora": o erro chega a quem chamou', async () => {
    // a API "responde", mas a data é inválida para o Postgres: o INSERT falha
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaApi([{ date: 'isto-nao-e-data', name: 'X', type: 'national' }])));
    await expect(listarPorAno(ANO)).rejects.toMatchObject({ code: '22007' });
  });
});
