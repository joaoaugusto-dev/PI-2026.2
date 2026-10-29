-- ============================================================================
-- SOUFER Tools - Teste manual de fn_gerar_notificacoes() (API-17)
--
-- Cria quatro retiradas abertas com previsao de devolucao em momentos
-- diferentes, roda a funcao e confere o que ela gerou:
--   hoje      -> devolucao_hoje
--   atrasada  -> atraso (2 dias)
--   muito     -> atraso (10 dias)
--   futura    -> nenhuma notificacao
-- E ocorrencias: AVARIA aberta ha 10 dias e PERDA em reparo ha 9 dias (geram
-- ocorrencia_pendente; PERDA aparece como extravio), AVARIA de 3 dias e uma
-- PERDA resolvida de 10 dias (nao geram).
-- Roda a funcao uma segunda vez para provar que nao duplica.
--
-- Tudo acontece em uma unica transacao que termina em ROLLBACK, entao pode
-- ser executado em qualquer ambiente sem deixar dado para tras.
--
-- Como rodar:
--   psql -h <host> -U <user> -d <db> -f api/db/testes-notificacoes.sql
-- ============================================================================

BEGIN;

INSERT INTO setores (nome) VALUES ('Teste API-17') RETURNING id \gset setor_
INSERT INTO grupos_ferramentas (nome) VALUES ('Teste API-17') RETURNING id \gset grupo_
INSERT INTO colaboradores (nome, matricula, setor_id)
VALUES ('Usuario Teste API-17', '9017', :setor_id)
RETURNING id \gset colabusuario_
INSERT INTO usuarios (colaborador_id, senha_hash)
VALUES (:colabusuario_id, 'hash-fake-apenas-para-teste')
RETURNING id \gset usuario_
INSERT INTO colaboradores (nome, matricula, setor_id)
VALUES ('Colaborador Teste API-17', '9018', :setor_id)
RETURNING id \gset colaborador_

INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 hoje', :grupo_id, :setor_id) RETURNING id \gset fhoje_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 atrasada 2 dias', :grupo_id, :setor_id) RETURNING id \gset fatrasada_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 atrasada 10 dias', :grupo_id, :setor_id) RETURNING id \gset fmuito_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 futura', :grupo_id, :setor_id) RETURNING id \gset ffutura_

INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 ocorrencia 10 dias', :grupo_id, :setor_id) RETURNING id \gset focantiga_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 ocorrencia 3 dias', :grupo_id, :setor_id) RETURNING id \gset focrecente_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 ocorrencia resolvida', :grupo_id, :setor_id) RETURNING id \gset focresolvida_
INSERT INTO ferramentas (nome, grupo_id, setor_id) VALUES ('API17 ocorrencia extravio 9 dias', :grupo_id, :setor_id) RETURNING id \gset focextravio_
INSERT INTO ocorrencias (ferramenta_id, tipo, descricao, status, registrada_por, created_at) VALUES
    (:focantiga_id,   'AVARIA', 'teste API-17', 'aberta',    :usuario_id, NOW() - INTERVAL '10 days'),
    (:focrecente_id,  'AVARIA', 'teste API-17', 'aberta',    :usuario_id, NOW() - INTERVAL '3 days'),
    (:focextravio_id, 'PERDA',  'teste API-17', 'em_reparo', :usuario_id, NOW() - INTERVAL '9 days'),
    (:focresolvida_id, 'PERDA', 'teste API-17', 'resolvida', :usuario_id, NOW() - INTERVAL '10 days');

INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, previsao_devolucao, usuario_retirada_id) VALUES
    (:fhoje_id,     :colaborador_id, :setor_id, NOW(),                       :usuario_id),
    (:fatrasada_id, :colaborador_id, :setor_id, NOW() - INTERVAL '2 days',   :usuario_id),
    (:fmuito_id,    :colaborador_id, :setor_id, NOW() - INTERVAL '10 days',  :usuario_id),
    (:ffutura_id,   :colaborador_id, :setor_id, NOW() + INTERVAL '3 days',   :usuario_id);

\echo '--- Retiradas abertas criadas (hoje em Brasilia: ver coluna previsao) ---'
SELECT f.nome,
       (e.previsao_devolucao AT TIME ZONE 'America/Sao_Paulo')::DATE AS previsao,
       (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE AS hoje
FROM emprestimos e JOIN ferramentas f ON f.id = e.ferramenta_id
WHERE f.grupo_id = :grupo_id
ORDER BY e.previsao_devolucao DESC;

\echo '--- 1a execucao: SELECT fn_gerar_notificacoes() (inclui avisos de outros emprestimos abertos do banco) ---'
SELECT fn_gerar_notificacoes() AS gerados_total;

\echo '--- Notificacoes geradas para estas retiradas (esperado: hoje=devolucao_hoje, 2 e 10 dias=atraso, ocorrencias de 10 e 9 dias=ocorrencia_pendente, demais nenhuma) ---'
SELECT tipo, titulo, mensagem, usuario_id, lida
FROM notificacoes
WHERE mensagem LIKE 'API17 %'
ORDER BY id;

\echo '--- 2a execucao (esperado: 0 novas para estas retiradas, sem duplicar) ---'
SELECT fn_gerar_notificacoes() AS gerados_total;
SELECT COUNT(*) AS notificacoes_destas_retiradas FROM notificacoes WHERE mensagem LIKE 'API17 %';

ROLLBACK;
