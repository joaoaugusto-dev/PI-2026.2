# Monta o PDF do relatório. uso: python3 -I relatorio.py <scratchpad> <saida.pdf>
import json, sys, os, csv
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, Image,
                                PageBreak, KeepTogether, NextPageTemplate, Preformatted)

S, SAIDA = sys.argv[1], sys.argv[2]
O, G = f'{S}/out', f'{S}/graficos'
N = '/usr/share/fonts/truetype/noto'
pdfmetrics.registerFont(TTFont('Noto', f'{N}/NotoSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Noto-B', f'{N}/NotoSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Noto-I', f'{N}/NotoSans-Italic.ttf'))
pdfmetrics.registerFont(TTFont('DV', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Mono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Noto', normal='Noto', bold='Noto-B', italic='Noto-I', boldItalic='Noto-B')

VERM, PRETO, CINZA, LINHA, FUNDO = colors.HexColor('#E30613'), colors.HexColor('#1D1D1B'), colors.HexColor('#575756'), colors.HexColor('#D9D9D9'), colors.HexColor('#F5F5F3')
OK, ATENCAO, CRIT = colors.HexColor('#1B8A4B'), colors.HexColor('#C77700'), colors.HexColor('#E30613')

st = lambda name, **kw: ParagraphStyle(name, **{'fontName': 'Noto', 'fontSize': 9.5, 'leading': 13.5, 'textColor': PRETO, **kw})
P = st('p', spaceAfter=5)
PS = st('ps', fontSize=8, leading=10.5, textColor=CINZA)
H1 = st('h1', fontName='Noto-B', fontSize=17, leading=21, spaceBefore=4, spaceAfter=8)
H2 = st('h2', fontName='Noto-B', fontSize=12, leading=15, spaceBefore=10, spaceAfter=5)
H3 = st('h3', fontName='Noto-B', fontSize=10, leading=13, spaceBefore=6, spaceAfter=3)
TC = st('tc', fontSize=8, leading=10.5)
TCB = st('tcb', fontName='Noto-B', fontSize=8, leading=10.5, textColor=colors.white)
BUL = st('bul', leftIndent=12, bulletIndent=2, spaceAfter=2)
COD = ParagraphStyle('cod', fontName='Mono', fontSize=7, leading=9, textColor=PRETO, backColor=FUNDO, borderPadding=5, leftIndent=4, rightIndent=4, spaceBefore=4, spaceAfter=8)

import re as _re
GLIFO = lambda t: _re.sub('([→≈≥⊇])', r'<font name="DV">\1</font>', t) if isinstance(t, str) else t
def p(t, s=P): return Paragraph(GLIFO(t), s)
def bullets(itens): return [Paragraph(GLIFO(i), BUL, bulletText='•') for i in itens]
def img(nome, w=170):
    from reportlab.lib.utils import ImageReader
    iw, ih = ImageReader(f'{G}/{nome}.png').getSize()
    return Image(f'{G}/{nome}.png', width=w * mm, height=w * mm * ih / iw)
def legenda(t): return p(f'<i>{t}</i>', PS)
def tabela(linhas, larguras, cab=True, zebra=True, extra=()):
    dados = [[c if not isinstance(c, str) else Paragraph(GLIFO(c), TCB if (cab and i == 0) else TC) for c in l] for i, l in enumerate(linhas)]
    t = Table(dados, colWidths=[w * mm for w in larguras], repeatRows=1 if cab else 0)
    s = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -1), .4, LINHA), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]
    if cab: s += [('BACKGROUND', (0, 0), (-1, 0), PRETO)]
    if zebra: s += [('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, FUNDO])]
    t.setStyle(TableStyle(s + list(extra)))
    return t
def selo(txt, cor): return f'<font color="{cor.hexval().replace("0x", "#")}"><b>{txt}</b></font>'
SOK, SAT, SCR = selo('OK', OK), selo('ATENÇÃO', ATENCAO), selo('BLOQUEANTE', CRIT)

J = lambda f: json.load(open(f'{O}/{f}'))
api, web = J('api-tests.json'), J('web-tests.json')
conc, seg, br = J('concorrencia.json'), J('seguranca.json'), J('browser.json')
loads = {c: J(f'load-{c}.json')['total'] for c in [1, 5, 10, 25, 50, 100, 200]}
spikes = {c: J(f'spike-{c}.json')['total'] for c in [500, 1000] if os.path.exists(f'{O}/spike-{c}.json')}
soak = J('soak.json')['total']
imp = list(csv.DictReader(open(f'{O}/import-bench2.csv')))
fa, fd = J('front-import.json'), J('front-import-fix.json')
mon = list(csv.DictReader(open(f'{O}/monitor.csv')))
seg_ok = sum(c['ok'] for c in seg)
seg_fail = [c for c in seg if not c['ok']]
CTX = json.load(open(f'{O}/contexto.json'))

def rodape(c, doc):
    c.saveState()
    c.setFont('Noto', 7.5); c.setFillColor(CINZA)
    c.drawString(18 * mm, 10 * mm, 'SOUFER Tools · Relatório de prontidão para implantação · 09/10/2026')
    c.drawRightString(192 * mm, 10 * mm, f'página {doc.page}')
    c.setStrokeColor(VERM); c.setLineWidth(1.4); c.line(18 * mm, 287 * mm, 192 * mm, 287 * mm)
    c.restoreState()
def capa(c, doc):
    c.saveState()
    c.setFillColor(PRETO); c.rect(0, 0, 210 * mm, 297 * mm, fill=1, stroke=0)
    c.setFillColor(VERM); c.rect(0, 200 * mm, 210 * mm, 3 * mm, fill=1, stroke=0)
    logo = '/home/joao/development/projetos/PI-2026.2/web/public/brand/soufer-branco.png'
    if os.path.exists(logo): c.drawImage(logo, 20 * mm, 240 * mm, width=60 * mm, height=30 * mm, preserveAspectRatio=True, mask='auto', anchor='sw')
    c.setFillColor(colors.white); c.setFont('Noto-B', 30); c.drawString(20 * mm, 175 * mm, 'SOUFER Tools')
    c.setFont('Noto', 16); c.drawString(20 * mm, 163 * mm, 'Relatório de prontidão para implantação')
    c.setFont('Noto', 11); c.setFillColor(colors.HexColor('#C9C9C4'))
    for i, l in enumerate(['Revisão completa, testes funcionais, de carga, estresse, resistência,', 'concorrência, segurança e usabilidade — com plano de ação para terça-feira.']):
        c.drawString(20 * mm, (150 - i * 6) * mm, l)
    c.setFont('Noto', 9)
    info = [f'Data: 09/10/2026 · Implantação prevista: terça-feira, 13/10/2026', f'Branch avaliada: {CTX["branch"]} @ {CTX["commit"]} (+ 3 arquivos não commitados do front)',
            'Ambiente de teste: build de produção local (NODE_ENV=production), PostgreSQL 14, banco isolado soufer_audit', 'PI 2026.2 · Desenvolvimento de Soluções Web Inteligentes e Integradas']
    for i, l in enumerate(info): c.drawString(20 * mm, (40 - i * 5.5) * mm, l)
    c.restoreState()

doc = BaseDocTemplate(SAIDA, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=17 * mm,
                      title='SOUFER Tools — Relatório de prontidão para implantação', author='Equipe SOUFER Tools', subject='Testes e prontidão')
fr = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate('capa', [fr], onPage=capa), PageTemplate('corpo', [fr], onPage=rodape)])
E = [NextPageTemplate('corpo'), PageBreak()]

# ---------------- 1. Sumário executivo
E += [p('1. Sumário executivo', H1)]
E += [p(f'<b>Veredito: o sistema está pronto para implantação na terça, desde que três itens bloqueantes sejam resolvidos antes</b> (todos pequenos, ~2 a 3 horas de trabalho somadas). '
        f'O núcleo — retirada, devolução, ocorrências, perfis e quiosque — está sólido: {api["numPassedTests"]}/{api["numTotalTests"]} testes da API e {web["numPassedTests"]}/{web["numTotalTests"]} do front passam, '
        f'nenhuma corrida de concorrência quebrou uma regra de negócio, a API não devolveu nenhum erro 5xx em {CTX["total_reqs"]:,} requisições de carga, '
        f'e {seg_ok} de {len(seg)} verificações de segurança passaram.'.replace(',', '.'))]
E += [p('Os três bloqueantes:', H3)]
E += bullets([
    '<b>Carga inicial do inventário fica lenta e pode estourar o tempo limite.</b> O gatilho que gera o código de 4 dígitos da ferramenta escolhe um plano de execução quadrático quando o banco está vazio — exatamente o estado do banco na terça. '
    f'Importar 800 ferramentas por CSV levou <b>60,3 s</b> (limite típico de proxy: 60 s); cadastrar 500 pela tela levou <b>{fa["segundos"]:.0f} s</b>, com cada cadastro ficando mais lento que o anterior. '
    f'Uma correção de 1 função SQL (seção 6) derruba para <b>7,2 s</b> e <b>{fd["segundos"]:.1f} s</b>, e foi validada contra a suíte inteira ({CTX["fix_tests"]}).',
    '<b>Senhas e contas de teste no banco de produção.</b> O guia de deploy (docs/nuvem/dokploy.md) manda rodar <font name="Mono">npm run db:seed</font>, que cria o admin 0053 e os operadores 0001/0002 com a senha <b>123456</b>, '
    'além de setores, categorias e atividades fictícios. Na produção isso é uma porta aberta e ainda ocupa matrículas que podem ser de funcionários reais.',
    '<b>Variáveis de produção obrigatórias.</b> A API se recusa a subir sem JWT_SECRET forte, DB_PASSWORD forte e CORS_ORIGIN (testado: a trava funciona). '
    'Falta também TRUST_PROXY_HOPS=1 atrás do proxy — sem ele todos os usuários dividem o mesmo IP e o limite de 10 logins/min passa a valer para a fábrica inteira.',
])
E += [Spacer(1, 4), p('Placar por área', H3)]
area = [['Área', 'Situação', 'Resumo'],
        ['Testes automatizados', SOK, f'{api["numPassedTests"]+web["numPassedTests"]} testes, 0 falhas; typecheck e build de produção sem erros; 17 avisos de lint (não bloqueiam).'],
        ['Regras de negócio sob concorrência', SOK, '50 retiradas simultâneas da mesma ferramenta: 1 aceita, 49 recusadas. 30 devoluções simultâneas: 1 aceita e exatamente 1 ocorrência aberta. Responsável vem sempre do token.'],
        ['Performance', SOK, f'Rotas do dia a dia respondem em 3–10 ms (p50). O histórico de empréstimos é o mais lento (~40 ms com 2 anos de dados); um índice leva a 1,8 ms.'],
        ['Carga e estresse', SOK, f'~{max(l["rps"] for l in loads.values()):.0f} req/s sustentadas; 0 erros 5xx até {max(list(loads)+list(spikes))} usuários simultâneos. A Soufer precisa de menos de 5 req/s.'],
        ['Resistência (soak)', SOK, f'4 min contínuos a 25 usuários: latência estável, memória estável (sem vazamento).'],
        ['Importação / carga inicial', SCR, 'Gatilho do código de ferramenta degrada com banco vazio. Correção pronta e testada (seção 6).'],
        ['Segurança da aplicação', SAT, f'{seg_ok}/{len(seg)} casos passaram. Pendências: JSON malformado vira erro 500, enumeração de matrícula por tempo, 1 dependência crítica (proxy-addr) com correção disponível.'],
        ['Configuração de produção', SCR, 'Seed com senha 123456, variáveis obrigatórias, volume de fotos, backup do banco. Checklist na seção 10.'],
        ['Usabilidade e responsividade', SAT if CTX['overflow'] else SOK, CTX['ux_resumo']]]
E += [tabela(area, [44, 24, 106])]
E += [PageBreak()]

# ---------------- 2. Escopo e método
E += [p('2. O que foi testado e como', H1)]
E += [p('Tudo foi executado contra o <b>build de produção</b> (TypeScript compilado, <font name="Mono">NODE_ENV=production</font>) e um banco PostgreSQL isolado criado só para esta auditoria — o banco de desenvolvimento da equipe não foi tocado e nenhum arquivo do repositório foi alterado. '
        'Para o teste refletir a Soufer, o banco foi populado com volume realista, a partir do relatório da visita técnica (parque estimado de ~1.000 ferramentas, giro diário de lixadeiras, extensões e chaves):')]
E += [tabela([['Dado', 'Volume', 'Equivale a'],
              ['Ferramentas', '1.500', '1,5× o parque estimado da Soufer'],
              ['Colaboradores', '403', 'quadro de funcionários com matrícula'],
              ['Empréstimos históricos', '50.000', '≈ 2 anos com ~70 retiradas por dia'],
              ['Empréstimos em aberto', '300 (60 atrasados)', 'pico de ferramentas fora ao mesmo tempo']], [50, 40, 84])]
E += [p('Bateria executada', H3)]
E += [tabela([['Tipo', 'Como', 'Pergunta respondida'],
              ['Funcional', 'Suítes Vitest/Supertest da API e do front, typecheck, lint, build', 'O código faz o que promete?'],
              ['Performance', '14 rotas, 1 usuário, 6 s cada, com banco cheio; EXPLAIN ANALYZE nas lentas', 'Quanto cada tela espera a API?'],
              ['Carga', 'Mistura realista de 12 rotas, 1→200 usuários sem pausa, 15 s por degrau', 'Quanto o sistema aguenta antes de degradar?'],
              ['Estresse / pico', '500 e 1.000 usuários simultâneos por 20 s', 'Onde quebra e como quebra?'],
              ['Resistência', '25 usuários contínuos por 4 min, memória e CPU amostradas a cada 1 s', 'Tem vazamento ou degradação no tempo?'],
              ['Concorrência', 'Corridas de retirada, devolução e cadastro + carga de escrita com 20 operadores', 'As regras inegociáveis seguram sob disputa?'],
              ['Importação', 'CSV de 100 a 2.000 linhas e 500 cadastros pela tela, banco vazio', 'A carga inicial da terça funciona?'],
              ['Segurança', f'{len(seg)} casos: JWT, perfis, injeção, uploads, CORS, força bruta, exposição; npm audit', 'Dá para burlar ou derrubar?'],
              ['Usabilidade', 'Chrome real em 360, 768 e 1280 px, 17 telas, erros de console, primeira carga', 'O funcionário consegue usar com clareza?']], [28, 80, 66])]
E += [Spacer(1, 6), p(f'<b>Máquina de teste:</b> {CTX["maquina"]}. <b>Atenção ao comparar:</b> o servidor de produção previsto (EC2 t3.micro, 2 vCPU com crédito, 1 GB) é várias vezes mais modesto; '
        'por isso os números de capacidade abaixo devem ser lidos como teto da aplicação, não do servidor. Mesmo com uma margem de 10×, a folga continua enorme para o uso da Soufer.', PS)]
E += [PageBreak()]

# ---------------- 3. Testes automatizados
E += [p('3. Testes automatizados e qualidade de código', H1)]
E += [img('testes', 160)]
E += [p(f'A suíte da API tem {api["numTotalTests"]} testes em {len(api["testResults"])} arquivos e cobre exatamente os pontos que mais quebram em produção: regras de retirada/devolução, kits, ocorrências, permissões por perfil, rate limit do login e do quiosque, convites, importação/exportação CSV, notificações e o próprio contrato do Swagger. '
        f'Todos passaram em {CTX["api_tempo"]:.1f} s contra um banco recém-migrado. O front tem {web["numTotalTests"]} testes de lógica (formatação, CSV, interceptors do Axios, resumo diário).')]
E += [tabela([['Verificação', 'Resultado'],
              ['API — vitest run', f'{api["numPassedTests"]}/{api["numTotalTests"]} ' + SOK],
              ['API — tsc --noEmit', 'sem erros ' + SOK],
              ['Web — vitest run', f'{web["numPassedTests"]}/{web["numTotalTests"]} ' + SOK],
              ['Web — tsc -b + vite build', 'sem erros ' + SOK],
              ['Web — oxlint', '0 erros, 17 avisos (8 only-export-components, 6 set-state-in-effect, 1 refs, 1 static-components, 1 incompatible-library) ' + SAT],
              ['Web — tamanho do bundle', '969 KB de JS (291 KB gzip) em um único arquivo; Vite avisa acima de 500 KB ' + SAT],
              ['Migrations do zero', '10 migrations aplicadas em 0,65 s ' + SOK],
              ['console.log / segredos no código', 'nenhum encontrado; .env não versionado ' + SOK]], [55, 119])]
E += [p('Sobre os arquivos não commitados da branch', H3)]
E += [p('A branch atual tem 3 arquivos alterados e não commitados (EtapasTratativa.tsx, OcorrenciaCard.tsx, useOcorrencias.ts): rótulo "Em apuração" para perda e botão de admin "Desativar ferramenta". '
        'O código está correto e o build passa com eles. Dois detalhes: o diálogo de confirmação não se fecha sozinho depois de desativar (fica aberto até o card sumir da lista) e a lista é invalidada só pela chave <font name="Mono">["ferramentas"]</font> — conferir se a tela de Indisponíveis e o dashboard também atualizam. '
        '<b>Precisam ser commitados e passar por PR antes do deploy</b>, ou ficam fora da versão de terça.')]
E += [PageBreak()]

# ---------------- 4. Performance
E += [p('4. Performance — quanto cada tela espera', H1)]
E += [img('baseline', 165), legenda('Cada barra é uma rota da API medida isoladamente, com o banco cheio (50.300 empréstimos). Ordem: da mais rápida para a mais lenta no p95.')]
E += [p('Leitura: quase tudo responde em menos de 10 ms — imperceptível. O leitor de código de barras (<i>ferramenta por código</i>) e a identificação do colaborador, que são o coração do balcão, ficam em 3–6 ms. '
        'As duas rotas mais lentas são do <b>histórico de empréstimos</b> (lista e busca, 40–60 ms). Não incomodam hoje, mas crescem junto com o histórico.')]
E += [p('Causa e correção sugerida', H3)]
E += [p('A listagem ordena por <font name="Mono">data_retirada DESC</font> sem índice, então o Postgres junta as 50 mil linhas da view antes de ordenar e cortar 20. Um índice resolve sem mudar código:')]
E += [Preformatted('CREATE INDEX IF NOT EXISTS idx_emprestimos_data_retirada\n  ON emprestimos (data_retirada DESC, id DESC);', COD)]
E += [tabela([['Consulta (página 21 do histórico)', 'Sem índice', 'Com índice'], ['SELECT ... ORDER BY data_retirada DESC LIMIT 20 OFFSET 400', '31,5 ms', '1,8 ms (17× mais rápido)']], [104, 30, 40])]
E += [p('Não é bloqueante para terça (o banco começa vazio); vale entrar como migration 0011/0012 nas próximas semanas.', PS)]
E += [PageBreak()]

# ---------------- 5. Carga, estresse e resistência
E += [p('5. Carga, estresse e resistência', H1)]
E += [img('carga', 170), legenda('Usuários virtuais disparando requisições sem pausa — cada um equivale a dezenas de pessoas reais, que levam segundos entre um clique e outro.')]
linhas = [['Usuários', 'Req/s', 'p50 (ms)', 'p95 (ms)', 'p99 (ms)', 'Erros 5xx', 'Respostas']]
for c, l in list(loads.items()) + list(spikes.items()):
    e5 = sum(v for k, v in l['statuses'].items() if k.startswith('5') or k == '-1')
    linhas.append([str(c), f'{l["rps"]:.0f}', f'{l["p50"]:.0f}', f'{l["p95"]:.0f}', f'{l["p99"]:.0f}', str(e5), ', '.join(f'{k}: {v}' for k, v in sorted(l['statuses'].items()))])
E += [tabela(linhas, [17, 15, 16, 16, 16, 17, 77])]
E += [p('Os únicos "não-200" são <b>409 de nome ambíguo</b> na identificação de colaborador (o termo de busca "Colaborador Carga 1" casa com vários nomes) — comportamento correto da regra 5, não erro.', PS)]
E += [p('O que isso significa', H3)]
E += bullets([f'A vazão estabiliza em <b>~{max(l["rps"] for l in loads.values()):.0f} requisições/s</b> a partir de 25 usuários. O uso real da manutenção (1–3 operadores, um quiosque e o polling de notificações) fica abaixo de 5 req/s: mais de <b>100× de folga</b>.',
              'Acima do ponto de saturação o sistema <b>degrada com elegância</b>: a latência sobe por fila, mas nenhuma requisição falha. Quem segura a fila é o pool de 20 conexões do Postgres (gráfico abaixo) — exatamente o desenho esperado.',
              'O processo Node usou no máximo ~70% de um núcleo; a memória ficou estável. Não há necessidade de cluster, cache ou réplica para a Soufer.'])
E += [img('recursos', 170), legenda('CPU e sessões abertas no Postgres durante a rampa (degraus de 1, 5, 10, 25, 50, 100 e 200 usuários, 15 s cada). *A contagem passa de 20 porque inclui a sessão do próprio monitor e os workers de consulta paralela que o Postgres abre nas listagens grandes; o pool da API fica em 20.')]
E += [KeepTogether([p('Resistência (soak)', H3), img('soak', 170), legenda(f'25 usuários contínuos por 4 minutos: {soak["count"]:,} requisições, p50 {soak["p50"]:.0f} ms, p95 {soak["p95"]:.0f} ms, {sum(v for k, v in soak["statuses"].items() if k.startswith("5"))} erros 5xx.'.replace(',', '.'))])]
E += [p('A latência não sobe com o tempo e a memória fica num patamar fixo: sem sinal de vazamento. Uma ressalva de operação: a API roda tarefas a cada 30 min (gerar notificações) com <font name="Mono">setInterval</font>; como o PM2/Dokploy reinicia o processo se cair, isso é suficiente.')]
E += [PageBreak()]

# ---------------- 6. Importação
E += [p('6. Achado crítico — carga inicial do inventário', H1)]
E += [p('Pelo relatório da visita técnica, <b>a equipe faz a carga inicial</b> a partir da planilha da Soufer (~1.000 ferramentas). Esse é o primeiro uso real do sistema, e é onde o problema aparece.')]
E += [img('importacao', 170), legenda('Esquerda: importação em lote por CSV, sempre partindo de banco vazio. Direita: 500 cadastros um a um (o que a tela de Cadastros faz), mostrando o tempo médio de cada bloco de 50.')]
ant = {int(r['linhas']): float(r['segundos']) for r in imp if r['cenario'] == 'tabela_vazia'}
dep = {int(r['linhas']): float(r['segundos']) for r in imp if r['cenario'] == 'corrigido'}
E += [tabela([['Linhas do CSV (banco vazio)', 'Gatilho atual', 'Gatilho corrigido', 'Ganho']] +
             [[f'{n}', f'{ant[n]:.1f} s', f'{dep[n]:.2f} s', f'{ant[n] / dep[n]:.0f}×'] for n in sorted(ant)] +
             [['2.000', 'não medido (projeção > 4 min)', f'{dep[2000]:.1f} s', '—'],
              ['500 cadastros pela tela', f'{fa["segundos"]:.1f} s', f'{fd["segundos"]:.1f} s', f'{fa["segundos"] / fd["segundos"]:.0f}×']], [52, 46, 40, 36])]
E += [p('Causa raiz', H3)]
E += [p('O gatilho <font name="Mono">fn_gera_codigo_identificacao</font> (migration 0005) acha o menor código livre com '
        '<font name="Mono">SELECT MIN(c) FROM generate_series(1, 9999) c WHERE NOT EXISTS (...)</font>. Com a estatística do Postgres dizendo "tabela vazia", o otimizador escolhe um <i>nested loop</i> que compara os 9.999 códigos com <b>todas</b> as ferramentas a cada INSERT — custo 9.999 × N, que cresce a cada linha. '
        'No cadastro pela tela o problema se resolve sozinho quando o autovacuum atualiza a estatística (por isso a curva vermelha cai depois de ~350 cadastros); na importação em lote, tudo acontece numa transação só e a estatística nunca é atualizada no meio. '
        'Isolada, a mesma consulta leva 1,7 ms: o defeito é a dependência do plano, não a lógica.')]
E += [KeepTogether([p('Correção proposta (testada, mesma regra: menor código livre, com o mesmo advisory lock)', H3), Preformatted('CREATE OR REPLACE' + open(f'{S}/fix-0011.sql').read().split('CREATE OR REPLACE', 1)[1], COD)])]
E += [p(f'Validação: aplicada num banco recém-migrado, a suíte completa da API passou ({CTX["fix_tests"]}), incluindo os testes de reaproveitamento de código e o teste de estresse de 15 INSERTs concorrentes da própria migration 0005. '
        'Nas corridas desta auditoria, 30 cadastros simultâneos geraram 30 códigos distintos.')]
E += [p('<b>Plano B se não der tempo de subir a migration:</b> importar em arquivos de até 150 linhas e rodar <font name="Mono">ANALYZE ferramentas;</font> no banco depois do primeiro arquivo — a partir daí o Postgres escolhe o plano bom (medido: 500 linhas em 0,6 s com a tabela já analisada).', PS)]
E += [PageBreak()]

# ---------------- 7. Concorrência
E += [p('7. Concorrência e integridade dos dados', H1)]
E += [p('As regras 1, 3 e 6 do projeto são inegociáveis. Elas foram atacadas com requisições simultâneas, que é como os erros de integridade aparecem na vida real (dois cliques no botão, dois operadores, rede lenta com reenvio).')]
cr, cd, cc, ce = conc['corridaRetirada'], conc['corridaDevolucao'], conc['corridaCadastro'], conc['cargaEscrita']
E += [tabela([['Teste', 'Esperado', 'Obtido', ''],
              ['50 retiradas simultâneas da mesma ferramenta (regra 1)', '1 aceita, 49 recusadas', f'{cr["statuses"]}', SOK],
              ['Corpo da retirada com usuarioRetiradaId=999 forjado (regra 6)', 'ignorado; responsável = usuário do token', f'gravado: {cr["usuarioRetiradaIgnorado"]}', SOK],
              ['30 devoluções simultâneas com avaria do mesmo empréstimo (regra 3)', '1 aceita, 1 ocorrência, ferramenta indisponível', f'{cd["statuses"]}, {cd["ocorrenciasDaFerramenta"]} ocorrência, status {cd["statusFinal"]}/{cd["motivo"]}', SOK],
              ['30 cadastros simultâneos de ferramenta', '30 códigos distintos', f'{cc["codigosDistintos"]} distintos de {cc["criados"]}', SOK],
              [f'Carga de escrita: {ce["operadores"]} operadores em retirada→devolução por {ce["segundos"]} s', 'sem erro 5xx', f'{ce["ciclos"]:,} ciclos, {ce["opsPorSeg"]:.0f} op/s, statuses {ce["statuses"]}'.replace(',', '.'), SOK]], [62, 42, 54, 16])]
E += [p(f'Latência das escritas sob essa carga: retirada p50 {ce["retirada"]["p50"]} ms / p95 {ce["retirada"]["p95"]} ms; devolução p50 {ce["devolucao"]["p50"]} ms / p95 {ce["devolucao"]["p95"]} ms.')]
E += [p('Auditoria de consistência no banco depois de tudo', H3)]
E += [Preformatted(open(f'{O}/consistencia.txt').read().strip(), COD)]
E += [p('Zero em todas as linhas: nenhuma ferramenta com dois empréstimos abertos, nenhum status divergente do empréstimo, nenhum código duplicado e nenhum registro com responsável forjado. '
        'O mérito é do desenho: índice único parcial, gatilhos no banco e travas <font name="Mono">FOR UPDATE</font> nas transações de retirada e devolução.')]
E += [PageBreak()]

# ---------------- 8. Segurança
E += [p('8. Segurança', H1)]
E += [p(f'<b>{seg_ok} de {len(seg)}</b> casos passaram. A base é boa: JWT verificado com segredo forte obrigatório em produção, revalidação de usuário ativo a cada requisição, perfis isolados nos dois sentidos, todas as consultas parametrizadas, Helmet, CORS restrito, limites de tentativa em login, quiosque e convite, e bloqueio de conta após 5 senhas erradas.')]
rows = [['Categoria', 'Caso', 'Esperado', 'Obtido', '']]
for c in seg:
    rows.append([c['cat'], c['nome'] + (f'<br/><font color="#575756">{c["nota"]}</font>' if c['nota'] and not c['ok'] else ''), c['esperado'], c['obtido'][:70], SOK if c['ok'] else SAT])
E += [tabela(rows, [20, 58, 30, 46, 20])]
E += [p('Achados e recomendações, por prioridade', H2)]
E += [tabela([['Prioridade', 'Achado', 'Recomendação'],
              [SCR, 'Seed cria admin 0053 e operadores 0001/0002 com senha 123456; o guia de deploy manda rodar o seed.', 'Não rodar o seed completo em produção. Criar só setores/categorias reais e o admin real; ou rodar e, no mesmo minuto, gerar link de acesso para o admin real e inativar 0001/0002/0053.'],
              [SCR, 'Sem TRUST_PROXY_HOPS=1 atrás do Nginx/Traefik, todos os usuários ficam com o IP do proxy.', 'Definir TRUST_PROXY_HOPS=1 (está no .env.example, mas não no checklist de deploy).'],
              [SAT, 'npm audit da API: proxy-addr com alerta crítico (spoofing de IP em trust por sub-rede).', 'npm audit fix na API (correção sem quebra). O projeto usa trust por número de saltos, então o impacto real é baixo.'],
              [SAT, 'JSON malformado no corpo devolve 500 INTERNAL_SERVER_ERROR e grava log de erro.', 'Tratar err.type === "entity.parse.failed" no errorHandler como 400 (3 linhas, igual ao entity.too.large que já existe).'],
              [SAT, 'Tempo de resposta do login revela quais matrículas têm conta (bcrypt só roda quando a conta existe).', 'Comparar com um hash fixo quando a matrícula não existe. Risco baixo: a matrícula não é segredo por desenho.'],
              [SAT, 'Qualquer pessoa que saiba a matrícula de um operador consegue bloqueá-lo por 15 min errando a senha 5 vezes.', 'Aceitável para o porte; documentar que o admin destrava gerando um link de acesso.'],
              [SAT, 'Admin fica fora do bloqueio por conta; a senha é de 6 dígitos (1 milhão de combinações) e só o limite por IP (10/min) protege.', 'Para o admin, exigir senha maior ou manter o painel acessível só na rede interna da Soufer.'],
              [SAT, 'Front (vite/serve) sai sem cabeçalhos de segurança e guarda o token em localStorage.', 'Configurar CSP, X-Frame-Options e HSTS no proxy/CloudFront do front. O código não usa dangerouslySetInnerHTML nem eval (verificado).'],
              ['Baixa', '/v1/health expõe nome do banco e ambiente; Swagger público em produção.', 'Aceitável no PI (o Swagger é entregável). Em produção real, restringir /docs.'],
              ['Baixa', 'npm audit do front: 15 alertas, todos vindos do pacote shadcn (CLI) em dependencies.', 'Mover shadcn para devDependencies; nada disso vai para o bundle do navegador.']], [26, 74, 74])]
E += [PageBreak()]

# ---------------- 9. Usabilidade
E += [p('9. Usabilidade e responsividade (navegador real)', H1)]
E += [p(f'Cada tela foi aberta num Chrome real, logado com o perfil certo, nas três larguras exigidas pelo projeto (360, 768 e 1280 px). Para cada uma: rolagem horizontal indesejada, elementos fora da tela, erros de console e respostas HTTP com erro.')]
tel = {}
for r in br['results']: tel.setdefault(r['nome'], {})[r['width']] = r
def cel(r):
    if not r: return '—'
    s = SAT if r['overflowX'] else SOK
    errs = [l for l in r['logs'] if l['type'] in ('exception', 'error') or (l['type'] == 'http' and not l['text'].startswith('404'))]
    return s + (f'<br/><font size="6.5">{len(errs)} erro(s) no console</font>' if errs else '')
E += [tabela([['Tela', '360 px', '768 px', '1280 px', 'Título exibido']] + [[n, cel(v.get(360)), cel(v.get(768)), cel(v.get(1280)), (v.get(1280) or {}).get('titulo') or ('página 404' if (v.get(1280) or {}).get('texto404') else '—')] for n, v in tel.items()], [46, 22, 22, 22, 62])]
E += [p(CTX['ux_detalhe'])]
fr_ = br['frio']
E += [p('Primeira carga (sem cache, rede local)', H3)]
E += [p(f'Tela de login, 5 medições: FCP mediano {sorted(x["fcp"] for x in fr_)[2]} ms, carga completa {sorted(x["load"] for x in fr_)[2]} ms, {sorted(x["transfer"] for x in fr_)[2] / 1024:.0f} KB transferidos. '
        'Em rede local o tamanho do bundle (969 KB) não pesa; numa conexão 4G fraca da fábrica a primeira abertura fica em ~3–4 s. Depois disso o navegador guarda em cache.')]
E += [PageBreak()]
E += [p('Telas principais em 360 px (celular) e 1280 px (computador da manutenção)', H2)]
for par in [('dashboard', 'retirada'), ('devolucao', 'indisponiveis'), ('ferramentas', 'consulta-quiosque'), ('calendario', 'cadastro-colaboradores')]:
    linha = []
    for n in par:
        im1 = Image(f'{O}/shots/{n}-360.png', width=30 * mm, height=30 * mm * 780 / 360)
        im2 = Image(f'{O}/shots/{n}-1280.png', width=52 * mm, height=52 * mm * 900 / 1280)
        linha += [im1, im2]
    t = Table([linha, [Paragraph(f'<b>{par[0]}</b>', PS), '', Paragraph(f'<b>{par[1]}</b>', PS), '']], colWidths=[32 * mm, 55 * mm, 32 * mm, 55 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('SPAN', (0, 1), (1, 1)), ('SPAN', (2, 1), (3, 1))]))
    E += [t, Spacer(1, 4)]
E += [PageBreak()]
E += [p('Clareza para o funcionário — o que foi conferido', H2)]
E += bullets(CTX['ux_bullets'])
E += [PageBreak()]

# ---------------- 10. Prontidão de deploy
E += [p('10. Checklist de implantação', H1)]
E += [p('Itens de configuração e operação que não aparecem em teste automatizado, mas derrubam um deploy. Marque na hora, na ordem.')]
ck = [['#', 'Item', 'Situação hoje', ''],
      ['1', 'Aplicar a correção do gatilho (migration 0011) e o índice do histórico antes da carga inicial', 'Correção pronta, não está no repositório', SCR],
      ['2', 'Variáveis da API: NODE_ENV=production, JWT_SECRET (≥32 caracteres aleatórios), DB_PASSWORD forte, CORS_ORIGIN = domínio do front, TRUST_PROXY_HOPS=1, UPLOADS_DIR em volume persistente', 'A API recusa subir sem as 3 primeiras (testado)', SCR],
      ['3', 'Não rodar o seed com senha 123456; criar admin real e cadastros reais', 'Guia atual manda rodar o seed', SCR],
      ['4', 'VITE_API_URL definido no build do front (a variável é lida no build, não em tempo de execução)', 'Front avisa no console se faltar', SAT],
      ['5', 'Volume persistente para fotos (UPLOADS_DIR); sem ele as fotos somem a cada redeploy', 'Documentado em uploads.ts, não no guia', SAT],
      ['6', 'Backup automático do Postgres (pg_dump diário ou snapshot do RDS) e um teste de restauração', 'Não encontrado no repositório', SAT],
      ['7', 'PM2 em fork mode com 1 instância (rate limit é em memória)', 'Documentado em infraestrutura.md', SOK],
      ['8', 'Front servido com fallback de SPA (rotas como /ferramentas/12 abrindo direto) e cabeçalhos de segurança', 'nixpacks usa "npx serve -s" (baixa o pacote na subida — precisa de internet no container)', SAT],
      ['9', 'HTTPS (Let\'s Encrypt no Dokploy/Nginx); HSTS já vem da API', 'Previsto no guia', SOK],
      ['10', 'npm audit fix na API; mover shadcn para devDependencies no front', 'Pendente', SAT],
      ['11', 'Commitar/PR dos 3 arquivos pendentes da branch de notificações ou deixá-los fora', 'Pendente', SAT],
      ['12', 'Sincronizar feriados (npm run db:feriados) — sem isso a sugestão de previsão só pula fim de semana', 'Fallback existe', SOK],
      ['13', 'Hospedagem: a visita registra preferência da Soufer por servidor interno; confirmar com o TI onde roda na terça (Dokploy/EC2/servidor local)', 'Em aberto (visita técnica 5.3)', SAT],
      ['14', 'Monitor de disponibilidade apontando para /v1/health (CloudWatch, Uptime Kuma ou similar)', 'Rota pronta', SOK]]
E += [tabela(ck, [8, 90, 50, 26])]
E += [p('Roteiro sugerido para terça', H2)]
E += [tabela([['Quando', 'O quê', 'Quem'],
              ['Até segunda', 'Migration 0011 (gatilho) + índice do histórico + fix do JSON malformado + npm audit fix; PR revisado e mergeado em develop/main', 'Back (Henrique/Guilherme)'],
              ['Até segunda', 'Preparar CSV de ferramentas e de colaboradores a partir da planilha da Soufer usando o modelo de /v1/importacoes/:recurso/modelo; testar num banco de homologação', 'Front + Back'],
              ['Terça, antes', 'Deploy, migrations, variáveis, criação do admin real, sincronizar feriados; smoke test: login, retirada, devolução com avaria, quiosque', 'Infra (Guilherme)'],
              ['Terça, carga', 'Importar colaboradores e depois ferramentas, priorizando máquinas grandes (estratégia da visita técnica); imprimir etiquetas/gravar códigos', 'Equipe'],
              ['Terça, uso', 'Operador faz 2–3 retiradas e devoluções reais acompanhado; anotar dúvidas de tela na ata', 'João / Kauan'],
              ['Primeira semana', 'Acompanhar logs e /v1/health diariamente; conferir backup', 'Infra']], [26, 108, 40])]
E += [PageBreak()]

# ---------------- 11. Apêndice
E += [p('Apêndice — como reproduzir', H1)]
E += [p('Todos os scripts desta auditoria foram escritos sem dependências novas (Node 24 nativo e Python com matplotlib/reportlab) e não alteram o repositório.')]
E += [Preformatted('''# banco isolado + build de produção
DB_NAME=soufer_audit npm run db:migrate && DB_NAME=soufer_audit npm run db:seed
npm run build && NODE_ENV=production DB_NAME=soufer_audit PORT=3999 node dist/src/server.js
psql -d soufer_audit -f volume.sql               # 1.500 ferramentas, 50 mil empréstimos

node loadtest.mjs scen/load-50.json out/load-50.json   # carga (cenário em JSON)
node concorrencia.mjs <token-manutencao> out/concorrencia.json
node seguranca.mjs out/                          # 50+ casos com esperado x obtido
node browser.mjs out/ ...                        # Chrome headless via DevTools Protocol
python3 charts.py . && python3 relatorio.py . relatorio.pdf''', COD)]
E += [p('Limitações', H3)]
E += bullets(['Os testes rodaram em notebook (16 núcleos), não no servidor de produção; capacidade absoluta será menor lá, a folga relativa continua grande.',
              'Usabilidade foi avaliada por inspeção automatizada e capturas de tela, não com o operador real. O teste definitivo é a primeira hora de uso acompanhado na terça.',
              'O leitor de código de barras físico não foi testado (simulado como digitação rápida + Enter, que é o que ele envia).',
              'Não houve teste de rede (latência/4G) nem de falha do banco no meio de uma operação.'])

doc.build(E)
print('PDF gerado:', SAIDA)
