-- ============================================================================
-- SOUFER Tools - Migration 0003_colaboradores_identificacao.sql
-- API-09 (issue #45): coluna de autoria e busca por nome tolerante a
-- acento/erro de digitação em colaboradores.
--
-- Numerada 0003 (não 0002) porque a 0002_case_insensitive_unique_indexes.sql
-- já foi mergeada na main por outra issue (API-08) enquanto esta branch
-- estava em andamento. Essas mudanças viviam originalmente dentro de
-- 0001_init.sql, mas o runner de migrations passou a rastrear cada arquivo
-- aplicado numa tabela `schema_migrations` (ver scripts/migrate.ts) — editar
-- 0001 depois que ele já rodou em algum ambiente faria essas mudanças nunca
-- serem aplicadas lá, por isso viraram um arquivo novo.
-- ============================================================================

-- Quem cadastrou o colaborador (sempre vem do JWT — Regra 6 do CLAUDE.md).
-- Nullable porque os registros do seed e cadastros anteriores não têm autor.
ALTER TABLE colaboradores
    ADD COLUMN IF NOT EXISTS criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- unaccent() é STABLE, e índice de expressão exige função IMMUTABLE. O wrapper
-- fixa o dicionário para poder indexar (padrão recomendado para unaccent + GIN).
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Busca de colaborador por nome tolerante a acento e erro de digitação
-- (GET /v1/colaboradores/identificar). A query deve usar a mesma expressão:
-- f_unaccent(lower(nome)).
CREATE INDEX IF NOT EXISTS idx_colaboradores_nome_trgm
ON colaboradores USING gin (f_unaccent(lower(nome)) gin_trgm_ops);
