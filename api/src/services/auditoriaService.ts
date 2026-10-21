import { query } from '../config/database.js';

export interface LinhaAuditoria {
  id: number;
  tabela: string;
  operacao: string;
  registro_id: number | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_id: number | null;
  usuario_nome: string | null;
  ip_origem: string | null;
  created_at: string;
}

export interface FiltrosAuditoria {
  tabela?: string;
  registroId?: number;
  operacao?: string;
  usuarioId?: number;
  de?: string;
  ate?: string;
  offset: number;
  limit: number;
}

/**
 * GET /v1/auditoria: trilha de alterações (DATA-05), mais recente primeiro. `de`/`ate` são datas de calendário
 * (AAAA-MM-DD) inclusivas, no fuso de Brasília como o resto do sistema.
 */
export async function listar(f: FiltrosAuditoria): Promise<{ rows: LinhaAuditoria[]; total: number }> {
  const condicoes: string[] = [];
  const params: any[] = [];
  const adicionar = (sql: string, valor: unknown) => {
    params.push(valor);
    condicoes.push(sql.replace('?', `$${params.length}`));
  };

  if (f.tabela) adicionar('a.tabela = ?', f.tabela);
  if (f.registroId) adicionar('a.registro_id = ?', f.registroId);
  if (f.operacao) adicionar('a.operacao = ?', f.operacao);
  if (f.usuarioId) adicionar('a.usuario_id = ?', f.usuarioId);
  if (f.de) adicionar(`a.created_at >= (?::date)::timestamp AT TIME ZONE 'America/Sao_Paulo'`, f.de);
  if (f.ate) adicionar(`a.created_at < ((?::date) + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo'`, f.ate);

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

  const [dados, contagem] = await Promise.all([
    query<LinhaAuditoria>(
      `SELECT a.id, a.tabela, a.operacao, a.registro_id, a.dados_anteriores, a.dados_novos,
              a.usuario_id, c.nome AS usuario_nome, a.ip_origem, a.created_at
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       LEFT JOIN colaboradores c ON c.id = u.colaborador_id -- o nome mora no colaborador (migration 0004)
       ${where}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, f.limit, f.offset]
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM auditoria a ${where}`, params),
  ]);

  return { rows: dados.rows, total: contagem.rows[0].total };
}
