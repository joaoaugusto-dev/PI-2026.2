import { query } from '../config/database.js';
import { AppError } from '../utils/errors.js';

const BRASIL_API_BASE_URL = 'https://brasilapi.com.br/api/feriados/v1';

export interface Feriado {
  id: number;
  data: string;
  nome: string;
  tipo: string | null;
  ano: number;
}

interface BrasilApiFeriado {
  date: string;
  name: string;
  type: string;
}

/**
 * Busca os feriados nacionais do ano na BrasilAPI (fonte externa).
 * Lança AppError 502 se a fonte externa estiver indisponível — quem chama
 * decide se cai para o fallback de sábado/domingo (Regra 9 do CLAUDE.md).
 */
async function buscarNaBrasilApi(ano: number): Promise<BrasilApiFeriado[]> {
  const url = `${BRASIL_API_BASE_URL}/${ano}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (error: any) {
    throw new AppError(
      `Falha de rede ao consultar a BrasilAPI de feriados: ${error?.message || error}`,
      502,
      'BRASIL_API_UNAVAILABLE'
    );
  }

  if (!response.ok) {
    throw new AppError(
      `BrasilAPI retornou status ${response.status} para o ano ${ano}`,
      502,
      'BRASIL_API_UNAVAILABLE'
    );
  }

  return (await response.json()) as BrasilApiFeriado[];
}

/**
 * Sincroniza os feriados de um ano: busca na BrasilAPI e grava (upsert) na
 * tabela de cache local `feriados`. Se a fonte externa falhar, apenas repassa
 * o erro — a leitura (listarPorAno) é quem decide aplicar o fallback.
 */
export async function sincronizarFeriados(ano: number): Promise<Feriado[]> {
  const feriadosExternos = await buscarNaBrasilApi(ano);

  const salvos: Feriado[] = [];
  for (const feriado of feriadosExternos) {
    const result = await query<Feriado>(
      `INSERT INTO feriados (data, nome, tipo, ano)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (data) DO UPDATE SET nome = EXCLUDED.nome, tipo = EXCLUDED.tipo
       RETURNING id, to_char(data, 'YYYY-MM-DD') AS data, nome, tipo, ano`,
      [feriado.date, feriado.name, feriado.type, ano]
    );
    salvos.push(result.rows[0]);
  }

  return salvos;
}

function ehFimDeSemana(data: Date): boolean {
  const diaDaSemana = data.getUTCDay();
  return diaDaSemana === 0 || diaDaSemana === 6;
}

/**
 * Gera a lista de fallback de um ano quando a BrasilAPI está fora do ar:
 * apenas os sábados e domingos (Regra 9 do CLAUDE.md), sem os feriados
 * nacionais em si — é um fallback de "dia não útil", não um espelho da API.
 */
function gerarFallbackFinsDeSemana(ano: number): Feriado[] {
  const fallback: Feriado[] = [];
  const data = new Date(Date.UTC(ano, 0, 1));

  while (data.getUTCFullYear() === ano) {
    if (ehFimDeSemana(data)) {
      fallback.push({
        id: 0,
        data: data.toISOString().slice(0, 10),
        nome: data.getUTCDay() === 0 ? 'Domingo' : 'Sábado',
        tipo: 'fallback_fim_de_semana',
        ano,
      });
    }
    data.setUTCDate(data.getUTCDate() + 1);
  }

  return fallback;
}

/**
 * Lista os feriados de um ano priorizando o cache local; se o cache estiver
 * vazio, tenta sincronizar com a BrasilAPI e, se a fonte externa falhar,
 * cai para o fallback de sábado/domingo (Regra 9 do CLAUDE.md).
 */
export async function listarPorAno(ano: number): Promise<{ feriados: Feriado[]; fonte: 'cache' | 'brasil_api' | 'fallback_fim_de_semana' }> {
  const cache = await query<Feriado>(
    `SELECT id, to_char(data, 'YYYY-MM-DD') AS data, nome, tipo, ano
     FROM feriados WHERE ano = $1 ORDER BY data`,
    [ano]
  );

  if (cache.rows.length > 0) {
    return { feriados: cache.rows, fonte: 'cache' };
  }

  try {
    const sincronizados = await sincronizarFeriados(ano);
    return { feriados: sincronizados, fonte: 'brasil_api' };
  } catch (error) {
    if (error instanceof AppError && error.code === 'BRASIL_API_UNAVAILABLE') {
      return { feriados: gerarFallbackFinsDeSemana(ano), fonte: 'fallback_fim_de_semana' };
    }
    throw error;
  }
}

/**
 * Verifica se uma data (YYYY-MM-DD) é dia útil, consultando o cache/fonte
 * externa de feriados do respectivo ano e o calendário de fins de semana.
 */
export async function ehDiaUtil(dataISO: string): Promise<boolean> {
  const data = new Date(`${dataISO}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) {
    throw new AppError('Data inválida, use o formato YYYY-MM-DD', 400, 'INVALID_DATE');
  }

  if (ehFimDeSemana(data)) {
    return false;
  }

  const { feriados } = await listarPorAno(data.getUTCFullYear());
  return !feriados.some((f) => f.data === dataISO);
}
