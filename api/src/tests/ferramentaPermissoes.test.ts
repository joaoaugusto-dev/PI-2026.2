import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { env } from "../config/env.js";

const token = (papel: string) =>
  jwt.sign({ id: 1, papel, nome: "Teste", matricula: "0001" }, env.jwt.secret, {
    expiresIn: "1h",
  });

// A autorização roda antes de qualquer consulta ao banco, então 403 não depende de dado.
describe("Permissões de ferramentas por perfil", () => {
  it("admin também opera etiqueta e disponibilizar (admin = manutenção + cadastros)", async () => {
    for (const rota of ["etiqueta-impressa", "disponibilizar"]) {
      const res = await request(app)
        .patch(`/v1/ferramentas/999999/${rota}`)
        .set("Authorization", `Bearer ${token("admin")}`);
      expect(res.status).not.toBe(403);
    }
  });

  it("manutenção não edita nem baixa ferramenta (cadastro é do admin)", async () => {
    const auth = { Authorization: `Bearer ${token("manutencao")}` };
    expect(
      (
        await request(app)
          .patch("/v1/ferramentas/1")
          .set(auth)
          .send({ nome: "Novo nome" })
      ).status,
    ).toBe(403);
    expect(
      (await request(app).delete("/v1/ferramentas/1").set(auth)).status,
    ).toBe(403);
  });
});
