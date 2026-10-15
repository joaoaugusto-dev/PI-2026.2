-- Só para o banco de DEV (soufer_dev): espalha pelos últimos ~45 dias os empréstimos devolvidos
-- que o povoamento via API gravou todos em "hoje", para a tela de Análises mostrar evolução.
-- Seguro de rodar de novo (depois de movidos, os empréstimos deixam de ser "de hoje").
-- Não mexe em empréstimos abertos nem no que foi feito antes de hoje. Triggers só disparam na
-- passagem de data_devolucao nula -> preenchida, então o UPDATE abaixo não reabre ocorrência.
BEGIN;

CREATE TEMP TABLE _mover ON COMMIT DROP AS
SELECT id,
       data_retirada - (((id * 7) % 43) + 3) * INTERVAL '1 day' - ((id % 9) * INTERVAL '1 hour') AS nova_retirada,
       ((id * 37) % 70 + 2) * INTERVAL '1 hour' AS posse
FROM emprestimos
WHERE data_devolucao IS NOT NULL
  AND data_retirada >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

UPDATE ocorrencias o
SET created_at = m.nova_retirada + m.posse
FROM _mover m
WHERE o.emprestimo_id = m.id;

UPDATE emprestimos e
SET data_retirada      = m.nova_retirada,
    created_at         = m.nova_retirada,
    previsao_devolucao = m.nova_retirada + INTERVAL '3 days',
    data_devolucao     = m.nova_retirada + m.posse
FROM _mover m
WHERE e.id = m.id;

COMMIT;
