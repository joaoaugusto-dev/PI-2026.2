import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import v1Routes from '../routes/v1/index.js';
import { authenticate } from '../middlewares/auth.js';
import { env } from '../config/env.js';

// API-19 (#78): varredura de todas as rotas de /v1. O teste lê o roteador do Express, então uma rota
// nova sem `authenticate` (ou aberta ao token de consulta) quebra aqui sem ninguém lembrar de escrever
// o teste dela.

type RotaDescoberta = { metodo: string; caminho: string; protegida: boolean };

// Rotas abertas de propósito. Qualquer rota fora desta lista PRECISA ter `authenticate`.
const PUBLICAS = [
  'GET /v1/health',
  'POST /v1/auth/login',
  'GET /v1/auth/convites/:token',
  'POST /v1/auth/convites/:token/senha',
  'POST /v1/consulta/sessao',
  'GET /v1/feriados',
  'GET /v1/feriados/dia-util',
  'GET /v1/feriados/dias-uteis',
];

// Rotas que o token de consulta pode chamar, cada uma com o motivo.
const ABERTAS_AO_TOKEN_DE_CONSULTA: Record<string, string> = {
  'GET /v1/consulta/ferramentas': 'é a rota do quiosque (exclusiva do papel consulta)',
  'GET /v1/auth/me': 'devolve só os dados do próprio token, para qualquer perfil restaurar a sessão',
  // Pendência da API-19 (D1): sai desta lista quando /v1/opcoes passar a exigir manutencao/admin.
  'GET /v1/opcoes': 'PENDENTE: ainda sem authorize (API-19, D1)',
};

// Express 4: o prefixo de um `router.use('/x', ...)` só existe dentro da regexp da camada.
function prefixoDaCamada(regexp: RegExp): string {
  if ((regexp as any).fast_slash) return '';
  const fonte = regexp.source.replace(/^\^/, '').replace(/\\\/\?\(\?=\\\/\|\$\)$/, '');
  return fonte.replace(/\\\//g, '/');
}

function descobrirRotas(stack: any[], prefixo: string, jaProtegido: boolean): RotaDescoberta[] {
  const rotas: RotaDescoberta[] = [];
  let protegidoAteAqui = jaProtegido;

  for (const camada of stack) {
    if (camada.route) {
      if (typeof camada.route.path !== 'string') {
        throw new Error(`Rota com caminho não-string em ${prefixo}: o teste de segurança precisa ser ajustado`);
      }
      const protegida =
        protegidoAteAqui || camada.route.stack.some((c: any) => c.handle === authenticate);
      for (const metodo of Object.keys(camada.route.methods)) {
        // `router.get('/')` sob `/health` vira `/v1/health/`; a lista de públicas usa o caminho sem a barra final.
        const caminho = (prefixo + camada.route.path).replace(/(.)\/$/, '$1');
        rotas.push({ metodo: metodo.toUpperCase(), caminho, protegida });
      }
    } else if (camada.name === 'router') {
      rotas.push(...descobrirRotas(camada.handle.stack, prefixo + prefixoDaCamada(camada.regexp), protegidoAteAqui));
    } else if (camada.handle === authenticate) {
      // `router.use(authenticate)` protege tudo que for registrado depois dele.
      protegidoAteAqui = true;
    }
  }
  return rotas;
}

const rotas = descobrirRotas((v1Routes as any).stack, '/v1', false);
const chave = (r: RotaDescoberta) => `${r.metodo} ${r.caminho}`;
const urlDe = (caminho: string) =>
  caminho.replace(/:(\w+)/g, (_, nome) => (nome === 'recurso' ? 'ferramentas' : '1'));
const chamar = (r: RotaDescoberta, token?: string) => {
  const req = (request(app) as any)[r.metodo.toLowerCase()](urlDe(r.caminho));
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

const assinar = (papel: string, expiresIn: number | string) =>
  jwt.sign({ id: 1, nome: 'Teste Segurança', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: expiresIn as any });

const tokenConsulta = assinar('consulta', '15m');
const protegidas = rotas.filter((r) => !PUBLICAS.includes(chave(r)));

describe('Varredura de segurança das rotas /v1', () => {
  it('encontra as rotas do roteador (a leitura da árvore do Express não pode passar vazia)', () => {
    expect(rotas.length).toBeGreaterThan(50);
    expect(protegidas.length).toBeGreaterThan(40);
  });

  it('todas as rotas da lista de públicas e de exceções existem (lista não pode ficar velha)', () => {
    const existentes = rotas.map(chave);
    for (const chaveRota of [...PUBLICAS, ...Object.keys(ABERTAS_AO_TOKEN_DE_CONSULTA)]) {
      expect(existentes, chaveRota).toContain(chaveRota);
    }
  });

  it('toda rota fora da lista de públicas passa por authenticate', () => {
    const semAuth = protegidas.filter((r) => !r.protegida).map(chave);
    expect(semAuth).toEqual([]);
  });

  describe.each(protegidas.map((r) => [chave(r), r] as const))('%s', (_nome, rota) => {
    it('sem token responde 401 TOKEN_NOT_PROVIDED', async () => {
      const res = await chamar(rota);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_NOT_PROVIDED');
    });

    it('com token vencido de manutenção responde 401 TOKEN_EXPIRED', async () => {
      const res = await chamar(rota, assinar('manutencao', -10));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('com token vencido de consulta responde 401 TOKEN_EXPIRED', async () => {
      const res = await chamar(rota, assinar('consulta', -10));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    if (chave(rota) in ABERTAS_AO_TOKEN_DE_CONSULTA) {
      it('é aberta ao token de consulta só por decisão registrada', async () => {
        const res = await chamar(rota, tokenConsulta);
        expect(res.status).not.toBe(401);
      });
    } else {
      it('com token de consulta responde 403 ACCESS_DENIED', async () => {
        const res = await chamar(rota, tokenConsulta);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('ACCESS_DENIED');
      });
    }
  });
});
