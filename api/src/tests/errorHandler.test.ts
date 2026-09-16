import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorHandler } from '../middlewares/errorHandler.js';
import { validate } from '../middlewares/validate.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';

describe('Middleware errorHandler e Envelope Padrão de Erro', () => {
  const app = express();
  app.use(express.json());

  // Rota de teste para validação Zod
  const bodySchema = z.object({
    email: z.string().email('E-mail inválido'),
    idade: z.number().min(18, 'Idade mínima é 18'),
  });

  app.post('/test/valida-zod', validate({ body: bodySchema }), (req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Rotas para disparar erros específicos
  app.get('/test/erro-not-found', () => {
    throw new NotFoundError('Usuário não encontrado');
  });

  app.get('/test/erro-unauthorized', () => {
    throw new UnauthorizedError('Token não fornecido');
  });

  app.get('/test/erro-forbidden', () => {
    throw new ForbiddenError('Acesso restrito a almoxarifes');
  });

  app.get('/test/erro-conflict', () => {
    throw new ConflictError('Ferramenta já está emprestada');
  });

  app.get('/test/erro-pg-duplicate', () => {
    const err: any = new Error('duplicate key value violates unique constraint');
    err.code = '23505';
    err.detail = 'Key (matricula)=(MAT001) already exists.';
    err.constraint = 'colaboradores_matricula_key';
    throw err;
  });

  app.get('/test/erro-pg-foreign-key', () => {
    const err: any = new Error('insert or update on table violates foreign key constraint');
    err.code = '23503';
    err.detail = 'Key (setor_id)=(999) is not present in table "setores".';
    err.constraint = 'colaboradores_setor_id_fkey';
    throw err;
  });

  app.get('/test/erro-pg-trigger', () => {
    const err: any = new Error('Ferramenta 1 não está disponível para empréstimo (status atual: em_uso)');
    err.code = 'P0001';
    throw err;
  });

  app.get('/test/erro-desconhecido', () => {
    throw new Error('Falha inesperada no banco de dados');
  });

  app.use(errorHandler);

  it('retorna envelope 400 formatado para erro de validação forçado (Zod)', async () => {
    const res = await request(app)
      .post('/test/valida-zod')
      .send({ email: 'invalido', idade: 15 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erro de validação nos dados enviados',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'email', message: 'E-mail inválido' }),
          expect.objectContaining({ field: 'idade', message: 'Idade mínima é 18' }),
        ]),
      },
    });
  });

  it('retorna envelope 404 para NotFoundError', async () => {
    const res = await request(app).get('/test/erro-not-found');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Usuário não encontrado',
        details: [],
      },
    });
  });

  it('retorna envelope 401 para UnauthorizedError', async () => {
    const res = await request(app).get('/test/erro-unauthorized');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('retorna envelope 403 para ForbiddenError', async () => {
    const res = await request(app).get('/test/erro-forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('retorna envelope 409 para ConflictError', async () => {
    const res = await request(app).get('/test/erro-conflict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('mapeia erro PostgreSQL 23505 (duplicação) para 409 DUPLICATE_ENTRY', async () => {
    const res = await request(app).get('/test/erro-pg-duplicate');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('mapeia erro PostgreSQL 23503 (chave estrangeira) para 400 FOREIGN_KEY_VIOLATION', async () => {
    const res = await request(app).get('/test/erro-pg-foreign-key');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
  });

  it('mapeia erro PostgreSQL P0001 (trigger/regra de negócio) para 409 BUSINESS_RULE_VIOLATION', async () => {
    const res = await request(app).get('/test/erro-pg-trigger');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.message).toContain('Ferramenta 1 não está disponível');
  });

  it('retorna 500 INTERNAL_SERVER_ERROR para erros não tratados', async () => {
    const res = await request(app).get('/test/erro-desconhecido');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
