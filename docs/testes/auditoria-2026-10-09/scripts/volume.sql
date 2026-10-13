\timing on
DELETE FROM notificacoes; DELETE FROM ocorrencias; DELETE FROM emprestimos; DELETE FROM itens_kit; DELETE FROM ferramentas;
-- 1.500 ferramentas (código explícito: o gatilho só gera quando vem nulo)
INSERT INTO ferramentas (nome, marca, modelo, grupo_id, localizacao, valor_aquisicao, codigo_identificacao)
SELECT upper((ARRAY['Furadeira','Esmerilhadeira','Chave de impacto','Multímetro','Alicate amperímetro','Torquímetro','Parafusadeira','Serra mármore','Lixadeira','Talha'])[1+g%10]||' '||g),
       (ARRAY['Bosch','Makita','DeWalt','Fluke','Gedore'])[1+g%5], 'MOD-'||g,
       (SELECT array_agg(id ORDER BY id) FROM grupos_ferramentas)[1+g%5],
       'Prateleira '||(g%40), (50+random()*2000)::numeric(10,2), g
FROM generate_series(1,1500) g;
-- 50.000 empréstimos devolvidos em 2 anos (~70/dia)
WITH f AS (SELECT array_agg(id) a FROM ferramentas), c AS (SELECT array_agg(id) a, array_agg(setor_id) s FROM colaboradores)
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, usuario_devolucao_id,
                         data_retirada, previsao_devolucao, data_devolucao, condicao_devolucao, ordem_servico)
SELECT f.a[1+(g*7919)%1500], c.a[1+(g*104729)%array_length(c.a,1)], c.s[1+(g*104729)%array_length(c.a,1)], 1, 2,
       d, d + interval '2 days', d + (random()*3||' days')::interval, 'ok', 'OS-'||g
FROM generate_series(1,50000) g, f, c, LATERAL (SELECT now() - (g/50000.0*730||' days')::interval - interval '4 days' d) t;
-- 300 em aberto, 60 atrasados
WITH c AS (SELECT array_agg(id) a, array_agg(setor_id) s FROM colaboradores)
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, data_retirada, previsao_devolucao)
SELECT f.id, c.a[1+f.rn%array_length(c.a,1)], c.s[1+f.rn%array_length(c.a,1)], 1, now() - interval '3 days',
       CASE WHEN f.rn<=60 THEN now() - interval '1 day' ELSE now() + ((f.rn%10)||' days')::interval END
FROM (SELECT id, row_number() over (order by id) rn FROM ferramentas ORDER BY id LIMIT 300) f, c;
VACUUM ANALYZE;
SELECT status, count(*) FROM ferramentas GROUP BY 1;
SELECT count(*) emprestimos FROM emprestimos;
SELECT pg_size_pretty(pg_database_size(current_database())) tamanho;
