import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SOUFER Tools API (TypeScript)',
      version: '1.0.0',
      description: 'API REST do sistema de controle de retiradas, devoluções e ocorrências de ferramentas do almoxarifado Soufer (PI 2026.2).',
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
                  example: [{ field: 'email', message: 'E-mail inválido' }],
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './dist/src/routes/**/*.js',
    './dist/src/controllers/**/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
