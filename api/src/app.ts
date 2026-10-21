import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { avariasDir, uploadsDir } from './config/uploads.js';
import { swaggerSpec } from './config/swagger.js';
import { httpLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { registrarContextoRequisicao } from './middlewares/contextoRequisicao.js';
import { NotFoundError } from './utils/errors.js';
import v1Routes from './routes/v1/index.js';

const app = express();

if (env.trustProxyHops > 0) {
  app.set('trust proxy', env.trustProxyHops);
}

// Middlewares de Segurança e Parsing
app.use(helmet());
app.use(registrarContextoRequisicao);

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const configuredOrigins = env.corsOrigin === '*'
  ? ['*']
  : env.corsOrigin.split(',').map((o) => o.trim());

// `*` dentro de uma origem (ex.: https://app-*-time.vercel.app) casa só um rótulo de DNS
// [a-z0-9-]+ — serve aos previews da Vercel sem abrir para qualquer origem.
const originPatterns = configuredOrigins
  .filter((o) => o !== '*' && o.includes('*'))
  .map((o) => new RegExp(`^${o.split('*').map((parte) => parte.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+')}$`));

const isOriginAllowed = (origin?: string): boolean => {
  // Permite requisições sem header Origin (Postman, Insomnia, curl direto, CLI, etc.)
  if (!origin) return true;
  if (configuredOrigins.includes('*')) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (originPatterns.some((padrao) => padrao.test(origin))) return true;
  // Em desenvolvimento, garante que o Swagger UI (porta 3000) e o Vite (5173) funcionem sem bloqueio
  if (env.nodeEnv !== 'production' && defaultDevOrigins.includes(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging estruturado
app.use(httpLogger);

// Documentação Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /:
 *   get:
 *     summary: Informações básicas da API e links para documentação
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Status e links principais da API
 */
// Rota raiz
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'SOUFER Tools API (TypeScript)',
    version: '1.0.0',
    status: 'running',
    docs: '/docs',
    api: '/v1',
  });
});

// Fotos de ferramentas (públicas, nomes com UUID). O helmet manda CORP same-origin,
// o que bloquearia o <img> do front em outra origem; sob /v1 para passar pelo mesmo proxy da API.
const corpCrossOrigin = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};
const estatico = { immutable: true, maxAge: '365d', index: false };
// avarias antes: /v1/uploads/avarias/x não pode cair na pasta das ferramentas
app.use('/v1/uploads/avarias', corpCrossOrigin, express.static(avariasDir, estatico));
app.use('/v1/uploads', corpCrossOrigin, express.static(uploadsDir, estatico));

// Rotas da versão 1 (/v1)
app.use('/v1', v1Routes);

// Tratamento de rota não encontrada (404)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
});

// Tratamento global de erros
app.use(errorHandler);

export default app;
