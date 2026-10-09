import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { getClient, pool } from '../src/config/database.js';
import { AuthService } from '../src/services/authService.js';

/**
 * Primeiro admin de um banco novo (produção), sem senha padrão: cria (ou promove) a conta admin da
 * matrícula informada com uma senha aleatória que ninguém conhece e imprime o link de convite — a
 * pessoa abre o link, define o próprio PIN e já entra. Substitui o `db:seed` em produção.
 *
 *   npm run db:admin -- <matricula> "<nome completo>" "<setor>"
 */
async function main() {
  const [matricula, nome, setor] = process.argv.slice(2);
  if (!/^\d{4}$/.test(matricula ?? '') || matricula === '0000' || !nome?.trim() || !setor?.trim()) {
    console.error('Uso: npm run db:admin -- <matrícula de 4 dígitos> "<nome completo>" "<setor>"');
    process.exitCode = 1;
    return;
  }

  const client = await getClient();
  let colaboradorId: number;
  let usuarioId: number;
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO setores (nome) VALUES ($1) ON CONFLICT (LOWER(nome)) DO NOTHING', [setor.trim()]);
    const setorId = (await client.query<{ id: number }>('SELECT id FROM setores WHERE LOWER(nome) = LOWER($1)', [setor.trim()])).rows[0].id;
    // matrícula que já existe mantém o cadastro (nome e setor) e só ganha a conta de admin
    colaboradorId = (
      await client.query<{ id: number }>(
        `INSERT INTO colaboradores (nome, matricula, setor_id) VALUES ($1, $2, $3)
         ON CONFLICT (matricula) DO UPDATE SET ativo = true, updated_at = NOW()
         RETURNING id`,
        [nome.trim(), matricula, setorId]
      )
    ).rows[0].id;
    const senhaInutilizavel = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    usuarioId = (
      await client.query<{ id: number }>(
        `INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo) VALUES ($1, $2, 'admin', true)
         ON CONFLICT (colaborador_id) DO UPDATE SET papel = 'admin', ativo = true, updated_at = NOW()
         RETURNING id`,
        [colaboradorId, senhaInutilizavel]
      )
    ).rows[0].id;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const convite = await AuthService.criarConvite(colaboradorId, usuarioId);
  const front = env.corsOrigin.split(',')[0].trim();
  const base = front && front !== '*' ? front : '<endereço do front>';
  console.log(`✅ Admin ${convite.colaborador.nome} (matrícula ${convite.colaborador.matricula}) pronto.`);
  console.log(`🔗 Link para definir a senha (vale 7 dias, uso único):\n   ${base}/c/${convite.token}`);
}

main()
  .catch((error) => {
    console.error('❌ Falha ao criar o admin:', error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
