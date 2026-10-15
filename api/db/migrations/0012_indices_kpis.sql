-- 0012: índices de apoio aos KPIs de gestão (issue #208, GET /v1/kpis/*).
--
-- Os KPIs de período filtram por data (de/ate) em três colunas. data_retirada já tem índice (0011); faltam
-- data_devolucao (tempo médio de posse, taxa de avaria e devoluções da evolução) e created_at das ocorrências
-- (avarias e perdas por categoria e ocorrências da evolução). O índice de data_devolucao é parcial: empréstimos
-- abertos (data_devolucao nula) nunca entram nessas consultas, e o índice fica menor.
CREATE INDEX IF NOT EXISTS idx_emprestimos_data_devolucao
ON emprestimos (data_devolucao)
WHERE data_devolucao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ocorrencias_created_at
ON ocorrencias (created_at);
