-- 0011: desempenho da geração do código da ferramenta e do histórico de empréstimos.
--
-- 1) fn_gera_codigo_identificacao (0005) achava o menor código livre com
--    SELECT MIN(c) FROM generate_series(1, 9999) c WHERE NOT EXISTS (...).
--    Com a estatística de tabela vazia (banco recém-criado, ou toda a carga
--    dentro da transação de POST /v1/importacoes), o otimizador escolhe um
--    nested loop que compara os 9.999 códigos com todas as ferramentas a cada
--    INSERT: custo 9.999 x N, quadrático na carga inicial. Medido na auditoria
--    de 09/10/2026: CSV de 800 linhas em banco vazio levava 60,3 s (cai para
--    7,2 s) e 500 cadastros pela tela, 43 s (cai para 3,5 s).
--    O laço abaixo testa um código por vez pelo índice único parcial
--    uq_ferramenta_codigo_ativo e para no primeiro livre: mesma regra (menor
--    código livre, reaproveitando o de ferramenta baixada), mesmo advisory lock
--    da 0005, custo proporcional ao código encontrado e independente do plano.
CREATE OR REPLACE FUNCTION fn_gera_codigo_identificacao()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo INTEGER;
BEGIN
    IF NEW.codigo_identificacao IS NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext('fn_gera_codigo_identificacao')::bigint);

        FOR v_codigo IN 1..9999 LOOP
            IF NOT EXISTS (
                SELECT 1 FROM ferramentas f
                WHERE f.codigo_identificacao = v_codigo AND f.ativo = TRUE
            ) THEN
                NEW.codigo_identificacao := v_codigo;
                RETURN NEW;
            END IF;
        END LOOP;

        RAISE EXCEPTION 'Limite máximo de 9999 ferramentas ativas atingido — nenhum código de 4 dígitos disponível';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) GET /v1/emprestimos ordena por data_retirada DESC, id DESC. Sem índice o
--    Postgres junta a view inteira antes de ordenar e cortar a página: 31 ms com
--    50 mil empréstimos (≈ 2 anos), 1,8 ms com o índice.
CREATE INDEX IF NOT EXISTS idx_emprestimos_data_retirada
ON emprestimos (data_retirada DESC, id DESC);
