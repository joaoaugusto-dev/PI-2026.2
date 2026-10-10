import app from './app.js';
import { env } from './config/env.js';
import { query, testConnection } from './config/database.js';
import { logger } from './middlewares/logger.js';

const PORT = env.port;

// Não depende do pg_cron: a função é idempotente (deduplica por empréstimo), então rodar
// na subida e a cada 30 min só cobre quando a extensão não existe ou o servidor ficou fora.
// ponytail: várias instâncias só repetem um SELECT inofensivo.
function gerarNotificacoes() {
  query('SELECT fn_gerar_notificacoes()').catch((err) => logger.warn({ err }, 'falha ao gerar notificações'));
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
