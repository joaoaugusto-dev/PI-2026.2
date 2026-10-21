import { env } from '../src/config/env.js';
import { pool } from '../src/config/database.js';
import { codigoDeSaida, executarVerificacoes, ResultadoVerificacao } from '../src/services/dataCheckService.js';

/**
 * npm run data:check [-- --json] [-- --so-erros]
 *   --json      imprime só o JSON dos resultados (para CI)
 *   --so-erros  não lista as verificações que passaram
 * Saída 0 = nenhum erro (avisos não reprovam); 1 = há erro; 2 = não foi possível rodar.
 */

const args = new Set(process.argv.slice(2));
const modoJson = args.has('--json');
const soErros = args.has('--so-erros');

const ICONE = { ok: '✅', erro: '❌', aviso: '⚠️ ' } as const;

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function imprimirRelatorio(resultados: ResultadoVerificacao[]) {
  const agora = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  console.log('🔎 SOUFER Tools — verificação de consistência dos dados');
  console.log(`Banco: ${env.db.database} @ ${env.db.host}:${env.db.port}   Data: ${agora}\n`);

  for (const r of resultados) {
    const ok = r.total === 0;
    if (ok && soErros) continue;
    const icone = ok ? ICONE.ok : ICONE[r.gravidade];
    console.log(`${icone} ${r.id.padEnd(46, '.')} ${r.total}`);
    if (ok) continue;
    console.log(`     ${r.titulo}`);
    for (const linha of r.amostra) {
      console.log(`     • ${Object.entries(linha).map(([k, v]) => `${k}=${formatarValor(v)}`).join('  ')}`);
    }
    if (r.total > r.amostra.length) console.log(`     … e mais ${r.total - r.amostra.length} registro(s)`);
    console.log(`     Como corrigir: ${r.correcao}`);
  }

  const erros = resultados.filter((r) => r.total > 0 && r.gravidade === 'erro').length;
  const avisos = resultados.filter((r) => r.total > 0 && r.gravidade === 'aviso').length;
  const oks = resultados.filter((r) => r.total === 0).length;
  const saida = codigoDeSaida(resultados);
  console.log(`\nResumo: ${resultados.length} verificações · ${oks} ok · ${erros} com erro · ${avisos} com aviso`);
  console.log(saida === 0 ? 'Resultado: tudo certo (saída 0)' : 'Resultado: PROBLEMAS ENCONTRADOS (saída 1)');
}

async function main() {
  const resultados = await executarVerificacoes();
  if (modoJson) {
    console.log(JSON.stringify(resultados, null, 2));
  } else {
    imprimirRelatorio(resultados);
  }
  return codigoDeSaida(resultados);
}

main()
  .then(async (codigo) => {
    await pool.end();
    process.exit(codigo);
  })
  .catch(async (error) => {
    console.error('❌ Não foi possível executar a verificação:', error?.message ?? error);
    await pool.end().catch(() => {});
    process.exit(2);
  });
