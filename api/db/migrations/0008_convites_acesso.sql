-- 0008: convites de acesso (substitui o auto-cadastro com aprovação).
--
-- O admin cadastra o colaborador (que já é o funcionário) e gera um link de
-- convite; quem recebe define a própria senha e entra já logado. O banco guarda
-- só o hash (SHA-256) do token: o link em si aparece uma única vez, na resposta
-- que o gera, e um vazamento da tabela não entrega links utilizáveis.
CREATE TABLE IF NOT EXISTS convites_acesso (
    id SERIAL PRIMARY KEY,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
    usado_em TIMESTAMP WITH TIME ZONE,
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_convites_acesso_colaborador ON convites_acesso (colaborador_id);
