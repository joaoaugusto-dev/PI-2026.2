-- ============================================================================
-- SOUFER Tools - Seed Inicial de Testes
--
-- [DB-08] Popula soufer_dev com dado realista o bastante para o front
-- trabalhar sem precisar cadastrar tudo na mao: 5 setores, 5 categorias
-- (grupos_ferramentas), 10 atividades, 2 usuarios almoxarife, 20
-- colaboradores, 50 ferramentas variadas e uma massa de emprestimos
-- (abertos, devolvidos sem ocorrencia e devolvidos com ocorrencia) para o
-- dashboard nao nascer vazio.
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
-- Hashes bcrypt reais, gerados com bcryptjs (mesma lib usada pelo AuthService).
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo) VALUES
('Almoxarife Principal', 'almoxarife@soufer.com.br', '$2b$10$aVJ0wpiXaidQ.PdN9EoXI.N3Hv8Qk.HkNock5/NVL9KIz37p4jmga', 'almoxarife', true),
('Almoxarife Suporte', 'almoxarife2@soufer.com.br', '$2b$10$XbtUd/Ec6WjBvxSv8AUxqOtI0mURMOEikQ5JnVe9Wdx2SJ6ecSr3y', 'almoxarife', true)
ON CONFLICT (email) DO NOTHING;

-- 5. Colaboradores (20)
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
  ('Lucas Mendes Ramos', 'MAT005', 'Manutenção Geral'),
  ('Juliana Aparecida Santos', 'MAT006', 'Estamparia'),
  ('Bruno Henrique Oliveira', 'MAT007', 'Usinagem CNC'),
  ('Camila Fernandes Rocha', 'MAT008', 'Montagem Industrial'),
  ('Diego Martins Pereira', 'MAT009', 'Manutenção Geral'),
  ('Patrícia Gonçalves Nunes', 'MAT010', 'Controle de Qualidade'),
  ('Thiago Rezende Almeida', 'MAT011', 'Estamparia'),
  ('Aline Cristina Moraes', 'MAT012', 'Usinagem CNC'),
  ('Gustavo Henrique Batista da Silva', 'MAT013', 'Montagem Industrial'),
  ('Vanessa Regina Cardoso', 'MAT014', 'Manutenção Geral'),
  ('Felipe Augusto Teixeira', 'MAT015', 'Controle de Qualidade'),
  ('Renata Aparecida de Souza Lima', 'MAT016', 'Estamparia'),
  ('Marcelo Vinícius Correia', 'MAT017', 'Usinagem CNC'),
  ('Priscila Andrade Monteiro', 'MAT018', 'Montagem Industrial'),
  ('Eduardo Henrique Nascimento Barros', 'MAT019', 'Manutenção Geral'),
  ('Simone Cristina Farias', 'MAT020', 'Controle de Qualidade')
) AS v(nome, matricula, setor_nome)
JOIN setores s ON s.nome = v.setor_nome
ON CONFLICT (matricula) DO NOTHING;

-- 6. Ferramentas (50, variadas entre as 5 categorias)
-- codigo_identificacao (4 dígitos) é gerado automaticamente pela trigger
-- fn_gera_codigo_identificacao — não informar na carga. grupo_id/setor_id
-- também por subquery (nome), pelo mesmo motivo do bloco de colaboradores.
-- Guard por WHERE NOT EXISTS em vez de ON CONFLICT: sem coluna natural única
-- em ferramentas após a revisão DB-02.
INSERT INTO ferramentas (nome, descricao, marca, modelo, grupo_id, setor_id, status, localizacao, ativo)
SELECT v.nome, v.descricao, v.marca, v.modelo, g.id, s.id, v.status, v.localizacao, true
FROM (VALUES
  -- Ferramentas Elétricas (10)
  ('Furadeira de Impacto Bosch GSB 13 RE', 'Furadeira 750W 127V com mandril 1/2', 'Bosch', 'GSB 13 RE', 'Ferramentas Elétricas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Prateleira A1'),
  ('Parafusadeira DeWalt 20V Max', 'Parafusadeira a bateria com controle de torque', 'DeWalt', 'DCF787', 'Ferramentas Elétricas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Prateleira A2'),
  ('Esmerilhadeira Angular Makita 4.1/2 840W', 'Esmerilhadeira 127V para discos de desbaste', 'Makita', 'GA4530', 'Ferramentas Elétricas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Prateleira C1'),
  ('Lixadeira Orbital Makita BO3711', 'Lixadeira orbital 190W com base de velcro', 'Makita', 'BO3711', 'Ferramentas Elétricas', 'Estamparia', 'disponivel'::status_ferramenta, 'Prateleira D1'),
  ('Serra Circular Bosch GKS 150', 'Serra circular 1200W com disco de 150mm', 'Bosch', 'GKS 150', 'Ferramentas Elétricas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Prateleira C2'),
  ('Serra Tico-Tico Black+Decker CD601', 'Serra tico-tico 400W com velocidade variável', 'Black+Decker', 'CD601', 'Ferramentas Elétricas', 'Estamparia', 'disponivel'::status_ferramenta, 'Prateleira D2'),
  ('Furadeira de Bancada Vonder FBV 550', 'Furadeira de bancada 550W com mesa inclinável', 'Vonder', 'FBV 550', 'Ferramentas Elétricas', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 01'),
  ('Soprador Térmico Bosch GHG 20-63', 'Soprador térmico 2000W com temperatura ajustável', 'Bosch', 'GHG 20-63', 'Ferramentas Elétricas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Prateleira A3'),
  ('Retífica Reta DeWalt DWE4887', 'Retífica reta 710W para acabamento e polimento', 'DeWalt', 'DWE4887', 'Ferramentas Elétricas', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 02'),
  ('Plaina Elétrica Makita KP0810', 'Plaina elétrica 850W com profundidade ajustável', 'Makita', 'KP0810', 'Ferramentas Elétricas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Prateleira C3'),

  -- Ferramentas Manuais (10)
  ('Jogo de Chaves Combinadas 6 a 32mm', 'Conjunto Gedore com 26 peças em lona', 'Gedore', 'Red R46003026', 'Ferramentas Manuais', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Gaveta B3'),
  ('Jogo de Soquetes Sextavados 1/2 Polegada Gedore Red', 'Conjunto com 32 peças e catraca reversível', 'Gedore', 'Red R69003032', 'Ferramentas Manuais', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Gaveta E1'),
  ('Martelo de Borracha Tramontina 500g', 'Martelo com cabo de fibra de vidro', 'Tramontina', '55201/500', 'Ferramentas Manuais', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Gaveta C4'),
  ('Alicate Universal Vonder 8 Polegadas', 'Alicate isolado 1000V com cabo emborrachado', 'Vonder', 'AU 8', 'Ferramentas Manuais', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Gaveta B4'),
  ('Jogo de Chaves Allen Tramontina 9 Peças', 'Conjunto em milímetros com suporte plástico', 'Tramontina', '41102/109', 'Ferramentas Manuais', 'Estamparia', 'disponivel'::status_ferramenta, 'Gaveta D3'),
  ('Talhadeira de Aço Vonder 300mm', 'Talhadeira temperada para corte a frio', 'Vonder', 'TAV 300', 'Ferramentas Manuais', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Gaveta B5'),
  ('Serrote para Metal Irwin 12 Polegadas', 'Serrote com lâmina bimetálica de dentes finos', 'Irwin', 'SM12', 'Ferramentas Manuais', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Gaveta C5'),
  ('Chave de Grifo Stanley 14 Polegadas', 'Chave de grifo em ferro fundido para tubulações', 'Stanley', 'ST14', 'Ferramentas Manuais', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Gaveta E2'),
  ('Nível de Bolha Profissional Vonder 60cm', 'Nível de alumínio com 3 fiéis de precisão', 'Vonder', 'NBP 60', 'Ferramentas Manuais', 'Estamparia', 'disponivel'::status_ferramenta, 'Gaveta D4'),
  ('Jogo de Limas para Metal Nicholson 6 Peças', 'Conjunto com limas chata, meia-cana e triangular', 'Nicholson', 'LM6', 'Ferramentas Manuais', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Gaveta B6'),

  -- Instrumentos de Medição (10)
  ('Paquímetro Digital Mitutoyo 150mm', 'Paquímetro de precisão 0.01mm com estojo', 'Mitutoyo', '500-197-30', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 01'),
  ('Micrômetro Externo 0-25mm Mitutoyo', 'Resolução 0.001mm com catraca de fricção', 'Mitutoyo', '103-137', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 01'),
  ('Trena a Laser Bosch GLM 50 C', 'Medidor de distância a laser com Bluetooth, alcance 50m', 'Bosch', 'GLM 50 C', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 02'),
  ('Relógio Comparador Digital Mitutoyo 2046S', 'Curso de 12.7mm com resolução 0.01mm', 'Mitutoyo', '2046S', 'Instrumentos de Medição', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 03'),
  ('Goniômetro Universal Starrett 224', 'Medição angular de 0 a 360 graus', 'Starrett', '224', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 02'),
  ('Multímetro Digital Minipa ET-2042C', 'Multímetro true RMS com medição de temperatura', 'Minipa', 'ET-2042C', 'Instrumentos de Medição', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Armário Elétrica 01'),
  ('Termômetro Infravermelho Industrial Fluke 62 MAX', 'Termômetro sem contato com mira a laser', 'Fluke', '62 MAX', 'Instrumentos de Medição', 'Estamparia', 'disponivel'::status_ferramenta, 'Armário Medição 03'),
  ('Escala de Precisão em Aço Inox Starrett 300mm', 'Régua graduada em milímetros e polegadas', 'Starrett', 'C604RE-12', 'Instrumentos de Medição', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 03'),
  ('Rugosímetro Portátil Mitutoyo SJ-210', 'Medidor de rugosidade superficial portátil', 'Mitutoyo', 'SJ-210', 'Instrumentos de Medição', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 03'),
  ('Traçador de Altura Digital Digimess 300mm', 'Base em granito sintético com display digital', 'Digimess', '120.365', 'Instrumentos de Medição', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 04'),

  -- Equipamentos de Solda (10)
  ('Máquina de Solda Inversora TIG/MMA 200A', 'Inversora bivolt com cabos e tocha inclusa', 'Esab', 'Rebel EMP 205ic', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Bancada Solda 02'),
  ('Máquina de Solda MIG/MAG Schulz Bivolt 200A', 'Inversora com alimentador de arame integrado', 'Schulz', 'SMM 200 LCD', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Bancada Solda 01'),
  ('Máscara de Solda Automática Esab Sentinel', 'Escurecimento automático com regulagem de sensibilidade', 'Esab', 'Sentinel A50', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Armário EPI Solda'),
  ('Cilindro de Gás Argônio com Regulador White Martins', 'Cilindro industrial com válvula reguladora de vazão', 'White Martins', 'Ar Puro 7m³', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Área Externa Gases'),
  ('Tocha de Solda TIG Refrigerada a Ar Esab', 'Tocha TIG 150A com cabo de 4 metros', 'Esab', 'TXH 150', 'Equipamentos de Solda', 'Estamparia', 'disponivel'::status_ferramenta, 'Bancada Solda 03'),
  ('Alicate de Solda a Ponto Lincoln Electric', 'Alicate para solda a ponto de chapas finas', 'Lincoln Electric', 'SP-200', 'Equipamentos de Solda', 'Estamparia', 'disponivel'::status_ferramenta, 'Bancada Solda 03'),
  ('Esmeril de Bancada para Eletrodos Vonder EBV-750', 'Esmeril de bancada 750W com dois rebolos', 'Vonder', 'EBV-750', 'Equipamentos de Solda', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Bancada Solda 04'),
  ('Máquina de Solda por Ponto Portátil Kinal', 'Solda por ponto para chapas de até 1.5mm', 'Kinal', 'MSP-15', 'Equipamentos de Solda', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Bancada Solda 01'),
  ('Escova Rotativa de Aço para Solda Norton', 'Escova rotativa para limpeza de cordão de solda', 'Norton', 'ERA-100', 'Equipamentos de Solda', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 05'),
  ('Régua de Solda Bridge Cam Gauge', 'Gabarito para medição de filete e reforço de solda', 'Bridge Cam', 'BCG-01', 'Equipamentos de Solda', 'Controle de Qualidade', 'disponivel'::status_ferramenta, 'Armário Medição 04'),

  -- Ferramentas Pneumáticas (10)
  ('Chave de Impacto Pneumática 1/2 Polegada', 'Torque 650Nm para aperto pesado', 'Ingersoll Rand', '2145QiMAX', 'Ferramentas Pneumáticas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Painel Pneumático 01'),
  ('Parafusadeira Pneumática de Impacto Ingersoll Rand 2135TiMAX', 'Torque 950Nm com corpo em titânio', 'Ingersoll Rand', '2135TiMAX', 'Ferramentas Pneumáticas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Painel Pneumático 02'),
  ('Lixadeira Pneumática Orbital Chiaperini', 'Lixadeira orbital com base de velcro 6 polegadas', 'Chiaperini', 'LPO-6', 'Ferramentas Pneumáticas', 'Estamparia', 'disponivel'::status_ferramenta, 'Painel Pneumático 03'),
  ('Pistola de Pintura Pneumática Sata Jet 4000 B', 'Pistola HVLP com bico de 1.3mm', 'Sata', 'Jet 4000 B', 'Ferramentas Pneumáticas', 'Estamparia', 'disponivel'::status_ferramenta, 'Cabine de Pintura'),
  ('Martelete Pneumático Ingersoll Rand 121', 'Martelete para demolição e corte leve', 'Ingersoll Rand', '121', 'Ferramentas Pneumáticas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Painel Pneumático 01'),
  ('Furadeira Pneumática Reta Chiaperini FP-500', 'Furadeira reta de alta rotação para acabamento', 'Chiaperini', 'FP-500', 'Ferramentas Pneumáticas', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 06'),
  ('Grampeador Pneumático Industrial Bostitch', 'Grampeador para fixação de embalagens de madeira', 'Bostitch', 'N88WWB', 'Ferramentas Pneumáticas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Painel Pneumático 02'),
  ('Pistola de Ar Comprimido Vonder PSV 04', 'Pistola de sopro com bico extensor', 'Vonder', 'PSV 04', 'Ferramentas Pneumáticas', 'Manutenção Geral', 'disponivel'::status_ferramenta, 'Painel Pneumático 01'),
  ('Compressor de Ar Portátil Schulz CSI 8,7 Pés', 'Compressor de ar 2HP com reservatório de 25 litros', 'Schulz', 'CSI 8,7/25', 'Ferramentas Pneumáticas', 'Usinagem CNC', 'disponivel'::status_ferramenta, 'Bancada Usinagem 06'),
  ('Rebitadeira Pneumática GYS Air Riv', 'Rebitadeira para rebites de repuxo até 6.4mm', 'GYS', 'Air Riv', 'Ferramentas Pneumáticas', 'Montagem Industrial', 'disponivel'::status_ferramenta, 'Painel Pneumático 02')
) AS v(nome, descricao, marca, modelo, grupo_nome, setor_nome, status, localizacao)
JOIN grupos_ferramentas g ON g.nome = v.grupo_nome
JOIN setores s ON s.nome = v.setor_nome
WHERE NOT EXISTS (SELECT 1 FROM ferramentas);

-- 7. Empréstimos de exemplo (6 abertos, 6 devolvidos sem ocorrência, 4
-- devolvidos com ocorrência — 3 avarias e 1 perda), para o dashboard não
-- nascer vazio.
--
-- Cada devolução é feita em duas etapas (INSERT em aberto, depois UPDATE
-- fechando) em vez de um único INSERT já devolvido, porque
-- fn_sync_status_ferramenta e fn_abre_ocorrencia só disparam a lógica de
-- fechamento (status da ferramenta e abertura de ocorrência) em UPDATE, não
-- em INSERT — o mesmo comportamento já validado manualmente na DB-06.
--
-- Guarda \if pelo psql em vez de WHERE NOT EXISTS em cada statement: a seção
-- inteira é um fluxo de várias etapas (INSERT + UPDATE) que só faz sentido
-- rodar do zero. Sem essa guarda, rodar o seed.sql de novo tentaria abrir
-- empréstimo em ferramenta que já está em_uso/indisponivel e falharia na
-- trigger fn_valida_retirada.
SELECT NOT EXISTS (SELECT 1 FROM emprestimos) AS seed_emprestimos \gset
\if :seed_emprestimos

-- 7.1 Empréstimos em aberto (6) — 2 propositalmente atrasados para a KPI
-- "atrasadas" do dashboard não nascer zerada.
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, usuario_retirada_id, data_retirada, previsao_devolucao, observacoes_retirada)
SELECT f.id, c.id, c.setor_id, a.id, u.id, v.data_retirada, v.previsao_devolucao, v.observacoes
FROM (VALUES
  ('Furadeira de Impacto Bosch GSB 13 RE', 'MAT001', 'Manutenção Preventiva', 'almoxarife@soufer.com.br', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NULL),
  ('Parafusadeira DeWalt 20V Max', 'MAT002', 'Montagem de Estruturas', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '1 day', NULL),
  ('Esmerilhadeira Angular Makita 4.1/2 840W', 'MAT003', 'Corte e Furação', 'almoxarife@soufer.com.br', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', 'OS-4471 — corte de chapa para suporte'),
  ('Máquina de Solda MIG/MAG Schulz Bivolt 200A', 'MAT009', 'Soldagem TIG/MIG', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NULL),
  ('Trena a Laser Bosch GLM 50 C', 'MAT004', 'Calibração e Medição', 'almoxarife@soufer.com.br', NOW() - INTERVAL '4 hours', NOW() + INTERVAL '1 day', NULL),
  ('Parafusadeira Pneumática de Impacto Ingersoll Rand 2135TiMAX', 'MAT007', 'Apoio de Linha', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', 'OS-4459 — linha 3 parada aguardando peça')
) AS v(ferramenta_nome, colaborador_matricula, atividade_nome, usuario_email, data_retirada, previsao_devolucao, observacoes)
JOIN ferramentas f ON f.nome = v.ferramenta_nome
JOIN colaboradores c ON c.matricula = v.colaborador_matricula
JOIN atividades a ON a.nome = v.atividade_nome
JOIN usuarios u ON u.email = v.usuario_email;

-- 7.2 Empréstimos já devolvidos, condição OK (6, sem ocorrência)
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, usuario_retirada_id, data_retirada, previsao_devolucao)
SELECT f.id, c.id, c.setor_id, a.id, u.id, v.data_retirada, v.data_retirada + INTERVAL '1 day'
FROM (VALUES
  ('Paquímetro Digital Mitutoyo 150mm', 'MAT005', 'Calibração e Medição', 'almoxarife@soufer.com.br', NOW() - INTERVAL '5 days'),
  ('Jogo de Chaves Combinadas 6 a 32mm', 'MAT008', 'Montagem de Estruturas', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '6 days'),
  ('Micrômetro Externo 0-25mm Mitutoyo', 'MAT010', 'Calibração e Medição', 'almoxarife@soufer.com.br', NOW() - INTERVAL '3 days'),
  ('Chave de Impacto Pneumática 1/2 Polegada', 'MAT011', 'Manutenção Corretiva', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '7 days'),
  ('Lixadeira Orbital Makita BO3711', 'MAT012', 'Corte e Furação', 'almoxarife@soufer.com.br', NOW() - INTERVAL '4 days'),
  ('Serra Circular Bosch GKS 150', 'MAT013', 'Montagem de Estruturas', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '2 days')
) AS v(ferramenta_nome, colaborador_matricula, atividade_nome, usuario_email, data_retirada)
JOIN ferramentas f ON f.nome = v.ferramenta_nome
JOIN colaboradores c ON c.matricula = v.colaborador_matricula
JOIN atividades a ON a.nome = v.atividade_nome
JOIN usuarios u ON u.email = v.usuario_email;

UPDATE emprestimos SET data_devolucao = data_retirada + INTERVAL '1 day', condicao_devolucao = 'ok', usuario_devolucao_id = (SELECT id FROM usuarios WHERE email = 'almoxarife@soufer.com.br')
WHERE ferramenta_id IN (
  SELECT id FROM ferramentas WHERE nome IN (
    'Paquímetro Digital Mitutoyo 150mm', 'Jogo de Chaves Combinadas 6 a 32mm', 'Micrômetro Externo 0-25mm Mitutoyo',
    'Chave de Impacto Pneumática 1/2 Polegada', 'Lixadeira Orbital Makita BO3711', 'Serra Circular Bosch GKS 150'
  )
) AND data_devolucao IS NULL;

-- 7.3 Empréstimos devolvidos com avaria (3) — trg_abre_ocorrencia cria a
-- ocorrência automaticamente a partir do UPDATE abaixo.
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, usuario_retirada_id, data_retirada, previsao_devolucao)
SELECT f.id, c.id, c.setor_id, a.id, u.id, v.data_retirada, v.data_retirada + INTERVAL '1 day'
FROM (VALUES
  ('Furadeira de Bancada Vonder FBV 550', 'MAT014', 'Usinagem Mecânica', 'almoxarife@soufer.com.br', NOW() - INTERVAL '10 days'),
  ('Soprador Térmico Bosch GHG 20-63', 'MAT015', 'Instalação Elétrica', 'almoxarife2@soufer.com.br', NOW() - INTERVAL '8 days'),
  ('Máscara de Solda Automática Esab Sentinel', 'MAT016', 'Soldagem TIG/MIG', 'almoxarife@soufer.com.br', NOW() - INTERVAL '12 days')
) AS v(ferramenta_nome, colaborador_matricula, atividade_nome, usuario_email, data_retirada)
JOIN ferramentas f ON f.nome = v.ferramenta_nome
JOIN colaboradores c ON c.matricula = v.colaborador_matricula
JOIN atividades a ON a.nome = v.atividade_nome
JOIN usuarios u ON u.email = v.usuario_email;

UPDATE emprestimos SET data_devolucao = data_retirada + INTERVAL '1 day', condicao_devolucao = 'avaria', usuario_devolucao_id = (SELECT id FROM usuarios WHERE email = 'almoxarife2@soufer.com.br'), observacoes_devolucao = 'Mandril travado após uso, necessita troca de rolamento'
WHERE ferramenta_id = (SELECT id FROM ferramentas WHERE nome = 'Furadeira de Bancada Vonder FBV 550') AND data_devolucao IS NULL;

UPDATE emprestimos SET data_devolucao = data_retirada + INTERVAL '1 day', condicao_devolucao = 'avaria', usuario_devolucao_id = (SELECT id FROM usuarios WHERE email = 'almoxarife@soufer.com.br'), observacoes_devolucao = 'Resistência queimada, sem aquecimento'
WHERE ferramenta_id = (SELECT id FROM ferramentas WHERE nome = 'Soprador Térmico Bosch GHG 20-63') AND data_devolucao IS NULL;

UPDATE emprestimos SET data_devolucao = data_retirada + INTERVAL '1 day', condicao_devolucao = 'avaria', usuario_devolucao_id = (SELECT id FROM usuarios WHERE email = 'almoxarife2@soufer.com.br'), observacoes_devolucao = 'Sensor de escurecimento automático não funciona'
WHERE ferramenta_id = (SELECT id FROM ferramentas WHERE nome = 'Máscara de Solda Automática Esab Sentinel') AND data_devolucao IS NULL;

-- 7.4 Empréstimo devolvido com perda (1)
INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, atividade_id, usuario_retirada_id, data_retirada, previsao_devolucao)
SELECT f.id, c.id, c.setor_id, a.id, u.id, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'
FROM ferramentas f, colaboradores c, atividades a, usuarios u
WHERE f.nome = 'Multímetro Digital Minipa ET-2042C'
  AND c.matricula = 'MAT017'
  AND a.nome = 'Instalação Elétrica'
  AND u.email = 'almoxarife@soufer.com.br';

UPDATE emprestimos SET data_devolucao = data_retirada + INTERVAL '1 day', condicao_devolucao = 'perda', usuario_devolucao_id = (SELECT id FROM usuarios WHERE email = 'almoxarife2@soufer.com.br'), observacoes_devolucao = 'Equipamento não foi localizado após o turno, colaborador relatou extravio'
WHERE ferramenta_id = (SELECT id FROM ferramentas WHERE nome = 'Multímetro Digital Minipa ET-2042C') AND data_devolucao IS NULL;

\endif
