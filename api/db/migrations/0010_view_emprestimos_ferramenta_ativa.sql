-- 0010: expõe se a ferramenta do empréstimo ainda está ativa.
--
-- Como o código de identificação de uma ferramenta baixada é reaproveitado
-- (fn_gera_codigo_identificacao só considera as ativas), o histórico pode
-- mostrar o mesmo código para duas ferramentas. O front usa ferramenta_ativa
-- para marcar a baixada. Coluna nova entra no fim da view (exigência do
-- CREATE OR REPLACE VIEW).
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
    cud.nome AS usuario_devolucao_nome,
    f.ativo AS ferramenta_ativa
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
