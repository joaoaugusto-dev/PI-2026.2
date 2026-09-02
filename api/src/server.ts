import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { logger } from './middlewares/logger.js';

const PORT = env.port;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Servidor TypeScript rodando na porta ${PORT} [Ambiente: ${env.nodeEnv}]`);
  logger.info(`📚 Swagger UI disponível em http://localhost:${PORT}/docs`);

  // Teste de conectividade inicial com o PostgreSQL
  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    logger.info(`🗄️ PostgreSQL conectado com sucesso no banco: ${dbStatus.database}`);
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
