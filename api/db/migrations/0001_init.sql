-- ============================================================================
-- SOUFER Tools - Migration 0001_init.sql
-- Schema inicial completo com 11 tabelas, enums, triggers, views e índices
-- ============================================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tipos Enumerados (ENUMs)
DO $$ BEGIN
    CREATE TYPE papel_usuario AS ENUM ('almoxarife', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_ferramenta AS ENUM ('disponivel', 'em_uso', 'indisponivel');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE motivo_indisponibilidade AS ENUM ('avaria', 'perda', 'manutencao_preventiva', 'baixada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE condicao_devolucao AS ENUM ('ok', 'avaria', 'perda');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_ocorrencia AS ENUM ('aberta', 'em_reparo', 'cobrada', 'resolvida', 'baixada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_notificacao AS ENUM ('devolucao_hoje', 'atraso', 'ocorrencia_pendente', 'sistema');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabelas Principais

-- 3.1 Setores
CREATE TABLE IF NOT EXISTS setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.2 Categorias de Ferramentas
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.3 Atividades
CREATE TABLE IF NOT EXISTS atividades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.4 Usuários (Almoxarifes e Administradores com acesso por senha)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    papel papel_usuario NOT NULL DEFAULT 'almoxarife',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.5 Colaboradores (Funcionários que retiram ferramentas)
CREATE TABLE IF NOT EXISTS colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    codigo_cracha VARCHAR(50) UNIQUE,
    setor_id INTEGER REFERENCES setores(id) ON DELETE RESTRICT,
    cargo VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.6 Ferramentas
CREATE TABLE IF NOT EXISTS ferramentas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    codigo_patrimonio VARCHAR(20) UNIQUE,
    patrimonio_legado VARCHAR(50),
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    setor_id INTEGER REFERENCES setores(id) ON DELETE RESTRICT,
    status status_ferramenta NOT NULL DEFAULT 'disponivel',
    motivo_indisponivel motivo_indisponibilidade,
    localizacao_padrao VARCHAR(100),
    foto_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.7 Empréstimos / Retiradas
CREATE TABLE IF NOT EXISTS emprestimos (
    id SERIAL PRIMARY KEY,
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id) ON DELETE RESTRICT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
    setor_destino_id INTEGER NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    atividade_id INTEGER NOT NULL REFERENCES atividades(id) ON DELETE RESTRICT,
    usuario_retirada_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    usuario_devolucao_id INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_retirada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    previsao_devolucao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_devolucao TIMESTAMP WITH TIME ZONE,
    condicao_devolucao condicao_devolucao,
    observacoes_retirada TEXT,
    observacoes_devolucao TEXT,
    ordem_servico VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- REGRA CRÍTICA: Uma ferramenta pode ter apenas UM empréstimo aberto (sem data_devolucao)
CREATE UNIQUE INDEX IF NOT EXISTS uq_emprestimo_aberto 
ON emprestimos (ferramenta_id) 
WHERE data_devolucao IS NULL;

-- 3.8 Ocorrências (Avarias, Perdas, Reparos)
CREATE TABLE IF NOT EXISTS ocorrencias (
    id SERIAL PRIMARY KEY,
    emprestimo_id INTEGER REFERENCES emprestimos(id) ON DELETE SET NULL,
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id) ON DELETE RESTRICT,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE RESTRICT,
    tipo VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    status status_ocorrencia NOT NULL DEFAULT 'aberta',
    custo_estimado NUMERIC(10, 2),
    custo_real NUMERIC(10, 2),
    data_resolucao TIMESTAMP WITH TIME ZONE,
    observacoes_resolucao TEXT,
    registrada_por INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    resolvida_por INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.9 Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo tipo_notificacao NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.10 Feriados (Sincronizados via BrasilAPI)
CREATE TABLE IF NOT EXISTS feriados (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50),
    ano INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.11 Auditoria (Logs em JSONB)
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    tabela VARCHAR(50) NOT NULL,
    operacao VARCHAR(20) NOT NULL,
    registro_id INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_origem VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Funções e Triggers de Negócio

-- 4.1 Geração Automática de Código de Patrimônio (SF + 6 dígitos)
CREATE OR REPLACE FUNCTION fn_gera_codigo_patrimonio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_patrimonio IS NULL OR NEW.codigo_patrimonio = '' THEN
        NEW.codigo_patrimonio := 'SF' || LPAD(NEW.id::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gera_codigo_patrimonio ON ferramentas;
CREATE TRIGGER trg_gera_codigo_patrimonio
BEFORE INSERT ON ferramentas
FOR EACH ROW
EXECUTE FUNCTION fn_gera_codigo_patrimonio();

-- 4.2 Validação de Retirada (Impede retirada de ferramenta não disponível)
CREATE OR REPLACE FUNCTION fn_valida_retirada()
RETURNS TRIGGER AS $$
DECLARE
    v_status status_ferramenta;
BEGIN
    SELECT status INTO v_status FROM ferramentas WHERE id = NEW.ferramenta_id;
    
    IF v_status <> 'disponivel' THEN
        RAISE EXCEPTION 'Ferramenta % não está disponível para empréstimo (status atual: %)', NEW.ferramenta_id, v_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_retirada ON emprestimos;
CREATE TRIGGER trg_valida_retirada
BEFORE INSERT ON emprestimos
FOR EACH ROW
EXECUTE FUNCTION fn_valida_retirada();

-- 4.3 Sincronização de Status da Ferramenta
CREATE OR REPLACE FUNCTION fn_sync_status_ferramenta()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for nova retirada: passa status para 'em_uso'
    IF TG_OP = 'INSERT' AND NEW.data_devolucao IS NULL THEN
        UPDATE ferramentas 
        SET status = 'em_uso', motivo_indisponivel = NULL, updated_at = NOW() 
        WHERE id = NEW.ferramenta_id;
    END IF;

    -- Se for devolução: sincroniza conforme a condição
    IF TG_OP = 'UPDATE' AND OLD.data_devolucao IS NULL AND NEW.data_devolucao IS NOT NULL THEN
        IF NEW.condicao_devolucao = 'ok' THEN
            UPDATE ferramentas 
            SET status = 'disponivel', motivo_indisponivel = NULL, updated_at = NOW() 
            WHERE id = NEW.ferramenta_id;
        ELSIF NEW.condicao_devolucao = 'avaria' THEN
            UPDATE ferramentas 
            SET status = 'indisponivel', motivo_indisponivel = 'avaria', updated_at = NOW() 
            WHERE id = NEW.ferramenta_id;
        ELSIF NEW.condicao_devolucao = 'perda' THEN
            UPDATE ferramentas 
            SET status = 'indisponivel', motivo_indisponivel = 'perda', updated_at = NOW() 
            WHERE id = NEW.ferramenta_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_status_ferramenta ON emprestimos;
CREATE TRIGGER trg_sync_status_ferramenta
AFTER INSERT OR UPDATE ON emprestimos
FOR EACH ROW
EXECUTE FUNCTION fn_sync_status_ferramenta();

-- 4.4 Abertura Automática de Ocorrência na Devolução com Avaria ou Perda
CREATE OR REPLACE FUNCTION fn_abre_ocorrencia()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.data_devolucao IS NULL AND NEW.data_devolucao IS NOT NULL THEN
        IF NEW.condicao_devolucao IN ('avaria', 'perda') THEN
            INSERT INTO ocorrencias (
                emprestimo_id,
                ferramenta_id,
                colaborador_id,
                tipo,
                descricao,
                status,
                registrada_por,
                created_at
            ) VALUES (
                NEW.id,
                NEW.ferramenta_id,
                NEW.colaborador_id,
                UPPER(NEW.condicao_devolucao::TEXT),
                COALESCE(NEW.observacoes_devolucao, 'Ocorrência registrada automaticamente na devolução com condição: ' || NEW.condicao_devolucao::TEXT),
                'aberta',
                NEW.usuario_devolucao_id,
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_abre_ocorrencia ON emprestimos;
CREATE TRIGGER trg_abre_ocorrencia
AFTER UPDATE ON emprestimos
FOR EACH ROW
EXECUTE FUNCTION fn_abre_ocorrencia();

-- 5. Views de Consulta

-- 5.1 Detalhes de Empréstimos
CREATE OR REPLACE VIEW vw_emprestimos_detalhe AS
SELECT 
    e.id,
    e.data_retirada,
    e.previsao_devolucao,
    e.data_devolucao,
    e.condicao_devolucao,
    e.ordem_servico,
    e.observacoes_retirada,
    e.observacoes_devolucao,
    CASE 
        WHEN e.data_devolucao IS NOT NULL THEN 'devolvido'
        WHEN NOW() > e.previsao_devolucao THEN 'atrasado'
        ELSE 'em_aberto'
    END AS situacao,
    f.id AS ferramenta_id,
    f.nome AS ferramenta_nome,
    f.codigo_patrimonio,
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.matricula AS colaborador_matricula,
    s.id AS setor_id,
    s.nome AS setor_nome,
    a.id AS atividade_id,
    a.nome AS atividade_nome,
    ur.nome AS usuario_retirada_nome,
    ud.nome AS usuario_devolucao_nome
FROM emprestimos e
JOIN ferramentas f ON f.id = e.ferramenta_id
JOIN colaboradores c ON c.id = e.colaborador_id
JOIN setores s ON s.id = e.setor_destino_id
JOIN atividades a ON a.id = e.atividade_id
JOIN usuarios ur ON ur.id = e.usuario_retirada_id
LEFT JOIN usuarios ud ON ud.id = e.usuario_devolucao_id;

-- 5.2 KPIs do Dashboard
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT 
    (SELECT COUNT(*) FROM ferramentas WHERE ativo = TRUE) AS total_cadastradas,
    (SELECT COUNT(*) FROM ferramentas WHERE status = 'disponivel' AND ativo = TRUE) AS total_disponiveis,
    (SELECT COUNT(*) FROM ferramentas WHERE status = 'em_uso' AND ativo = TRUE) AS total_em_uso,
    (SELECT COUNT(*) FROM ferramentas WHERE status = 'indisponivel' AND ativo = TRUE) AS total_indisponiveis,
    (SELECT COUNT(*) FROM emprestimos WHERE data_devolucao IS NULL AND NOW() > previsao_devolucao) AS total_atrasadas,
    (SELECT COUNT(*) FROM ocorrencias WHERE status = 'aberta') AS ocorrencias_abertas;

-- 5.3 Ocorrências Agrupadas por Colaborador
CREATE OR REPLACE VIEW vw_ocorrencias_por_colaborador AS
SELECT 
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.matricula,
    s.nome AS setor_nome,
    COUNT(o.id) AS total_ocorrencias,
    COUNT(CASE WHEN o.tipo = 'AVARIA' THEN 1 END) AS total_avarias,
    COUNT(CASE WHEN o.tipo = 'PERDA' THEN 1 END) AS total_perdas,
    COALESCE(SUM(o.custo_real), SUM(o.custo_estimado), 0) AS custo_total
FROM colaboradores c
LEFT JOIN ocorrencias o ON o.colaborador_id = c.id
LEFT JOIN setores s ON s.id = c.setor_id
GROUP BY c.id, c.nome, c.matricula, s.nome;
