import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { validate } from '../middlewares/validate.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import {
  criarFerramentaSchema,
  editarFerramentaSchema,
  ferramentaIdParamSchema,
} from '../validators/ferramentaValidator.js';
import {
  criarColaboradorSchema,
  editarColaboradorSchema,
  colaboradorIdParamSchema,
} from '../validators/colaboradorValidator.js';

describe('Validação Zod de Ferramentas e Envelope de Erro (API-08 / Depende de API-07)', () => {
  const app = express();
  app.use(express.json());

  // Rota de criação de ferramenta com middleware validate
  app.post('/test/ferramentas', validate({ body: criarFerramentaSchema }), (req: Request, res: Response) => {
    res.status(201).json({ data: req.body });
  });

  // Rota de edição de ferramenta com middleware validate
  app.put(
    '/test/ferramentas/:id',
    validate({ params: ferramentaIdParamSchema, body: editarFerramentaSchema }),
    (req: Request, res: Response) => {
      res.status(200).json({ data: { id: req.params.id, ...req.body } });
    }
  );

  // Rota de criação de colaborador (Bônus: reaproveitamento do padrão)
  app.post('/test/colaboradores', validate({ body: criarColaboradorSchema }), (req: Request, res: Response) => {
    res.status(201).json({ data: req.body });
  });

  // Rota de edição de colaborador (Bônus)
  app.put(
    '/test/colaboradores/:id',
    validate({ params: colaboradorIdParamSchema, body: editarColaboradorSchema }),
    (req: Request, res: Response) => {
      res.status(200).json({ data: { id: req.params.id, ...req.body } });
    }
  );

  app.use(errorHandler);

  describe('Sucesso (dados válidos)', () => {
    it('aceita cadastro com dados válidos completos e preço positivo', async () => {
      const payload = {
        nome: 'Furadeira de Impacto 1/2',
        descricao: 'Furadeira profissional 750W',
        marca: 'Bosch',
        modelo: 'GSB 16 RE',
        grupoId: 2,
        subgrupoId: 5,
        setorId: 1,
        localizacao: 'Armário A - Prateleira 3',
        valorAquisicao: 450.90,
        ehKit: false,
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe('Furadeira de Impacto 1/2');
      expect(res.body.data.valorAquisicao).toBe(450.90);
    });

    it('aceita edição parcial de ferramenta com preço e grupo válidos', async () => {
      const payload = {
        valorAquisicao: 599.99,
        grupoId: 3,
      };

      const res = await request(app).put('/test/ferramentas/10').send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.valorAquisicao).toBe(599.99);
      expect(res.body.data.grupoId).toBe(3);
    });
  });

  describe('Caso 1: Campo obrigatório faltando (Missing Required Field)', () => {
    it('rejeita cadastro de ferramenta sem o campo obrigatório "nome"', async () => {
      const payload = {
        grupoId: 1,
        valorAquisicao: 100.0,
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Erro de validação nos dados enviados',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'nome',
              message: 'Nome é obrigatório',
            }),
          ]),
        },
      });
    });

    it('rejeita cadastro de ferramenta sem o campo obrigatório "grupoId"', async () => {
      const payload = {
        nome: 'Alicate Universal 8"',
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'grupoId',
          }),
        ])
      );
    });
  });

  describe('Caso 2: Tipo errado (Invalid Data Types)', () => {
    it('rejeita grupoId que não pode ser convertido para número inteiro', async () => {
      const payload = {
        nome: 'Chave Inglesa',
        grupoId: 'invalido_texto',
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'grupoId',
            message: 'grupoId deve ser um número',
          }),
        ])
      );
    });

    it('rejeita valorAquisicao com tipo de dado não numérico', async () => {
      const payload = {
        nome: 'Multímetro Digital',
        grupoId: 1,
        valorAquisicao: 'muito_caro',
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'valorAquisicao',
            message: 'Valor de aquisição deve ser um número',
          }),
        ])
      );
    });

    it('rejeita parâmetro :id não numérico ou inválido', async () => {
      const res = await request(app).put('/test/ferramentas/abc').send({ nome: 'Nova Ferramenta' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: 'ID deve ser um número',
          }),
        ])
      );
    });
  });

  describe('Caso 3: Valor fora do domínio (Out-of-domain Values)', () => {
    it('rejeita preço negativo no cadastro (valorAquisicao < 0)', async () => {
      const payload = {
        nome: 'Esmerilhadeira 7"',
        grupoId: 2,
        valorAquisicao: -150.0,
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'valorAquisicao',
            message: 'Valor de aquisição não pode ser negativo',
          }),
        ])
      );
    });

    it('rejeita preço negativo na edição de ferramenta', async () => {
      const payload = {
        valorAquisicao: -25.5,
      };

      const res = await request(app).put('/test/ferramentas/1').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'valorAquisicao',
            message: 'Valor de aquisição não pode ser negativo',
          }),
        ])
      );
    });

    it('rejeita nome vazio ou contendo apenas espaços', async () => {
      const payload = {
        nome: '   ',
        grupoId: 1,
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'nome',
            message: 'Nome não pode ser vazio',
          }),
        ])
      );
    });

    it('rejeita grupoId negativo ou zero (categoria/grupo inexistente / fora do domínio)', async () => {
      const payload = {
        nome: 'Torquímetro',
        grupoId: -5,
      };

      const res = await request(app).post('/test/ferramentas').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'grupoId',
            message: 'grupoId deve ser um número positivo',
          }),
        ])
      );
    });

    it('rejeita status fora dos valores permitidos do enum na edição', async () => {
      const payload = {
        status: 'status_inexistente',
      };

      const res = await request(app).put('/test/ferramentas/1').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
            message: 'Status deve ser disponivel, em_uso ou indisponivel',
          }),
        ])
      );
    });
  });

  describe('Reaproveitamento de padrão (Colaborador)', () => {
    it('valida dados obrigatórios de colaborador (nome, matrícula, setorId)', async () => {
      const payload = {
        nome: '',
        matricula: '  ',
        setorId: -1,
      };

      const res = await request(app).post('/test/colaboradores').send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'nome', message: 'Nome não pode ser vazio' }),
          expect.objectContaining({ field: 'matricula', message: 'Matrícula não pode ser vazia' }),
          expect.objectContaining({ field: 'setorId', message: 'setorId deve ser um número positivo' }),
        ])
      );
    });

    it('aceita colaborador válido', async () => {
      const payload = {
        nome: 'Carlos Silva',
        matricula: 'MAT-12345',
        setorId: 2,
      };

      const res = await request(app).post('/test/colaboradores').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.nome).toBe('Carlos Silva');
      expect(res.body.data.matricula).toBe('MAT-12345');
    });
  });
});
