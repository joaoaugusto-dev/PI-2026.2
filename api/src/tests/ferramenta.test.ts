import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { env } from '../config/env.js';

function gerarToken(payload: Record<string, unknown> = { id: 1, nome: 'Almoxarife Teste', papel: 'almoxarife' }) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
}

describe('Rotas de Ferramentas (API-07)', () => {
  const token = gerarToken();

  describe('GET /v1/ferramentas', () => {
    it('retorna 401 quando o token não é fornecido', async () => {
      const res = await request(app).get('/v1/ferramentas');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
    });

    it('retorna lista paginada de ferramentas com envelope padrão', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        })
      );
    });

    it('filtra ferramentas por status (ex: status=disponivel)', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?status=disponivel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((tool: any) => {
        expect(tool.status).toBe('disponivel');
      });
    });

    it('filtra ferramentas por status (ex: status=em_uso)', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?status=em_uso')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach((tool: any) => {
        expect(tool.status).toBe('em_uso');
      });
    });

    it('filtra por categoria/grupo (categoria_id)', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?categoria_id=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((tool: any) => {
        expect(tool.grupo_id).toBe(1);
      });
    });

    it('busca textual pelo termo "q" (nome, marca, modelo ou código)', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?q=Bosch')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const matches = res.body.data.some(
        (t: any) =>
          t.nome.toLowerCase().includes('bosch') ||
          (t.marca && t.marca.toLowerCase().includes('bosch'))
      );
      expect(matches).toBe(true);
    });

    it('ordena ferramentas por sort (ex: sort=nome:desc)', async () => {
      const res = await request(app)
        .get('/v1/ferramentas?sort=nome:desc&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(1);
      const names = res.body.data.map((t: any) => t.nome);
      const sorted = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(sorted);
    });
  });

  describe('GET /v1/ferramentas/:id', () => {
    it('retorna 200 com os dados detalhados da ferramenta', async () => {
      // Pega uma ferramenta existente
      const listRes = await request(app)
        .get('/v1/ferramentas?limit=1')
        .set('Authorization', `Bearer ${token}`);
      const toolId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/v1/ferramentas/${toolId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          id: toolId,
          nome: expect.any(String),
          grupo_nome: expect.any(String),
          status: expect.any(String),
        })
      );
    });

    it('inclui o empréstimo em aberto quando a ferramenta está em uso', async () => {
      // Busca ferramentas em uso do seed
      const listRes = await request(app)
        .get('/v1/ferramentas?status=em_uso&limit=1')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.body.data.length).toBeGreaterThan(0);
      const toolInUse = listRes.body.data[0];

      const res = await request(app)
        .get(`/v1/ferramentas/${toolInUse.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('em_uso');
      expect(res.body.data.emprestimo_atual).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          colaborador_nome: expect.any(String),
          colaborador_matricula: expect.any(String),
          data_retirada: expect.any(String),
        })
      );
    });

    it('retorna 404 para ID inexistente', async () => {
      const res = await request(app)
        .get('/v1/ferramentas/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FERRAMENTA_NOT_FOUND');
    });
  });

  describe('GET /v1/ferramentas/por-codigo/:codigo', () => {
    it('busca ferramenta pelo código de identificação numérico simples', async () => {
      // Pega uma ferramenta com código
      const listRes = await request(app)
        .get('/v1/ferramentas?limit=1')
        .set('Authorization', `Bearer ${token}`);
      const tool = listRes.body.data[0];
      const codigo = tool.codigo_identificacao;

      const res = await request(app)
        .get(`/v1/ferramentas/por-codigo/${codigo}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tool.id);
      expect(res.body.data.codigo_identificacao).toBe(codigo);
    });

    it('busca ferramenta com código formatado com zeros à esquerda (ex: "0002" ou "SF000002")', async () => {
      const listRes = await request(app)
        .get('/v1/ferramentas?limit=1')
        .set('Authorization', `Bearer ${token}`);
      const tool = listRes.body.data[0];
      const codigoPadded = String(tool.codigo_identificacao).padStart(4, '0');

      const res = await request(app)
        .get(`/v1/ferramentas/por-codigo/${codigoPadded}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tool.id);
    });

    it('funciona também pelo alias /porcodigo/:codigo', async () => {
      const listRes = await request(app)
        .get('/v1/ferramentas?limit=1')
        .set('Authorization', `Bearer ${token}`);
      const tool = listRes.body.data[0];

      const res = await request(app)
        .get(`/v1/ferramentas/porcodigo/${tool.codigo_identificacao}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(tool.id);
    });

    it('retorna 404 para código inexistente', async () => {
      const res = await request(app)
        .get('/v1/ferramentas/por-codigo/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FERRAMENTA_NOT_FOUND');
    });
  });

  describe('GET /v1/ferramentas/:id/historico', () => {
    it('retorna histórico de empréstimos e ocorrências de uma ferramenta', async () => {
      // Pega uma ferramenta que tem histórico no seed
      const listRes = await request(app)
        .get('/v1/ferramentas?limit=5')
        .set('Authorization', `Bearer ${token}`);
      const tool = listRes.body.data[0];

      const res = await request(app)
        .get(`/v1/ferramentas/${tool.id}/historico`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          ferramenta: expect.objectContaining({
            id: tool.id,
            nome: tool.nome,
          }),
          emprestimos: expect.any(Array),
          ocorrencias: expect.any(Array),
          total_emprestimos: expect.any(Number),
          total_ocorrencias: expect.any(Number),
        })
      );
    });

    it('retorna 404 ao buscar histórico de ferramenta inexistente', async () => {
      const res = await request(app)
        .get('/v1/ferramentas/99999/historico')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FERRAMENTA_NOT_FOUND');
    });
  });
});
