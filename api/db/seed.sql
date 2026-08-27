-- ============================================================================
-- SOUFER Tools - Seed Inicial de Testes
-- ============================================================================

-- 1. Setores
INSERT INTO setores (nome, ativo) VALUES
('Manutenção Geral', true),
('Usinagem CNC', true),
('Montagem Industrial', true),
('Controle de Qualidade', true),
('Estamparia', true)
ON CONFLICT (nome) DO NOTHING;

-- 2. Categorias
INSERT INTO categorias (nome, descricao, ativo) VALUES
('Ferramentas Elétricas', 'Furadeiras, parafusadeiras, lixadeiras e esmerilhadeiras', true),
('Ferramentas Manuais', 'Chaves fixas, combinadas, alicates e martelos', true),
('Instrumentos de Medição', 'Paquímetros, micrômetros, relógios comparadores e trenas', true),
('Equipamentos de Solda', 'Máquinas TIG/MIG, tochas e acessórios', true),
('Ferramentas Pneumáticas', 'Chaves de impacto pneumáticas e bicos de sopro', true)
ON CONFLICT (nome) DO NOTHING;

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
ON CONFLICT (nome) DO NOTHING;

-- 4. Usuários do Almoxarifado (Senha padrão para testes: '123456')
-- Hash bcrypt gerado para '123456'
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES
('Almoxarife Principal', 'almoxarife@soufer.com.br', '$2a$10$tZ9v2R2FfO6lE8u5e9.X9uVv9.Gf5fO8x6V6qE9e9.Gf5fO8x6V6q', 'almoxarife', true)
ON CONFLICT (email) DO NOTHING;

-- 5. Colaboradores
INSERT INTO colaboradores (nome, matricula, codigo_cracha, setor_id, cargo, ativo) VALUES
('Carlos Eduardo Souza', 'MAT001', 'CRACH001', 1, 'Mecânico de Manutenção', true),
('Mariana Lima Silva', 'MAT002', 'CRACH002', 2, 'Operadora de CNC', true),
('Rodrigo Alves Ferreira', 'MAT003', 'CRACH003', 3, 'Montador Industrial', true),
('Fernanda Costa Barbosa', 'MAT004', 'CRACH004', 4, 'Inspetora de Qualidade', true),
('Lucas Mendes Ramos', 'MAT005', 'CRACH005', 1, 'Eletricista de Manutenção', true)
ON CONFLICT (matricula) DO NOTHING;

-- 6. Ferramentas
INSERT INTO ferramentas (nome, descricao, codigo_patrimonio, categoria_id, setor_id, status, localizacao_padrao, ativo) VALUES
('Furadeira de Impacto Bosch GSB 13 RE', 'Furadeira 750W 127V com mandril 1/2', 'SF000001', 1, 1, 'disponivel', 'Prateleira A1', true),
('Parafusadeira DeWalt 20V Max', 'Parafusadeira a bateria com controle de torque', 'SF000002', 1, 1, 'disponivel', 'Prateleira A2', true),
('Paquímetro Digital Mitutoyo 150mm', 'Paquímetro de precisão 0.01mm com estojo', 'SF000003', 3, 4, 'disponivel', 'Armário Medição 01', true),
('Jogo de Chaves Combinadas 6 a 32mm', 'Conjunto Gedore com 26 peças em lona', 'SF000004', 2, 1, 'disponivel', 'Gaveta B3', true),
('Esmerilhadeira Angular Makita 4.1/2 840W', 'Esmerilhadeira 127V para discos de desbaste', 'SF000005', 1, 3, 'disponivel', 'Prateleira C1', true),
('Máquina de Solda Inversora TIG/MMA 200A', 'Inversora bivolt com cabos e tocha inclusa', 'SF000006', 4, 3, 'disponivel', 'Bancada Solda 02', true),
('Micrômetro Externo 0-25mm Mitutoyo', 'Resolução 0.001mm com catraca de fricção', 'SF000007', 3, 4, 'disponivel', 'Armário Medição 01', true),
('Chave de Impacto Pneumática 1/2', 'Torque 650Nm para aperto pesado', 'SF000008', 5, 1, 'disponivel', 'Painel Pneumático 01', true)
ON CONFLICT (codigo_patrimonio) DO NOTHING;
