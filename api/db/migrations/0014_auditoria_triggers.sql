-- 0014: auditoria automática em jsonb (DATA-05).
-- Toda alteração real em ferramentas, emprestimos e ocorrencias grava uma linha em `auditoria`, sem depender
-- de o código da API lembrar de gravar. As linhas manuais que o authService e o ferramentaService já fazem
-- (login, convite, 'disponibilizar') continuam: têm semântica de negócio e `operacao` própria.
--
-- Quem escreveu: a API chama set_config('app.usuario_id', <id do JWT>, true) logo depois do BEGIN
-- (definirUsuarioAuditoria em config/database.ts). Sem isso, usuario_id fica nulo (scripts, psql).
-- `usuarios` fica de fora de propósito: tem senha_hash.

-- Consulta por entidade ("histórico deste registro") e por período.
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_registro ON auditoria (tabela, registro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria (created_at DESC);

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario INTEGER := NULLIF(current_setting('app.usuario_id', true), '')::INTEGER;
    v_ip      TEXT    := NULLIF(current_setting('app.ip_origem', true), '');
    v_antes   JSONB;
    v_depois  JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO auditoria (tabela, operacao, registro_id, dados_anteriores, dados_novos, usuario_id, ip_origem)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, NULL, to_jsonb(NEW), v_usuario, v_ip);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Só as colunas que mudaram; updated_at sozinho não é alteração (trigger e API o atualizam sempre).
        SELECT jsonb_object_agg(o.key, o.value), jsonb_object_agg(n.key, n.value)
          INTO v_antes, v_depois
          FROM jsonb_each(to_jsonb(OLD)) o
          JOIN jsonb_each(to_jsonb(NEW)) n ON n.key = o.key
         WHERE o.value IS DISTINCT FROM n.value AND o.key <> 'updated_at';

        IF v_depois IS NULL THEN
            RETURN NEW;
        END IF;

        INSERT INTO auditoria (tabela, operacao, registro_id, dados_anteriores, dados_novos, usuario_id, ip_origem)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_antes, v_depois, v_usuario, v_ip);
        RETURN NEW;
    ELSE
        INSERT INTO auditoria (tabela, operacao, registro_id, dados_anteriores, dados_novos, usuario_id, ip_origem)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD), NULL, v_usuario, v_ip);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditoria_ferramentas ON ferramentas;
CREATE TRIGGER trg_auditoria_ferramentas
AFTER INSERT OR UPDATE OR DELETE ON ferramentas
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_emprestimos ON emprestimos;
CREATE TRIGGER trg_auditoria_emprestimos
AFTER INSERT OR UPDATE OR DELETE ON emprestimos
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

DROP TRIGGER IF EXISTS trg_auditoria_ocorrencias ON ocorrencias;
CREATE TRIGGER trg_auditoria_ocorrencias
AFTER INSERT OR UPDATE OR DELETE ON ocorrencias
FOR EACH ROW EXECUTE FUNCTION fn_auditoria();
