import fs from 'fs/promises';
import path from 'path';
import { pool } from '../config/database.js';
import { avariasDir, uploadsDir } from '../config/uploads.js';

/**
 * Verificações de consistência dos dados (DATA-06, `npm run data:check`).
 *
 * Todas são SELECT: o comando aponta o problema, não corrige. Cada verificação devolve o total de registros
 * problemáticos e uma amostra (até 10 linhas) para o relatório. Quem decide o que fazer com o registro é a pessoa.
 */

/** Pool ou cliente de transação: os testes rodam as verificações dentro de uma transação revertida. */
export interface Consultavel {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export type Gravidade = 'erro' | 'aviso';

export interface ResultadoVerificacao {
  id: string;
  titulo: string;
  gravidade: Gravidade;
  total: number;
  amostra: Record<string, unknown>[];
  correcao: string;
}

interface Verificacao {
  id: string;
  titulo: string;
  gravidade: Gravidade;
  correcao: string;
  /** SQL com as linhas problemáticas (sem LIMIT): o total e a amostra saem dele. */
  sql?: string;
  /** Verificação que depende de algo fora do banco (disco, catálogo do Postgres). */
  executar?: (db: Consultavel, limite: number) => Promise<{ total: number; amostra: Record<string, unknown>[] }>;
}

export const TAMANHO_AMOSTRA = 10;

// Ocorrência "viva": ainda exige a ferramenta fora de circulação.
const OCORRENCIA_ABERTA = `('aberta', 'em_reparo', 'cobrada')`;

const VERIFICACOES: Verificacao[] = [
  {
    id: 'EM_USO_SEM_EMPRESTIMO',
    titulo: 'Ferramenta "em uso" sem empréstimo aberto',
    gravidade: 'erro',
    correcao: 'Conferir o histórico da ferramenta; se ela está na bancada, devolver o status para "disponivel".',
    sql: `SELECT f.id AS ferramenta_id, f.nome, f.codigo_identificacao
          FROM ferramentas f
          WHERE f.ativo AND f.eh_kit = FALSE AND f.status = 'em_uso'
            AND NOT EXISTS (SELECT 1 FROM emprestimos e WHERE e.ferramenta_id = f.id AND e.data_devolucao IS NULL)`,
  },
  {
    id: 'EMPRESTIMO_ABERTO_FERRAMENTA_NAO_EM_USO',
    titulo: 'Empréstimo aberto de ferramenta que não está "em uso"',
    gravidade: 'erro',
    correcao: 'Registrar a devolução do empréstimo ou corrigir o status da ferramenta.',
    sql: `SELECT e.id AS emprestimo_id, e.ferramenta_id, f.nome, f.status::text AS status_ferramenta
          FROM emprestimos e
          JOIN ferramentas f ON f.id = e.ferramenta_id
          WHERE e.data_devolucao IS NULL AND e.item_kit_id IS NULL AND f.eh_kit = FALSE AND f.status <> 'em_uso'`,
  },
  {
    id: 'INDISPONIVEL_SEM_MOTIVO',
    titulo: 'Ferramenta indisponível sem motivo gravado',
    gravidade: 'erro',
    correcao: 'Preencher o motivo (avaria, perda, manutenção preventiva ou baixada) ou reativar a ferramenta.',
    sql: `SELECT id AS ferramenta_id, nome, codigo_identificacao
          FROM ferramentas WHERE status = 'indisponivel' AND motivo_indisponivel IS NULL`,
  },
  {
    id: 'MOTIVO_COM_STATUS_DIFERENTE',
    titulo: 'Motivo de indisponibilidade em ferramenta que não está indisponível',
    gravidade: 'aviso',
    correcao: 'Limpar o motivo; ele só faz sentido com status "indisponivel".',
    sql: `SELECT id AS ferramenta_id, nome, status::text AS status, motivo_indisponivel::text AS motivo
          FROM ferramentas WHERE status <> 'indisponivel' AND motivo_indisponivel IS NOT NULL`,
  },
  {
    id: 'INDISPONIVEL_SEM_OCORRENCIA_ABERTA',
    titulo: 'Ferramenta indisponível por avaria/perda sem ocorrência em andamento',
    gravidade: 'aviso',
    correcao: 'Abrir a ocorrência correspondente ou reativar a ferramenta, se o problema já foi resolvido.',
    sql: `SELECT f.id AS ferramenta_id, f.nome, f.motivo_indisponivel::text AS motivo
          FROM ferramentas f
          WHERE f.ativo AND f.status = 'indisponivel' AND f.motivo_indisponivel IN ('avaria', 'perda')
            AND NOT EXISTS (
              SELECT 1 FROM ocorrencias o WHERE o.ferramenta_id = f.id AND o.status IN ${OCORRENCIA_ABERTA}
            )`,
  },
  {
    id: 'OCORRENCIA_ABERTA_FERRAMENTA_DISPONIVEL',
    titulo: 'Ocorrência em andamento com a ferramenta marcada como disponível',
    gravidade: 'aviso',
    correcao: 'Resolver a ocorrência ou tirar a ferramenta de circulação.',
    sql: `SELECT o.id AS ocorrencia_id, o.ferramenta_id, f.nome, o.status::text AS status_ocorrencia
          FROM ocorrencias o
          JOIN ferramentas f ON f.id = o.ferramenta_id
          WHERE o.status IN ${OCORRENCIA_ABERTA} AND f.ativo AND f.status = 'disponivel'`,
  },
  {
    id: 'COLABORADOR_MATRICULA_DUPLICADA',
    titulo: 'Colaboradores com a mesma matrícula (ignorando maiúsculas e espaços)',
    gravidade: 'erro',
    correcao: 'Unificar os cadastros: manter um, inativar o outro e conferir os empréstimos de cada um.',
    sql: `SELECT LOWER(BTRIM(matricula)) AS matricula_normalizada, COUNT(*)::int AS cadastros,
                 ARRAY_AGG(id ORDER BY id) AS colaborador_ids
          FROM colaboradores
          GROUP BY LOWER(BTRIM(matricula))
          HAVING COUNT(*) > 1`,
  },
  {
    id: 'FERRAMENTA_CODIGO_DUPLICADO',
    titulo: 'Ferramentas ativas com o mesmo código de identificação',
    gravidade: 'erro',
    correcao: 'Reetiquetar uma das ferramentas (o índice uq_ferramenta_codigo_ativo deveria impedir isto).',
    sql: `SELECT codigo_identificacao, COUNT(*)::int AS ferramentas, ARRAY_AGG(id ORDER BY id) AS ferramenta_ids
          FROM ferramentas
          WHERE ativo AND codigo_identificacao IS NOT NULL
          GROUP BY codigo_identificacao
          HAVING COUNT(*) > 1`,
  },
  {
    id: 'EMPRESTIMO_PREVISAO_ANTES_RETIRADA',
    titulo: 'Empréstimo com previsão de devolução anterior à retirada',
    gravidade: 'erro',
    correcao: 'Corrigir a previsão de devolução do empréstimo.',
    sql: `SELECT id AS emprestimo_id, ferramenta_id, data_retirada, previsao_devolucao
          FROM emprestimos WHERE previsao_devolucao < data_retirada`,
  },
  {
    id: 'EMPRESTIMO_DEVOLUCAO_ANTES_RETIRADA',
    titulo: 'Empréstimo devolvido antes de ser retirado',
    gravidade: 'erro',
    correcao: 'Corrigir a data de retirada ou de devolução.',
    sql: `SELECT id AS emprestimo_id, ferramenta_id, data_retirada, data_devolucao
          FROM emprestimos WHERE data_devolucao IS NOT NULL AND data_devolucao < data_retirada`,
  },
  {
    id: 'EMPRESTIMO_DEVOLVIDO_SEM_CONDICAO',
    titulo: 'Empréstimo devolvido sem a condição da devolução',
    gravidade: 'aviso',
    correcao: 'Informar a condição (ok, avaria ou perda); sem ela o status da ferramenta não é atualizado.',
    sql: `SELECT id AS emprestimo_id, ferramenta_id, data_devolucao
          FROM emprestimos WHERE data_devolucao IS NOT NULL AND condicao_devolucao IS NULL`,
  },
  {
    id: 'EMPRESTIMO_COLABORADOR_INATIVO_ABERTO',
    titulo: 'Empréstimo aberto em nome de colaborador inativo',
    gravidade: 'aviso',
    correcao: 'Cobrar a devolução da ferramenta ou reativar o colaborador.',
    sql: `SELECT e.id AS emprestimo_id, e.ferramenta_id, c.id AS colaborador_id, c.nome AS colaborador
          FROM emprestimos e
          JOIN colaboradores c ON c.id = e.colaborador_id
          WHERE e.data_devolucao IS NULL AND c.ativo = FALSE`,
  },
  {
    id: 'FERRAMENTA_SUBGRUPO_FORA_DO_GRUPO',
    titulo: 'Ferramenta com subgrupo de outro grupo',
    gravidade: 'erro',
    correcao: 'Escolher um subgrupo que pertença ao grupo da ferramenta (ou mudar o grupo).',
    sql: `SELECT f.id AS ferramenta_id, f.nome, f.grupo_id, s.id AS subgrupo_id, s.grupo_id AS grupo_do_subgrupo
          FROM ferramentas f
          JOIN subgrupos_ferramentas s ON s.id = f.subgrupo_id
          WHERE s.grupo_id <> f.grupo_id`,
  },
  {
    id: 'FERRAMENTA_VALOR_NEGATIVO',
    titulo: 'Ferramenta com valor de aquisição negativo',
    gravidade: 'erro',
    correcao: 'Corrigir o valor de aquisição.',
    sql: `SELECT id AS ferramenta_id, nome, valor_aquisicao FROM ferramentas WHERE valor_aquisicao < 0`,
  },
  {
    id: 'FERRAMENTA_NOME_VAZIO',
    titulo: 'Ferramenta com nome em branco',
    gravidade: 'erro',
    correcao: 'Informar o nome da ferramenta.',
    sql: `SELECT id AS ferramenta_id, codigo_identificacao FROM ferramentas WHERE BTRIM(nome) = ''`,
  },
  {
    id: 'OCORRENCIA_SEM_COLABORADOR_COM_EMPRESTIMO',
    titulo: 'Ocorrência ligada a empréstimo mas sem o colaborador responsável',
    gravidade: 'aviso',
    correcao: 'Preencher o colaborador a partir do empréstimo de origem (regra 3: a ocorrência herda o responsável).',
    sql: `SELECT o.id AS ocorrencia_id, o.emprestimo_id, o.ferramenta_id
          FROM ocorrencias o
          WHERE o.emprestimo_id IS NOT NULL AND o.colaborador_id IS NULL`,
  },
  {
    id: 'FOTO_ARQUIVO_INEXISTENTE',
    titulo: 'Foto cadastrada cujo arquivo não existe no disco',
    gravidade: 'aviso',
    correcao: 'Reenviar a foto ou limpar o campo foto_url (em produção, conferir o volume persistente de uploads).',
    executar: async (db, limite) => {
      const ausentes: Record<string, unknown>[] = [];
      const fontes: { tabela: string; chave: string; pasta: string }[] = [
        { tabela: 'ferramentas', chave: 'ferramenta_id', pasta: uploadsDir },
        { tabela: 'ocorrencias', chave: 'ocorrencia_id', pasta: avariasDir },
      ];
      for (const { tabela, chave, pasta } of fontes) {
        const { rows } = await db.query(`SELECT id, foto_url FROM ${tabela} WHERE foto_url IS NOT NULL ORDER BY id`);
        for (const r of rows) {
          const arquivo = path.join(pasta, path.basename(String(r.foto_url)));
          const existe = await fs.access(arquivo).then(() => true, () => false);
          if (!existe) ausentes.push({ tabela, [chave]: r.id, foto_url: r.foto_url });
        }
      }
      return { total: ausentes.length, amostra: ausentes.slice(0, limite) };
    },
  },
  {
    id: 'AUDITORIA_TRIGGER_AUSENTE',
    titulo: 'Trigger de auditoria ausente ou desabilitada',
    gravidade: 'erro',
    correcao: 'Rodar `npm run db:migrate` (migration 0014) ou reabilitar a trigger com ALTER TABLE ... ENABLE TRIGGER.',
    executar: async (db) => {
      const { rows } = await db.query(
        `SELECT t.tabela,
                EXISTS (
                  SELECT 1 FROM pg_trigger g
                  WHERE g.tgrelid = to_regclass('public.' || t.tabela) AND g.tgname = 'trg_auditoria_' || t.tabela
                    AND NOT g.tgisinternal AND g.tgenabled <> 'D'
                ) AS ok
         FROM (VALUES ('ferramentas'), ('emprestimos'), ('ocorrencias')) AS t(tabela)`
      );
      const faltando = rows.filter((r) => !r.ok).map((r) => ({ tabela: r.tabela, trigger: `trg_auditoria_${r.tabela}` }));
      return { total: faltando.length, amostra: faltando };
    },
  },
  {
    id: 'AUDITORIA_SEM_REGISTRO',
    titulo: 'Registro criado depois da auditoria entrar em vigor mas sem nenhuma linha de auditoria',
    gravidade: 'aviso',
    correcao: 'Indica escrita que passou por fora da trigger (replication_role = replica) ou trigger desabilitada na época.',
    sql: `WITH inicio AS (
            SELECT MIN(created_at) AS desde FROM auditoria WHERE operacao = 'INSERT' AND tabela IN ('ferramentas', 'emprestimos', 'ocorrencias')
          ),
          criados AS (
            SELECT 'ferramentas' AS tabela, id, created_at FROM ferramentas
            UNION ALL SELECT 'emprestimos', id, created_at FROM emprestimos
            UNION ALL SELECT 'ocorrencias', id, created_at FROM ocorrencias
          )
          SELECT c.tabela, c.id AS registro_id, c.created_at
          FROM criados c, inicio i
          WHERE i.desde IS NOT NULL AND c.created_at >= i.desde
            AND NOT EXISTS (SELECT 1 FROM auditoria a WHERE a.tabela = c.tabela AND a.registro_id = c.id)`,
  },
];

export const IDS_VERIFICACOES = VERIFICACOES.map((v) => v.id);

async function contarEAmostrar(db: Consultavel, sql: string, limite: number) {
  const { rows } = await db.query(
    `WITH achados AS (${sql})
     SELECT (SELECT COUNT(*)::int FROM achados) AS total,
            COALESCE((SELECT JSONB_AGG(t) FROM (SELECT * FROM achados LIMIT ${Math.trunc(limite)}) t), '[]'::jsonb) AS amostra`
  );
  return { total: rows[0].total as number, amostra: rows[0].amostra as Record<string, unknown>[] };
}

/**
 * Roda as verificações (todas, ou só as de `ids`). Uma que falhe ao executar não derruba as outras: entra no
 * resultado como erro "falha ao executar" com a mensagem do banco.
 */
export async function executarVerificacoes(
  db: Consultavel = pool,
  opcoes: { ids?: string[]; tamanhoAmostra?: number } = {}
): Promise<ResultadoVerificacao[]> {
  const alvo = opcoes.ids ? VERIFICACOES.filter((v) => opcoes.ids!.includes(v.id)) : VERIFICACOES;
  const resultados: ResultadoVerificacao[] = [];

  for (const v of alvo) {
    const base = { id: v.id, titulo: v.titulo, gravidade: v.gravidade, correcao: v.correcao };
    try {
      const { total, amostra } = v.executar ? await v.executar(db, opcoes.tamanhoAmostra ?? TAMANHO_AMOSTRA) : await contarEAmostrar(db, v.sql!, opcoes.tamanhoAmostra ?? TAMANHO_AMOSTRA);
      resultados.push({ ...base, total, amostra });
    } catch (err: any) {
      resultados.push({
        ...base,
        titulo: `${v.titulo} — falha ao executar a verificação`,
        gravidade: 'erro',
        total: 1,
        amostra: [{ erro: err?.message ?? String(err) }],
      });
    }
  }
  return resultados;
}

/** Saída do comando: 1 se alguma verificação de gravidade "erro" achou registro (avisos não reprovam). */
export function codigoDeSaida(resultados: ResultadoVerificacao[]): 0 | 1 {
  return resultados.some((r) => r.gravidade === 'erro' && r.total > 0) ? 1 : 0;
}
