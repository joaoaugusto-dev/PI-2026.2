// Gera os tokens forjados da coleção soufer-tools-seguranca.json (API-19, #78).
// Eles precisam do JWT_SECRET da API, então não dá para criá-los dentro do Insomnia.
//
// Uso, a partir da raiz do repositório:
//   node --env-file=api/.env docs/insomnia/gerar-tokens-invasao.mjs
//
// Cole cada valor na variável de mesmo nome do Base Environment da coleção. Use só contra a API local:
// o script lê o segredo do seu api/.env e nunca o imprime.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../api/package.json', import.meta.url));
const jwt = require('jsonwebtoken');

const segredo = process.env.JWT_SECRET;
if (!segredo) {
  console.error('JWT_SECRET não encontrado. Rode com: node --env-file=api/.env docs/insomnia/gerar-tokens-invasao.mjs');
  process.exit(1);
}

const AUD_SESSAO = 'soufer-sessao';
const AUD_CONSULTA = 'soufer-consulta';
const usuario = (papel) => ({ id: 1, nome: 'Invasor Simulado', papel, matricula: '0001' });
const assinar = (papel, opcoes) => jwt.sign(usuario(papel), segredo, { algorithm: 'HS256', expiresIn: '1h', ...opcoes });
const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const tokens = {
  // 401 TOKEN_EXPIRED
  token_vencido_manutencao: assinar('manutencao', { audience: AUD_SESSAO, expiresIn: -10 }),
  token_vencido_consulta: assinar('consulta', { audience: AUD_CONSULTA, expiresIn: -10 }),
  // 401 TOKEN_INVALID
  token_alg_none: `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
    ...usuario('admin'),
    aud: AUD_SESSAO,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.`,
  token_hs512: assinar('admin', { algorithm: 'HS512', audience: AUD_SESSAO }),
  token_aud_consulta_em_balcao: assinar('manutencao', { audience: AUD_CONSULTA }),
  token_aud_sessao_em_consulta: assinar('consulta', { audience: AUD_SESSAO }),
  // 401 TOKEN_OUTDATED
  token_sem_aud: assinar('manutencao', {}),
};

for (const [nome, valor] of Object.entries(tokens)) console.log(`${nome}=${valor}`);
