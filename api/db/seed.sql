-- ============================================================================
-- SOUFER Tools - Seed Inicial de Testes
-- Alinhado ao schema de api/db/migrations/0001_init.sql (revisão pós-visita
-- técnica de 02/09: sem "categorias" (agora grupos_ferramentas + subgrupos),
-- colaboradores sem codigo_cracha/cargo, ferramentas com codigo_identificacao
-- (gerado automaticamente pela trigger fn_gera_codigo_identificacao) e
-- localizacao (não mais localizacao_padrao/codigo_patrimonio).
-- ============================================================================

-- 1. Setores
INSERT INTO setores (nome, ativo) VALUES
('Manutenção Geral', true),
('Usinagem CNC', true),
('Montagem Industrial', true),
('Controle de Qualidade', true),
('Estamparia', true)
ON CONFLICT (nome) DO NOTHING;

-- 2. Grupos de Ferramentas (substitui "categorias")
INSERT INTO grupos_ferramentas (nome, ativo) VALUES
('Ferramentas Elétricas', true),
('Ferramentas Manuais', true),
('Instrumentos de Medição', true),
('Equipamentos de Solda', true),
('Ferramentas Pneumáticas', true)
ON CONFLICT (nome) DO NOTHING;

-- 3. Subgrupos de Ferramentas
INSERT INTO subgrupos_ferramentas (grupo_id, nome, ativo)
SELECT g.id, s.nome, true
FROM (VALUES
    ('Ferramentas Elétricas', 'Furadeiras'),
    ('Ferramentas Elétricas', 'Parafusadeiras'),
    ('Ferramentas Elétricas', 'Esmerilhadeiras'),
    ('Ferramentas Manuais', 'Jogos de Chaves Combinadas'),
    ('Instrumentos de Medição', 'Paquímetros'),
    ('Instrumentos de Medição', 'Micrômetros'),
    ('Equipamentos de Solda', 'Inversoras TIG/MMA'),
    ('Ferramentas Pneumáticas', 'Chaves de Impacto')
) AS s(grupo_nome, nome)
JOIN grupos_ferramentas g ON g.nome = s.grupo_nome
ON CONFLICT (grupo_id, nome) DO NOTHING;

-- 4. Atividades Pré-definidas
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
ON CONFLICT (nome) DO NOTHING;

-- 5. Usuários do Almoxarifado (Senha padrão para testes: '123456')
-- O placeholder de hash abaixo é substituído em tempo de execução por
-- scripts/seed.ts com um hash bcrypt real gerado na hora.
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES
('Almoxarife Principal', 'almoxarife@soufer.com.br', '$2a$10$tZ9v2R2FfO6lE8u5e9.X9uVv9.Gf5fO8x6V6qE9e9.Gf5fO8x6V6q', 'almoxarife', true)
ON CONFLICT (email) DO NOTHING;

-- 6. Colaboradores (sem codigo_cracha/cargo — removidos do schema em 02/09)
INSERT INTO colaboradores (nome, matricula, setor_id, ativo)
SELECT c.nome, c.matricula, s.id, true
FROM (VALUES
    ('Carlos Eduardo Souza', 'MAT001', 'Manutenção Geral'),
    ('Mariana Lima Silva', 'MAT002', 'Usinagem CNC'),
    ('Rodrigo Alves Ferreira', 'MAT003', 'Montagem Industrial'),
    ('Fernanda Costa Barbosa', 'MAT004', 'Controle de Qualidade'),
    ('Lucas Mendes Ramos', 'MAT005', 'Manutenção Geral')
) AS c(nome, matricula, setor_nome)
JOIN setores s ON s.nome = c.setor_nome
ON CONFLICT (matricula) DO NOTHING;

-- 7. Ferramentas (codigo_identificacao é gerado automaticamente pela trigger
-- fn_gera_codigo_identificacao — não é informado aqui)
INSERT INTO ferramentas (nome, descricao, grupo_id, subgrupo_id, setor_id, status, localizacao, ativo)
SELECT f.nome, f.descricao, g.id, sg.id, s.id, 'disponivel', f.localizacao, true
FROM (VALUES
    ('Furadeira de Impacto Bosch GSB 13 RE', 'Furadeira 750W 127V com mandril 1/2', 'Ferramentas Elétricas', 'Furadeiras', 'Manutenção Geral', 'Prateleira A1'),
    ('Parafusadeira DeWalt 20V Max', 'Parafusadeira a bateria com controle de torque', 'Ferramentas Elétricas', 'Parafusadeiras', 'Manutenção Geral', 'Prateleira A2'),
    ('Paquímetro Digital Mitutoyo 150mm', 'Paquímetro de precisão 0.01mm com estojo', 'Instrumentos de Medição', 'Paquímetros', 'Controle de Qualidade', 'Armário Medição 01'),
    ('Jogo de Chaves Combinadas 6 a 32mm', 'Conjunto Gedore com 26 peças em lona', 'Ferramentas Manuais', 'Jogos de Chaves Combinadas', 'Manutenção Geral', 'Gaveta B3'),
    ('Esmerilhadeira Angular Makita 4.1/2 840W', 'Esmerilhadeira 127V para discos de desbaste', 'Ferramentas Elétricas', 'Esmerilhadeiras', 'Montagem Industrial', 'Prateleira C1'),
    ('Máquina de Solda Inversora TIG/MMA 200A', 'Inversora bivolt com cabos e tocha inclusa', 'Equipamentos de Solda', 'Inversoras TIG/MMA', 'Montagem Industrial', 'Bancada Solda 02'),
    ('Micrômetro Externo 0-25mm Mitutoyo', 'Resolução 0.001mm com catraca de fricção', 'Instrumentos de Medição', 'Micrômetros', 'Controle de Qualidade', 'Armário Medição 01'),
    ('Chave de Impacto Pneumática 1/2', 'Torque 650Nm para aperto pesado', 'Ferramentas Pneumáticas', 'Chaves de Impacto', 'Manutenção Geral', 'Painel Pneumático 01')
) AS f(nome, descricao, grupo_nome, subgrupo_nome, setor_nome, localizacao)
JOIN grupos_ferramentas g ON g.nome = f.grupo_nome
JOIN subgrupos_ferramentas sg ON sg.nome = f.subgrupo_nome AND sg.grupo_id = g.id
JOIN setores s ON s.nome = f.setor_nome
WHERE NOT EXISTS (
    SELECT 1 FROM ferramentas existente WHERE existente.nome = f.nome
);
