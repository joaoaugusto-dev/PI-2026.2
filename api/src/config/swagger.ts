import swaggerJSDoc from 'swagger-jsdoc';
import type { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { env } from './env.js';
import { gerarPathsFerramentasViaZod } from './openapiFromZod.js';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SOUFER Tools API (TypeScript)',
      version: '1.0.0',
      description: 'API REST do sistema de controle de retiradas, devoluções e ocorrências de ferramentas da manutenção Soufer (PI 2026.2).',
      contact: {
        name: 'Equipe SOUFER Tools',
      },
    },
    servers: [
      {
        url: '/v1',
        description: 'Servidor Atual (v1)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT fornecido em /v1/auth/login ou /v1/consulta/sessao',
        },
      },
      schemas: {
        StandardSuccessResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
              },
            },
          },
        },
        StandardErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Erro de validação nos dados enviados' },
                details: {
                  type: 'array',
                  items: { type: 'object' },
                  example: [{ field: 'matricula', message: 'Matrícula deve ter exatamente 4 dígitos numéricos (0001 a 9999)' }],
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/app.ts',
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './dist/src/app.js',
    './dist/src/routes/**/*.js',
    './dist/src/controllers/**/*.js',
  ],
};

const spec = swaggerJSDoc(swaggerOptions) as ReturnType<OpenApiGeneratorV3['generateDocument']>;

// Prova de conceito da issue API-14 ("se sobrar tempo"): o POST e o PATCH de
// /ferramentas vêm de zod-to-openapi (gerados a partir dos schemas Zod reais,
// em openapiFromZod.ts) em vez do comentário @openapi manual. Faz merge por
// método HTTP para não perder o GET (que continua documentado via JSDoc).
const pathsGeradosViaZod = gerarPathsFerramentasViaZod();
spec.paths = spec.paths ?? {};
for (const [caminho, metodos] of Object.entries(pathsGeradosViaZod)) {
  spec.paths[caminho] = { ...spec.paths[caminho], ...metodos };
}

export const swaggerSpec = spec;
