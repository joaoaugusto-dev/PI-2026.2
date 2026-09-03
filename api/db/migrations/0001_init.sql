-- ============================================================================
-- SOUFER Tools - Migration 0001_init.sql
-- Schema inicial completo: 13 tabelas, enums, triggers, views e índices
--
-- [REVISÃO 02/09/2026 — pós visita técnica de 31/08/2026]
-- Esta migration já nasce com as correções da visita técnica embutidas
-- (projeto ainda não tinha ido a produção com o schema anterior):
--   - "categorias" virou "grupos_ferramentas" (sem descricao) + novo nível
--     "subgrupos_ferramentas" (jogo de chaves — Regra 10/11 do CLAUDE.md).
--   - "ferramentas" perdeu codigo_patrimonio/patrimonio_legado (não existia
--     nenhum código físico prévio — "ponto zero") e ganhou
--     codigo_identificacao (numérico, 4 dígitos, reaproveitável), marca,
--     modelo, localizacao (além do setor), valor_aquisicao e eh_kit.
--   - Nova tabela "itens_kit" para o caso de jogo de ferramentas.
--   - "colaboradores" perdeu codigo_cracha e cargo — fluxo real usa só
--     matrícula (Regra 5). setor_id continua obrigatório porque o sistema
--     precisa "puxar nome e setor" ao digitar a matrícula (relatório da
--     visita, Seção 4).
--   - "emprestimos" ganhou item_kit_id (peça específica de um kit) e
--     atividade_observacao (campo livre complementar — Regra 12).
--   - Sem nenhuma dependência de Supabase — auth 100% própria (bcrypt + JWT).
-- ============================================================================

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tipos Enumerados (ENUMs)
DO $$ BEGIN
    CREATE TYPE papel_usuario AS ENUM ('almoxarife');
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

-- 3.2 Grupos de Ferramentas (era "categorias" — sem campo descricao)
CREATE TABLE IF NOT EXISTS grupos_ferramentas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.3 Subgrupos de Ferramentas (NOVO — nível 2, ex.: "Chaves de fenda" -> "Chave 3/8")
CREATE TABLE IF NOT EXISTS subgrupos_ferramentas (
    id SERIAL PRIMARY KEY,
    grupo_id INTEGER NOT NULL REFERENCES grupos_ferramentas(id) ON DELETE RESTRICT,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (grupo_id, nome)
);

-- 3.4 Atividades (catálogo rápido; campo livre complementar mora em emprestimos.atividade_observacao)
CREATE TABLE IF NOT EXISTS atividades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.5 Usuários (almoxarifes com acesso por senha — auth própria, sem Supabase)
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

-- 3.6 Colaboradores (funcionários que retiram ferramentas)
-- Simplificado 02/09: sem codigo_cracha nem cargo. setor_id continua
-- obrigatório porque o fluxo de retirada precisa "puxar nome e setor"
-- a partir da matrícula digitada (relatório da visita técnica).
CREATE TABLE IF NOT EXISTS colaboradores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    setor_id INTEGER NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.7 Ferramentas
-- codigo_identificacao substitui codigo_patrimonio: numérico de 4 dígitos
-- (1-9999), gerado automaticamente (trigger fn_gera_codigo_identificacao) e
-- reaproveitável quando a ferramenta é baixada (ativo = false) — por isso a
-- unicidade é um índice parcial "WHERE ativo = true", não um UNIQUE simples.
CREATE TABLE IF NOT EXISTS ferramentas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    codigo_identificacao SMALLINT CHECK (codigo_identificacao BETWEEN 1 AND 9999),
    grupo_id INTEGER NOT NULL REFERENCES grupos_ferramentas(id) ON DELETE RESTRICT,
    subgrupo_id INTEGER REFERENCES subgrupos_ferramentas(id) ON DELETE RESTRICT,
    setor_id INTEGER REFERENCES setores(id) ON DELETE RESTRICT,
    localizacao VARCHAR(150),
    status status_ferramenta NOT NULL DEFAULT 'disponivel',
    motivo_indisponivel motivo_indisponibilidade,
    eh_kit BOOLEAN NOT NULL DEFAULT FALSE,
    valor_aquisicao NUMERIC(10, 2),
    foto_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_subgrupo_pertence_grupo_check CHECK (TRUE) -- validado por trigger (subgrupo x grupo), ver fn_valida_subgrupo
);

-- Unicidade do código só entre ferramentas ativas (permite reaproveitar o
-- número de uma ferramenta baixada em um cadastro futuro).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ferramenta_codigo_ativo
ON ferramentas (codigo_identificacao)
WHERE ativo = TRUE;

-- 3.8 Itens de Kit (NOVO — peças individuais de um "jogo" cadastrado como
-- uma única ferramenta com eh_kit = true; ex.: kit "Jogo de chaves
-- combinadas" com os itens "3/8", "7/16", "1/2"...)
CREATE TABLE IF NOT EXISTS itens_kit (
    id SERIAL PRIMARY KEY,
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (ferramenta_id, nome)
);

-- 3.9 Empréstimos / Retiradas
CREATE TABLE IF NOT EXISTS emprestimos (
    id SERIAL PRIMARY KEY,
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id) ON DELETE RESTRICT,
    item_kit_id INTEGER REFERENCES itens_kit(id) ON DELETE RESTRICT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
    setor_destino_id INTEGER NOT NULL REFERENCES setores(id) ON DELETE RESTRICT,
    atividade_id INTEGER REFERENCES atividades(id) ON DELETE RESTRICT,
    atividade_observacao TEXT,
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

-- REGRA CRÍTICA (Regra 1/11 do CLAUDE.md): no máximo um empréstimo aberto por
-- combinação (ferramenta, item do kit). COALESCE trata "kit inteiro"
-- (item_kit_id nulo) como uma chave própria (0), então:
--   - ferramenta simples: só pode ter 1 aberto (item_kit_id sempre nulo).
--   - kit: cada peça individual pode estar aberta ao mesmo tempo que outras
--     peças diferentes, mas nunca duplicada, e o "kit inteiro" (nulo) só uma
--     vez. A exclusão cruzada entre "kit inteiro" x "peça avulsa" é feita
--     pela trigger fn_valida_kit_exclusividade logo abaixo, pois um índice
--     único não consegue expressar essa regra.
CREATE UNIQUE INDEX IF NOT EXISTS uq_emprestimo_aberto
ON emprestimos (ferramenta_id, COALESCE(item_kit_id, 0))
WHERE data_devolucao IS NULL;

-- 3.10 Ocorrências (Avarias, Perdas, Reparos)
CREATE TABLE IF NOT EXISTS ocorrencias (
    id SERIAL PRIMARY KEY,
    emprestimo_id INTEGER REFERENCES emprestimos(id) ON DELETE SET NULL,
    ferramenta_id INTEGER NOT NULL REFERENCES ferramentas(id) ON DELETE RESTRICT,
    item_kit_id INTEGER REFERENCES itens_kit(id) ON DELETE SET NULL,
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

-- 3.11 Notificações
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

-- 3.12 Feriados (Sincronizados via BrasilAPI)
CREATE TABLE IF NOT EXISTS feriados (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(50),
    ano INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3.13 Auditoria (Logs em JSONB)
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

-- 4.1 Geração automática do código de identificação (4 dígitos, reaproveitável)
-- Substitui fn_gera_codigo_patrimonio. Busca o menor número entre 1 e 9999
-- que não esteja em uso por nenhuma ferramenta ATIVA no momento.
CREATE OR REPLACE FUNCTION fn_gera_codigo_identificacao()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo SMALLINT;
BEGIN
    IF NEW.codigo_identificacao IS NULL THEN
        SELECT MIN(c) INTO v_codigo
        FROM generate_series(1, 9999) AS c
        WHERE NOT EXISTS (
            SELECT 1 FROM ferramentas f
            WHERE f.codigo_identificacao = c AND f.ativo = TRUE
        );

        IF v_codigo IS NULL THEN
            RAISE EXCEPTION 'Limite máximo de 9999 ferramentas ativas atingido — nenhum código de 4 dígitos disponível';
        END IF;

        NEW.codigo_identificacao := v_codigo;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gera_codigo_identificacao ON ferramentas;
CREATE TRIGGER trg_gera_codigo_identificacao
BEFORE INSERT ON ferramentas
FOR EACH ROW
EXECUTE FUNCTION fn_gera_codigo_identificacao();

-- 4.2 Validação de subgrupo pertencente ao grupo informado
CREATE OR REPLACE FUNCTION fn_valida_subgrupo()
RETURNS TRIGGER AS $$
DECLARE
    v_grupo_do_subgrupo INTEGER;
BEGIN
    IF NEW.subgrupo_id IS NOT NULL THEN
        SELECT grupo_id INTO v_grupo_do_subgrupo FROM subgrupos_ferramentas WHERE id = NEW.subgrupo_id;
        IF v_grupo_do_subgrupo IS NULL THEN
            RAISE EXCEPTION 'subgrupo_id % não existe', NEW.subgrupo_id;
        END IF;
        IF v_grupo_do_subgrupo <> NEW.grupo_id THEN
            RAISE EXCEPTION 'O subgrupo % não pertence ao grupo % informado', NEW.subgrupo_id, NEW.grupo_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_subgrupo ON ferramentas;
CREATE TRIGGER trg_valida_subgrupo
BEFORE INSERT OR UPDATE ON ferramentas
FOR EACH ROW
EXECUTE FUNCTION fn_valida_subgrupo();

-- 4.3 Validação de item de kit (só pode existir se a ferramenta for um kit)
CREATE OR REPLACE FUNCTION fn_valida_item_kit()
RETURNS TRIGGER AS $$
DECLARE
    v_eh_kit BOOLEAN;
BEGIN
    SELECT eh_kit INTO v_eh_kit FROM ferramentas WHERE id = NEW.ferramenta_id;
    IF v_eh_kit IS NOT TRUE THEN
        RAISE EXCEPTION 'Só é possível cadastrar itens em ferramentas marcadas como eh_kit = true (ferramenta %)', NEW.ferramenta_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_item_kit ON itens_kit;
CREATE TRIGGER trg_valida_item_kit
BEFORE INSERT ON itens_kit
FOR EACH ROW
EXECUTE FUNCTION fn_valida_item_kit();

-- 4.4 Validação de Retirada (impede retirada de ferramenta simples indisponível)
CREATE OR REPLACE FUNCTION fn_valida_retirada()
RETURNS TRIGGER AS $$
DECLARE
    v_status status_ferramenta;
    v_eh_kit BOOLEAN;
BEGIN
    SELECT status, eh_kit INTO v_status, v_eh_kit FROM ferramentas WHERE id = NEW.ferramenta_id;

    -- Para ferramentas simples (não-kit), o status precisa estar 'disponivel'.
    -- Para kits, a disponibilidade é controlada peça a peça pela trigger
    -- fn_valida_kit_exclusividade, não pelo status geral do kit.
    IF v_eh_kit IS NOT TRUE AND v_status <> 'disponivel' THEN
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

-- 4.5 Exclusividade de kit (Regra 11 do CLAUDE.md)
-- Não pode existir um empréstimo do kit inteiro enquanto qualquer peça
-- individual estiver aberta, nem uma peça individual aberta enquanto o kit
-- inteiro estiver emprestado. Também valida que item_kit_id pertence à
-- ferramenta informada e que só é usado quando eh_kit = true.
CREATE OR REPLACE FUNCTION fn_valida_kit_exclusividade()
RETURNS TRIGGER AS $$
DECLARE
    v_eh_kit BOOLEAN;
    v_conflito INTEGER;
    v_item_pertence INTEGER;
BEGIN
    SELECT eh_kit INTO v_eh_kit FROM ferramentas WHERE id = NEW.ferramenta_id;

    IF v_eh_kit IS TRUE THEN
        IF NEW.item_kit_id IS NULL THEN
            -- Empréstimo do kit inteiro: não pode haver NENHUMA peça aberta.
            SELECT COUNT(*) INTO v_conflito
            FROM emprestimos
            WHERE ferramenta_id = NEW.ferramenta_id
              AND data_devolucao IS NULL
              AND item_kit_id IS NOT NULL;
            IF v_conflito > 0 THEN
                RAISE EXCEPTION 'Não é possível emprestar o kit inteiro: há % peça(s) individual(is) já emprestada(s)', v_conflito;
            END IF;
        ELSE
            -- Empréstimo de peça avulsa: item precisa pertencer ao kit informado.
            SELECT COUNT(*) INTO v_item_pertence
            FROM itens_kit WHERE id = NEW.item_kit_id AND ferramenta_id = NEW.ferramenta_id;
            IF v_item_pertence = 0 THEN
                RAISE EXCEPTION 'item_kit_id % não pertence à ferramenta %', NEW.item_kit_id, NEW.ferramenta_id;
            END IF;

            -- ...e o kit inteiro não pode estar emprestado.
            SELECT COUNT(*) INTO v_conflito
            FROM emprestimos
            WHERE ferramenta_id = NEW.ferramenta_id
              AND data_devolucao IS NULL
              AND item_kit_id IS NULL;
            IF v_conflito > 0 THEN
                RAISE EXCEPTION 'Não é possível emprestar esta peça: o kit inteiro já está emprestado';
            END IF;
        END IF;
    ELSE
        IF NEW.item_kit_id IS NOT NULL THEN
            RAISE EXCEPTION 'item_kit_id só pode ser informado quando a ferramenta é um kit (eh_kit = true)';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_valida_kit_exclusividade ON emprestimos;
CREATE TRIGGER trg_valida_kit_exclusividade
BEFORE INSERT ON emprestimos
FOR EACH ROW
EXECUTE FUNCTION fn_valida_kit_exclusividade();

-- 4.6 Sincronização de Status da Ferramenta
-- Para kits, só sincroniza o status geral quando o KIT INTEIRO é
-- emprestado/devolvido (item_kit_id nulo) — emprestar uma peça avulsa não
-- muda o status do container, já que o restante do kit continua disponível.
CREATE OR REPLACE FUNCTION fn_sync_status_ferramenta()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.data_devolucao IS NULL AND NEW.item_kit_id IS NULL THEN
        UPDATE ferramentas
        SET status = 'em_uso', motivo_indisponivel = NULL, updated_at = NOW()
        WHERE id = NEW.ferramenta_id;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.data_devolucao IS NULL AND NEW.data_devolucao IS NOT NULL AND NEW.item_kit_id IS NULL THEN
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

-- 4.7 Abertura Automática de Ocorrência na Devolução com Avaria ou Perda
CREATE OR REPLACE FUNCTION fn_abre_ocorrencia()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.data_devolucao IS NULL AND NEW.data_devolucao IS NOT NULL THEN
        IF NEW.condicao_devolucao IN ('avaria', 'perda') THEN
            INSERT INTO ocorrencias (
                emprestimo_id,
                ferramenta_id,
                item_kit_id,
                colaborador_id,
                tipo,
                descricao,
                status,
                registrada_por,
                created_at
            ) VALUES (
                NEW.id,
                NEW.ferramenta_id,
                NEW.item_kit_id,
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
    f.codigo_identificacao,
    f.eh_kit,
    ik.id AS item_kit_id,
    ik.nome AS item_kit_nome,
    c.id AS colaborador_id,
    c.nome AS colaborador_nome,
    c.matricula AS colaborador_matricula,
    s.id AS setor_id,
    s.nome AS setor_nome,
    a.id AS atividade_id,
    a.nome AS atividade_nome,
    e.atividade_observacao,
    ur.nome AS usuario_retirada_nome,
    ud.nome AS usuario_devolucao_nome
FROM emprestimos e
JOIN ferramentas f ON f.id = e.ferramenta_id
LEFT JOIN itens_kit ik ON ik.id = e.item_kit_id
JOIN colaboradores c ON c.id = e.colaborador_id
JOIN setores s ON s.id = e.setor_destino_id
LEFT JOIN atividades a ON a.id = e.atividade_id
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
