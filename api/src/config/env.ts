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

// Só `development` e `test`, escritos assim, podem cair nos valores públicos do repositório (segredo
// JWT e senha do banco de exemplo). Qualquer outro caso (production, staging, typo, NODE_ENV vazio ou
// ausente) exige segredo de verdade: antes só `production` era protegido, e um deploy com NODE_ENV
// esquecido subiria assinando token com a chave que está no GitHub (API-19).
const ambienteLocal = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const descricaoAmbiente = process.env.NODE_ENV ? `NODE_ENV=${process.env.NODE_ENV}` : 'NODE_ENV não definido';

const INSECURE_JWT_SECRETS = [
  'soufer_tools_fallback_secret',
  'soufer_tools_super_secret_jwt_key_development_2026',
  'secret',
  'jwt_secret',
  'changeme',
];

const JWT_SECRET_DEV = 'soufer_tools_fallback_secret';
const jwtSecret = process.env.JWT_SECRET;
if (!ambienteLocal) {
  if (!jwtSecret || INSECURE_JWT_SECRETS.includes(jwtSecret) || jwtSecret.length < 32) {
    throw new Error(
      `FATAL: JWT_SECRET precisa ser definido com uma chave segura de no mínimo 32 caracteres fora de development/test (${descricaoAmbiente}). Não utilize o segredo de exemplo do .env.example; em desenvolvimento local, defina NODE_ENV=development.`
    );
  }
}

const INSECURE_DB_PASSWORDS = ['postgres', 'root', '123456', 'password', 'admin'];
const dbPassword = process.env.DB_PASSWORD;
if (!ambienteLocal) {
  if (!dbPassword || INSECURE_DB_PASSWORDS.includes(dbPassword.toLowerCase())) {
    throw new Error(
      `FATAL: DB_PASSWORD precisa ser definido com uma senha segura fora de development/test (${descricaoAmbiente}). Não utilize senhas padrão como "postgres"; em desenvolvimento local, defina NODE_ENV=development.`
    );
  }
}

const corsOrigin = process.env.CORS_ORIGIN;
if (isProd && !corsOrigin) {
  throw new Error('FATAL: CORS_ORIGIN precisa ser obrigatoriamente definido em ambiente de produção (ex: https://meudominio.com).');
}

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  // Quantos proxies reversos (Nginx, Traefik do Dokploy) ficam na frente da API.
  // 0 = sem proxy (req.ip é o do cliente). Em produção atrás de 1 proxy, use 1:
  // sem isso todos os clientes compartilhariam o mesmo IP no rate limit.
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '0', 10),
  corsOrigin: corsOrigin || (isProd ? '' : '*'),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'soufer_dev',
    user: process.env.DB_USER || 'postgres',
    password: ambienteLocal ? dbPassword || 'postgres' : (dbPassword as string),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  jwt: {
    secret: ambienteLocal ? jwtSecret || JWT_SECRET_DEV : (jwtSecret as string),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    consultaExpiresIn: process.env.JWT_CONSULTA_EXPIRES_IN || '15m',
  },
};
