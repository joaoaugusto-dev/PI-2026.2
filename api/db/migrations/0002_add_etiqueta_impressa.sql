-- Migration 0002: Garante existência do campo etiqueta_impressa_em na tabela ferramentas
ALTER TABLE ferramentas ADD COLUMN IF NOT EXISTS etiqueta_impressa_em TIMESTAMP WITH TIME ZONE;
