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

-- 2. Grupos de Ferramentas (era "categorias" — sem campo descricao, ver 0001_init.sql)
INSERT INTO grupos_ferramentas (nome, ativo) VALUES
('Ferramentas Elétricas', true),
('Ferramentas Manuais', true),
('Instrumentos de Medição', true),
('Equipamentos de Solda', true),
('Ferramentas Pneumáticas', true)
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
-- Simplificado 02/09 (DB-02): sem codigo_cracha nem cargo, ver 0001_init.sql.
-- setor_id por subquery (nome), não por id literal: SERIAL não é
-- transacional, então um id fixo quebra depois de qualquer seed que tenha
-- falhado antes (a sequência avança mesmo com ROLLBACK).
INSERT INTO colaboradores (nome, matricula, setor_id, ativo)
SELECT v.nome, v.matricula, s.id, true
FROM (VALUES
  ('Carlos Eduardo Souza', 'MAT001', 'Manutenção Geral'),
  ('Mariana Lima Silva', 'MAT002', 'Usinagem CNC'),
  ('Rodrigo Alves Ferreira', 'MAT003', 'Montagem Industrial'),
  ('Fernanda Costa Barbosa', 'MAT004', 'Controle de Qualidade'),
  ('Lucas Mendes Ramos', 'MAT005', 'Manutenção Geral')
) AS v(nome, matricula, setor_nome)
JOIN setores s ON s.nome = v.setor_nome
ON CONFLICT (matricula) DO NOTHING;

-- 6. Ferramentas
-- codigo_identificacao (4 dígitos) é gerado automaticamente pela trigger
-- fn_gera_codigo_identificacao — não informar na carga. grupo_id/setor_id
-- também por subquery (nome), pelo mesmo motivo do bloco de colaboradores.
-- Guard por WHERE NOT EXISTS em vez de ON CONFLICT: sem coluna natural única
-- em ferramentas após a revisão DB-02.
INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, setor_id, status, localizacao, ativo)
SELECT v.nome, v.descricao, v.marca, v.modelo, g.id, s.id, v.status, v.localizacao, true
FROM (VALUES
  ('Furadeira de Impacto Bosch GSB 13 RE', 'Furadeira 750W 127V com mandril 1/2', 'Bosch', 'GSB 13 RE', 'Ferramentas Elétricas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Prateleira A1'),
  ('Parafusadeira DeWalt 20V Max', 'Parafusadeira a bateria com controle de torque', 'DeWalt', 'DCF787', 'Ferramentas Elétricas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Prateleira A2'),
  ('Paquímetro Digital Mitutoyo 150mm', 'Paquímetro de precisão 0.01mm com estojo', 'Mitutoyo', '500-197-30', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 01'),
  ('Jogo de Chaves Combinadas 6 a 32mm', 'Conjunto Gedore com 26 peças em lona', 'Gedore', 'Red R46003026', 'Ferramentas Manuais', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Gaveta B3'),
  ('Esmerilhadeira Angular Makita 4.1/2 840W', 'Esmerilhadeira 127V para discos de desbaste', 'Makita', 'GA4530', 'Ferramentas Elétricas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Prateleira C1'),
  ('Máquina de Solda Inversora TIG/MMA 200A', 'Inversora bivolt com cabos e tocha inclusa', 'Esab', 'Rebel EMP 205ic', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Bancada Solda 02'),
  ('Micrômetro Externo 0-25mm Mitutoyo', 'Resolução 0.001mm com catraca de fricção', 'Mitutoyo', '103-137', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 01'),
  ('Chave de Impacto Pneumática 1/2', 'Torque 650Nm para aperto pesado', 'Ingersoll Rand', '2145QiMAX', 'Ferramentas Pneumáticas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Painel Pneumático 01')
) AS v(nome, descricao, marca, modelo, grupo_nome, setor_nome, status, localizacao)
JOIN grupos_ferramentas g ON g.nome = v.grupo_nome
JOIN setores s ON s.nome = v.setor_nome
WHERE NOT EXISTS (SELECT 1 FROM ferramentas);
