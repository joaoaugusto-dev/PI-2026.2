-- 0015: fn_gerar_notificacoes() passa a gerar também 'ocorrencia_pendente' (API-17, opcional).
--
-- Pendente = ocorrência ainda não encerrada (status fora de 'resolvida' e
-- 'baixada') aberta há mais de 7 dias, contados em dias de Brasília. É um
-- aviso por ocorrência: o link /ferramentas/:id?ocorrencia=:id a deduplica,
-- como o do empréstimo. Ocorrência nunca retrocede de status (a API recusa), então
-- uma encerrada não volta a ficar pendente e o created_at fixo basta para a
-- deduplicação. Na mensagem, PERDA aparece como "extravio", o nome que a tela
-- usa (o valor no banco continua PERDA). Se ela continuar pendente depois que a notificação
-- lida for limpada (fn_limpar_notificacoes, 30 dias), um novo aviso é gerado
-- (lembrete mensal). O retorno soma os avisos de empréstimo e de ocorrência.
CREATE OR REPLACE FUNCTION fn_gerar_notificacoes()
RETURNS INTEGER AS $$
DECLARE
    hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    dias_pendente CONSTANT INTEGER := 7;
    gerados INTEGER;
    gerados_ocorrencia INTEGER;
BEGIN
    WITH candidatos AS (
        SELECT
            CASE
                WHEN (e.previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::DATE = hoje
                    THEN 'devolucao_hoje'::tipo_notificacao
                ELSE 'atraso'::tipo_notificacao
            END AS tipo,
            e.id AS emprestimo_id,
            e.data_retirada,
            f.id AS ferramenta_id,
            f.nome AS ferramenta_nome,
            c.nome AS colaborador_nome,
            (e.previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::DATE AS previsao
        FROM emprestimos e
        JOIN ferramentas f ON f.id = e.ferramenta_id
        JOIN colaboradores c ON c.id = e.colaborador_id
        WHERE e.data_devolucao IS NULL
          AND (e.previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::DATE <= hoje
    ),
    novos AS (
        SELECT
            k.tipo,
            CASE k.tipo WHEN 'devolucao_hoje' THEN 'Devolução prevista para hoje' ELSE 'Empréstimo atrasado' END AS titulo,
            k.ferramenta_nome || ' com ' || k.colaborador_nome ||
                CASE k.tipo
                    WHEN 'devolucao_hoje' THEN ' deve ser devolvida hoje.'
                    ELSE ' está atrasada desde ' || TO_CHAR(k.previsao, 'DD/MM') || '.'
                END AS mensagem,
            '/ferramentas/' || k.ferramenta_id || '?emprestimo=' || k.emprestimo_id AS link,
            k.data_retirada
        FROM candidatos k
    ),
    inseridos AS (
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
        SELECT NULL, n.tipo, n.titulo, n.mensagem, n.link
        FROM novos n
        WHERE NOT EXISTS (
            SELECT 1 FROM notificacoes x
            WHERE x.tipo = n.tipo AND x.link = n.link AND x.created_at >= n.data_retirada
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO gerados FROM inseridos;

    WITH pendentes AS (
        SELECT
            o.id AS ocorrencia_id,
            o.created_at,
            o.ferramenta_id,
            f.nome AS ferramenta_nome,
            CASE o.tipo WHEN 'PERDA' THEN 'extravio' ELSE LOWER(o.tipo) END AS tipo_ocorrencia,
            hoje - (o.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS dias
        FROM ocorrencias o
        JOIN ferramentas f ON f.id = o.ferramenta_id
        WHERE o.status NOT IN ('resolvida', 'baixada')
          AND hoje - (o.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE > dias_pendente
    ),
    inseridos AS (
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link)
        SELECT
            NULL,
            'ocorrencia_pendente',
            'Ocorrência pendente',
            p.ferramenta_nome || ' está com ocorrência de ' || p.tipo_ocorrencia || ' sem solução há ' || p.dias || ' dias.',
            '/ferramentas/' || p.ferramenta_id || '?ocorrencia=' || p.ocorrencia_id
        FROM pendentes p
        WHERE NOT EXISTS (
            SELECT 1 FROM notificacoes x
            WHERE x.tipo = 'ocorrencia_pendente'
              AND x.link = '/ferramentas/' || p.ferramenta_id || '?ocorrencia=' || p.ocorrencia_id
              AND x.created_at >= p.created_at
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO gerados_ocorrencia FROM inseridos;

    RETURN gerados + gerados_ocorrencia;
END;
$$ LANGUAGE plpgsql;
