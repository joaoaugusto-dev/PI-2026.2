-- ============================================================================
-- SOUFER Tools - Dados FICTÍCIOS de demonstração
--
-- Complementa o seed.sql (que só traz setores, categorias, atividades e as 3
-- contas de acesso). Aqui entram colaboradores, ferramentas (com um kit),
-- histórico de empréstimos/devoluções, ocorrências e ferramentas em todos os
-- estados (disponível, em uso, em atraso, indisponível), para o dashboard, o
-- calendário, as análises e as telas de retirada/devolução terem o que mostrar.
--
-- Não é para produção real: nomes e matrículas são inventados. Os empréstimos
-- passam pelas mesmas triggers do sistema (status da ferramenta, abertura
-- automática de ocorrência na avaria/perda), então os dados ficam coerentes.
--
-- Pré-requisito: migrations e seed.sql aplicados (npm run db:migrate e
-- NODE_ENV=development npm run db:seed). Recusa rodar se já houver ferramentas.
--
-- Como rodar (a partir da raiz do repositório):
--   psql -h <host> -U <user> -d <db> -v ON_ERROR_STOP=1 -f api/db/seed-demo.sql
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM ferramentas) THEN
    RAISE EXCEPTION 'Já existem ferramentas no banco: seed-demo.sql só roda em banco sem ferramentas.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM setores WHERE nome = 'Manutenção Geral') THEN
    RAISE EXCEPTION 'Rode o seed.sql antes (NODE_ENV=development npm run db:seed).';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Colaboradores (matrículas 0101 a 0116)
-- ----------------------------------------------------------------------------
INSERT INTO colaboradores (nome, matricula, setor_id, ativo, criado_por)
SELECT v.nome, v.matricula, s.id, true, (SELECT u.id FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id WHERE c.matricula = '0053')
FROM (VALUES
  ('Carlos Eduardo Souza',   '0101', 'Usinagem CNC'),
  ('Ana Paula Pereira',      '0102', 'Montagem Industrial'),
  ('Marcos Vinícius Lima',   '0103', 'Estamparia'),
  ('Fernanda Rocha',         '0104', 'Controle de Qualidade'),
  ('Rafael Nogueira',        '0105', 'Usinagem CNC'),
  ('Juliana Martins',        '0106', 'Montagem Industrial'),
  ('Paulo Henrique Alves',   '0107', 'Estamparia'),
  ('Beatriz Cardoso',        '0108', 'Controle de Qualidade'),
  ('Thiago Barbosa',         '0109', 'Manutenção Geral'),
  ('Larissa Teixeira',       '0110', 'Montagem Industrial'),
  ('Gustavo Ribeiro',        '0111', 'Usinagem CNC'),
  ('Camila Duarte',          '0112', 'Estamparia'),
  ('Diego Fernandes',        '0113', 'Manutenção Geral'),
  ('Patrícia Gomes',         '0114', 'Controle de Qualidade'),
  ('Lucas Araújo',           '0115', 'Montagem Industrial'),
  ('Renata Medeiros',        '0116', 'Usinagem CNC')
) AS v(nome, matricula, setor_nome)
JOIN setores s ON s.nome = v.setor_nome;

-- ----------------------------------------------------------------------------
-- 2. Ferramentas (a ordem da lista define o n usado nos empréstimos abaixo)
--    1-20  histórico de empréstimos devolvidos ok
--    21-26 em uso agora | 27-29 em atraso | 30-31 vencem hoje
--    32-34 avaria/perda | 35 manutenção preventiva | 36 kit
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE demo_ferr (n int, id int) ON COMMIT DROP;

WITH lista(n, nome, marca, modelo, grupo, setor, local, valor) AS (VALUES
  (1,  'Furadeira de impacto',        'Bosch',          'GSB 13 RE',     'Ferramentas Elétricas',   'Manutenção Geral',      'Armário 1',     489.90),
  (2,  'Parafusadeira a bateria',     'DeWalt',         'DCD791',        'Ferramentas Elétricas',   'Manutenção Geral',      'Armário 1',     899.00),
  (3,  'Esmerilhadeira angular',      'Makita',         'GA4530',        'Ferramentas Elétricas',   'Manutenção Geral',      'Armário 1',     359.00),
  (4,  'Serra tico-tico',             'Bosch',          'GST 700',       'Ferramentas Elétricas',   'Manutenção Geral',      'Armário 1',     420.00),
  (5,  'Lixadeira orbital',           'Makita',         'BO5031',        'Ferramentas Elétricas',   'Montagem Industrial',   'Armário 2',     615.00),
  (6,  'Chave de fenda Phillips',     'Tramontina',     'PH2',           'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 2',       18.90),
  (7,  'Alicate universal 8"',        'Gedore',         '8140',          'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 2',       64.50),
  (8,  'Martelo de borracha',         'Tramontina',     '500 g',         'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 2',       39.00),
  (9,  'Chave de grifo 14"',          'Gedore',         '14',            'Ferramentas Manuais',     'Montagem Industrial',   'Gaveta 3',       92.00),
  (10, 'Serra arco',                  'Starrett',       'BS12',          'Ferramentas Manuais',     'Montagem Industrial',   'Gaveta 3',       58.00),
  (11, 'Paquímetro digital 150 mm',   'Mitutoyo',       '500-196',       'Instrumentos de Medição', 'Controle de Qualidade', 'Armário 3',     780.00),
  (12, 'Micrômetro externo 0-25 mm',  'Mitutoyo',       '103-137',       'Instrumentos de Medição', 'Controle de Qualidade', 'Armário 3',     650.00),
  (13, 'Relógio comparador',          'Mitutoyo',       '2046S',         'Instrumentos de Medição', 'Controle de Qualidade', 'Armário 3',     540.00),
  (14, 'Trena de aço 5 m',            'Stanley',        'Powerlock',     'Instrumentos de Medição', 'Manutenção Geral',      'Gaveta 1',       45.00),
  (15, 'Nível de bolha 40 cm',        'Stanley',        '42-287',        'Instrumentos de Medição', 'Montagem Industrial',   'Gaveta 1',       52.00),
  (16, 'Máquina de solda MIG',        'ESAB',           'Smashweld 250', 'Equipamentos de Solda',   'Montagem Industrial',   'Bancada 4',    2890.00),
  (17, 'Máquina de solda TIG',        'Lincoln',        'Invertec 200',  'Equipamentos de Solda',   'Montagem Industrial',   'Bancada 4',    4350.00),
  (18, 'Maçarico de corte',           'White Martins',  'MC-100',        'Equipamentos de Solda',   'Manutenção Geral',      'Bancada 4',     780.00),
  (19, 'Chave de impacto pneumática', 'Ingersoll Rand', '2235',          'Ferramentas Pneumáticas', 'Estamparia',            'Prateleira 5', 1250.00),
  (20, 'Lixadeira pneumática',        'Chicago Pneum.', 'CP7202',        'Ferramentas Pneumáticas', 'Estamparia',            'Prateleira 5',  890.00),
  (21, 'Furadeira de bancada',        'Schulz',         'FSB 16',        'Ferramentas Elétricas',   'Usinagem CNC',          'Bancada 1',    1890.00),
  (22, 'Retífica reta',               'Makita',         'GD0601',        'Ferramentas Elétricas',   'Usinagem CNC',          'Armário 2',     640.00),
  (23, 'Torquímetro 40-200 Nm',       'Gedore',         'DREMOMETER',    'Ferramentas Manuais',     'Montagem Industrial',   'Gaveta 3',     1180.00),
  (24, 'Jogo de chaves Allen',        'Tramontina',     '9 peças',       'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 2',       72.00),
  (25, 'Multímetro digital',          'Fluke',          '115',           'Instrumentos de Medição', 'Manutenção Geral',      'Armário 3',    1350.00),
  (26, 'Parafusadeira pneumática',    'Ingersoll Rand', '2115',          'Ferramentas Pneumáticas', 'Estamparia',            'Prateleira 5',  970.00),
  (27, 'Esmerilhadeira de bancada',   'Schulz',         'ESB 8',         'Ferramentas Elétricas',   'Usinagem CNC',          'Bancada 1',     720.00),
  (28, 'Chave de boca combinada 19',  'Gedore',         '7-19',          'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 2',       34.00),
  (29, 'Goniômetro digital',          'Mitutoyo',       '950-317',       'Instrumentos de Medição', 'Controle de Qualidade', 'Armário 3',     890.00),
  (30, 'Rebitadeira pneumática',      'Chicago Pneum.', 'CP9882',        'Ferramentas Pneumáticas', 'Montagem Industrial',   'Prateleira 5',  760.00),
  (31, 'Politriz angular',            'Makita',         '9227C',         'Ferramentas Elétricas',   'Montagem Industrial',   'Armário 2',     980.00),
  (32, 'Furadeira de impacto 3/4"',   'Hilti',          'TE 30',         'Ferramentas Elétricas',   'Manutenção Geral',      'Armário 1',    2650.00),
  (33, 'Alicate amperímetro',         'Fluke',          '323',           'Instrumentos de Medição', 'Manutenção Geral',      'Armário 3',    1090.00),
  (34, 'Pistola de pintura HVLP',     'Wagner',         'W 880',         'Ferramentas Pneumáticas', 'Estamparia',            'Prateleira 5',  430.00),
  (35, 'Lâmpada estroboscópica',      'Minipa',         'MDT-2244',      'Instrumentos de Medição', 'Controle de Qualidade', 'Armário 3',    1550.00),
  (36, 'Jogo de chaves combinadas',   'Gedore',         '6-19 mm',       'Ferramentas Manuais',     'Manutenção Geral',      'Gaveta 4',      540.00)
), ins AS (
  INSERT INTO ferramentas (nome, marca, modelo, grupo_id, setor_id, localizacao, valor_aquisicao, eh_kit)
  SELECT l.nome, l.marca, l.modelo, g.id, s.id, l.local, l.valor, (l.n = 36)
  FROM lista l
  JOIN grupos_ferramentas g ON g.nome = l.grupo
  JOIN setores s ON s.nome = l.setor
  ORDER BY l.n
  RETURNING id, nome
)
INSERT INTO demo_ferr (n, id)
SELECT l.n, ins.id FROM lista l JOIN ins ON ins.nome = l.nome;

-- Itens do kit (peças individuais da ferramenta 36)
INSERT INTO itens_kit (ferramenta_id, nome)
SELECT (SELECT id FROM demo_ferr WHERE n = 36), medida
FROM unnest(ARRAY['8 mm','10 mm','12 mm','13 mm','14 mm','17 mm','19 mm']) AS medida;

-- ----------------------------------------------------------------------------
-- 3. Empréstimos
--    Cada empréstimo entra aberto (as triggers marcam a ferramenta em_uso) e,
--    se já foi devolvido, é atualizado em seguida (as triggers voltam o status
--    ou abrem a ocorrência de avaria/perda).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_user1 int; v_user2 int;
  v_cols int[];
  v_atividades int[];
  v_emp int;
  v_ferr int;
  v_col int;
  v_setor int;
  v_ret timestamptz;
BEGIN
  SELECT u.id INTO v_user1 FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id WHERE c.matricula = '0001';
  SELECT u.id INTO v_user2 FROM usuarios u JOIN colaboradores c ON c.id = u.colaborador_id WHERE c.matricula = '0002';
  SELECT array_agg(id ORDER BY matricula) INTO v_cols FROM colaboradores WHERE matricula BETWEEN '0101' AND '0116';
  SELECT array_agg(id ORDER BY id) INTO v_atividades FROM atividades;

  -- 3.1 Histórico: 60 empréstimos devolvidos ok nas ferramentas 1 a 20, do mais antigo ao mais novo
  FOR r IN SELECT i FROM generate_series(1, 60) AS i ORDER BY i LOOP
    v_ferr := (SELECT id FROM demo_ferr WHERE n = ((r.i - 1) % 20) + 1);
    v_col  := v_cols[((r.i * 5) % 16) + 1];
    v_setor := (SELECT setor_id FROM colaboradores WHERE id = v_col);
    v_ret := now() - make_interval(days => 62 - r.i, hours => 1 + (r.i % 7));

    INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, usuario_retirada_id,
                             data_retirada, previsao_devolucao, ordem_servico)
    VALUES (v_ferr, v_col, v_setor, v_atividades[(r.i % array_length(v_atividades, 1)) + 1],
            CASE WHEN r.i % 2 = 0 THEN v_user1 ELSE v_user2 END,
            v_ret, v_ret + interval '2 days',
            CASE WHEN r.i % 4 = 0 THEN 'OS-' || (1000 + r.i) END)
    RETURNING id INTO v_emp;

    UPDATE emprestimos
       SET data_devolucao = v_ret + make_interval(days => 1 + (r.i % 3), hours => r.i % 5),
           condicao_devolucao = 'ok',
           usuario_devolucao_id = CASE WHEN r.i % 2 = 0 THEN v_user2 ELSE v_user1 END
     WHERE id = v_emp;
  END LOOP;

  -- 3.2 Em uso agora (ferramentas 21 a 26), prazo ainda no futuro
  FOR r IN SELECT n, (n - 20) AS k FROM generate_series(21, 26) AS n LOOP
    v_ferr := (SELECT id FROM demo_ferr WHERE n = r.n);
    v_col  := v_cols[r.k * 2];
    v_setor := (SELECT setor_id FROM colaboradores WHERE id = v_col);
    INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, atividade_observacao,
                             usuario_retirada_id, data_retirada, previsao_devolucao)
    VALUES (v_ferr, v_col, v_setor, v_atividades[r.k], 'Serviço na linha ' || r.k,
            v_user1, now() - make_interval(hours => r.k * 3), now() + make_interval(days => 1 + (r.k % 3)));
  END LOOP;

  -- 3.3 Em atraso (ferramentas 27 a 29): prazo já venceu, ainda não devolvidas
  FOR r IN SELECT n, (n - 26) AS k FROM generate_series(27, 29) AS n LOOP
    v_ferr := (SELECT id FROM demo_ferr WHERE n = r.n);
    v_col  := v_cols[r.k * 3 + 1];
    v_setor := (SELECT setor_id FROM colaboradores WHERE id = v_col);
    INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id,
                             usuario_retirada_id, data_retirada, previsao_devolucao, observacoes_retirada)
    VALUES (v_ferr, v_col, v_setor, v_atividades[r.k + 2],
            v_user2, now() - make_interval(days => 5 + r.k * 2), now() - make_interval(days => 1 + r.k),
            'Combinado devolver até o fim da semana');
  END LOOP;

  -- 3.4 Vencem hoje (ferramentas 30 e 31)
  FOR r IN SELECT n, (n - 29) AS k FROM generate_series(30, 31) AS n LOOP
    v_ferr := (SELECT id FROM demo_ferr WHERE n = r.n);
    v_col  := v_cols[r.k * 4 + 3];
    v_setor := (SELECT setor_id FROM colaboradores WHERE id = v_col);
    INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id,
                             usuario_retirada_id, data_retirada, previsao_devolucao)
    VALUES (v_ferr, v_col, v_setor, v_atividades[r.k + 5],
            v_user1, now() - interval '1 day', date_trunc('day', now()) + interval '18 hours');
  END LOOP;

  -- 3.5 Devolvidas com avaria (32 e 33) e com perda (34): a trigger abre a ocorrência e marca indisponível
  FOR r IN SELECT * FROM (VALUES
      (32, 'avaria'::condicao_devolucao, 'Broca travou e o mandril ficou empenado'),
      (33, 'avaria'::condicao_devolucao, 'Visor rachou após queda da bancada'),
      (34, 'perda'::condicao_devolucao,  'Não foi encontrada ao final do turno')
    ) AS t(n, cond, obs) LOOP
    v_ferr := (SELECT id FROM demo_ferr WHERE n = r.n);
    v_col  := v_cols[r.n - 20];
    v_setor := (SELECT setor_id FROM colaboradores WHERE id = v_col);
    v_ret := now() - make_interval(days => 12 - (r.n - 32) * 3);
    INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id,
                             usuario_retirada_id, data_retirada, previsao_devolucao)
    VALUES (v_ferr, v_col, v_setor, v_atividades[2], v_user1, v_ret, v_ret + interval '2 days')
    RETURNING id INTO v_emp;
    UPDATE emprestimos
       SET data_devolucao = v_ret + interval '2 days', condicao_devolucao = r.cond,
           observacoes_devolucao = r.obs, usuario_devolucao_id = v_user2
     WHERE id = v_emp;
  END LOOP;

  -- 3.6 Uma peça do kit emprestada agora (a ferramenta 36 continua "disponivel": o kit controla por peça)
  INSERT INTO emprestimos (ferramenta_id, item_kit_id, colaborador_id, setor_destino_id, atividade_id,
                           usuario_retirada_id, data_retirada, previsao_devolucao)
  VALUES ((SELECT id FROM demo_ferr WHERE n = 36),
          (SELECT id FROM itens_kit WHERE nome = '13 mm' AND ferramenta_id = (SELECT id FROM demo_ferr WHERE n = 36)),
          v_cols[9], (SELECT setor_id FROM colaboradores WHERE id = v_cols[9]), v_atividades[1],
          v_user1, now() - interval '2 hours', now() + interval '1 day');
END $$;

-- ----------------------------------------------------------------------------
-- 4. Ocorrências: dá andamento a algumas das abertas automaticamente
-- ----------------------------------------------------------------------------
-- avaria da ferramenta 32: em reparo com custo estimado
UPDATE ocorrencias SET status = 'em_reparo', custo_estimado = 380.00, updated_at = now()
 WHERE ferramenta_id = (SELECT id FROM demo_ferr WHERE n = 32);

-- perda da ferramenta 34: cobrada do colaborador
UPDATE ocorrencias SET status = 'cobrada', custo_estimado = 430.00, custo_real = 430.00, updated_at = now()
 WHERE ferramenta_id = (SELECT id FROM demo_ferr WHERE n = 34);

-- avaria da ferramenta 33 fica "aberta" (aparece como pendente no sistema)

-- ----------------------------------------------------------------------------
-- 5. Ferramenta em manutenção preventiva (indisponível, sem empréstimo)
-- ----------------------------------------------------------------------------
UPDATE ferramentas SET status = 'indisponivel', motivo_indisponivel = 'manutencao_preventiva', updated_at = now()
 WHERE id = (SELECT id FROM demo_ferr WHERE n = 35);

COMMIT;

-- Resumo do que foi carregado
SELECT 'colaboradores' AS tabela, count(*) AS total FROM colaboradores
UNION ALL SELECT 'ferramentas', count(*) FROM ferramentas
UNION ALL SELECT '  disponiveis', count(*) FROM ferramentas WHERE status = 'disponivel'
UNION ALL SELECT '  em uso', count(*) FROM ferramentas WHERE status = 'em_uso'
UNION ALL SELECT '  indisponiveis', count(*) FROM ferramentas WHERE status = 'indisponivel'
UNION ALL SELECT 'emprestimos', count(*) FROM emprestimos
UNION ALL SELECT '  em aberto', count(*) FROM emprestimos WHERE data_devolucao IS NULL
UNION ALL SELECT '  em atraso', count(*) FROM emprestimos WHERE data_devolucao IS NULL AND now() > previsao_devolucao
UNION ALL SELECT 'ocorrencias', count(*) FROM ocorrencias;
