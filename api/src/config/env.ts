import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Procura o arquivo .env de forma resiliente em dev (src/) e build compilado (dist/src/)
const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'api/.env'),
  path.resolve(__dirname, '../../.env'),    // dev: api/src/config -> api/.env
  path.resolve(__dirname, '../../../.env'), // dist: api/dist/src/config -> api/.env
];

const envPath = candidatePaths.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET;
if (isProd && (!jwtSecret || jwtSecret === 'soufer_tools_fallback_secret')) {
  throw new Error('FATAL: JWT_SECRET precisa ser obrigatoriamente definido com um valor seguro em ambiente de produção.');
}

const dbPassword = process.env.DB_PASSWORD;
if (isProd && !dbPassword) {
  throw new Error('FATAL: DB_PASSWORD precisa ser obrigatoriamente definido em ambiente de produção.');
}

const corsOrigin = process.env.CORS_ORIGIN;
if (isProd && !corsOrigin) {
  throw new Error('FATAL: CORS_ORIGIN precisa ser obrigatoriamente definido em ambiente de produção (ex: https://meudominio.com).');
}

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  corsOrigin: corsOrigin || (isProd ? '' : '*'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'soufer_dev',
    user: process.env.DB_USER || 'postgres',
    password: dbPassword || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  jwt: {
    secret: jwtSecret || 'soufer_tools_fallback_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    consultaExpiresIn: process.env.JWT_CONSULTA_EXPIRES_IN || '15m',
  },
};
