-- ============================================================================
-- SOUFER Tools - Testes manuais das triggers de negocio (DB-06)
--
-- Valida os tres cenarios da issue DB-06 direto contra um banco com a
-- migration 0001_init.sql aplicada (soufer_dev):
--   1. Retirada normal            -> ferramenta.status vira 'em_uso'
--   2. Retirada de ferramenta ja emprestada -> fn_valida_retirada bloqueia
--   3. Devolucao com avaria       -> ferramenta.status vira 'indisponivel'
--                                     e uma ocorrencia e aberta automaticamente
--
-- O script roda tudo dentro de uma unica transacao e termina com ROLLBACK,
-- entao pode ser executado repetidas vezes em qualquer ambiente (dev/prod)
-- sem deixar dado de teste para tras e sem exigir estado previo no banco.
--
-- Como rodar:
--   psql -h <host> -U <user> -d <db> -f api/db/testes-manuais.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Massa de dados minima para os testes (setor, grupo, usuario, colaborador,
-- ferramenta disponivel).
-- ----------------------------------------------------------------------------
INSERT INTO setores (nome) VALUES ('Teste DB-06') RETURNING id \gset setor_
INSERT INTO grupos_ferramentas (nome) VALUES ('Teste DB-06') RETURNING id \gset grupo_
INSERT INTO usuarios (nome, email, senha_hash)
VALUES ('Usuario Teste DB-06', 'teste.db06@soufer.local', 'hash-fake-apenas-para-teste')
RETURNING id \gset usuario_
INSERT INTO colaboradores (nome, matricula, setor_id)
VALUES ('Colaborador Teste DB-06', 'MAT-DB06', :setor_id)
RETURNING id \gset colaborador_
INSERT INTO ferramentas (nome, grupo_id, setor_id)
VALUES ('Ferramenta Teste DB-06', :grupo_id, :setor_id)
RETURNING id, status \gset ferramenta_

\echo '--- Estado inicial da ferramenta (esperado: disponivel) ---'
SELECT id, nome, status FROM ferramentas WHERE id = :ferramenta_id;

-- ----------------------------------------------------------------------------
-- Cenario 1: retirada normal
-- Esperado: insert aceito e trg_sync_status_ferramenta muda o status para
-- 'em_uso'.
-- ----------------------------------------------------------------------------
\echo '--- Cenario 1: retirada normal ---'
INSERT INTO emprestimos (
    ferramenta_id, colaborador_id, setor_destino_id,
    usuario_retirada_id, previsao_devolucao
) VALUES (
    :ferramenta_id, :colaborador_id, :setor_id,
    :usuario_id, NOW() + INTERVAL '1 day'
) RETURNING id \gset emprestimo_

SELECT id, status FROM ferramentas WHERE id = :ferramenta_id;
-- Esperado: status = 'em_uso'

-- ----------------------------------------------------------------------------
-- Cenario 2: retirada de ferramenta ja emprestada
-- Esperado: fn_valida_retirada bloqueia com excecao (ferramenta nao esta
-- 'disponivel'). Usa SAVEPOINT para capturar o erro esperado sem abortar a
-- transacao inteira.
-- ----------------------------------------------------------------------------
\echo '--- Cenario 2: retirada de ferramenta ja emprestada (deve falhar) ---'
SAVEPOINT cenario_2;
DO $$
BEGIN
    INSERT INTO emprestimos (
        ferramenta_id, colaborador_id, setor_destino_id,
        usuario_retirada_id, previsao_devolucao
    ) VALUES (
        (SELECT id FROM ferramentas WHERE nome = 'Ferramenta Teste DB-06' LIMIT 1),
        (SELECT id FROM colaboradores WHERE matricula = 'MAT-DB06'),
        (SELECT id FROM setores WHERE nome = 'Teste DB-06'),
        (SELECT id FROM usuarios WHERE email = 'teste.db06@soufer.local'),
        NOW() + INTERVAL '1 day'
    );
    RAISE EXCEPTION 'FALHA NO TESTE: insert deveria ter sido bloqueado pela fn_valida_retirada';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM LIKE 'Ferramenta % não está disponível%' THEN
            RAISE NOTICE 'OK: retirada bloqueada como esperado -> %', SQLERRM;
        ELSE
            RAISE;
        END IF;
END $$;
ROLLBACK TO SAVEPOINT cenario_2;

-- ----------------------------------------------------------------------------
-- Cenario 3: devolucao com avaria
-- Esperado: trg_sync_status_ferramenta muda o status para 'indisponivel'
-- (motivo_indisponivel = 'avaria') e trg_abre_ocorrencia insere uma linha em
-- ocorrencias automaticamente.
-- ----------------------------------------------------------------------------
\echo '--- Cenario 3: devolucao com avaria ---'
UPDATE emprestimos
SET data_devolucao = NOW(),
    condicao_devolucao = 'avaria',
    usuario_devolucao_id = :usuario_id,
    observacoes_devolucao = 'Teste manual DB-06 - avaria simulada'
WHERE id = :emprestimo_id;

SELECT id, status, motivo_indisponivel FROM ferramentas WHERE id = :ferramenta_id;
-- Esperado: status = 'indisponivel', motivo_indisponivel = 'avaria'

SELECT id, emprestimo_id, ferramenta_id, tipo, status, descricao
FROM ocorrencias
WHERE emprestimo_id = :emprestimo_id;
-- Esperado: 1 linha, tipo = 'AVARIA', status = 'aberta'

-- ----------------------------------------------------------------------------
-- Limpeza: nada e persistido. Isso mantem o script idempotente e seguro para
-- rodar contra soufer_dev ou soufer_prod sem deixar dado de teste.
-- ----------------------------------------------------------------------------
ROLLBACK;
