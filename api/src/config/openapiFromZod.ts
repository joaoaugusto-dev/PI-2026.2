import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { criarFerramentaSchema, atualizarFerramentaSchema } from '../validators/ferramentaValidator.js';

// Prova de conceito da issue API-14 ("se sobrar tempo"): gerar o trecho
// Swagger de POST/PATCH /ferramentas a partir dos schemas Zod já existentes,
// em vez de manter a lista de propriedades duplicada à mão no comentário
// @openapi de ferramentaRoutes.ts. extendZodWithOpenApi precisa rodar antes
// de qualquer .openapi() ser chamado — como ele patcheia o prototype de
// ZodType, funciona mesmo com schemas já criados em ferramentaValidator.ts.
// ATENÇÃO: efeito colateral global — qualquer módulo que passar a usar
// .openapi() precisa garantir que este arquivo já foi importado antes.
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: '/ferramentas',
  tags: ['Ferramentas'],
  summary: 'Cadastra uma nova ferramenta',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: criarFerramentaSchema },
      },
    },
  },
  responses: {
    201: { description: 'Ferramenta criada com sucesso' },
    400: { description: 'Erro de validação nos campos' },
    401: { description: 'Token inválido ou não fornecido' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/ferramentas/{id}',
  tags: ['Ferramentas'],
  summary: 'Atualiza os campos editáveis de uma ferramenta',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.coerce.number().int().openapi({
        param: { name: 'id', in: 'path', required: true },
        type: 'integer',
        description: 'ID da ferramenta',
      }),
    }),
    body: {
      content: {
        'application/json': { schema: atualizarFerramentaSchema },
      },
    },
  },
  responses: {
    200: { description: 'Ferramenta atualizada com sucesso' },
    400: { description: 'Erro de validação nos campos' },
    401: { description: 'Token inválido ou não fornecido' },
    404: { description: 'Ferramenta não encontrada' },
  },
});

// Documento isolado (só as 2 rotas desta prova de conceito). swagger.ts faz
// o merge dos paths gerados aqui com o restante do spec vindo do
// swagger-jsdoc (as demais rotas continuam documentadas por @openapi manual).
export function gerarPathsFerramentasViaZod() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const documento = generator.generateDocument({
    openapi: '3.0.0',
    info: { title: 'poc-zod-to-openapi', version: '1.0.0' },
  });
  return documento.paths ?? {};
}
