-- 0006: fn_gerar_notificacoes() e agendamento diário (API-17 / FE-19).
--
-- Gera as notificações de "devolução hoje" e "atraso" para empréstimos
-- abertos. Elas são da equipe de manutenção (usuario_id NULL = todos), então
-- o estado "lida" é compartilhado. O link carrega o id do empréstimo
-- (/ferramentas/:id?emprestimo=:id), que é o que a deduplica: cada tipo é
-- gerado uma única vez por empréstimo, mesmo que a função rode todo dia ou
-- manualmente. "Hoje" e a data de previsão são lidos no fuso de Brasília.
CREATE OR REPLACE FUNCTION fn_gerar_notificacoes()
RETURNS INTEGER AS $$
DECLARE
    hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    gerados INTEGER;
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

    RETURN gerados;
END;
$$ LANGUAGE plpgsql;

-- Agendamento: segunda a sexta às 07:00 de Brasília (10:00 UTC, sem horário de
-- verão). pg_cron só existe onde a extensão está instalada (RDS sim, Postgres
-- local nem sempre); sem ela a migration segue e a função roda manualmente
-- (SELECT fn_gerar_notificacoes();).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'gerar_notificacoes';
        PERFORM cron.schedule('gerar_notificacoes', '0 10 * * 1-5', 'SELECT fn_gerar_notificacoes()');
    ELSE
        RAISE NOTICE 'pg_cron indisponível: agende fn_gerar_notificacoes() por fora (0 10 * * 1-5 UTC).';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'não foi possível agendar via pg_cron (%): agende por fora.', SQLERRM;
END $$;
