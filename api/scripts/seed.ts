import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool, getClient } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('🌱 Populando banco com dados de teste...');

  const seedPath = path.resolve(__dirname, '../db/seed.sql');
  let sql = fs.readFileSync(seedPath, 'utf8');

  // Gera hash bcrypt real para a senha padrão '123456'
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash('123456', salt);

  // Substitui os hashes de placeholder pelo hash real
  sql = sql.replace(/\$2a\$10\$tZ9v2R2FfO6lE8u5e9\.X9uVv9\.Gf5fO8x6V6qE9e9\.Gf5fO8x6V6q/g, senhaHash);

  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Seed executado com sucesso!');
    console.log('🔑 Credenciais de teste:');
    console.log('   - Almoxarife: almoxarife@soufer.com.br / Senha: 123456');
    console.log('   - Admin:      admin@soufer.com.br / Senha: 123456');
    console.log('   - Consulta:   Matrícula "MAT001" ou Crachá "CRACH001"');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao executar seed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
