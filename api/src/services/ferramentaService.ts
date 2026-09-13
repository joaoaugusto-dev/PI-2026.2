import { query } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { CriarFerramentaInput } from '../validators/ferramentaValidator.js';

export interface Ferramenta {
  id: number;
  nome: string;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  codigo_identificacao: number | null;
  grupo_id: number;
  grupo_nome?: string;
  subgrupo_id: number | null;
  subgrupo_nome?: string | null;
  setor_id: number | null;
  setor_nome?: string | null;
  localizacao: string | null;
  status: 'disponivel' | 'em_uso' | 'indisponivel';
  motivo_indisponivel: string | null;
  eh_kit: boolean;
  valor_aquisicao: string | null;
  foto_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at?: string;
  total_itens_kit?: number;
  itens?: ItemKit[];
  emprestimo_atual?: EmprestimoAtual | null;
}

export interface ItemKit {
  id: number;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface EmprestimoAtual {
  id: number;
  data_retirada: string;
  previsao_devolucao: string;
  observacoes_retirada: string | null;
  ordem_servico: string | null;
  colaborador_id: number;
  colaborador_nome: string;
  colaborador_matricula: string;
  setor_id: number;
  setor_nome: string;
  atividade_id: number | null;
  atividade_nome: string | null;
  usuario_retirada_id: number;
  usuario_retirada_nome: string;
}

export interface ListarFerramentasParams {
  offset: number;
  limit: number;
  q?: string;
  status?: string;
  grupoId?: number;
  categoriaId?: number;
  setorId?: number;
  sort?: string;
}

/**
 * Consulta de ferramentas ativas com filtros avançados (q, status, grupo/categoria, setor)
 * e ordenação flexível.
 */
export async function listar({
  offset,
  limit,
  q,
  status,
  grupoId,
  categoriaId,
  setorId,
  sort,
}: ListarFerramentasParams): Promise<{ rows: Ferramenta[]; total: number }> {
  const condicoes = ['f.ativo = true'];
  const params: any[] = [];

  // Filtro de busca textual (nome, marca, modelo, localizacao ou código numérico/formatado)
  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    params.push(term);
    const pIdx = params.length;
    condicoes.push(
      `(f.nome ILIKE $${pIdx} OR f.marca ILIKE $${pIdx} OR f.modelo ILIKE $${pIdx} OR f.localizacao ILIKE $${pIdx} OR to_char(f.codigo_identificacao, 'FM0000') ILIKE $${pIdx} OR f.codigo_identificacao::text ILIKE $${pIdx})`
    );
  }

  // Filtro de status
  if (status) {
    params.push(status);
    condicoes.push(`f.status = $${params.length}`);
  }

  // Filtro por grupo / categoria (aceita categoria_id como alias para grupo_id)
  const targetGrupoId = grupoId || categoriaId;
  if (targetGrupoId) {
    params.push(targetGrupoId);
    condicoes.push(`f.grupo_id = $${params.length}`);
  }

  // Filtro por setor
  if (setorId) {
    params.push(setorId);
    condicoes.push(`f.setor_id = $${params.length}`);
  }

  const where = `WHERE ${condicoes.join(' AND ')}`;

  // Contagem total
  const totalResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total 
     FROM ferramentas f
     JOIN grupos_ferramentas g ON g.id = f.grupo_id
     ${where}`,
    params
  );

  // Ordenação segura
  let orderBy = 'f.nome ASC';
  if (sort) {
    const [field, direction] = sort.split(':');
    const dir = direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const allowedFields: Record<string, string> = {
      nome: 'f.nome',
      status: 'f.status',
      codigo: 'f.codigo_identificacao',
      codigo_identificacao: 'f.codigo_identificacao',
      marca: 'f.marca',
      modelo: 'f.modelo',
      created_at: 'f.created_at',
      grupo: 'g.nome',
    };

    if (allowedFields[field?.toLowerCase()]) {
      orderBy = `${allowedFields[field.toLowerCase()]} ${dir}, f.nome ASC`;
    }
  }

  params.push(limit, offset);
  const rowsResult = await query<Ferramenta>(
    `SELECT 
       f.id,
       f.nome,
       f.descricao,
       f.marca,
       f.modelo,
       f.codigo_identificacao,
       f.grupo_id,
       g.nome AS grupo_nome,
       f.subgrupo_id,
       sg.nome AS subgrupo_nome,
       f.setor_id,
       s.nome AS setor_nome,
       f.localizacao,
       f.status,
       f.motivo_indisponivel,
       f.eh_kit,
       f.valor_aquisicao,
       f.foto_url,
       f.ativo,
       f.created_at,
       f.updated_at,
       (SELECT COUNT(*)::int FROM itens_kit ik WHERE ik.ferramenta_id = f.id AND ik.ativo = true) AS total_itens_kit
     FROM ferramentas f
     JOIN grupos_ferramentas g ON g.id = f.grupo_id
     LEFT JOIN subgrupos_ferramentas sg ON sg.id = f.subgrupo_id
     LEFT JOIN setores s ON s.id = f.setor_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    rows: rowsResult.rows,
    total: parseInt(totalResult.rows[0]?.total || '0', 10),
  };
}

/**
 * Busca detalhe completo de uma ferramenta por ID.
 * Se for kit, carrega os itens vinculados.
 * Se estiver em uso, inclui o empréstimo ativo no momento.
 */
export async function buscarPorId(id: number): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `SELECT 
       f.id,
       f.nome,
       f.descricao,
       f.marca,
       f.modelo,
       f.codigo_identificacao,
       f.grupo_id,
       g.nome AS grupo_nome,
       f.subgrupo_id,
       sg.nome AS subgrupo_nome,
       f.setor_id,
       s.nome AS setor_nome,
       f.localizacao,
       f.status,
       f.motivo_indisponivel,
       f.eh_kit,
       f.valor_aquisicao,
       f.foto_url,
       f.ativo,
       f.created_at,
       f.updated_at
     FROM ferramentas f
     JOIN grupos_ferramentas g ON g.id = f.grupo_id
     LEFT JOIN subgrupos_ferramentas sg ON sg.id = f.subgrupo_id
     LEFT JOIN setores s ON s.id = f.setor_id
     WHERE f.id = $1 AND f.ativo = true`,
    [id]
  );

  const ferramenta = result.rows[0];
  if (!ferramenta) {
    throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
  }

  // Se for kit, busca os itens
  if (ferramenta.eh_kit) {
    const itensResult = await query<ItemKit>(
      `SELECT id, nome, ativo, created_at
       FROM itens_kit
       WHERE ferramenta_id = $1 AND ativo = true
       ORDER BY nome`,
      [id]
    );
    ferramenta.itens = itensResult.rows;
  } else {
    ferramenta.itens = [];
  }

  // Se estiver em uso, busca o empréstimo em aberto
  if (ferramenta.status === 'em_uso') {
    const emprestimoResult = await query<EmprestimoAtual>(
      `SELECT 
         e.id,
         e.data_retirada,
         e.previsao_devolucao,
         e.observacoes_retirada,
         e.ordem_servico,
         c.id AS colaborador_id,
         c.nome AS colaborador_nome,
         c.matricula AS colaborador_matricula,
         s.id AS setor_id,
         s.nome AS setor_nome,
         a.id AS atividade_id,
         a.nome AS atividade_nome,
         ur.id AS usuario_retirada_id,
         ur.nome AS usuario_retirada_nome
       FROM emprestimos e
       JOIN colaboradores c ON c.id = e.colaborador_id
       JOIN setores s ON s.id = e.setor_destino_id
       LEFT JOIN atividades a ON a.id = e.atividade_id
       JOIN usuarios ur ON ur.id = e.usuario_retirada_id
       WHERE e.ferramenta_id = $1 AND e.data_devolucao IS NULL
       ORDER BY e.data_retirada DESC
       LIMIT 1`,
      [id]
    );
    ferramenta.emprestimo_atual = emprestimoResult.rows[0] || null;
  } else {
    ferramenta.emprestimo_atual = null;
  }

  return ferramenta;
}

/**
 * Busca uma ferramenta ativa pelo seu código de identificação (numérico ou string com prefixo).
 * Ex: "1", "0001", "SF000001".
 */
export async function buscarPorCodigo(codigoInput: string | number): Promise<Ferramenta> {
  const match = String(codigoInput).match(/\d+/);
  const codigoNum = match ? parseInt(match[0], 10) : NaN;

  if (isNaN(codigoNum) || codigoNum <= 0) {
    throw new NotFoundError(
      'Código de identificação inválido ou não numérico',
      'FERRAMENTA_NOT_FOUND'
    );
  }

  const result = await query<{ id: number }>(
    `SELECT id FROM ferramentas WHERE codigo_identificacao = $1 AND ativo = true`,
    [codigoNum]
  );

  const row = result.rows[0];
  if (!row) {
    throw new NotFoundError(
      `Ferramenta com código "${codigoInput}" não encontrada`,
      'FERRAMENTA_NOT_FOUND'
    );
  }

  return buscarPorId(row.id);
}

/**
 * Retorna o histórico de movimentações (empréstimos e ocorrências) de uma ferramenta.
 */
export async function buscarHistorico(id: number): Promise<{
  ferramenta: { id: number; nome: string; codigo_identificacao: number | null; status: string };
  emprestimos: any[];
  ocorrencias: any[];
  total_emprestimos: number;
  total_ocorrencias: number;
}> {
  // Valida se a ferramenta existe
  const toolResult = await query<{ id: number; nome: string; codigo_identificacao: number | null; status: string }>(
    `SELECT id, nome, codigo_identificacao, status FROM ferramentas WHERE id = $1 AND ativo = true`,
    [id]
  );

  const ferramenta = toolResult.rows[0];
  if (!ferramenta) {
    throw new NotFoundError('Ferramenta não encontrada', 'FERRAMENTA_NOT_FOUND');
  }

  // Empréstimos da ferramenta
  const emprestimosResult = await query(
    `SELECT 
       e.id,
       e.data_retirada,
       e.previsao_devolucao,
       e.data_devolucao,
       e.condicao_devolucao,
       e.ordem_servico,
       e.observacoes_retirada,
       e.observacoes_devolucao,
       e.situacao,
       e.colaborador_id,
       e.colaborador_nome,
       e.colaborador_matricula,
       e.setor_id AS setor_destino_id,
       e.setor_nome AS setor_destino_nome,
       e.atividade_id,
       e.atividade_nome,
       e.item_kit_id,
       e.item_kit_nome,
       e.usuario_retirada_nome,
       e.usuario_devolucao_nome
     FROM vw_emprestimos_detalhe e
     WHERE e.ferramenta_id = $1
     ORDER BY e.data_retirada DESC`,
    [id]
  );

  // Ocorrências da ferramenta
  const ocorrenciasResult = await query(
    `SELECT 
       o.id,
       o.emprestimo_id,
       o.tipo,
       o.descricao,
       o.status,
       o.custo_estimado,
       o.custo_real,
       o.data_resolucao,
       o.observacoes_resolucao,
       c.id AS colaborador_id,
       c.nome AS colaborador_nome,
       c.matricula AS colaborador_matricula,
       ur.nome AS registrada_por_nome,
       us.nome AS resolvida_por_nome,
       o.created_at,
       o.updated_at
     FROM ocorrencias o
     LEFT JOIN colaboradores c ON c.id = o.colaborador_id
     LEFT JOIN usuarios ur ON ur.id = o.registrada_por
     LEFT JOIN usuarios us ON us.id = o.resolvida_por
     WHERE o.ferramenta_id = $1
     ORDER BY o.created_at DESC`,
    [id]
  );

  return {
    ferramenta,
    emprestimos: emprestimosResult.rows,
    ocorrencias: ocorrenciasResult.rows,
    total_emprestimos: emprestimosResult.rows.length,
    total_ocorrencias: ocorrenciasResult.rows.length,
  };
}

export async function criar(input: CriarFerramentaInput): Promise<Ferramenta> {
  const result = await query<Ferramenta>(
    `INSERT INTO ferramentas (
       nome, descricao, marca, modelo, grupo_id, subgrupo_id, setor_id, 
       localizacao, eh_kit, valor_aquisicao, foto_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, nome, descricao, marca, modelo, codigo_identificacao, grupo_id,
               subgrupo_id, setor_id, localizacao, status, motivo_indisponivel,
               eh_kit, valor_aquisicao, foto_url, ativo, created_at, updated_at`,
    [
      input.nome,
      input.descricao ?? null,
      input.marca ?? null,
      input.modelo ?? null,
      input.grupoId,
      input.subgrupoId ?? null,
      input.setorId ?? null,
      input.localizacao ?? null,
      input.ehKit ?? false,
      input.valorAquisicao ?? null,
      input.fotoUrl ?? null,
    ]
  );

  return result.rows[0];
}

