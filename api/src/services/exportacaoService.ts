import { query } from '../config/database.js';
import { montarCsv } from '../utils/csv.js';
import { filtroEmprestimos, FiltrosEmprestimos } from './emprestimoService.js';
import type { RecursoExportavel } from '../validators/exportacaoValidator.js';

// Histórico de empréstimos cresce sem limite; acima disso o arquivo é cortado
// e ganha uma linha final avisando, para ninguém tratá-lo como completo. O
// arquivo é montado em memória: se o histórico passar muito disso, o próximo
// passo é streaming (pg-cursor) direto para a resposta.
export const MAX_LINHAS_EXPORTACAO = 50000;

// Partes numéricas no fuso de Brasília, montadas à mão: não depende da
// pontuação que cada versão do ICU põe entre data e hora em toLocaleString.
const partesBR = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function partes(d: Date): Record<string, string> {
  return Object.fromEntries(partesBR.formatToParts(d).map((p) => [p.type, p.value]));
}

/** Mesmo formato da tela (lib/formatar.ts no front): dd/mm/aaaa [HH:mm] em Brasília, "—" quando vazio. */
const dataBR = (d: Date | null) => {
  if (!d) return '—';
  const p = partes(d);
  return `${p.day}/${p.month}/${p.year}`;
};
const dataHoraBR = (d: Date | null) => {
  if (!d) return '—';
  const p = partes(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};
/** Mesmo formato de formatarPatrimonio no front. */
const patrimonio = (codigo: number | null) => (codigo ? String(codigo).padStart(6, '0') : '—');

const ROTULO_STATUS: Record<string, string> = { disponivel: 'Disponível', em_uso: 'Em uso', indisponivel: 'Indisponível' };
const ROTULO_SITUACAO: Record<string, string> = { em_aberto: 'Em aberto', atrasado: 'Atrasado', devolvido: 'Devolvido' };

interface Planilha {
  cabecalho: string[];
  linhas: (string | number | null)[][];
}

/**
 * Cadastros saem com o cabeçalho do modelo de importação (nome, categoria,
 * setor...), então o arquivo exportado pode ser editado e reenviado em
 * POST /v1/importacoes/:recurso; as colunas extras (codigo, status) são
 * ignoradas na volta. Só registros ativos, como nas listagens.
 */
const EXPORTADORES: Record<RecursoExportavel, (filtros: FiltrosEmprestimos) => Promise<Planilha>> = {
  async ferramentas() {
    const { rows } = await query(
      `SELECT f.codigo_identificacao, f.nome, g.nome AS categoria, f.marca, f.modelo, s.nome AS setor,
              f.localizacao, f.descricao, f.status
       FROM ferramentas f
       JOIN grupos_ferramentas g ON g.id = f.grupo_id
       LEFT JOIN setores s ON s.id = f.setor_id
       WHERE f.ativo = true
       ORDER BY f.nome, f.id`
    );
    return {
      cabecalho: ['codigo', 'nome', 'categoria', 'marca', 'modelo', 'setor', 'localizacao', 'descricao', 'status'],
      linhas: rows.map((f) => [
        patrimonio(f.codigo_identificacao),
        f.nome,
        f.categoria,
        f.marca,
        f.modelo,
        f.setor,
        f.localizacao,
        f.descricao,
        ROTULO_STATUS[f.status] ?? f.status,
      ]),
    };
  },

  async colaboradores() {
    const { rows } = await query(
      `SELECT c.matricula, c.nome, s.nome AS setor
       FROM colaboradores c
       JOIN setores s ON s.id = c.setor_id
       WHERE c.ativo = true
       ORDER BY c.nome, c.id`
    );
    return { cabecalho: ['matricula', 'nome', 'setor'], linhas: rows.map((c) => [c.matricula, c.nome, c.setor]) };
  },

  async categorias() {
    const { rows } = await query('SELECT nome FROM grupos_ferramentas WHERE ativo = true ORDER BY nome');
    return { cabecalho: ['nome'], linhas: rows.map((r) => [r.nome]) };
  },

  async setores() {
    const { rows } = await query('SELECT nome FROM setores WHERE ativo = true ORDER BY nome');
    return { cabecalho: ['nome'], linhas: rows.map((r) => [r.nome]) };
  },

  // Mesmas colunas e formato do "Exportar CSV" da tela de empréstimos, mas
  // numa consulta só (sem a paginação por offset do front, que podia duplicar
  // ou perder linha se um empréstimo mudasse no meio da exportação).
  async emprestimos(filtros) {
    const { where, params } = filtroEmprestimos(filtros);
    const { rows } = await query(
      `SELECT ferramenta_nome, codigo_identificacao, colaborador_nome, colaborador_matricula, setor_nome,
              data_retirada, previsao_devolucao, data_devolucao, situacao
       FROM vw_emprestimos_detalhe ${where}
       ORDER BY data_retirada DESC, id DESC
       LIMIT $${params.length + 1}`,
      [...params, MAX_LINHAS_EXPORTACAO + 1]
    );
    const truncou = rows.length > MAX_LINHAS_EXPORTACAO;
    const linhas = rows.slice(0, MAX_LINHAS_EXPORTACAO).map((e) => [
      e.ferramenta_nome,
      patrimonio(e.codigo_identificacao),
      e.colaborador_nome,
      e.colaborador_matricula,
      e.setor_nome,
      dataHoraBR(e.data_retirada),
      dataBR(e.previsao_devolucao),
      dataHoraBR(e.data_devolucao),
      ROTULO_SITUACAO[e.situacao] ?? e.situacao,
    ]);
    if (truncou) {
      linhas.push([`ATENÇÃO: exportação truncada em ${MAX_LINHAS_EXPORTACAO.toLocaleString('pt-BR')} registros. Refine os filtros.`]);
    }
    return {
      cabecalho: ['Ferramenta', 'Código', 'Colaborador', 'Matrícula', 'Setor', 'Retirada', 'Previsão', 'Devolução', 'Situação'],
      linhas,
    };
  },
};

/** GET /v1/exportacoes/:recurso: texto do CSV pronto para download. */
export async function exportar(recurso: RecursoExportavel, filtros: FiltrosEmprestimos = {}): Promise<string> {
  const { cabecalho, linhas } = await EXPORTADORES[recurso](filtros);
  return montarCsv(cabecalho, linhas);
}
