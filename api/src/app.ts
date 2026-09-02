import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { httpLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import v1Routes from './routes/v1/index.js';

const app = express();

// Middlewares de Segurança e Parsing
app.use(helmet());

const allowedOrigins = env.corsOrigin === '*'
  ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000']
  : env.corsOrigin.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (como Postman, Insomnia, CLI) ou contidas na whitelist
      if (!origin || allowedOrigins.includes(origin) || env.corsOrigin === '*') {
        callback(null, true);
      } else {
        callback(new Error(`Origem '${origin}' não autorizada pelas políticas de CORS.`));
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

// Rotas da versão 1 (/v1)
app.use('/v1', v1Routes);

// Tratamento de rota não encontrada (404)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Rota não encontrada: ${req.method} ${req.originalUrl}`));
});

// Tratamento global de erros
app.use(errorHandler);

export default app;
