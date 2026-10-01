-- 0009: bloqueio temporário de login por conta (matrícula).
--
-- A senha tem só 6 dígitos e a matrícula não é secreta, então o limite por IP
-- (loginLimiter) não basta contra tentativas vindas de vários IPs. Cada senha
-- errada soma em tentativas_falhas; ao chegar no limite a conta fica bloqueada
-- até bloqueado_ate. Login certo ou nova senha (convite) zeram o contador.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS tentativas_falhas INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMP WITH TIME ZONE;
