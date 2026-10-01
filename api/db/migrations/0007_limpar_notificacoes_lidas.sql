-- 0007: limpeza automática de notificações lidas (retenção de 30 dias).
--
-- Apaga só as já lidas com mais de 30 dias (created_at; a tabela não guarda a
-- data da leitura). As não lidas nunca são apagadas. Efeito colateral
-- conhecido: como fn_gerar_notificacoes() deduplica pelas linhas existentes,
-- um empréstimo que continua atrasado há mais de 30 dias gera um novo aviso
-- depois da limpeza — na prática, um lembrete mensal.
CREATE OR REPLACE FUNCTION fn_limpar_notificacoes()
RETURNS INTEGER AS $$
DECLARE
    apagadas INTEGER;
BEGIN
    DELETE FROM notificacoes
    WHERE lida = TRUE AND created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS apagadas = ROW_COUNT;
    RETURN apagadas;
END;
$$ LANGUAGE plpgsql;

-- pg_cron não tem "a cada 30 dias"; roda todo dia às 03:00 de Brasília (06:00
-- UTC) e a própria função aplica a janela de 30 dias. Mesmo tratamento da
-- 0006 quando a extensão não existe: agendar por fora.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'limpar_notificacoes';
        PERFORM cron.schedule('limpar_notificacoes', '0 6 * * *', 'SELECT fn_limpar_notificacoes()');
    ELSE
        RAISE NOTICE 'pg_cron indisponível: agende fn_limpar_notificacoes() por fora (0 6 * * * UTC).';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'não foi possível agendar via pg_cron (%): agende por fora.', SQLERRM;
END $$;
