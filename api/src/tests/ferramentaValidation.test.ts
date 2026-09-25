import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { validate } from '../middlewares/validate.js';
import { errorHandler } from '../middlewares/errorHandler.js';
import ferramentaRoutes from '../routes/v1/ferramentaRoutes.js';
import * as ferramentaService from '../services/ferramentaService.js';
import {
  criarFerramentaSchema,
  ferramentaIdParamSchema,
} from '../validators/ferramentaValidator.js';
import {
  criarColaboradorSchema,
  editarColaboradorSchema,
  colaboradorIdParamSchema,
} from '../validators/colaboradorValidator.js';

// A edição é testada contra o router real (ferramentaRoutes) para garantir que
// o schema aplicado em produção (atualizarFerramentaSchema) é o que está sendo
// exercitado. Auth e service são mockados: aqui só interessa a validação.
vi.mock('../middlewares/auth.js', () => ({
  authenticate: (req: Request, _res: Response, next: () => void) => {
    (req as any).usuario = { id: 1, nome: 'Almoxarife', papel: 'almoxarife' };
    next();
  },
}));
vi.mock('../services/ferramentaService.js');

describe('Validação Zod de Ferramentas e Envelope de Erro (API-08 / Depende de API-07)', () => {
  const app = express();
  app.use(express.json());

  // Rota de criação de ferramenta com middleware validate
  app.post('/test/ferramentas', validate({ body: criarFerramentaSchema }), (req: Request, res: Response) => {
    res.status(201).json({ data: req.body });
  });

  app.use('/v1/ferramentas', ferramentaRoutes);

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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ferramentaService.atualizar).mockImplementation(async (id: number, dados: any) => ({ id, ...dados }) as any);
  });

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

    it('aceita edição parcial de ferramenta com nome e grupo válidos', async () => {
      const res = await request(app).patch('/v1/ferramentas/10').send({ nome: 'Furadeira', grupoId: 3 });

      expect(res.status).toBe(200);
      expect(ferramentaService.atualizar).toHaveBeenCalledWith(10, { nome: 'Furadeira', grupoId: 3 });
    });

    it('descarta valorAquisicao, ehKit e status na edição (não são editáveis por PUT/PATCH /:id)', async () => {
      const res = await request(app)
        .patch('/v1/ferramentas/10')
        .send({ nome: 'Furadeira', valorAquisicao: 10, ehKit: true, status: 'indisponivel' });

      expect(res.status).toBe(200);
      expect(ferramentaService.atualizar).toHaveBeenCalledWith(10, { nome: 'Furadeira' });
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
      const res = await request(app).patch('/v1/ferramentas/abc').send({ nome: 'Nova Ferramenta' });

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

    it('rejeita edição sem nenhum campo editável', async () => {
      const res = await request(app).patch('/v1/ferramentas/1').send({ valorAquisicao: -25.5 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(ferramentaService.atualizar).not.toHaveBeenCalled();
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

    it('rejeita nome com 1 caractere (mínimo é 2)', async () => {
      const res = await request(app).post('/test/ferramentas').send({ nome: 'a', grupoId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'nome',
            message: 'Nome deve ter no mínimo 2 caracteres',
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
