import { sincronizarFeriados } from '../src/services/feriadoService.js';
import { pool } from '../src/config/database.js';

async function main() {
  const args = process.argv.slice(2);
  const anosParaSincronizar = args.length > 0
    ? args.map((arg) => parseInt(arg, 10)).filter((ano) => !Number.isNaN(ano))
    : [2026, 2027];

  console.log('📅 Sincronizando feriados nacionais (BrasilAPI)...');
  console.log(`📋 Anos selecionados: ${anosParaSincronizar.join(', ')}\n`);

  let totalSincronizados = 0;

  for (const ano of anosParaSincronizar) {
    try {
      console.log(`⏳ Sincronizando ano ${ano}...`);
      const feriados = await sincronizarFeriados(ano);
      console.log(`✅ Ano ${ano}: ${feriados.length} feriados inseridos/atualizados com sucesso!`);
      totalSincronizados += feriados.length;
    } catch (error: any) {
      console.error(`❌ Erro ao sincronizar ano ${ano}:`, error?.message || error);
    }
  }

  console.log(`\n🎉 Processo finalizado! Total de ${totalSincronizados} registros sincronizados na tabela 'feriados'.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error('❌ Falha fatal no script de sincronização:', error);
  await pool.end();
  process.exit(1);
});
