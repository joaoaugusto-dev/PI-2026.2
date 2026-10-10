import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

describe('CORS com origem contendo *', () => {
  it('aceita só um rótulo de DNS no lugar do *', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://web-dev.vercel.app,https://web-dev-*-time.vercel.app');
    const { default: app } = await import('../app.js');
    const origemPermitida = async (origem: string) =>
      (await request(app).get('/v1/health').set('Origin', origem)).headers['access-control-allow-origin'] === origem;

    expect(await origemPermitida('https://web-dev.vercel.app')).toBe(true);
    expect(await origemPermitida('https://web-dev-git-feat-x-time.vercel.app')).toBe(true);
    expect(await origemPermitida('https://web-dev-a.evil.com-time.vercel.app')).toBe(false);
    expect(await origemPermitida('https://outro.vercel.app')).toBe(false);
  });
});
