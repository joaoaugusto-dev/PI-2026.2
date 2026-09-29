-- 0005: corrige a condição de corrida em fn_gera_codigo_identificacao.
--
-- Achado durante a API-13, não relacionado a ela: fn_gera_codigo_identificacao
-- (trigger BEFORE INSERT em ferramentas) escolhe o próximo código livre com
-- "SELECT MIN(c) ... WHERE NOT EXISTS (...)", sem nenhum lock. Sob
-- READ COMMITTED, duas inserções concorrentes não enxergam a inserção uma da
-- outra ainda não commitada, calculam o mesmo código livre e a segunda perde
-- para o índice único uq_ferramenta_codigo_ativo — reproduzido com um teste de
-- estresse de 15 INSERTs concorrentes (3 falharam com "duplicar valor da
-- chave viola a restrição de unicidade uq_ferramenta_codigo_ativo").
--
-- A correção serializa só a geração do código com um advisory lock
-- transacional (pg_advisory_xact_lock): quem entra primeiro na trigger segura
-- o lock até o fim da própria transação (COMMIT ou ROLLBACK libera
-- automaticamente), e a segunda inserção concorrente espera a primeira
-- terminar de escolher (e gravar) o código antes de calcular o seu. Não
-- precisa de FOR UPDATE numa linha existente (não há linha para travar antes
-- do INSERT); o advisory lock é a ferramenta certa para serializar em torno
-- de um recurso lógico (aqui, "a faixa de códigos de ferramentas ativas") em
-- vez de uma linha específica.
CREATE OR REPLACE FUNCTION fn_gera_codigo_identificacao()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo SMALLINT;
BEGIN
    IF NEW.codigo_identificacao IS NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext('fn_gera_codigo_identificacao')::bigint);

        SELECT MIN(c) INTO v_codigo
        FROM generate_series(1, 9999) AS c
        WHERE NOT EXISTS (
            SELECT 1 FROM ferramentas f
            WHERE f.codigo_identificacao = c AND f.ativo = TRUE
        );

        IF v_codigo IS NULL THEN
            RAISE EXCEPTION 'Limite máximo de 9999 ferramentas ativas atingido — nenhum código de 4 dígitos disponível';
        END IF;

        NEW.codigo_identificacao := v_codigo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
