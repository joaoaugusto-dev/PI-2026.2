-- ============================================================================
-- SOUFER Tools - Migration 0002_case_insensitive_unique_indexes.sql
-- Índices únicos funcionais case-insensitive para entidades auxiliares
--
-- Substitui constraints de unicidade case-sensitive por índices UNIQUE em LOWER(nome)
-- para garantir integridade sob concorrência e permitir remoção de SELECTs prévios.
-- ============================================================================

-- 1. Setores
ALTER TABLE setores DROP CONSTRAINT IF EXISTS setores_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_setores_nome_lower ON setores (LOWER(nome));

-- 2. Grupos de Ferramentas (Categorias)
ALTER TABLE grupos_ferramentas DROP CONSTRAINT IF EXISTS grupos_ferramentas_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_grupos_ferramentas_nome_lower ON grupos_ferramentas (LOWER(nome));

-- 3. Subgrupos de Ferramentas
ALTER TABLE subgrupos_ferramentas DROP CONSTRAINT IF EXISTS subgrupos_ferramentas_grupo_id_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_subgrupos_ferramentas_grupo_nome_lower ON subgrupos_ferramentas (grupo_id, LOWER(nome));

-- 4. Atividades
ALTER TABLE atividades DROP CONSTRAINT IF EXISTS atividades_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_atividades_nome_lower ON atividades (LOWER(nome));
