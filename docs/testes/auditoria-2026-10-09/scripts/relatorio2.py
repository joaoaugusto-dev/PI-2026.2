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
A, O, G = f'{S}/out', f'{S}/out2', f'{S}/graficos2'
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
GLIFO = lambda t: _re.sub('([→≈≥≤⊇★−])', r'<font name="DV">\1</font>', t) if isinstance(t, str) else t
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


# ===================== dados =====================
from xml.sax.saxutils import escape as esc
JA = lambda f: json.load(open(f'{A}/{f}'))
JD = lambda f: json.load(open(f'{O}/{f}'))
api, web = JD('api-tests.json'), JD('web-tests.json')
api0, web0 = JA('api-tests.json'), JA('web-tests.json')
seg, seg0 = JD('seguranca.json'), JA('seguranca.json')
conc = JD('concorrencia.json')
b2, b2a, br0 = JD('browser2.json'), JD('browser2-antes-a11y.json'), JA('browser.json')
ens = JD('ensaio.json')['passos']
bk = JD('backup.json')
blq1, blq10, blq0 = JD('bloqueio-1.json'), JD('bloqueio-10.json'), JD('exportacao-bloqueio.json')
CTX2 = JD('contexto2.json'); CTX1 = JA('contexto.json')
L0 = {c: JA(f'load-{c}.json')['total'] for c in [1, 5, 10, 25, 50, 100, 200]}
L1 = {c: JD(f'load-{c}.json')['total'] for c in [1, 5, 10, 25, 50, 100, 200]}
SP0 = {c: JA(f'spike-{c}.json')['total'] for c in [500, 1000]}
SP1 = {c: JD(f'spike-{c}.json')['total'] for c in [500, 1000]}
soak0, soak1 = JA('soak.json')['total'], JD('soak.json')['total']
cpu1 = {c: JD(f'cpu1-{c}.json')['total'] for c in [1, 5, 10, 25, 50, 100]}
res = JD('resiliencia.json')['total']
commits = [l.strip().split('|', 1) for l in open(f'{O}/commits.txt') if l.strip()]
fr = b2['frio']
def frio(rede, build, tela): return next(x for x in fr if x['rede'] == rede and x['build'] == build and x['tela'] == tela)
e5 = lambda st: sum(v for k, v in st.items() if k.startswith('5') or k == '-1')
seg_ok = sum(c['ok'] for c in seg)
br = lambda n: f'{n:,}'.replace(',', '.')
import collections
def axe_agg(d):
    a = collections.defaultdict(lambda: {'impact': None, 'telas': set(), 'nodes': 0, 'help': ''})
    for r in d['results']:
        for v in (r['axe'] or []):
            x = a[v['id']]; x['impact'] = v['impact']; x['telas'].add(f"{r['nome']}@{r['width']}"); x['nodes'] += v['nodes']; x['help'] = v['help']
    return a
AX0, AX1 = axe_agg(b2a), axe_agg(b2)
over0 = sum(1 for r in br0['results'] if r['overflowX'])
over1 = sum(1 for r in b2['results'] if r['overflowX'])

def rodape(c, doc):
    c.saveState(); c.setFont('Noto', 7.5); c.setFillColor(CINZA)
    c.drawString(18 * mm, 10 * mm, 'SOUFER Tools · Relatório 2 — correções e revalidação · 09/10/2026')
    c.drawRightString(192 * mm, 10 * mm, f'página {doc.page}')
    c.setStrokeColor(VERM); c.setLineWidth(1.4); c.line(18 * mm, 287 * mm, 192 * mm, 287 * mm); c.restoreState()
def capa(c, doc):
    c.saveState(); c.setFillColor(PRETO); c.rect(0, 0, 210 * mm, 297 * mm, fill=1, stroke=0)
    c.setFillColor(VERM); c.rect(0, 200 * mm, 210 * mm, 3 * mm, fill=1, stroke=0)
    logo = '/home/joao/development/projetos/PI-2026.2/web/public/brand/soufer-branco.png'
    if os.path.exists(logo): c.drawImage(logo, 20 * mm, 240 * mm, width=60 * mm, height=30 * mm, preserveAspectRatio=True, mask='auto', anchor='sw')
    c.setFillColor(colors.white); c.setFont('Noto-B', 30); c.drawString(20 * mm, 175 * mm, 'SOUFER Tools')
    c.setFont('Noto', 16); c.drawString(20 * mm, 163 * mm, 'Relatório 2 — correções e revalidação')
    c.setFont('Noto', 11); c.setFillColor(colors.HexColor('#C9C9C4'))
    for i, l in enumerate(['Tudo o que a primeira auditoria encontrou, corrigido e testado de novo — mais', 'ensaio da implantação, resiliência, servidor pequeno, acessibilidade e fluxos pela tela.']):
        c.drawString(20 * mm, (150 - i * 6) * mm, l)
    c.setFont('Noto', 9)
    info = ['Data: 09/10/2026 · Implantação prevista: terça-feira, 13/10/2026',
            f'Branch: fix/auditoria-prontidao-implantacao ({len(commits)} commits sobre development @ e5f4a60) · local, sem push',
            'Ambiente: build de produção (NODE_ENV=production), PostgreSQL 14, banco recriado do zero (soufer_v2)',
            'PI 2026.2 · Desenvolvimento de Soluções Web Inteligentes e Integradas']
    for i, l in enumerate(info): c.drawString(20 * mm, (40 - i * 5.5) * mm, l)
    c.restoreState()

doc = BaseDocTemplate(SAIDA, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=17 * mm,
                      title='SOUFER Tools — Relatório 2: correções e revalidação', author='Equipe SOUFER Tools', subject='Correções e revalidação')
fr_ = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate('capa', [fr_], onPage=capa), PageTemplate('corpo', [fr_], onPage=rodape)])
E = [NextPageTemplate('corpo'), PageBreak()]
SRES = selo('RESOLVIDO', OK)
SPEND = selo('PENDENTE', ATENCAO)
SNOVO = selo('NOVO — RESOLVIDO', OK)

# ===================== 1. Sumário =====================
imp_ens = next(p_ for p_ in ens if p_['nome'].startswith('7.'))
E += [p('1. Sumário executivo', H1)]
E += [p(f'<b>Veredito: pronto para implantar na terça.</b> Os três bloqueantes do relatório 1 foram corrigidos, assim como todos os itens de atenção que eram do código. '
        f'A segunda rodada de testes encontrou <b>dois problemas novos e sérios</b> que a primeira não pegava — a API caía se o banco derrubasse as conexões no meio de uma transação, e a exportação de CSV congelava a API inteira — e os dois também foram corrigidos. '
        f'Ao todo foram {len(commits)} commits numa branch própria (sem push), {api["numPassedTests"]}/{api["numTotalTests"]} testes na API e {web["numPassedTests"]}/{web["numTotalTests"]} no front, '
        f'{br(CTX2["total_reqs"])} requisições de carga sem nenhum erro de servidor, {seg_ok}/{len(seg)} casos de segurança e o <b>ensaio completo da terça</b> (banco zerado até a primeira retirada) passando em ~2 s.')]
E += [p('Antes × depois, por achado', H3)]
E += [tabela([['Achado (relatório 1)', 'Antes', 'Depois', ''],
              ['Carga inicial de ferramentas (CSV, banco vazio)', '800 linhas: 60,3 s (no limite do proxy)', f'1.000 linhas: {imp_ens["ms"]/1000:.1f} s no ensaio'.replace('.', ',').replace('1,000', '1.000').replace('.', ',', 1).replace('1,000', '1.000'), SRES],
              ['Cadastro de 500 ferramentas pela tela', '43,3 s, cada um mais lento', '3,5 s, constante', SRES],
              ['Seed com senha 123456 em produção', 'guia mandava rodar', 'seed recusa produção; db:admin cria o admin por link', SRES],
              ['Variáveis/guia de deploy', 'faltava TRUST_PROXY_HOPS, volume, backup', 'guia atualizado e testado', SRES],
              ['Rolagem horizontal em 768 px', f'{over0} aberturas de tela com estouro', f'{over1} em 51 aberturas', SRES],
              ['JSON malformado', '500 + log de erro', '400 INVALID_JSON', SRES],
              ['Enumeração de matrícula pelo tempo do login', '3 ms × 62 ms', '57 ms × 57 ms', SRES],
              ['/v1/health expõe nome do banco', 'soufer_audit', 'null em produção', SRES],
              ['npm audit (produção)', 'API 1 crítica · front 15', 'API 0 · front 0', SRES],
              ['Bundle inicial do front', '969 KB (1 arquivo)', '494 KB + telas sob demanda', SRES],
              ['Histórico de empréstimos (lista)', 'p50 40 ms', 'p50 16 ms (índice)', SRES],
              ['Botão de imprimir pendências (visita técnica)', 'não existia', 'lista A4 no dashboard', SRES],
              ['Título revela rota de admin / 404 dizia "Dashboard"', 'sim', '"Página não encontrada"', SRES],
              ['Cabeçalhos de segurança no front', 'ausentes', 'CSP, X-Frame-Options, nosniff…', SRES],
              ['<b>Novo:</b> queda de conexão do banco derrubava a API', '—', 'API segue; 0,05% de falhas no instante', SNOVO],
              ['<b>Novo:</b> exportação CSV congelava a API', 'sonda esperando 7,3 s', '1,3 s com 10 simultâneas', SNOVO],
              ['<b>Novo:</b> acessibilidade (axe-core)', '1 crítico em 15 telas', '0 críticos', SNOVO],
              ['Contraste das cores de status (verde/âmbar)', '—', 'decisão de design do time', SPEND],
              ['Swagger público em produção', '—', 'mantido (entregável do PI)', SPEND]], [62, 42, 46, 24])]
E += [PageBreak()]

# ===================== 2. O que mudou =====================
E += [p('2. O que foi alterado no código', H1)]
E += [p('Todas as mudanças estão na branch <font name="Mono">fix/auditoria-prontidao-implantacao</font>, criada a partir da <font name="Mono">development</font> atualizada (git pull feito: o último commit do remoto é o merge do PR #189). '
        'Nada foi enviado ao GitHub. O PR #190 (notificações) não foi tocado e não conflita: os arquivos dele (server.ts, SinoNotificacoes.tsx) ficaram de fora.')]
E += [tabela([['Commit', 'Mudança']] + [[f'<font name="Mono">{h}</font>', esc(m)] for h, m in commits], [20, 154])]
E += [Spacer(1, 6), p('Arquivos principais', H3)]
E += bullets(['<b>API:</b> migration <font name="Mono">0011_desempenho_codigo_e_historico.sql</font> (gatilho do código + índice do histórico), <font name="Mono">errorHandler</font> (JSON malformado), <font name="Mono">authService</font> (bcrypt para matrícula sem conta), <font name="Mono">healthController</font>, <font name="Mono">config/database.ts</font> (ouvinte de erro em todo cliente do pool), <font name="Mono">exportacaoService</font> (datas no Postgres), <font name="Mono">scripts/criar-admin.ts</font> (novo <font name="Mono">npm run db:admin</font>), <font name="Mono">scripts/seed.ts</font> (recusa produção), <font name="Mono">npm audit fix</font>.',
              '<b>Testes novos (API):</b> JSON malformado → 400; bcrypt roda para matrícula sem conta; conexão emprestada que cai não derruba o processo (falha sem a correção, verificado); 300 ferramentas numa transação com códigos distintos.',
              '<b>Front:</b> <font name="Mono">min-w-0</font> no conteúdo do layout (estouro em 768 px), título do cabeçalho, carregamento de telas sob demanda, <font name="Mono">ImprimirPendencias</font> (lista A4), acessibilidade, rodapé do fluxo no celular, <font name="Mono">serve</font> fixo + <font name="Mono">public/serve.json</font> com cabeçalhos de segurança, <font name="Mono">shadcn</font> em devDependencies, remoção do pacote npm <font name="Mono">cn</font> usado por engano no Avatar.',
              '<b>Documentação:</b> <font name="Mono">docs/nuvem/dokploy.md</font> (db:admin no lugar do seed, TRUST_PROXY_HOPS, UPLOADS_DIR, backup, porta da API não exposta, carga inicial) e <font name="Mono">api/README.md</font>.'])
E += [p(f'Tamanho da mudança: 34 arquivos, +1.858/−276 linhas (a maior parte é package-lock.json). Typecheck, build, checagem de animação e lint (15 avisos de estilo, 0 erros) passam.', PS)]
E += [PageBreak()]

# ===================== 3. Ensaio =====================
E += [p('3. Ensaio da implantação de terça', H1)]
E += [p('O cenário real foi reproduzido do zero: banco vazio, só <font name="Mono">npm run db:migrate</font> e <font name="Mono">npm run db:admin</font>, API em modo produção. Daí em diante tudo pela API, na ordem em que a equipe vai fazer na Soufer.')]
E += [tabela([['Passo', 'Tempo', 'Resultado']] + [[x['nome'], f"{x['ms']} ms", esc(', '.join(f'{k}: {v}' for k, v in x.items() if k not in ('nome', 'ms') and v is not None)[:110])] for x in ens], [70, 18, 86])]
E += [p(f'<b>Total do ensaio: {sum(x["ms"] for x in ens)/1000:.1f} s.</b> Migrations do zero: 0,75 s. O link de convite usado de novo é recusado (410), o operador entra com o próprio PIN, a retirada grava o operador logado como responsável (regra 6), a devolução com avaria abre a ocorrência (regra 3) e o quiosque só vê nome, categoria, status e localização (regra 8).')]
E += [img('importacao', 165), legenda('Importação em lote em banco vazio. A estrela é a importação real do ensaio (1.000 linhas, com categorias e setores resolvidos por nome).')]
E += [p('<b>Seed recusado em produção (testado):</b> "db:seed recusado com NODE_ENV=production (cria contas com senha 123456). Use npm run db:admin."', PS)]
E += [PageBreak()]

# ===================== 4. Performance e carga =====================
E += [p('4. Performance, carga e resistência — antes × depois', H1)]
E += [img('baseline', 160), legenda('Mesma bateria da rodada 1. A busca de colaborador mudou de termo (nome em vez de matrícula) e não é comparável.')]
E += [p('A única rota que ainda passa de 20 ms é a <b>busca no histórico</b> (~60 ms): é ILIKE com curinga dos dois lados sobre a view de 50 mil linhas. Imperceptível hoje; vira candidata a índice trigram se o histórico passar de 5 anos.', PS)]
E += [img('carga', 168)]
lin = [['Usuários', 'Req/s antes', 'Req/s depois', 'p95 antes', 'p95 depois', '5xx antes', '5xx depois']]
for c in [1, 5, 10, 25, 50, 100, 200, 500, 1000]:
    a = L0.get(c) or SP0.get(c); d = L1.get(c) or SP1.get(c)
    lin.append([str(c), f'{a["rps"]:.0f}', f'{d["rps"]:.0f}', f'{a["p95"]:.0f} ms', f'{d["p95"]:.0f} ms', str(e5(a['statuses'])), str(e5(d['statuses']))])
E += [tabela(lin, [20, 24, 26, 26, 26, 24, 28])]
E += [p('Vazão máxima de ~660 para ~960 req/s e p95 bem menor em todos os degraus; com 500 usuários o p95 agora fica abaixo de 1 s. <b>Ressalva honesta:</b> a base da rodada 2 tem 1.030 ferramentas (do ensaio) contra 1.530 na rodada 1, com os mesmos ~50 mil empréstimos — parte do ganho vem disso; o resto vem do índice do histórico, que era a rota mais pesada da mistura.', PS)]
E += [KeepTogether([p('Resistência (4 min, 25 usuários)', H3), img('soak', 168),
                    legenda(f'Rodada 2: {br(soak1["count"])} requisições, {soak1["rps"]:.0f} req/s, p95 {soak1["p95"]:.0f} ms, {e5(soak1["statuses"])} erros 5xx (rodada 1: {soak0["rps"]:.0f} req/s, p95 {soak0["p95"]:.0f} ms). Memória estável, sem vazamento.')])]
E += [PageBreak()]

# ===================== 5. Servidor pequeno =====================
E += [p('5. Servidor pequeno: API presa a 1 núcleo e 256 MB', H1)]
E += [p('O servidor previsto (EC2 t3.micro: 2 vCPU com crédito, 1 GB) é bem mais modesto que a máquina de teste. Para simular, a API foi presa a um único núcleo (<font name="Mono">taskset -c 3</font>) com heap limitado a 256 MB (<font name="Mono">--max-old-space-size=256</font>) e recebeu a mesma mistura de carga.')]
E += [img('cpu1', 168)]
E += [tabela([['Usuários', 'Req/s', 'p50', 'p95', 'p99', 'Erros']] + [[str(c), f'{v["rps"]:.0f}', f'{v["p50"]:.0f} ms', f'{v["p95"]:.0f} ms', f'{v["p99"]:.0f} ms', str(v['errors'])] for c, v in cpu1.items()], [25, 25, 30, 30, 30, 34])]
E += [p('Mesmo em 1 núcleo a API sustenta ~830 req/s sem erros e a memória máxima do processo ficou em <b>231 MB</b> (pico medido em /proc). O uso real estimado da Soufer fica abaixo de 5 req/s: mais de 150× de folga. Nesse cenário o Postgres continuou com todos os núcleos; num servidor com banco e API juntos, a folga é menor mas continua grande.')]
E += [PageBreak()]

# ===================== 6. Resiliência e operação =====================
E += [p('6. Resiliência e operação', H1)]
E += [p('Achado novo: a API caía quando o banco derrubava as conexões', H2)]
E += [p('Teste: com 25 usuários em carga, todas as conexões da API no Postgres foram encerradas à força aos 10 s (<font name="Mono">pg_terminate_backend</font>) — o que acontece num reinício do Postgres, failover do RDS ou rede piscando. '
        '<b>Na primeira execução o processo da API morreu</b> ("Unhandled \'error\' event"): o <font name="Mono">pg-pool</font> tira o ouvinte de erro do cliente enquanto ele está emprestado para uma transação (dashboard, retirada, devolução). '
        'A correção registra um ouvinte em todo cliente do pool. Um teste novo derruba a conexão de um cliente emprestado: sem a correção o Vitest acusa "Unhandled Errors" e falha; com ela, passa.')]
E += [img('resiliencia', 168), legenda(f'Depois da correção: {res["statuses"].get("500", 0)} respostas 500 (as requisições que estavam em voo no instante, {res["errorRate"]*100:.2f}%) em {br(res["count"])}; o atendimento continua no segundo seguinte. Antes: processo encerrado.')]
E += [p('Achado novo: exportação de CSV congelava a API', H2)]
E += [p('A exportação do histórico (50 mil linhas) montava as datas com <font name="Mono">Intl.formatToParts</font> no Node — CPU síncrona que para o <i>event loop</i>. Medido com uma sonda (leitura de código a cada 50 ms) enquanto as exportações rodavam:')]
E += [tabela([['Cenário', 'Tempo da exportação', 'Pior espera da leitura de código'],
              ['1 exportação — antes', '~750 ms', '~750 ms'],
              ['10 simultâneas — antes', f'{blq0["total_ms"]/1000:.1f} s', f'{blq0["sonda_durante"]["max"]/1000:.1f} s'],
              ['1 exportação — depois', f'{blq1["total_ms"]} ms', f'{blq1["sonda_durante"]["max"]:.0f} ms'],
              ['10 simultâneas — depois', f'{blq10["total_ms"]/1000:.1f} s', f'{blq10["sonda_durante"]["max"]/1000:.1f} s']], [60, 50, 64])]
E += [p('A formatação passou para o Postgres (<font name="Mono">to_char</font> no fuso de Brasília, mesmo formato; o teste existente que confere "30/09/2026 14:05" continua passando). Ainda resta 1,3 s de congelamento com 10 exportações ao mesmo tempo — cenário improvável no uso real; o próximo passo, se preciso, é streaming com cursor.', PS)]
E += [p('Backup e restauração', H2)]
E += [tabela([['Etapa', 'Resultado'], ['pg_dump -Fc do banco do ensaio', f'{bk["dump_s"]} s · {br(bk["dump_kb"])} KB'], ['pg_restore em banco novo', f'{bk["restore_s"]} s · sem erros'],
              ['Contagens originais', esc(bk['original'])], ['Contagens restauradas', esc(bk['restaurado'])], ['Idênticas', 'sim ' + SOK if bk['iguais'] else 'NÃO']], [55, 119])]
E += [PageBreak()]

# ===================== 7. Concorrência =====================
cr, cd, cc, ce = conc['corridaRetirada'], conc['corridaDevolucao'], conc['corridaCadastro'], conc['cargaEscrita']
E += [p('7. Concorrência e integridade (repetido com o código novo)', H1)]
E += [tabela([['Teste', 'Esperado', 'Obtido', ''],
              ['50 retiradas simultâneas da mesma ferramenta', '1 aceita, 49 recusadas', str(cr['statuses']), SOK],
              ['usuarioRetiradaId forjado no corpo', 'ignorado', f'gravado: {cr["usuarioRetiradaIgnorado"]}', SOK],
              ['30 devoluções simultâneas com avaria', '1 aceita, 1 ocorrência', f'{cd["statuses"]}, 1 ocorrência (conferido no banco)', SOK],
              ['30 cadastros simultâneos (gatilho novo)', '30 códigos distintos', f'{cc["codigosDistintos"]} de {cc["criados"]}', SOK],
              [f'{ce["operadores"]} operadores em retirada→devolução por {ce["segundos"]} s', 'sem 5xx', f'{br(ce["ciclos"])} ciclos, {ce["opsPorSeg"]:.0f} op/s', SOK]], [62, 40, 56, 16])]
E += [Preformatted(open(f'{O}/consistencia.txt').read().strip(), COD)]
E += [p('O gatilho novo manteve a garantia de códigos distintos sob disputa (mesmo advisory lock da 0005). Nota: na 1ª rodada de testes deste relatório meu script contava ocorrências por um filtro que a rota não tem; o número acima foi conferido direto no banco.', PS)]

# ===================== 8. Segurança =====================
E += [PageBreak(), p('8. Segurança — rodada 2', H1)]
E += [p(f'<b>{seg_ok} de {len(seg)}</b> casos passaram (rodada 1: {sum(c["ok"] for c in seg0)} de {len(seg0)}). A única falha é o Swagger público, mantido de propósito. Os casos novos estão marcados com ★.')]
novos = {'Sessão', 'Proxy', 'CSV'}
rows = [['Categoria', 'Caso', 'Obtido', '']]  # selo na última coluna
for c in seg:
    novo = c['cat'] in novos or (c['cat'] == 'Upload' and ('MP' in c['nome'] or 'KB' in c['nome'] or 'fotos' in c['nome']))
    rows.append([c['cat'], ('★ ' if novo else '') + esc(c['nome']), esc(c['obtido'][:62]), SOK if c['ok'] else SAT])
E += [tabela(rows, [20, 74, 58, 22])]
E += [p('Destaques', H3)]
E += bullets(['<b>Revogação imediata:</b> operador desativado pelo admin perde o acesso na requisição seguinte, mesmo com token de 7 dias válido.',
              '<b>X-Forwarded-For:</b> com <font name="Mono">TRUST_PROXY_HOPS=1</font> e a porta da API acessível sem o proxy, 14 tentativas de login com IP forjado passaram sem nenhum bloqueio — por isso o guia agora diz explicitamente que a porta 3000 não pode ser publicada. Na configuração sem proxy (0), o IP forjado é ignorado e o limite vale.',
              '<b>Uploads reais:</b> foto de 12 MP (3,8 MB) vira webp de ~35 KB em cerca de 0,14 s; 10 fotos simultâneas terminam em menos de 0,5 s; imagem de 48 MP é recusada pelo limite de 40 MP do sharp (6 ms, sem estourar memória); arquivo acima de 5 MB recebe 413 (tempos exatos na tabela).',
              '<b>CSV:</b> nome com fórmula (<font name="Mono">=HYPERLINK(...)</font>) sai neutralizado com apóstrofo na exportação.',
              '<b>Front:</b> CSP, X-Frame-Options DENY, nosniff, Referrer-Policy e Permissions-Policy em todas as rotas; assets com cache imutável de 1 ano e gzip (494 → 150 KB na rede).'])
E += [PageBreak()]

# ===================== 9. Front =====================
E += [p('9. Front-end: responsividade, acessibilidade e fluxos pela tela', H1)]
tel = {}
for r in b2['results']: tel.setdefault(r['nome'], {})[r['width']] = r
cel = lambda r: (SAT if r['overflowX'] else SOK) if r else '—'
E += [tabela([['Tela', '360', '768', '1280', 'Título no cabeçalho']] + [[n, cel(v.get(360)), cel(v.get(768)), cel(v.get(1280)), (v.get(1280) or {}).get('titulo') or '—'] for n, v in tel.items()], [52, 18, 18, 18, 68])]
E += [p(f'<b>Rolagem horizontal: {over0} → {over1}.</b> A causa era uma só: o conteúdo do layout é item flex e crescia até a largura da tabela; com <font name="Mono">min-w-0</font> a tabela rola dentro do próprio cartão. Operador abrindo /cadastros pela URL agora vê "Página não encontrada" também no cabeçalho e na aba.', PS)]
E += [p('Fluxos executados pela interface (Chrome real, teclado simulado)', H2)]
E += [tabela([['Fluxo', 'Resultado', 'Detalhe']] + [[f['nome'], SOK if f['ok'] else SAT, esc((f.get('nota') or ', '.join(f'{k}: {v}' for k, v in f.items() if k not in ('nome', 'ok', 'ms', 'erro', 'nota')))[:160])] for f in b2['fluxos']], [62, 16, 96])]
E += [p('A retirada simula o leitor de código (digita o código e Enter): a ferramenta é reconhecida em ~0,3 s e a operação inteira — código, matrícula, setor, "Hoje", confirmar — leva menos de 1 s de sistema. A impressão gerou exatamente as 84 linhas esperadas (60 atrasados + 24 de hoje).', PS)]
E += [p('Acessibilidade (axe-core 4.10, 17 telas em 360 e 1280 px)', H2)]
ord_ = ['critical', 'serious', 'moderate', 'minor']
lin = [['Impacto', 'Regra', 'Antes', 'Depois']]
for k in sorted(set(AX0) | set(AX1), key=lambda k: ord_.index((AX0.get(k) or AX1.get(k))['impact'])):
    a, d = AX0.get(k), AX1.get(k)
    lin.append([(a or d)['impact'], esc(f'{k} — {(a or d)["help"][:60]}'), f'{len(a["telas"]) if a else 0} telas / {a["nodes"] if a else 0}', f'{len(d["telas"]) if d else 0} telas / {d["nodes"] if d else 0}'])
E += [tabela(lin, [20, 98, 28, 28])]
E += [p('Zerados: botão sem nome (interruptor de som), link sem nome (Status API no celular), lista do menu Cadastros, <font name="Mono">&lt;dl&gt;</font> da ficha, ausência de <font name="Mono">&lt;main&gt;</font>/<font name="Mono">&lt;h1&gt;</font> no login e no quiosque. '
        '<b>Pendente (decisão de design):</b> o contraste que sobra é das cores de status do design system — verde <font name="Mono">#1B8A4B</font> dá 4,39:1 no branco e 3,86:1 no fundo do badge; âmbar <font name="Mono">#C77700</font> dá 3,46:1; o mínimo é 4,5:1. Escurecer esses tokens é decisão da FE-01, não foi alterado aqui.', PS)]
E += [KeepTogether([p('Primeira abertura em rede lenta', H2), img('rede', 168),
                    legenda(f'Build antigo × novo, sem cache. JS transferido (gzip): {frio("4G","antigo","login")["jsKB"]} KB → {frio("4G","novo","login")["jsKB"]} KB. O ganho na primeira abertura é modesto (~5%): o gzip já comprimia bem o arquivo único. O ganho real é menos JS para o navegador interpretar (969 → 494 KB) e telas que só baixam quando usadas.')])]
E += [PageBreak()]
E += [p('Antes × depois em 768 px (tablet) e a lista de cobrança impressa', H2)]
ims = []
for f_, w in [(f'{A}/shots/cadastro-colaboradores-768.png', 52), (f'{O}/shots/cadastro-colaboradores-768.png', 52), (f'{O}/lista-cobranca-1.png', 62)]:
    from reportlab.lib.utils import ImageReader
    iw, ih = ImageReader(f_).getSize(); ims.append(Image(f_, width=w * mm, height=w * mm * ih / iw))
t = Table([ims, [Paragraph('<b>Antes:</b> botões de ação fora da tela', PS), Paragraph('<b>Depois:</b> menu vira gaveta e a tabela rola dentro do cartão', PS), Paragraph('<b>Lista de cobrança</b> (página 1 do PDF real da impressão)', PS)]], colWidths=[56 * mm, 56 * mm, 64 * mm])
t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')])); E += [t]
E += [Spacer(1, 6)]
ims = [Image(f'{O}/shots/{n}.png', width=w * mm, height=w * mm * h / ww) for n, w, ww, h in [('dashboard-1280', 84, 1280, 900), ('retirada-360', 36, 360, 780), ('consulta-quiosque-360', 36, 360, 780)]]
t = Table([ims, [Paragraph('Dashboard com o botão <b>Imprimir</b> no cartão Cobrar hoje', PS), Paragraph('Retirada no celular: rodapé compacto', PS), Paragraph('Quiosque no celular', PS)]], colWidths=[88 * mm, 40 * mm, 40 * mm])
t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')])); E += [t]
E += [PageBreak()]

# ===================== 10. Pendências =====================
E += [p('10. O que ainda fica (nenhum bloqueia terça)', H1)]
E += [tabela([['Item', 'Por que ficou', 'Sugestão'],
              ['Contraste das cores de status (verde/âmbar)', 'Mexe em token do design system (FE-01)', 'Escurecer só a variante de texto: verde ~#177A41, âmbar ~#A86400'],
              ['Swagger público em produção', 'É entregável do PI', 'Restringir /docs depois da apresentação'],
              ['15 avisos de lint (set-state-in-effect etc.)', 'Estilo; mexer em efeito na véspera é risco', 'Tratar depois da implantação'],
              ['Admin fora do bloqueio por conta (senha de 6 dígitos)', 'Decisão anterior do time (evitar trancar o admin)', 'Manter o admin acessível só pela rede interna'],
              ['Busca no histórico ~60 ms', 'Imperceptível hoje', 'Índice trigram se o histórico passar de 5 anos'],
              ['10 exportações simultâneas ainda seguram a API 1,3 s', 'Cenário improvável', 'Streaming com cursor, se aparecer na prática'],
              ['PR #190: diálogo "Desativar ferramenta" não fecha sozinho', 'Trabalho em andamento de outra branch', 'Fechar no onSuccess do baixar.mutate'],
              ['Cabeçalhos de segurança no S3 + CloudFront', 'serve.json só vale no Dokploy/serve', 'Response headers policy no CloudFront'],
              ['Onde roda na terça (servidor interno da Soufer × nuvem)', 'Decisão em aberto da visita técnica (5.3)', 'Confirmar com o TI antes de terça'],
              ['Branch sem push', 'Aguardando autorização', 'Push + PR para development e revisão de 1 integrante']], [56, 56, 62])]
E += [p('Checklist de terça (atualizado)', H2)]
E += [tabela([['#', 'Item', 'Situação'],
              ['1', 'Merge da branch fix/auditoria-prontidao-implantacao (migration 0011 incluída)', 'PR a abrir'],
              ['2', 'Variáveis: NODE_ENV, JWT_SECRET (≥32), DB_PASSWORD forte, CORS_ORIGIN, TRUST_PROXY_HOPS=1, UPLOADS_DIR em volume', 'Guia atualizado'],
              ['3', 'npm run db:migrate → npm run db:admin -- &lt;matrícula&gt; "&lt;nome&gt;" "&lt;setor&gt;" → npm run db:feriados', 'Ensaiado'],
              ['4', 'Admin abre o link, define o PIN; importa setores, categorias, colaboradores e ferramentas (CSV)', 'Ensaiado: ~2 s'],
              ['5', 'Gera link de acesso de cada operador; operador define o PIN', 'Ensaiado'],
              ['6', 'Smoke test: retirada, devolução com avaria, quiosque, imprimir lista de cobrança', 'Ensaiado pela tela'],
              ['7', 'Backup diário agendado + 1 restauração de teste', 'Testado: 0,3 s / 0,6 s'],
              ['8', 'Porta da API não publicada; só o proxy chega nela', 'Documentado'],
              ['9', 'Monitor de disponibilidade em /v1/health', 'Rota pronta']], [8, 120, 46])]
E += [PageBreak()]

# ===================== Apêndice =====================
E += [p('Apêndice — método e reprodução', H1)]
E += bullets([f'Máquina: {CTX1["maquina"]}. API em build de produção; front servido pelo <font name="Mono">serve</font> com o <font name="Mono">serve.json</font> (como no deploy).',
              'Rodada 1 (relatório 1): banco soufer_audit com 1.530 ferramentas e 50.300 empréstimos. Rodada 2: banco recriado do zero pelo ensaio (1.030 ferramentas, 401 colaboradores) + 50 mil empréstimos de histórico.',
              'Ferramentas: gerador de carga em Node puro (laço fechado, sem pausa entre requisições), Chrome headless via DevTools Protocol, axe-core 4.10.3, psql/pg_dump; nenhuma dependência nova no projeto.',
              'Os scripts estão em docs/testes/auditoria-2026-10-09/scripts/ junto com os dois relatórios.'])
E += [Preformatted('''# ensaio da terça (banco zerado)
DB_NAME=soufer_v2 npm run db:migrate
NODE_ENV=production ... node dist/scripts/criar-admin.js 0042 "Responsável" "Manutenção Geral"
node ensaio.mjs out2                 # convite, importações, operador, retirada, devolução, quiosque

python3 cenarios.py out2 3998 scen2  # mesmos cenários da rodada 1
node loadtest.mjs scen2/load-50.json out2/load-50.json
bash infra.sh .                      # resiliência, backup/restore, exportações
node seguranca2.mjs out2             # 60 casos
node browser2.mjs out2 axe.min.js    # telas, axe, fluxos E2E, rede lenta
python3 charts2.py . && python3 relatorio2.py . relatorio-2.pdf''', COD)]
E += [p('Limitações', H3)]
E += bullets(['Testes locais, não no servidor de produção; o teste de 1 núcleo aproxima mas não substitui.',
              'Usabilidade avaliada por fluxos automatizados e capturas, não com o operador; a primeira hora de uso acompanhado na terça continua sendo o teste definitivo.',
              'O leitor de código físico foi simulado (digitação + Enter), como ele funciona.'])

doc.build(E)
print('PDF gerado:', SAIDA)
