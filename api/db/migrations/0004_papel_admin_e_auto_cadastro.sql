-- ============================================================================
-- SOUFER Tools - Migration 0004_papel_admin_e_auto_cadastro.sql
-- Login por matrícula (issue API-150) + suporte a auto-cadastro de usuário da manutenção
-- com aprovação (issue API-149)
--
-- - Novo valor 'admin' no enum papel_usuario: só um admin pode ativar um
--   cadastro pendente (decisão do time, reunião de 22/09/2026 — substitui a
--   opção "qualquer usuário ativo da manutenção aprova" cogitada na issue original).
-- - Login por matrícula: e-mail não existe no ambiente fabril. A matrícula é a
--   identidade da pessoa e vive só em colaboradores (uma pessoa, uma matrícula);
--   usuarios vira a conta de acesso dessa pessoa, ligada por colaborador_id, e
--   deixa de ter e-mail e matrícula própria.
-- - Regra de matrícula: exatamente 4 dígitos numéricos, de 0001 a 9999,
--   garantida por CHECK no banco e não só na API; colaboradores.matricula
--   passa de VARCHAR(50) para VARCHAR(4).
-- - Os dois usuários da manutenção do seed viram colaboradores 0001 e 0002 (setor
--   "Manutenção Geral"); os colaboradores MAT001..MATnnn do seed antigo são
--   renumerados com +2 para abrir espaço (MAT001 -> 0003).
-- ============================================================================

ALTER TYPE papel_usuario ADD VALUE IF NOT EXISTS 'admin';

-- O perfil operacional é a manutenção (quem disponibiliza as ferramentas), não o
-- almoxarifado: renomeia o valor legado 'almoxarife' criado na 0001_init.sql.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'papel_usuario' AND e.enumlabel = 'almoxarife'
    ) THEN
        ALTER TYPE papel_usuario RENAME VALUE 'almoxarife' TO 'manutencao';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. usuarios.colaborador_id (preenchido nos passos seguintes)
-- ----------------------------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS colaborador_id INTEGER;

-- ----------------------------------------------------------------------------
-- 2. colaboradores: converte o formato antigo do seed (MAT001) para 4 dígitos,
--    deslocando +2 para que 0001 e 0002 fiquem livres para a manutenção.
-- ----------------------------------------------------------------------------
UPDATE colaboradores
SET matricula = LPAD((SUBSTRING(matricula FROM '^MAT([0-9]{1,4})$')::INT + 2)::TEXT, 4, '0')
WHERE matricula ~ '^MAT[0-9]{1,4}$';

-- ----------------------------------------------------------------------------
-- 3. Cada usuário existente vira (ou aponta para) um colaborador. Só os dois
--    usuários do seed têm matrícula conhecida; qualquer outro aborta a migration.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_setor_id INTEGER;
    v_usuario RECORD;
    v_matricula TEXT;
BEGIN
    SELECT id INTO v_setor_id FROM setores WHERE LOWER(nome) = 'manutenção geral';

    FOR v_usuario IN SELECT id, nome, email FROM usuarios WHERE colaborador_id IS NULL ORDER BY id LOOP
        v_matricula := CASE v_usuario.email
            WHEN 'almoxarife@soufer.com.br' THEN '0001'
            WHEN 'almoxarife2@soufer.com.br' THEN '0002'
        END;

        IF v_matricula IS NULL THEN
            RAISE EXCEPTION 'usuário % (%) sem matrícula definida. Cadastre-o como colaborador (matrícula de 4 dígitos) e preencha usuarios.colaborador_id antes de migrar.', v_usuario.id, v_usuario.email;
        END IF;
        IF v_setor_id IS NULL THEN
            RAISE EXCEPTION 'setor "Manutenção Geral" não encontrado: necessário para cadastrar o colaborador %.', v_matricula;
        END IF;
        IF EXISTS (SELECT 1 FROM colaboradores WHERE matricula = v_matricula) THEN
            RAISE EXCEPTION 'matrícula % já pertence a outro colaborador. Resolva o conflito antes de migrar.', v_matricula;
        END IF;

        INSERT INTO colaboradores (nome, matricula, setor_id) VALUES (v_usuario.nome, v_matricula, v_setor_id);
        UPDATE usuarios SET colaborador_id = (SELECT id FROM colaboradores WHERE matricula = v_matricula) WHERE id = v_usuario.id;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Regra de matrícula em colaboradores. Valores fora do padrão abortam a
--    migration em vez de ficar fora da regra.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    invalidas TEXT;
BEGIN
    SELECT string_agg(matricula, ', ') INTO invalidas
    FROM colaboradores
    WHERE matricula !~ '^(?!0000)[0-9]{4}$';

    IF invalidas IS NOT NULL THEN
        RAISE EXCEPTION 'colaboradores com matrícula fora do padrão de 4 dígitos (0001-9999): %. Corrija manualmente antes de migrar.', invalidas;
    END IF;
END $$;

ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS chk_colaboradores_matricula_formato;
ALTER TABLE colaboradores
    ADD CONSTRAINT chk_colaboradores_matricula_formato CHECK (matricula ~ '^(?!0000)[0-9]{4}$');

-- A matrícula tem exatamente 4 caracteres: o tipo passa a dizer isso (era
-- VARCHAR(50), herança do formato livre "MAT001"). O Postgres não altera o tipo
-- de coluna usada por view, então as duas views que a leem são recriadas
-- (vw_emprestimos_detalhe logo adiante, no passo 5).
DROP VIEW IF EXISTS vw_emprestimos_detalhe;
DROP VIEW IF EXISTS vw_ocorrencias_por_colaborador;
ALTER TABLE colaboradores ALTER COLUMN matricula TYPE VARCHAR(4);

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

-- ----------------------------------------------------------------------------
-- 5. usuarios: liga a conta ao colaborador, remove e-mail e nome.
--    O nome da pessoa vive só em colaboradores; a view de empréstimos passa a
--    lê-lo por lá (mesmas colunas de saída) antes de usuarios.nome ser removida.
-- ----------------------------------------------------------------------------
ALTER TABLE usuarios ALTER COLUMN colaborador_id SET NOT NULL;
ALTER TABLE usuarios
    ADD CONSTRAINT uq_usuarios_colaborador UNIQUE (colaborador_id),
    ADD CONSTRAINT fk_usuarios_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT;

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
    cur.nome AS usuario_retirada_nome,
    cud.nome AS usuario_devolucao_nome
FROM emprestimos e
JOIN ferramentas f ON f.id = e.ferramenta_id
LEFT JOIN itens_kit ik ON ik.id = e.item_kit_id
JOIN colaboradores c ON c.id = e.colaborador_id
JOIN setores s ON s.id = e.setor_destino_id
LEFT JOIN atividades a ON a.id = e.atividade_id
JOIN usuarios ur ON ur.id = e.usuario_retirada_id
JOIN colaboradores cur ON cur.id = ur.colaborador_id
LEFT JOIN usuarios ud ON ud.id = e.usuario_devolucao_id
LEFT JOIN colaboradores cud ON cud.id = ud.colaborador_id;

-- Remover as colunas leva junto usuarios_email_key e os índices sobre e-mail.
ALTER TABLE usuarios DROP COLUMN email;
ALTER TABLE usuarios DROP COLUMN nome;
