-- 0011 (proposta): geração do código sem depender do plano escolhido pelo otimizador.
-- O SELECT MIN(...) FROM generate_series(1, 9999) WHERE NOT EXISTS (...) vira, com
-- estatística de tabela vazia (banco recém-criado, ou tudo dentro de uma transação de
-- importação), um nested loop que compara 9.999 códigos x N ferramentas a cada INSERT.
-- O laço abaixo faz uma busca pelo índice único parcial uq_ferramenta_codigo_ativo por
-- código testado e para no primeiro livre: mesma regra (menor código livre), custo
-- proporcional só ao código encontrado.
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
