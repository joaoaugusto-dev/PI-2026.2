import { Request, Response, NextFunction } from 'express';
import * as auxiliaresService from '../services/auxiliaresService.js';
import { sendSuccess } from '../utils/response.js';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.js';

// ============================================================================
// SETORES
// ============================================================================
export class SetorController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const q = req.query.q as string | undefined;
      const incluirInativos = String(req.query.incluirInativos) === 'true';
      const sort = req.query.sort as 'nome' | 'id' | 'created_at' | undefined;
      const order = req.query.order as 'asc' | 'desc' | 'ASC' | 'DESC' | undefined;

      const { rows, total } = await auxiliaresService.listarSetores({
        offset,
        limit,
        q,
        incluirInativos,
        sort,
        order,
      });

      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const setor = await auxiliaresService.buscarSetorPorId(id);
      return sendSuccess(res, setor, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const setor = await auxiliaresService.criarSetor(req.body);
      return sendSuccess(res, setor, null, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const setor = await auxiliaresService.atualizarSetor(id, req.body);
      return sendSuccess(res, setor, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async excluir(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const setor = await auxiliaresService.excluirSetor(id);
      return sendSuccess(res, setor, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}

// ============================================================================
// CATEGORIAS
// ============================================================================
export class CategoriaController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const q = req.query.q as string | undefined;
      const incluirInativos = String(req.query.incluirInativos) === 'true';
      const sort = req.query.sort as 'nome' | 'id' | 'created_at' | undefined;
      const order = req.query.order as 'asc' | 'desc' | 'ASC' | 'DESC' | undefined;

      const { rows, total } = await auxiliaresService.listarCategorias({
        offset,
        limit,
        q,
        incluirInativos,
        sort,
        order,
      });

      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const categoria = await auxiliaresService.buscarCategoriaPorId(id);
      return sendSuccess(res, categoria, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const categoria = await auxiliaresService.criarCategoria(req.body);
      return sendSuccess(res, categoria, null, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const categoria = await auxiliaresService.atualizarCategoria(id, req.body);
      return sendSuccess(res, categoria, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async excluir(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const categoria = await auxiliaresService.excluirCategoria(id);
      return sendSuccess(res, categoria, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}

// ============================================================================
// ATIVIDADES
// ============================================================================
export class AtividadeController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const q = req.query.q as string | undefined;
      const incluirInativos = String(req.query.incluirInativos) === 'true';
      const sort = req.query.sort as 'nome' | 'id' | 'created_at' | undefined;
      const order = req.query.order as 'asc' | 'desc' | 'ASC' | 'DESC' | undefined;

      const { rows, total } = await auxiliaresService.listarAtividades({
        offset,
        limit,
        q,
        incluirInativos,
        sort,
        order,
      });

      return sendSuccess(res, rows, buildPaginationMeta(page, limit, total), 200);
    } catch (error) {
      return next(error);
    }
  }

  static async buscarPorId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const atividade = await auxiliaresService.buscarAtividadePorId(id);
      return sendSuccess(res, atividade, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async criar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const atividade = await auxiliaresService.criarAtividade(req.body);
      return sendSuccess(res, atividade, null, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const atividade = await auxiliaresService.atualizarAtividade(id, req.body);
      return sendSuccess(res, atividade, null, 200);
    } catch (error) {
      return next(error);
    }
  }

  static async excluir(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const id = Number(req.params.id);
      const atividade = await auxiliaresService.excluirAtividade(id);
      return sendSuccess(res, atividade, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}

// ============================================================================
// OPÇÕES
// ============================================================================
export class OpcoesController {
  static async obterOpcoes(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const opcoes = await auxiliaresService.obterOpcoesCombinadas();
      return sendSuccess(res, opcoes, null, 200);
    } catch (error) {
      return next(error);
    }
  }
}
