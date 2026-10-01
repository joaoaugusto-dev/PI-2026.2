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

// Regra 8 (atualizada em 30/09/2026, issue DATA-04): atividades não seguem o
// mesmo padrão dos outros cadastros auxiliares. A manutenção mantém acesso
// completo (consome o campo de atividade na retirada), e o admin ganha
// leitura e cadastro (não edição/inativação) para poder preparar a lista sem
// depender da manutenção.
describe("Permissões de atividades (regra própria, diferente dos outros cadastros)", () => {
  it("manutenção continua com acesso completo (ler, criar, editar, inativar)", async () => {
    expect(
      (await request(app).get("/v1/atividades").set(auth("manutencao"))).status,
    ).toBe(200);

    const escritas = [
      request(app).post("/v1/atividades").set(auth("manutencao")).send({ nome: `X${Date.now()}` }),
      request(app).put("/v1/atividades/999999").set(auth("manutencao")).send({ nome: "X" }),
      request(app).patch("/v1/atividades/1").set(auth("manutencao")).send({ nome: "X" }),
    ];
    for (const res of await Promise.all(escritas)) expect(res.status).not.toBe(403);
  });

  it("admin lê, cadastra, edita e inativa atividades (passa da autorização)", async () => {
    expect((await request(app).get("/v1/atividades").set(auth("admin"))).status).toBe(200);
    expect((await request(app).get("/v1/atividades/1").set(auth("admin"))).status).not.toBe(403);
    expect(
      (await request(app).post("/v1/atividades").set(auth("admin")).send({ nome: `Y${Date.now()}` })).status,
    ).toBe(201);

    const edicoes = [
      request(app).put("/v1/atividades/999999").set(auth("admin")).send({ nome: "X" }),
      request(app).patch("/v1/atividades/999999").set(auth("admin")).send({ nome: "X" }),
      request(app).delete("/v1/atividades/999999").set(auth("admin")),
    ];
    for (const res of await Promise.all(edicoes)) expect(res.status).not.toBe(403);
  });
});

describe("Admin opera o balcão (é a manutenção com recursos a mais)", () => {
  it("identificar colaborador, buscar ferramenta por código e histórico de empréstimos não dão 403", async () => {
    const rotas = [
      "/v1/colaboradores/identificar?termo=a",
      "/v1/ferramentas/por-codigo/1",
      "/v1/emprestimos",
    ];
    for (const rota of rotas)
      expect((await request(app).get(rota).set(auth("admin"))).status).not.toBe(
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
