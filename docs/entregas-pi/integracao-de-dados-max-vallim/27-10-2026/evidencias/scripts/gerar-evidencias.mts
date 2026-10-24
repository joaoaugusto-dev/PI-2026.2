/**
 * Gera as evidências da entrega "Transformação, Validação e Qualidade dos Dados" a partir de execuções reais
 * contra o banco de desenvolvimento. Rode de dentro de api/:
 *
 *   npx tsx ../docs/entregas-pi/integracao-de-dados-max-vallim/27-10-2026/evidencias/scripts/gerar-evidencias.mts
 *
 * Tudo que o script grava no banco leva o prefixo ZZEVID_ e é removido no fim (a contagem de linhas antes e
 * depois vai no arquivo 03). Nenhum token, senha ou conteúdo do .env é escrito nos arquivos de saída.
 */
import { execFile } from 'child_process';
import fs from 'fs';
import http from 'http';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const API = process.cwd();
const SAIDA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireApi = createRequire(path.join(API, 'package.json'));
const jwt = requireApi('jsonwebtoken') as typeof import('jsonwebtoken');
const P = 'ZZEVID_';

const head = (await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: API })).stdout.trim();
const sujo = (await execFileAsync('git', ['status', '--porcelain', '--', '.'], { cwd: API })).stdout.trim() !== '';
const commit = sujo ? `${head} + alterações ainda não commitadas` : head;
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' });
const semAnsi = (t: string) => t.replace(/\u001b\[[0-9;]*m/g, '');

const db = await import(pathToFileURL(path.join(API, 'src/config/database.ts')).href);
const { env } = await import(pathToFileURL(path.join(API, 'src/config/env.ts')).href);
const { default: app } = await import(pathToFileURL(path.join(API, 'src/app.ts')).href);
const { query, pool } = db as { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>; pool: { end: () => Promise<void> } };

function cabecalho(titulo: string, comando: string): string {
  return [
    `# ${titulo}`,
    `# Gerado em: ${agora()} (Brasília)`,
    `# Comando: ${comando}`,
    `# Ambiente: banco de desenvolvimento (${env.db.database} @ ${env.db.host}:${env.db.port}) · commit ${commit}`,
    '',
  ].join('\n');
}
const gravar = (arquivo: string, texto: string) => fs.writeFileSync(path.join(SAIDA, arquivo), texto, 'utf-8');

// --------------------------------------------------------------------------------------------- servidor + HTTP
const servidor = http.createServer(app);
await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${(servidor.address() as any).port}/v1`;

const usuarioManutencao = (await query("SELECT id FROM usuarios WHERE papel = 'manutencao' AND ativo ORDER BY id LIMIT 1")).rows[0].id;
const usuarioAdmin = (await query("SELECT id FROM usuarios WHERE papel = 'admin' AND ativo ORDER BY id LIMIT 1")).rows[0]?.id ?? usuarioManutencao;
const token = (papel: string, id: number) => jwt.sign({ id, nome: 'Evidência', papel, matricula: '0001' }, env.jwt.secret, { expiresIn: '1h' });
const tManut = token('manutencao', usuarioManutencao);
const tAdmin = token('admin', usuarioAdmin);
const tConsulta = token('consulta', usuarioManutencao);

async function chamar(metodo: string, rota: string, opcoes: { token?: string | null; json?: unknown; corpo?: string; tipo?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opcoes.token) headers.Authorization = `Bearer ${opcoes.token}`;
  let body: string | undefined;
  if (opcoes.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opcoes.json);
  } else if (opcoes.corpo !== undefined) {
    headers['Content-Type'] = opcoes.tipo ?? 'application/json';
    body = opcoes.corpo;
  }
  const r = await fetch(base + rota, { method: metodo, headers, body });
  const texto = await r.text();
  let json: any;
  try {
    json = JSON.parse(texto);
  } catch {
    json = texto;
  }
  return { status: r.status, body: json };
}

// --------------------------------------------------------------------------------------------- dados de apoio
const grupo = (await query("SELECT id, nome FROM grupos_ferramentas WHERE ativo ORDER BY id LIMIT 1")).rows[0];
const setor = (await query('SELECT id, nome FROM setores WHERE ativo ORDER BY id LIMIT 1')).rows[0];
const colaborador = (await query('SELECT id FROM colaboradores WHERE ativo ORDER BY id LIMIT 1')).rows[0].id;
const existente = (
  await query(
    `SELECT nome, marca, modelo, codigo_identificacao FROM ferramentas
     WHERE ativo AND marca IS NOT NULL AND modelo IS NOT NULL AND nome NOT LIKE 'ZZ%' ORDER BY id LIMIT 1`
  )
).rows[0];

const TABELAS = ['ferramentas', 'emprestimos', 'ocorrencias', 'colaboradores', 'auditoria'] as const;
async function contagens() {
  const r: Record<string, number> = {};
  for (const t of TABELAS) r[t] = (await query(`SELECT COUNT(*)::int AS n FROM ${t}`)).rows[0].n;
  return r;
}

/** Apaga o que o script criou (por id), na ordem das FKs, junto com as linhas de auditoria desses registros. */
async function apagar(ids: { ferramentas?: number[]; emprestimos?: number[]; ocorrencias?: number[]; colaboradores?: number[] }) {
  const f = ids.ferramentas ?? [];
  const oc = (await query('SELECT id FROM ocorrencias WHERE ferramenta_id = ANY($1)', [f])).rows.map((r) => r.id).concat(ids.ocorrencias ?? []);
  const em = (await query('SELECT id FROM emprestimos WHERE ferramenta_id = ANY($1)', [f])).rows.map((r) => r.id).concat(ids.emprestimos ?? []);
  await query('DELETE FROM ocorrencias WHERE id = ANY($1)', [oc]);
  await query('DELETE FROM emprestimos WHERE id = ANY($1)', [em]);
  await query('DELETE FROM ferramentas WHERE id = ANY($1)', [f]);
  if (ids.colaboradores?.length) await query('DELETE FROM colaboradores WHERE id = ANY($1)', [ids.colaboradores]);
  await query(
    `DELETE FROM auditoria WHERE (tabela = 'ferramentas' AND registro_id = ANY($1)) OR (tabela = 'emprestimos' AND registro_id = ANY($2))
       OR (tabela = 'ocorrencias' AND registro_id = ANY($3)) OR (tabela = 'colaboradores' AND registro_id = ANY($4))`,
    [f, em, oc, ids.colaboradores ?? []]
  );
}

async function dataCheck(args: string[] = []): Promise<{ saida: string; codigo: number }> {
  try {
    const r = await execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/data-check.ts', ...args], { cwd: API });
    return { saida: semAnsi(r.stdout), codigo: 0 };
  } catch (e: any) {
    return { saida: semAnsi(e.stdout ?? String(e)), codigo: e.code ?? 1 };
  }
}

// ============================================================================================ 01 testes
{
  console.log('01 testes…');
  const r = await execFileAsync('npx', ['vitest', 'run', '--reporter=verbose'], { cwd: API, shell: true, maxBuffer: 1 << 28 }).catch((e) => e);
  const linhas = semAnsi(String(r.stdout ?? ''))
    .split(/\r?\n/)
    .filter((l) => /^\s*(✓|✗|×|❯|RUN|Test Files|Tests|Start at|Duration)/.test(l) || /^\s*FAIL/.test(l));
  gravar('01-testes-vitest.txt', cabecalho('Suíte de testes automatizados (Vitest + Supertest)', 'cd api && npx vitest run --reporter=verbose') + linhas.join('\n') + '\n');
}

// ============================================================================================ 02 data:check (estado atual)
{
  console.log('02 data:check…');
  const r = await dataCheck();
  gravar('02-data-check-estado-atual.txt', cabecalho('data:check no estado atual do banco', 'cd api && npm run data:check') + r.saida + `\n[código de saída: ${r.codigo}]\n`);
}

// ============================================================================================ 03 data:check com inconsistências forçadas
{
  console.log('03 inconsistências…');
  const antes = await contagens();
  const ids = { ferramentas: [] as number[], emprestimos: [] as number[], ocorrencias: [] as number[], colaboradores: [] as number[] };
  const ferr = async (nome: string, extra = '') => {
    const id = (await query('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${P}${nome}`, grupo.id])).rows[0].id;
    ids.ferramentas.push(id);
    if (extra) await query(`UPDATE ferramentas SET ${extra} WHERE id = $1`, [id]);
    return id;
  };
  try {
    await ferr('em uso sem emprestimo', `status = 'em_uso'`);
    await ferr('indisponivel sem motivo', `status = 'indisponivel'`);
    await ferr('valor negativo', 'valor_aquisicao = -50');
    const vazio = await ferr('nome em branco');
    await query(`UPDATE ferramentas SET nome = '   ' WHERE id = $1`, [vazio]);
    const f = await ferr('previsao antes da retirada');
    ids.emprestimos.push(
      (
        await query(
          `INSERT INTO emprestimos (ferramenta_id, colaborador_id, setor_destino_id, usuario_retirada_id, previsao_devolucao)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '3 days') RETURNING id`,
          [f, colaborador, setor.id, usuarioManutencao]
        )
      ).rows[0].id
    );
    const antesTxt = (await dataCheck(['--so-erros'])).saida;
    gravar(
      '03-data-check-inconsistencia-forcada.txt',
      cabecalho(
        'data:check detectando inconsistências forçadas de propósito',
        'cd api && npm run data:check -- --so-erros   (antes e depois da limpeza)'
      ) +
        'Inconsistências criadas (registros com prefixo ZZEVID_): ferramenta "em uso" sem empréstimo; indisponível sem motivo;\n' +
        'valor de aquisição negativo; nome em branco; empréstimo com previsão de devolução anterior à retirada.\n\n' +
        '=== 1. COM as inconsistências ===\n' +
        antesTxt
    );
  } finally {
    await apagar(ids);
  }
  const depois = await contagens();
  const limpo = await dataCheck(['--so-erros']);
  const atual = fs.readFileSync(path.join(SAIDA, '03-data-check-inconsistencia-forcada.txt'), 'utf-8');
  gravar(
    '03-data-check-inconsistencia-forcada.txt',
    atual +
      '\n=== 2. DEPOIS de remover os registros de teste ===\n' +
      limpo.saida +
      '\n=== 3. Banco restaurado (contagem de linhas) ===\n' +
      TABELAS.map((t) => `${t.padEnd(14)} antes: ${String(antes[t]).padStart(5)}   depois: ${String(depois[t]).padStart(5)}   ${antes[t] === depois[t] ? 'igual' : 'DIFERENTE'}`).join('\n') +
      '\n'
  );
}

// ============================================================================================ 04/05 importação CSV
{
  console.log('04/05 importação…');
  const csv = [
    'nome;categoria;marca;modelo;setor;localizacao;descricao;valor',
    `  ${P.toLowerCase()}furadeira de impacto  ;${grupo.nome};Bosch;GSB 13;${setor.nome};Armário 2;;1.234,56`,
    `${P}Chave de fenda   Phillips nº 2;${grupo.nome};Tramontina;;;Gaveta 4;;R$ 18,90`,
    `${P}Alicate de corte;Categoria Inexistente;Gedore;;;;;45,00`,
    `${P}Martelo;${grupo.nome};Tramontina;;;;;12,5,0`,
    `A;${grupo.nome};;;;;;`,
    `${P}Furadeira de impacto;${grupo.nome};Bosch;GSB 13;;;;1234,56`,
    `${P}Serra tico-tico;${grupo.nome};Makita;4329;;Armário 1;;99999999999`,
    `${existente.nome};${grupo.nome};${existente.marca};${existente.modelo};;;;10,00`,
  ].join('\n');
  fs.writeFileSync(path.join(SAIDA, 'importacao-exemplo.csv'), csv + '\n', 'utf-8');

  const antes = await contagens();
  const r = await chamar('POST', '/importacoes/ferramentas', { token: tManut, corpo: csv, tipo: 'text/csv' });
  const aceitasIds: number[] = (r.body?.data?.aceitas ?? []).map((a: any) => a.id);
  const gravadas = (
    await query(
      `SELECT id, codigo_identificacao, nome, marca, modelo, localizacao, valor_aquisicao, status FROM ferramentas WHERE id = ANY($1) ORDER BY id`,
      [aceitasIds]
    )
  ).rows;
  const auditoriaImport = (await query(`SELECT operacao, usuario_id = $2 AS usuario_do_jwt, dados_novos->>'nome' AS nome FROM auditoria WHERE tabela = 'ferramentas' AND registro_id = ANY($1) ORDER BY id`, [aceitasIds, usuarioManutencao])).rows;
  await apagar({ ferramentas: aceitasIds });
  const depois = await contagens();

  gravar(
    '04-importacao-csv-relatorio.json',
    JSON.stringify(
      {
        _origem: `POST /v1/importacoes/ferramentas (text/csv) com evidencias/importacao-exemplo.csv · gerado em ${agora()} · commit ${commit}`,
        http: r.status,
        resposta: r.body,
      },
      null,
      2
    ) + '\n'
  );

  const linhasCsv = csv.split('\n');
  const tabelaGravadas = gravadas
    .map((g) => `| ${g.id} | ${String(g.codigo_identificacao).padStart(4, '0')} | ${g.nome} | ${g.marca ?? '—'} | ${g.modelo ?? '—'} | ${g.localizacao ?? '—'} | ${g.valor_aquisicao ?? '—'} | ${g.status} |`)
    .join('\n');
  gravar(
    '05-importacao-antes-depois.md',
    `${cabecalho('Importação de CSV: o que veio no arquivo × o que foi gravado', 'POST /v1/importacoes/ferramentas + SELECT nas linhas aceitas')}
## Linhas do arquivo (como vieram)

\`\`\`text
${linhasCsv.map((l, i) => `${String(i + 1).padStart(2, '0')}: ${l}`).join('\n')}
\`\`\`

## Resultado (resumo da API)

\`\`\`json
${JSON.stringify(r.body?.data?.resumo, null, 2)}
\`\`\`

## Linhas aceitas depois de gravadas no banco

| id | código | nome | marca | modelo | localização | valor | status |
|---|---|---|---|---|---|---|---|
${tabelaGravadas}

Transformações visíveis acima: o nome foi aparado, teve os espaços repetidos reduzidos e foi gravado em **maiúsculas**; \`1.234,56\` e \`R$ 18,90\` viraram o numérico \`1234.56\` e \`18.90\`; o código de identificação foi gerado pelo banco (a planilha não traz).

## Linhas que não entraram, e por quê

| Linha | Situação | Motivo |
|---|---|---|
${[...(r.body?.data?.rejeitadas ?? []).map((x: any) => `| ${x.linha} | rejeitada | ${x.motivos.join('; ')} |`), ...(r.body?.data?.ignoradas ?? []).map((x: any) => `| ${x.linha} | ignorada | ${x.motivo} |`)].join('\n')}

## Auditoria das linhas aceitas (trigger do banco, usuário vindo do JWT)

| operação | usuário do JWT | nome |
|---|---|---|
${auditoriaImport.map((a) => `| ${a.operacao} | ${a.usuario_do_jwt ? 'sim' : 'não'} | ${a.nome} |`).join('\n')}

## Banco restaurado

${TABELAS.map((t) => `- ${t}: ${antes[t]} antes, ${depois[t]} depois`).join('\n')}
`
  );
}

// ============================================================================================ 06 auditoria
{
  console.log('06 auditoria…');
  const ids = { ferramentas: [] as number[] };
  let texto = '';
  try {
    const criada = await chamar('POST', '/ferramentas', { token: tManut, json: { nome: `${P}Esmerilhadeira`, grupoId: grupo.id } });
    const f = criada.body.data.id as number;
    ids.ferramentas.push(f);
    const ret = await chamar('POST', '/emprestimos', {
      token: tManut,
      json: { ferramentaId: f, colaboradorId: colaborador, setorDestinoId: setor.id, previsaoDevolucao: new Date(Date.now() + 2 * 864e5).toISOString() },
    });
    const dev = await chamar('PATCH', `/emprestimos/${ret.body.data.id}/devolucao`, {
      token: tManut,
      json: { condicaoDevolucao: 'avaria', observacoesDevolucao: 'disco trincado', usuarioDevolucaoId: 999999 },
    });
    await chamar('PATCH', `/ferramentas/${f}`, { token: tAdmin, json: { localizacao: 'Armário 7' } });
    const oc = (await query('SELECT id FROM ocorrencias WHERE ferramenta_id = $1', [f])).rows[0].id;

    const trilha = async (tabela: string, id: number) => (await chamar('GET', `/auditoria?tabela=${tabela}&registroId=${id}&limit=20`, { token: tAdmin })).body;
    const ft = await trilha('ferramentas', f);
    const em = await trilha('emprestimos', ret.body.data.id);
    const ot = await trilha('ocorrencias', oc);
    const resumir = (b: any) =>
      b.data
        .slice()
        .reverse()
        .map((l: any) => ({ operacao: l.operacao, usuario_do_jwt: l.usuario_id === usuarioManutencao || l.usuario_id === usuarioAdmin, dados_anteriores: l.dados_anteriores && Object.keys(l.dados_anteriores).length > 8 ? '(registro completo)' : l.dados_anteriores, dados_novos: l.dados_novos && Object.keys(l.dados_novos).length > 8 ? '(registro completo)' : l.dados_novos }));
    const bloco = (t: string, b: any) => `### ${t}\n\n\`\`\`json\n${JSON.stringify(resumir(b), null, 2)}\n\`\`\`\n`;
    const completo = ft.data.find((l: any) => l.operacao === 'INSERT');

    texto =
      cabecalho('Auditoria automática em jsonb: exemplos reais', 'fluxo pela API (criar → retirar → devolver com avaria → editar) e GET /v1/auditoria') +
      `
Fluxo executado: \`POST /ferramentas\` → \`POST /emprestimos\` → \`PATCH /emprestimos/:id/devolucao\` (condição avaria, com \`usuarioDevolucaoId: 999999\` no corpo, que deve ser ignorado) → \`PATCH /ferramentas/:id\` (admin).
Retorno HTTP: criar ${criada.status}, retirada ${ret.status}, devolução ${dev.status}.

Trilhas lidas por \`GET /v1/auditoria?tabela=…&registroId=…\` (ordem cronológica; "(registro completo)" = o INSERT grava a linha inteira):

${bloco('Ferramenta (cada mudança de status e a edição aparecem com só as colunas que mudaram)', ft)}
${bloco('Empréstimo (INSERT da retirada e UPDATE da devolução)', em)}
${bloco('Ocorrência (aberta sozinha pela trigger fn_abre_ocorrencia, herdando o colaborador)', ot)}
### INSERT completo da ferramenta (dados_novos)

\`\`\`json
${JSON.stringify(completo?.dados_novos, null, 2)}
\`\`\`

### Prova da regra 6 (responsável vem do JWT, não do corpo)

\`\`\`text
usuario_devolucao_id gravado no empréstimo: ${(await query('SELECT usuario_devolucao_id FROM emprestimos WHERE id = $1', [ret.body.data.id])).rows[0].usuario_devolucao_id}  (enviado no corpo: 999999; usuário do token: ${usuarioManutencao})
\`\`\`
`;
  } finally {
    await apagar(ids);
  }
  gravar('06-auditoria-exemplos.md', texto);
}

// ============================================================================================ 07 erros de validação
{
  console.log('07 validação…');
  const f = (await query('INSERT INTO ferramentas (nome, grupo_id) VALUES ($1, $2) RETURNING id', [`${P}Validacao`, grupo.id])).rows[0].id as number;
  const ids = { ferramentas: [f], colaboradores: [] as number[] };
  const passado = new Date(Date.now() - 864e5).toISOString();
  const futuro = new Date(Date.now() + 2 * 864e5).toISOString();
  const casos: { titulo: string; metodo: string; rota: string; opcoes: any }[] = [
    { titulo: 'Ferramenta com nome de 1 letra', metodo: 'POST', rota: '/ferramentas', opcoes: { token: tAdmin, json: { nome: 'A', grupoId: grupo.id } } },
    { titulo: 'Ferramenta sem categoria (grupoId)', metodo: 'POST', rota: '/ferramentas', opcoes: { token: tAdmin, json: { nome: `${P}Sem grupo` } } },
    { titulo: 'Colaborador com matrícula inválida', metodo: 'POST', rota: '/colaboradores', opcoes: { token: tManut, json: { nome: 'Fulano', matricula: '12AB', setorId: setor.id } } },
    { titulo: 'Retirada sem previsão de devolução', metodo: 'POST', rota: '/emprestimos', opcoes: { token: tManut, json: { ferramentaId: f, colaboradorId: colaborador, setorDestinoId: setor.id } } },
    { titulo: 'Retirada com previsão no passado', metodo: 'POST', rota: '/emprestimos', opcoes: { token: tManut, json: { ferramentaId: f, colaboradorId: colaborador, setorDestinoId: setor.id, previsaoDevolucao: passado } } },
    { titulo: 'Retirada de ferramenta inexistente', metodo: 'POST', rota: '/emprestimos', opcoes: { token: tManut, json: { ferramentaId: 99999999, colaboradorId: colaborador, setorDestinoId: setor.id, previsaoDevolucao: futuro } } },
    { titulo: 'Retirada com JSON malformado', metodo: 'POST', rota: '/emprestimos', opcoes: { token: tManut, corpo: '{ "ferramentaId": 1, ', tipo: 'application/json' } },
    { titulo: 'KPI com período invertido (de depois de ate)', metodo: 'GET', rota: '/kpis/ferramentas-mais-retiradas?de=2026-10-20&ate=2026-10-01', opcoes: { token: tManut } },
    { titulo: 'KPI com data impossível (30 de fevereiro)', metodo: 'GET', rota: '/kpis/taxa-avaria?de=2026-02-30&ate=2026-03-10', opcoes: { token: tManut } },
    { titulo: 'Auditoria com tabela desconhecida', metodo: 'GET', rota: '/auditoria?tabela=usuarios', opcoes: { token: tAdmin } },
    { titulo: 'Auditoria sem token', metodo: 'GET', rota: '/auditoria', opcoes: {} },
    { titulo: 'Auditoria com perfil manutenção (só admin)', metodo: 'GET', rota: '/auditoria', opcoes: { token: tManut } },
    { titulo: 'Edição de ferramenta pela manutenção (só admin)', metodo: 'PATCH', rota: `/ferramentas/${f}`, opcoes: { token: tManut, json: { localizacao: 'X' } } },
    { titulo: 'Consulta tentando rota de balcão', metodo: 'GET', rota: '/ferramentas', opcoes: { token: tConsulta } },
    { titulo: 'Importação de CSV sem a coluna obrigatória', metodo: 'POST', rota: '/importacoes/ferramentas', opcoes: { token: tManut, corpo: 'nome;marca\nMartelo;Tramontina\n', tipo: 'text/csv' } },
    { titulo: 'Importação de recurso desconhecido', metodo: 'POST', rota: '/importacoes/usuarios', opcoes: { token: tAdmin, corpo: 'nome\nX\n', tipo: 'text/csv' } },
  ];
  // retirada válida seguida de outra no mesmo item: 409
  const ok = await chamar('POST', '/emprestimos', { token: tManut, json: { ferramentaId: f, colaboradorId: colaborador, setorDestinoId: setor.id, previsaoDevolucao: futuro } });
  casos.push({ titulo: 'Segunda retirada da mesma ferramenta (um empréstimo aberto por ferramenta, regra 1)', metodo: 'POST', rota: '/emprestimos', opcoes: { token: tManut, json: { ferramentaId: f, colaboradorId: colaborador, setorDestinoId: setor.id, previsaoDevolucao: futuro } } });
  const abertoId = ok.body?.data?.id;
  casos.push({ titulo: 'Devolução com condição inexistente', metodo: 'PATCH', rota: `/emprestimos/${abertoId}/devolucao`, opcoes: { token: tManut, json: { condicaoDevolucao: 'quebrada' } } });
  casos.push({ titulo: 'Devolução "ok" com custo estimado', metodo: 'PATCH', rota: `/emprestimos/${abertoId}/devolucao`, opcoes: { token: tManut, json: { condicaoDevolucao: 'ok', custoEstimado: 80 } } });

  let md = cabecalho('Validação nas rotas de escrita: requisições inválidas e a resposta da API', 'requisições HTTP reais à API (app em memória)') + '\n';
  md += `Cada caso abaixo foi executado de verdade. A resposta é sempre o envelope padrão de erro \`{ "error": { "code", "message", "details" } }\`.\n\n`;
  md += '| # | Caso | Requisição | HTTP | `error.code` | Mensagem / detalhe |\n|---|---|---|---|---|---|\n';
  let n = 0;
  const detalhes: string[] = [];
  try {
    for (const c of casos) {
      n++;
      const r = await chamar(c.metodo, c.rota, c.opcoes);
      const e = r.body?.error ?? {};
      const det = Array.isArray(e.details) && e.details.length ? e.details.map((d: any) => (d.field ? `${d.field}: ${d.message}` : d.message ?? JSON.stringify(d))).join('; ') : '';
      md += `| ${n} | ${c.titulo} | \`${c.metodo} /v1${c.rota.split('?')[0]}\` | **${r.status}** | ${e.code ?? '—'} | ${(e.message ?? '').replace(/\|/g, '/')}${det ? ` — ${det.replace(/\|/g, '/')}` : ''} |\n`;
      if (n <= 3 || /JSON|previsão/.test(c.titulo) || /409|Segunda/.test(c.titulo)) detalhes.push(`### ${n}. ${c.titulo}\n\n\`\`\`json\n${JSON.stringify(r.body, null, 2)}\n\`\`\`\n`);
    }
    md += '\n## Respostas completas de alguns casos\n\n' + detalhes.join('\n');
    // sucesso, para contraste
    md += `\n## Contraste: a mesma retirada, válida\n\nA primeira retirada de "${P}Validacao" (HTTP ${ok.status}) foi aceita; só a segunda foi barrada com 409.\n`;
  } finally {
    await apagar(ids);
  }
  gravar('07-validacao-api-erros.md', md);
}

// ============================================================================================ 08 feriados (BrasilAPI)
{
  console.log('08 feriados…');
  const sync = await execFileAsync(process.execPath, ['--import', 'tsx', 'scripts/sincronizar-feriados.ts', '2026'], { cwd: API }).then(
    (r) => semAnsi(r.stdout + r.stderr),
    (e) => semAnsi(String(e.stdout ?? '') + String(e.stderr ?? '') + `\n[falhou: ${e.message}]`)
  );
  const rows = (await query(`SELECT to_char(f.data, 'DD/MM/YYYY') AS data, f.nome, f.tipo FROM feriados f WHERE f.ano = 2026 ORDER BY f.data`)).rows;
  const dia = await chamar('GET', '/feriados/dia-util?data=2026-09-07', { token: tManut });
  const sab = await chamar('GET', '/feriados/dia-util?data=2026-10-24', { token: tManut });
  const segunda = await chamar('GET', '/feriados/dia-util?data=2026-10-26', { token: tManut });
  const teste = await execFileAsync('npx', ['vitest', 'run', 'src/tests/feriado.test.ts', 'src/tests/feriadoFallback.test.ts', '--reporter=verbose'], { cwd: API, shell: true, maxBuffer: 1 << 26 }).catch((e) => e);
  const linhasTeste = semAnsi(String(teste.stdout ?? '')).split(/\r?\n/).filter((l) => /^\s*(✓|×|❯|Test Files|Tests)/.test(l));
  gravar(
    '08-feriados-brasilapi.md',
    `${cabecalho('Fonte externa: feriados nacionais da BrasilAPI', 'npm run db:feriados -- 2026 · SELECT em feriados · GET /v1/feriados/dia-util')}
## Sincronização (BrasilAPI → tabela \`feriados\`)

\`\`\`text
${sync.trim()}
\`\`\`

## Registros gravados (ano 2026)

| Data | Feriado | Tipo |
|---|---|---|
${rows.map((r) => `| ${r.data} | ${r.nome} | ${r.tipo ?? '—'} |`).join('\n')}

Total: ${rows.length} feriados.

## Uso no cálculo de dias úteis (GET /v1/feriados/dia-util)

| Data | Resposta |
|---|---|
| 2026-09-07 (Independência, segunda-feira) | \`${JSON.stringify(dia.body.data ?? dia.body)}\` |
| 2026-10-24 (sábado) | \`${JSON.stringify(sab.body.data ?? sab.body)}\` |
| 2026-10-26 (segunda-feira comum) | \`${JSON.stringify(segunda.body.data ?? segunda.body)}\` |

## Fallback e falha de banco (testes automatizados)

\`\`\`text
${linhasTeste.join('\n')}
\`\`\`

O arquivo feriadoFallback.test.ts simula a rede com um fetch falso e cobre: BrasilAPI com erro de rede e com erro HTTP → fallback de sábado e domingo (104 dias em 2003, sem gravar no cache); BrasilAPI no ar → upsert no cache e leitura seguinte sem nova chamada; e falha de banco → erro repassado, **sem** mascarar como fallback.
`
  );
}

servidor.close();
await pool.end();
console.log('evidências geradas em', SAIDA);
