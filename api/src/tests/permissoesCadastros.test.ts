import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { env } from "../config/env.js";

const token = (papel: string) =>
  jwt.sign({ id: 1, papel, nome: "Teste", matricula: "0001" }, env.jwt.secret, {
    expiresIn: "1h",
  });
const auth = (papel: string) => ({ Authorization: `Bearer ${token(papel)}` });

// Regra 8: escrita dos cadastros auxiliares é do admin; a manutenção só lê
// (o fluxo de retirada consome setores e categorias); admin não opera o balcão.
describe("Permissões dos cadastros auxiliares", () => {
  for (const recurso of ["setores", "categorias"]) {
    it(`manutenção lê ${recurso}, mas não cria, edita nem inativa (403)`, async () => {
      expect(
        (await request(app).get(`/v1/${recurso}`).set(auth("manutencao")))
          .status,
      ).toBe(200);

      const escritas = [
        request(app)
          .post(`/v1/${recurso}`)
          .set(auth("manutencao"))
          .send({ nome: "X" }),
        request(app)
          .put(`/v1/${recurso}/1`)
          .set(auth("manutencao"))
          .send({ nome: "X" }),
        request(app)
          .patch(`/v1/${recurso}/1`)
          .set(auth("manutencao"))
          .send({ nome: "X" }),
        request(app).delete(`/v1/${recurso}/1`).set(auth("manutencao")),
      ];
      for (const res of await Promise.all(escritas))
        expect(res.status).toBe(403);
    });

    it(`admin lê ${recurso}`, async () => {
      expect(
        (await request(app).get(`/v1/${recurso}`).set(auth("admin"))).status,
      ).toBe(200);
    });
  }

  it("perfil consulta não acessa os cadastros (403)", async () => {
    expect(
      (await request(app).get("/v1/setores").set(auth("consulta"))).status,
    ).toBe(403);
  });
});

describe("Admin não opera o balcão", () => {
  it("identificar colaborador, buscar ferramenta por código e histórico de empréstimos dão 403", async () => {
    const rotas = [
      "/v1/colaboradores/identificar?termo=a",
      "/v1/ferramentas/por-codigo/1",
      "/v1/emprestimos",
    ];
    for (const rota of rotas)
      expect((await request(app).get(rota).set(auth("admin"))).status).toBe(
        403,
      );
  });
});

describe("Paginação", () => {
  it("page absurdo é 400, não 500 (OFFSET estouraria o bigint)", async () => {
    const res = await request(app)
      .get("/v1/emprestimos?page=1e20")
      .set(auth("manutencao"));
    expect(res.status).toBe(400);
  });
});
