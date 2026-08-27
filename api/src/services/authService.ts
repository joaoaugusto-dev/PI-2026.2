import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { UnauthorizedError, NotFoundError } from '../utils/errors.js';

export interface LoginResult {
  token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: string;
  };
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
   * Realiza login de usuário almoxarife
   */
  static async login(email: string, senha: string): Promise<LoginResult> {
    const result = await query(
      'SELECT id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      throw new UnauthorizedError('E-mail ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedError('Usuário inativo. Contate o administrador.', 'USER_INACTIVE');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedError('E-mail ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel || 'almoxarife',
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn as any }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
      },
    };
  }

  /**
   * Cria uma sessão temporária de 15 minutos para modo consulta (quiosque)
   * Regra 8 do CLAUDE.md: identificação no quiosque estritamente por matrícula ou crachá
   */
  static async criarSessaoConsulta(identificador: string): Promise<ConsultaSessaoResult> {
    const termo = identificador.trim();

    const result = await query(
      `SELECT id, nome, matricula, codigo_cracha, setor_id, ativo 
       FROM colaboradores 
       WHERE (matricula = $1 OR codigo_cracha = $1) AND ativo = true
       LIMIT 1`,
      [termo]
    );

    const colaborador = result.rows[0];

    if (!colaborador) {
      throw new NotFoundError(
        'Colaborador não encontrado com a matrícula/crachá informada ou cadastro inativo',
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
