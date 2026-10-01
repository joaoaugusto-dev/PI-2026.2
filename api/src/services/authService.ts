import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getClient, query } from "../config/database.js";
import { env } from "../config/env.js";
import {
  UnauthorizedError,
  NotFoundError,
  TooManyRequestsError,
} from "../utils/errors.js";

export interface LoginResult {
  token: string;
  usuario: {
    id: number;
    nome: string;
    matricula: string;
    papel: string;
  };
}

export interface ConviteCriado {
  token: string;
  expiraEm: string;
  colaborador: { id: number; nome: string; matricula: string };
}

const VALIDADE_CONVITE_DIAS = 7;
const MAX_FALHAS_LOGIN = 5;
const BLOQUEIO_LOGIN_MIN = 15;

const hashDoToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// mesma resposta para inexistente, expirado ou já usado: o link não revela o motivo
const conviteInvalido = () =>
  new NotFoundError(
    "Link inválido ou expirado. Peça um novo ao administrador.",
    "CONVITE_INVALIDO",
  );

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
      `SELECT u.id, u.senha_hash, u.papel, u.ativo, CEIL(EXTRACT(EPOCH FROM (u.bloqueado_ate - NOW())) / 60) AS minutos_bloqueio, c.nome, c.matricula, c.ativo AS colaborador_ativo
       FROM colaboradores c
       JOIN usuarios u ON u.colaborador_id = c.id
       WHERE c.matricula = $1`,
      [matricula],
    );

    const usuario = result.rows[0];

    if (!usuario) {
      throw new UnauthorizedError(
        "Matrícula ou senha inválidos",
        "INVALID_CREDENTIALS",
      );
    }

    if (!usuario.ativo || !usuario.colaborador_ativo) {
      throw new UnauthorizedError(
        "Usuário inativo. Contate o administrador.",
        "USER_INACTIVE",
      );
    }

    // admin fica fora do bloqueio por conta: a matrícula não é secreta e o bloqueio
    // total deixaria qualquer um trancá-lo para fora (só o loginLimiter por IP vale)
    const contaProtegida = usuario.papel !== "admin";
    if (contaProtegida && usuario.minutos_bloqueio > 0) {
      throw new TooManyRequestsError(
        `Muitas tentativas erradas. Tente novamente em ${usuario.minutos_bloqueio} min ou peça um link de acesso ao administrador.`,
        "CONTA_BLOQUEADA",
      );
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      // atômico: incrementa e, ao atingir o limite, bloqueia e zera o contador
      if (contaProtegida) {
        await query(
          `UPDATE usuarios
         SET tentativas_falhas = CASE WHEN tentativas_falhas + 1 >= $2 THEN 0 ELSE tentativas_falhas + 1 END,
             bloqueado_ate = CASE WHEN tentativas_falhas + 1 >= $2 THEN NOW() + make_interval(mins => $3) ELSE bloqueado_ate END
         WHERE id = $1`,
          [usuario.id, MAX_FALHAS_LOGIN, BLOQUEIO_LOGIN_MIN],
        );
      }
      throw new UnauthorizedError(
        "Matrícula ou senha inválidos",
        "INVALID_CREDENTIALS",
      );
    }

    await query(
      "UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = $1 AND tentativas_falhas > 0",
      [usuario.id],
    );

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        matricula: usuario.matricula,
        papel: usuario.papel,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn as any },
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
   * Gera um link de acesso (convite) para o colaborador definir a própria senha.
   * Invalida os convites anteriores ainda não usados. O token em claro só existe
   * nesta resposta: o banco guarda o hash.
   */
  static async criarConvite(
    colaboradorId: number,
    adminId: number,
  ): Promise<ConviteCriado> {
    const colaborador = await query<{
      id: number;
      nome: string;
      matricula: string;
    }>(
      "SELECT id, nome, matricula FROM colaboradores WHERE id = $1 AND ativo = true",
      [colaboradorId],
    );
    if (!colaborador.rows[0]) {
      throw new NotFoundError(
        "Colaborador não encontrado ou inativo",
        "COLABORADOR_NOT_FOUND",
      );
    }

    const token = randomBytes(32).toString("base64url");
    const client = await getClient();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM convites_acesso WHERE colaborador_id = $1 AND usado_em IS NULL",
        [colaboradorId],
      );
      const inserido = await client.query<{ expira_em: string }>(
        `INSERT INTO convites_acesso (colaborador_id, token_hash, expira_em, criado_por)
         VALUES ($1, $2, NOW() + make_interval(days => $3), $4)
         RETURNING expira_em`,
        [colaboradorId, hashDoToken(token), VALIDADE_CONVITE_DIAS, adminId],
      );
      await client.query(
        `INSERT INTO auditoria (tabela, operacao, registro_id, dados_novos, usuario_id)
         VALUES ('colaboradores', 'convite_criado', $1, $2, $3)`,
        [
          colaboradorId,
          JSON.stringify({ expira_em: inserido.rows[0].expira_em }),
          adminId,
        ],
      );
      await client.query("COMMIT");
      return {
        token,
        expiraEm: inserido.rows[0].expira_em,
        colaborador: colaborador.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /** Quem abre o link vê o nome e a matrícula antes de escolher a senha. */
  static async consultarConvite(
    token: string,
  ): Promise<{ nome: string; matricula: string }> {
    const result = await query<{ nome: string; matricula: string }>(
      `SELECT c.nome, c.matricula
       FROM convites_acesso v JOIN colaboradores c ON c.id = v.colaborador_id
       WHERE v.token_hash = $1 AND v.usado_em IS NULL AND v.expira_em > NOW() AND c.ativo = true`,
      [hashDoToken(token)],
    );
    if (!result.rows[0]) throw conviteInvalido();
    return result.rows[0];
  }

  /**
   * Define a senha escolhida pela pessoa, cria a conta (ou troca a senha, se ela já
   * tinha) ativa e devolve o mesmo resultado do login: a pessoa já entra logada.
   */
  static async aceitarConvite(
    token: string,
    senha: string,
  ): Promise<LoginResult> {
    const senhaHash = await bcrypt.hash(senha, await bcrypt.genSalt(10));
    const client = await getClient();
    try {
      await client.query("BEGIN");
      // FOR UPDATE: dois acessos simultâneos ao mesmo link não passam os dois
      const convite = await client.query<{
        id: number;
        colaborador_id: number;
        nome: string;
        matricula: string;
      }>(
        `SELECT v.id, v.colaborador_id, c.nome, c.matricula
         FROM convites_acesso v JOIN colaboradores c ON c.id = v.colaborador_id
         WHERE v.token_hash = $1 AND v.usado_em IS NULL AND v.expira_em > NOW() AND c.ativo = true
         FOR UPDATE OF v`,
        [hashDoToken(token)],
      );
      if (!convite.rows[0]) throw conviteInvalido();
      const {
        id: conviteId,
        colaborador_id: colaboradorId,
        nome,
        matricula,
      } = convite.rows[0];

      const usuario = await client.query<{ id: number; papel: string }>(
        `INSERT INTO usuarios (colaborador_id, senha_hash, papel, ativo)
         VALUES ($1, $2, 'manutencao', true)
         ON CONFLICT (colaborador_id) DO UPDATE
           SET senha_hash = EXCLUDED.senha_hash, ativo = true, tentativas_falhas = 0, bloqueado_ate = NULL, updated_at = NOW()
         RETURNING id, papel`,
        [colaboradorId, senhaHash],
      );
      await client.query(
        "UPDATE convites_acesso SET usado_em = NOW() WHERE id = $1",
        [conviteId],
      );
      await client.query(
        `INSERT INTO auditoria (tabela, operacao, registro_id, dados_novos, usuario_id)
         VALUES ('colaboradores', 'senha_definida', $1, $2, $3)`,
        [
          colaboradorId,
          JSON.stringify({ convite_id: conviteId }),
          usuario.rows[0].id,
        ],
      );
      await client.query("COMMIT");

      const { id, papel } = usuario.rows[0];
      const tokenSessao = jwt.sign(
        { id, nome, matricula, papel },
        env.jwt.secret,
        {
          expiresIn: env.jwt.expiresIn as any,
        },
      );
      return { token: tokenSessao, usuario: { id, nome, matricula, papel } };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cria uma sessão temporária de 15 minutos para modo consulta (quiosque).
   * O operador informa só a matrícula (sem senha); ela é buscada em
   * colaboradores, que é onde a matrícula vive, e só colaborador ativo entra.
   */
  static async criarSessaoConsulta(
    identificador: string,
  ): Promise<ConsultaSessaoResult> {
    const termo = identificador.trim();

    const result = await query(
      `SELECT id, nome, matricula, setor_id, ativo
       FROM colaboradores
       WHERE matricula = $1 AND ativo = true
       LIMIT 1`,
      [termo],
    );

    const colaborador = result.rows[0];

    if (!colaborador) {
      throw new NotFoundError(
        "Colaborador não encontrado com a matrícula informada ou cadastro inativo",
        "COLABORADOR_NOT_FOUND",
      );
    }

    const token = jwt.sign(
      {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        papel: "consulta",
      },
      env.jwt.secret,
      { expiresIn: env.jwt.consultaExpiresIn as any },
    );

    return {
      token,
      colaborador: {
        id: colaborador.id,
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        papel: "consulta",
      },
      expiraEm: env.jwt.consultaExpiresIn,
    };
  }
}
