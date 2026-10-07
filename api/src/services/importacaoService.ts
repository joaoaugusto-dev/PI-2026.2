import type { PoolClient } from 'pg';
import type { z } from 'zod';
import { getClient } from '../config/database.js';
import { lerCsv } from '../utils/csv.js';
import { ValidationError } from '../utils/errors.js';
import {
  LinhaColaborador,
  LinhaFerramenta,
  LinhaNome,
  RecursoImportavel,
  linhaColaboradorSchema,
  linhaFerramentaSchema,
  linhaNomeSchema,
  normalizarCabecalho,
  normalizarTexto,
} from '../validators/importacaoValidator.js';

type Papel = 'manutencao' | 'admin';
type DadosLinha = Record<string, string>;
type ItemAceito = { id: number } & Record<string, unknown>;

/**
 * O que o motor faz com uma linha que passou no Zod: ou rejeita (referência
 * inexistente, por exemplo) ou devolve a chave de duplicidade e como gravar.
 */
type Avaliacao = { motivos: string[] } | { chave: string; inserir: () => Promise<ItemAceito> };

interface Carga<L> {
  avaliar(linha: L): Avaliacao;
  /** Motivo para ignorar a linha quando a chave já existe no banco; undefined se é nova. */
  jaCadastrado(chave: string): string | undefined;
}

interface RecursoImportacao<L> {
  /** Os mesmos perfis que podem criar o recurso pela rota de cadastro. */
  papeis: Papel[];
  colunas: readonly string[];
  obrigatorias: readonly string[];
  /** Nomes alternativos aceitos no cabeçalho (já normalizados). */
  aliases?: Record<string, string>;
  /** Linha de exemplo do modelo de CSV (GET /v1/importacoes/:recurso/modelo). */
  exemplo: string[];
  schema: z.ZodType<L, z.ZodTypeDef, unknown>;
  /** Carrega, dentro da transação, o que a validação precisa (ids por nome, chaves já cadastradas). */
  preparar(client: PoolClient, usuarioId: number): Promise<Carga<L>>;
}

// Carga em ondas (visita técnica 01/09): o inventário chega aos poucos, então
// um arquivo por vez não precisa ser grande.
export const MAX_LINHAS_IMPORTACAO = 5000;

/** Chave sem diferenciar maiúsculas e espaços. */
const chaveTexto = (...partes: (string | null | undefined)[]) =>
  partes.map((t) => (normalizarTexto(t) ?? '').toLowerCase()).join('|');

async function idsPorNome(client: PoolClient, tabela: 'grupos_ferramentas' | 'setores'): Promise<Map<string, number>> {
  const { rows } = await client.query<{ id: number; nome: string }>(`SELECT id, nome FROM ${tabela} WHERE ativo = true`);
  return new Map(rows.map((r) => [chaveTexto(r.nome), r.id]));
}

const ferramentas: RecursoImportacao<LinhaFerramenta> = {
  papeis: ['manutencao', 'admin'],
  colunas: ['nome', 'categoria', 'marca', 'modelo', 'setor', 'localizacao', 'descricao', 'valor'],
  obrigatorias: ['nome', 'categoria'],
  aliases: { grupo: 'categoria', valor_aquisicao: 'valor' },
  exemplo: ['Furadeira de impacto', 'Ferramentas Elétricas', 'Bosch', 'GSB 13', 'Manutenção Geral', 'Armário 2', '', '1.234,56'],
  schema: linhaFerramentaSchema,
  async preparar(client) {
    const grupos = await idsPorNome(client, 'grupos_ferramentas');
    const setores = await idsPorNome(client, 'setores');
    // Sem patrimônio legado no schema (removido com o código de 4 dígitos) nem
    // no inventário da DATA-01: nome + marca + modelo é o que identifica um
    // item (a mesma chave de chaveFerramenta no front).
    const { rows } = await client.query<{ nome: string; marca: string | null; modelo: string | null; codigo_identificacao: number }>(
      'SELECT nome, marca, modelo, codigo_identificacao FROM ferramentas WHERE ativo = true'
    );
    const cadastradas = new Map(rows.map((f) => [chaveTexto(f.nome, f.marca, f.modelo), f.codigo_identificacao]));

    return {
      jaCadastrado: (chave) => {
        const codigo = cadastradas.get(chave);
        return codigo === undefined ? undefined : `Já cadastrada (código ${codigo})`;
      },
      avaliar(l) {
        const motivos: string[] = [];
        const grupoId = grupos.get(chaveTexto(l.categoria));
        if (grupoId === undefined) motivos.push(`Categoria "${l.categoria}" não cadastrada`);
        const setorId = l.setor === undefined ? null : setores.get(chaveTexto(l.setor));
        if (setorId === undefined) motivos.push(`Setor "${l.setor}" não cadastrado`);
        if (motivos.length) return { motivos };

        return {
          chave: chaveTexto(l.nome, l.marca, l.modelo),
          inserir: async () =>
            (
              await client.query<ItemAceito>(
                `INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, setor_id, localizacao, valor_aquisicao)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, codigo_identificacao, nome`,
                [l.nome, l.descricao ?? null, l.marca ?? null, l.modelo ?? null, grupoId, setorId, l.localizacao ?? null, l.valor ?? null]
              )
            ).rows[0],
        };
      },
    };
  },
};

const colaboradores: RecursoImportacao<LinhaColaborador> = {
  papeis: ['manutencao', 'admin'],
  colunas: ['matricula', 'nome', 'setor'],
  obrigatorias: ['matricula', 'nome', 'setor'],
  exemplo: ['0123', 'Nome Sobrenome', 'Manutenção Geral'],
  schema: linhaColaboradorSchema,
  async preparar(client, usuarioId) {
    const setores = await idsPorNome(client, 'setores');
    // matrícula é única entre todos os colaboradores, inclusive os inativos
    const { rows } = await client.query<{ matricula: string; nome: string; ativo: boolean }>(
      'SELECT matricula, nome, ativo FROM colaboradores'
    );
    const cadastrados = new Map(rows.map((c) => [c.matricula, c]));

    return {
      jaCadastrado: (matricula) => {
        const c = cadastrados.get(matricula);
        return c && `Matrícula já cadastrada para ${c.nome}${c.ativo ? '' : ' (inativo)'}`;
      },
      avaliar(l) {
        const setorId = setores.get(chaveTexto(l.setor));
        if (setorId === undefined) return { motivos: [`Setor "${l.setor}" não cadastrado`] };

        return {
          chave: l.matricula,
          // criado_por vem do JWT (Regra 6), como no POST /v1/colaboradores
          inserir: async () =>
            (
              await client.query<ItemAceito>(
                `INSERT INTO colaboradores (nome, matricula, setor_id, criado_por)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, matricula, nome`,
                [l.nome, l.matricula, setorId, usuarioId]
              )
            ).rows[0],
        };
      },
    };
  },
};

/** Categorias e setores: só nome, único sem diferenciar maiúsculas (inclusive entre os inativos). */
function cadastroPorNome(tabela: 'grupos_ferramentas' | 'setores', exemplo: string): RecursoImportacao<LinhaNome> {
  return {
    papeis: ['admin'],
    colunas: ['nome'],
    obrigatorias: ['nome'],
    exemplo: [exemplo],
    schema: linhaNomeSchema,
    async preparar(client) {
      const { rows } = await client.query<{ nome: string; ativo: boolean }>(`SELECT nome, ativo FROM ${tabela}`);
      const cadastrados = new Map(rows.map((r) => [chaveTexto(r.nome), r]));

      return {
        jaCadastrado: (chave) => {
          const r = cadastrados.get(chave);
          return r && `Já cadastrado como "${r.nome}"${r.ativo ? '' : ' (inativo)'}`;
        },
        avaliar: (l) => ({
          chave: chaveTexto(l.nome),
          inserir: async () =>
            (await client.query<ItemAceito>(`INSERT INTO ${tabela} (nome) VALUES ($1) RETURNING id, nome`, [l.nome])).rows[0],
        }),
      };
    },
  };
}

const RECURSOS: { [R in RecursoImportavel]: RecursoImportacao<any> } = {
  ferramentas,
  colaboradores,
  categorias: cadastroPorNome('grupos_ferramentas', 'Ferramentas Elétricas'),
  setores: cadastroPorNome('setores', 'Usinagem CNC'),
};

export const papeisImportacao = (recurso: RecursoImportavel): Papel[] => RECURSOS[recurso].papeis;

/** Cabeçalho e linha de exemplo do modelo de CSV do recurso. */
export function modelo(recurso: RecursoImportavel): { cabecalho: string[]; exemplo: string[] } {
  const { colunas, exemplo } = RECURSOS[recurso];
  return { cabecalho: [...colunas], exemplo };
}

export interface RelatorioImportacao {
  resumo: { total_linhas: number; aceitas: number; rejeitadas: number; ignoradas: number };
  aceitas: ({ linha: number } & ItemAceito)[];
  /** `dados` traz os valores como vieram no arquivo, para montar o CSV de correção. */
  rejeitadas: { linha: number; motivos: string[]; dados: DadosLinha }[];
  /** Já cadastradas (ou repetidas no próprio arquivo): não é erro, reenviar o mesmo arquivo é seguro. */
  ignoradas: { linha: number; motivo: string; dados: DadosLinha }[];
  colunas_ignoradas: string[];
}

function mensagemErroBanco(err: any): string {
  // P0001 = RAISE EXCEPTION das triggers (ex.: limite de 9999 códigos ativos)
  if (err?.code === 'P0001') return err.message;
  if (err?.code === '23505') return 'Já cadastrado (conflito com um registro existente)';
  if (err?.code === '23503') return 'Uma referência (categoria ou setor) deixou de existir durante a importação';
  if (err?.code === '23514') return 'Valor fora do formato aceito pelo banco';
  return 'Erro ao gravar a linha no banco';
}

/**
 * POST /v1/importacoes/:recurso: CSV -> parse -> normalização -> Zod por
 * linha -> deduplicação -> carga transacional -> relatório (DATA-03).
 * Linha inválida não bloqueia as válidas; cada INSERT roda num SAVEPOINT para
 * que uma falha do banco numa linha também não derrube as outras.
 */
export async function importar(recurso: RecursoImportavel, arquivo: Buffer, usuarioId: number): Promise<RelatorioImportacao> {
  const definicao = RECURSOS[recurso];
  const { cabecalho, linhas } = lerCsv(arquivo);

  const colunas = cabecalho.map((c) => {
    const normalizada = normalizarCabecalho(c);
    return definicao.aliases?.[normalizada] ?? normalizada;
  });
  const conhecida = (coluna: string) => definicao.colunas.includes(coluna);

  const faltando = definicao.obrigatorias.filter((c) => !colunas.includes(c));
  if (faltando.length) {
    throw new ValidationError(`Coluna(s) obrigatória(s) ausente(s) no cabeçalho: ${faltando.join(', ')}`, [
      { field: 'cabecalho', message: `Colunas aceitas: ${definicao.colunas.join(', ')}` },
    ]);
  }
  if (linhas.length === 0) {
    throw new ValidationError('O arquivo CSV não tem nenhuma linha além do cabeçalho');
  }
  if (linhas.length > MAX_LINHAS_IMPORTACAO) {
    throw new ValidationError(
      `O arquivo tem ${linhas.length} linhas; o limite é ${MAX_LINHAS_IMPORTACAO} por importação. Divida em ondas.`
    );
  }

  const relatorio: RelatorioImportacao = {
    resumo: { total_linhas: linhas.length, aceitas: 0, rejeitadas: 0, ignoradas: 0 },
    aceitas: [],
    rejeitadas: [],
    ignoradas: [],
    colunas_ignoradas: cabecalho.filter((_, i) => !conhecida(colunas[i])),
  };

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Duas importações simultâneas do mesmo recurso leriam os mesmos registros
    // existentes e gravariam o mesmo item duas vezes. Forma de duas chaves para
    // não colidir com o lock de chave única de fn_gera_codigo_identificacao (0005).
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', ['importacao', recurso]);

    const carga = await definicao.preparar(client, usuarioId);
    const noArquivo = new Map<string, number>();

    for (const { numero: linha, celulas } of linhas) {
      const dados: DadosLinha = {};
      colunas.forEach((coluna, i) => {
        if (conhecida(coluna) && celulas[i]) dados[coluna] = celulas[i];
      });
      const rejeitar = (motivos: string[]) => relatorio.rejeitadas.push({ linha, motivos, dados });
      const ignorar = (motivo: string) => relatorio.ignoradas.push({ linha, motivo, dados });

      // célula a mais com conteúdo costuma ser separador dentro de um valor sem aspas ("12,5" num CSV com vírgula)
      if (celulas.slice(colunas.length).some((c) => c !== '')) {
        rejeitar([`A linha tem ${celulas.length} colunas e o cabeçalho tem ${colunas.length} (valor com separador precisa estar entre aspas)`]);
        continue;
      }

      const normalizada = Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, normalizarTexto(v)]));
      const validacao = definicao.schema.safeParse(normalizada);
      if (!validacao.success) {
        rejeitar(validacao.error.issues.map((i) => i.message));
        continue;
      }

      const avaliacao = carga.avaliar(validacao.data);
      if ('motivos' in avaliacao) {
        rejeitar(avaliacao.motivos);
        continue;
      }

      const motivoCadastrado = carga.jaCadastrado(avaliacao.chave);
      if (motivoCadastrado) {
        ignorar(motivoCadastrado);
        continue;
      }
      const linhaAnterior = noArquivo.get(avaliacao.chave);
      if (linhaAnterior !== undefined) {
        ignorar(`Repetida no arquivo (mesma da linha ${linhaAnterior})`);
        continue;
      }

      try {
        await client.query('SAVEPOINT linha');
        const item = await avaliacao.inserir();
        await client.query('RELEASE SAVEPOINT linha');
        relatorio.aceitas.push({ linha, ...item });
        noArquivo.set(avaliacao.chave, linha);
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT linha');
        rejeitar([mensagemErroBanco(err)]);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  relatorio.resumo.aceitas = relatorio.aceitas.length;
  relatorio.resumo.rejeitadas = relatorio.rejeitadas.length;
  relatorio.resumo.ignoradas = relatorio.ignoradas.length;
  return relatorio;
}
