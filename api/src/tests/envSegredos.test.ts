import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// API-19 (#78), D5: só NODE_ENV=development|test aceita os segredos padrão do repositório. O env.ts
// roda no import, então cada caso reimporta o módulo com o ambiente montado à mão.

vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

const SEGREDO_FORTE = 'x'.repeat(40);
const VARIAVEIS = ['NODE_ENV', 'JWT_SECRET', 'DB_PASSWORD', 'CORS_ORIGIN'] as const;

const carregar = async (ambiente: Partial<Record<(typeof VARIAVEIS)[number], string>>) => {
  vi.resetModules();
  for (const nome of VARIAVEIS) vi.stubEnv(nome, undefined as unknown as string);
  for (const [nome, valor] of Object.entries(ambiente)) vi.stubEnv(nome, valor as string);
  return (await import('../config/env.js')).env;
};

describe('env.ts: segredos padrão só em development e test (D5)', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it.each(['development', 'test'])('NODE_ENV=%s sem JWT_SECRET e sem DB_PASSWORD usa os padrões de desenvolvimento', async (nodeEnv) => {
    const env = await carregar({ NODE_ENV: nodeEnv });

    expect(env.jwt.secret).toBe('soufer_tools_fallback_secret');
    expect(env.db.password).toBe('postgres');
  });

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['staging', 'staging'],
    ['production', 'production'],
    ['com erro de digitação', 'developmnet'],
    ['com maiúscula', 'Development'],
  ])('NODE_ENV %s sem JWT_SECRET recusa subir', async (_rotulo, nodeEnv) => {
    await expect(carregar({ ...(nodeEnv !== undefined && { NODE_ENV: nodeEnv }), DB_PASSWORD: 'senha-do-banco-forte', CORS_ORIGIN: 'https://app.exemplo.com' })).rejects.toThrow(/JWT_SECRET/);
  });

  it.each([
    ['ausente', undefined],
    ['staging', 'staging'],
    ['production', 'production'],
  ])('NODE_ENV %s sem DB_PASSWORD recusa subir', async (_rotulo, nodeEnv) => {
    await expect(carregar({ ...(nodeEnv !== undefined && { NODE_ENV: nodeEnv }), JWT_SECRET: SEGREDO_FORTE, CORS_ORIGIN: 'https://app.exemplo.com' })).rejects.toThrow(/DB_PASSWORD/);
  });

  it('fora de development/test recusa segredo de exemplo, senha padrão e segredo curto', async () => {
    const base = { NODE_ENV: 'staging', DB_PASSWORD: 'senha-do-banco-forte' };

    await expect(carregar({ ...base, JWT_SECRET: 'soufer_tools_super_secret_jwt_key_development_2026' })).rejects.toThrow(/JWT_SECRET/);
    await expect(carregar({ ...base, JWT_SECRET: 'curto' })).rejects.toThrow(/JWT_SECRET/);
    // a lista é comparada sem diferenciar maiúsculas de minúsculas (o texto de exemplo do .env.example em caixa alta não passa)
    await expect(carregar({ ...base, JWT_SECRET: 'SOUFER_TOOLS_SUPER_SECRET_JWT_KEY_DEVELOPMENT_2026' })).rejects.toThrow(/JWT_SECRET/);
    await expect(carregar({ NODE_ENV: 'staging', JWT_SECRET: SEGREDO_FORTE, DB_PASSWORD: 'postgres' })).rejects.toThrow(/DB_PASSWORD/);
  });

  it('recusa os textos de exemplo do guia do Dokploy, mesmo com tamanho suficiente', async () => {
    await expect(carregar({ NODE_ENV: 'production', JWT_SECRET: 'gere_uma_chave_jwt_secreta_longa_e_aleatoria_aqui', DB_PASSWORD: 'senha-do-banco-forte', CORS_ORIGIN: 'https://app.exemplo.com' })).rejects.toThrow(/JWT_SECRET/);
    await expect(carregar({ NODE_ENV: 'production', JWT_SECRET: SEGREDO_FORTE, DB_PASSWORD: 'sua_senha_do_postgres', CORS_ORIGIN: 'https://app.exemplo.com' })).rejects.toThrow(/DB_PASSWORD/);
  });

  it('ambienteLocal (guarda do db:seed) é true só em development e test', async () => {
    expect((await carregar({ NODE_ENV: 'development' })).ambienteLocal).toBe(true);
    expect((await carregar({ NODE_ENV: 'test' })).ambienteLocal).toBe(true);

    const reais = { JWT_SECRET: SEGREDO_FORTE, DB_PASSWORD: 'senha-do-banco-forte', CORS_ORIGIN: 'https://app.exemplo.com' };
    for (const nodeEnv of ['production', 'staging', 'Development', '']) {
      expect((await carregar({ NODE_ENV: nodeEnv, ...reais })).ambienteLocal, nodeEnv).toBe(false);
    }
    expect((await carregar(reais)).ambienteLocal).toBe(false);
  });

  it('a mensagem de erro diz qual NODE_ENV foi lido e como corrigir', async () => {
    await expect(carregar({ DB_PASSWORD: 'senha-do-banco-forte' })).rejects.toThrow(/NODE_ENV não definido.*NODE_ENV=development/);
    await expect(carregar({ NODE_ENV: 'staging', DB_PASSWORD: 'senha-do-banco-forte' })).rejects.toThrow(/NODE_ENV=staging/);
  });

  it('com segredos reais carrega em staging e em production e usa os valores informados', async () => {
    for (const nodeEnv of ['staging', 'production']) {
      const env = await carregar({ NODE_ENV: nodeEnv, JWT_SECRET: SEGREDO_FORTE, DB_PASSWORD: 'senha-do-banco-forte', CORS_ORIGIN: 'https://app.exemplo.com' });

      expect(env.jwt.secret).toBe(SEGREDO_FORTE);
      expect(env.db.password).toBe('senha-do-banco-forte');
    }
  });

  it('em desenvolvimento, segredos informados no ambiente têm preferência sobre os padrões', async () => {
    const env = await carregar({ NODE_ENV: 'development', JWT_SECRET: 'meu-segredo-local', DB_PASSWORD: 'minha-senha-local' });

    expect(env.jwt.secret).toBe('meu-segredo-local');
    expect(env.db.password).toBe('minha-senha-local');
  });
});
