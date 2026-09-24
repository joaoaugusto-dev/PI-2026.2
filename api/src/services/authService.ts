import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors.js';

export interface LoginResult {
  token: string;
  usuario: {
    id: number;
    nome: string;
    matricula: string;
    papel: string;
  };
}

export interface RegistroResult {
  id: number;
  nome: string;
  matricula: string;
  papel: string;
  ativo: boolean;
}

export interface ConsultaSessaoResult {
  token: string;
  colaborador: {
    id: number;
    nome: string;
    matricula: string;
    papel: string;
  };
  expiraEm: string;
}

export class AuthService {
  /**
   * Realiza login de usuário da manutenção (ou admin) por matrícula e senha.
   * A matrícula é do colaborador; a conta de acesso (usuarios) aponta para ele.
   */
  static async login(matricula: string, senha: string): Promise<LoginResult> {
    const result = await query(
      `SELECT u.id, u.senha_hash, u.papel, u.ativo, c.nome, c.matricula, c.ativo AS colaborador_ativo
       FROM colaboradores c
       JOIN usuarios u ON u.colaborador_id = c.id
       WHERE c.matricula = $1`,
      [matricula]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      throw new UnauthorizedError('Matrícula ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    if (!usuario.ativo || !usuario.colaborador_ativo) {
      throw new UnauthorizedError('Usuário inativo. Contate o administrador.', 'USER_INACTIVE');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedError('Matrícula ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        matricula: usuario.matricula,
        papel: usuario.papel,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn as any }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        matricula: usuario.matricula,
        papel: usuario.papel,
      },
    };
  }

  /**
   * Auto-cadastro da manutenção: a pessoa se identifica pela matrícula, que
   * precisa existir em colaboradores (ativo) e ainda não ter conta. Cria a conta
   * inativa, aguardando aprovação de um admin via PATCH /v1/usuarios/:id/ativar.
   * O nome vem do cadastro do colaborador, não do corpo da requisição.
   */
  static async registrar(matricula: string, senha: string): Promise<RegistroResult> {
    const colaboradorResult = await query<{ id: number; nome: string; matricula: string }>(
      'SELECT id, nome, matricula FROM colaboradores WHERE matricula = $1 AND ativo = true',
      [matricula]
    );
    const colaborador = colaboradorResult.rows[0];

    if (!colaborador) {
      throw new NotFoundError(
        'Colaborador não encontrado com a matrícula informada ou cadastro inativo',
        'COLABORADOR_NOT_FOUND'
      );
    }

    const conflito = new ConflictError('Esta matrícula já possui um cadastro de acesso', 'MATRICULA_JA_CADASTRADA');

    const existente = await query('SELECT id FROM usuarios WHERE colaborador_id = $1', [colaborador.id]);
    if (existente.rows.length > 0) {
      throw conflito;
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    try {
      const result = await query<{ id: number; papel: string; ativo: boolean }>(
        `INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo)
         VALUES ($1, $2, 'manutencao', false)
         RETURNING id, papel, ativo`,
        [colaborador.id, senhaHash]
      );

      return { ...result.rows[0], nome: colaborador.nome, matricula: colaborador.matricula };
    } catch (error: any) {
      // Dois registros simultâneos da mesma matrícula: o índice único de
      // usuarios.colaborador_id barra o segundo.
      if (error.code === '23505') {
        throw conflito;
      }
      throw error;
    }
  }

  /**
   * Cria uma sessão temporária de 15 minutos para modo consulta (quiosque).
   * O operador informa só a matrícula (sem senha); ela é buscada em
   * colaboradores, que é onde a matrícula vive, e só colaborador ativo entra.
   */
  static async criarSessaoConsulta(identificador: string): Promise<ConsultaSessaoResult> {
    const termo = identificador.trim();

    const result = await query(
      `SELECT id, nome, matricula, setor_id, ativo
       FROM colaboradores
       WHERE matricula = $1 AND ativo = true
       LIMIT 1`,
      [termo]
    );

    const colaborador = result.rows[0];

    if (!colaborador) {
      throw new NotFoundError(
        'Colaborador não encontrado com a matrícula informada ou cadastro inativo',
        'COLABORADOR_NOT_FOUND'
      );
    }

    const token = jwt.sign(
      {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        papel: 'consulta',
      },
      env.jwt.secret,
      { expiresIn: env.jwt.consultaExpiresIn as any }
    );

    return {
      token,
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        papel: 'consulta',
      },
      expiraEm: env.jwt.consultaExpiresIn,
    };
  }
}
