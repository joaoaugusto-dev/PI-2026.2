-- ============================================================================
-- SOUFER Tools - Seed Inicial
--
-- Só o mínimo para entrar no sistema e cadastrar o resto: 5 setores, 5 categorias
-- (grupos_ferramentas), 10 atividades e as 3 contas de acesso (2 manutenção + 1 admin).
-- Nenhuma ferramenta, colaborador do chão de fábrica ou empréstimo de exemplo:
-- esses dados entram pela aplicação.
--
-- Idempotente: cada bloco tem sua propria guarda (ON CONFLICT DO NOTHING
-- para tabelas com chave natural unica, WHERE NOT EXISTS para as que nao
-- tem). Seguro rodar mais de uma vez em qualquer ambiente.
--
-- Como rodar:
--   psql -h <host> -U <user> -d <db> -f api/db/seed.sql
-- ============================================================================

-- 1. Setores
INSERT INTO setores (nome, ativo) VALUES
('Manutenção Geral', true),
('Usinagem CNC', true),
('Montagem Industrial', true),
('Controle de Qualidade', true),
('Estamparia', true)
ON CONFLICT (LOWER(nome)) DO NOTHING;

-- 2. Grupos de Ferramentas (era "categorias" — sem campo descricao, ver 0001_init.sql)
INSERT INTO grupos_ferramentas (nome, ativo) VALUES
('Ferramentas Elétricas', true),
('Ferramentas Manuais', true),
('Instrumentos de Medição', true),
('Equipamentos de Solda', true),
('Ferramentas Pneumáticas', true)
ON CONFLICT (LOWER(nome)) DO NOTHING;

-- 3. Atividades Pré-definidas
INSERT INTO atividades (nome, descricao, ativo) VALUES
('Manutenção Preventiva', 'Atividades programadas de revisão de máquinas', true),
('Manutenção Corretiva', 'Reparo emergencial de equipamentos inoperantes', true),
('Montagem de Estruturas', 'Montagem de perfis e componentes de aço', true),
('Corte e Furação', 'Processos mecânicos de corte e furação de chapas', true),
('Calibração e Medição', 'Inspeção dimensional e controle de qualidade', true),
('Soldagem TIG/MIG', 'União de peças metálicas por processo de solda', true),
('Usinagem Mecânica', 'Torneamento, fresamento e ajustes manuais', true),
('Instalação Elétrica', 'Passagem de cabos e conexão de painéis', true),
('Limpeza Técnica', 'Higienização de matrizes e ferramentas de precisão', true),
('Apoio de Linha', 'Suporte operacional geral na linha de produção', true)
ON CONFLICT (LOWER(nome)) DO NOTHING;

-- 5. Colaboradores: só os donos das contas de acesso (2 da manutenção e o admin). Colaboradores,
-- ferramentas e empréstimos reais são cadastrados pela própria aplicação.
-- A matrícula é a identidade da pessoa e só existe aqui; usuarios aponta para cá (colaborador_id).
-- Simplificado 02/09 (DB-02): sem código de identificação além da matrícula nem cargo, ver 0001_init.sql.
-- Ampliado na API-09 (de 20 para 50 do chão de fábrica) para dar massa realista ao teste de
-- desempenho do índice gin_trgm da busca por nome (item "se sobrar tempo").
-- setor_id por subquery (nome), não por id literal: SERIAL não é
-- transacional, então um id fixo quebra depois de qualquer seed que tenha
-- falhado antes (a sequência avança mesmo com ROLLBACK).
INSERT INTO colaboradores (nome, matricula, setor_id, ativo)
SELECT v.nome, v.matricula, s.id, true
FROM (VALUES
  ('Manutenção Principal', '0001', 'Manutenção Geral'),
  ('Manutenção Suporte', '0002', 'Manutenção Geral'),
  ('Administrador do Sistema', '0053', 'Manutenção Geral')
) AS v(nome, matricula, setor_nome)
JOIN setores s ON s.nome = v.setor_nome
ON CONFLICT (matricula) DO NOTHING;

-- 4. Contas de acesso da manutenção (Senha padrão para testes: '123456')
-- Hashes bcrypt reais, gerados com bcryptjs (mesma lib usada pelo AuthService).
-- Criadas depois dos colaboradores (passo 5): cada conta aponta para o colaborador
-- de mesma matrícula, que é quem define nome e matrícula de login (usuarios não
-- guarda nome nem matrícula próprios).
INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo)
SELECT c.id, '$2b$10$SRP0OA7e7oj5Wgb5fCP8aedf9TbxzGz3AtL9wocFq5Dgfb7FO774m', 'manutencao', true
FROM colaboradores c
WHERE c.matricula IN ('0001', '0002')
ON CONFLICT (colaborador_id) DO NOTHING;

-- 4.1 Conta de acesso do admin (matrícula 0053), único papel que pode listar
-- e aprovar auto-cadastros pendentes (issue #149). Sem ela, ninguém consegue
-- aprovar um cadastro sem UPDATE manual no banco.
INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo)
SELECT c.id, '$2b$10$SRP0OA7e7oj5Wgb5fCP8aedf9TbxzGz3AtL9wocFq5Dgfb7FO774m', 'admin', true
FROM colaboradores c
WHERE c.matricula = '0053'
ON CONFLICT (colaborador_id) DO NOTHING;
