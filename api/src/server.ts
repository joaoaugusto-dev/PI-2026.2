import app from './app.js';
import { env } from './config/env.js';
import { query, testConnection } from './config/database.js';
import { logger } from './middlewares/logger.js';

const PORT = env.port;

// Mecanismo oficial no servidor caseiro (Dokploy), cujo Postgres não traz a extensão pg_cron:
// as funções são idempotentes (gerar deduplica por empréstimo; limpar só apaga lidas antigas),
// então rodar na subida e em intervalo fixo é seguro mesmo com o pg_cron agendado (RDS).
// ponytail: várias instâncias só repetem um SELECT/DELETE inofensivo.
function gerarNotificacoes() {
  query('SELECT fn_gerar_notificacoes()').catch((err) => logger.warn({ err }, 'falha ao gerar notificações'));
}

function limparNotificacoes() {
  query('SELECT fn_limpar_notificacoes()').catch((err) => logger.warn({ err }, 'falha ao limpar notificações'));
}

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Servidor TypeScript rodando na porta ${PORT} [Ambiente: ${env.nodeEnv}]`);
  logger.info(`📚 Swagger UI disponível em http://localhost:${PORT}/docs`);

  // Teste de conectividade inicial com o PostgreSQL
  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    logger.info(`🗄️ PostgreSQL conectado com sucesso no banco: ${dbStatus.database}`);
    gerarNotificacoes();
    setInterval(gerarNotificacoes, 30 * 60_000).unref();
    limparNotificacoes();
    setInterval(limparNotificacoes, 24 * 60 * 60_000).unref();
  } else {
    logger.warn(`⚠️  Não foi possível conectar ao PostgreSQL: ${dbStatus.error}`);
  }
});

// Tratamento de término gracioso (Graceful Shutdown)
function shutdown(signal: string) {
  logger.info(`🛑 Recebido ${signal}. Encerrando servidor graciosamente...`);
  server.close(() => {
    logger.info('👋 Servidor HTTP encerrado.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
