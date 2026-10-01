import { describe, it, expect } from 'vitest';
import { swaggerSpec } from '../config/swagger.js';

describe('swaggerSpec (merge JSDoc + zod-to-openapi)', () => {
  const paths = swaggerSpec.paths ?? {};

  it('mantém o GET /ferramentas vindo do JSDoc e adiciona o POST gerado do Zod', () => {
    expect(paths['/ferramentas']?.get).toBeDefined();
    expect(paths['/ferramentas']?.post?.tags).toEqual(['Ferramentas']);
  });

  it('gera PATCH /ferramentas/{id} com id integer em path', () => {
    const patch = paths['/ferramentas/{id}']?.patch;
    expect(patch).toBeDefined();
    const id = (patch?.parameters as Array<{ name: string; in: string; schema: { type: string } }>)
      .find((p) => p.name === 'id');
    expect(id?.in).toBe('path');
    expect(id?.schema.type).toBe('integer');
  });
});
