# Gera os gráficos do relatório a partir de out/*.json|csv. uso: python3 -I charts.py <scratchpad>
import json, csv, sys, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

S = sys.argv[1]; O = f'{S}/out'; G = f'{S}/graficos'
os.makedirs(G, exist_ok=True)
for f in ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf']:
    font_manager.fontManager.addfont(f'/usr/share/fonts/truetype/noto/{f}')
plt.rcParams.update({'font.family': 'Noto Sans', 'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.edgecolor': '#9a9994', 'axes.labelcolor': '#52514e', 'xtick.color': '#52514e', 'ytick.color': '#52514e',
                     'axes.grid': True, 'grid.color': '#e6e5e0', 'grid.linewidth': .6, 'axes.axisbelow': True, 'figure.dpi': 200,
                     'axes.titlesize': 10, 'axes.titleweight': 'bold', 'axes.titlelocation': 'left', 'legend.frameon': False})
C1, C2, C3 = '#2a78d6', '#eb6834', '#1baf7a'   # slots categóricos 1-3 (paleta validada)
CRIT, NEU = '#e34948', '#9a9994'
def salvar(fig, nome): fig.tight_layout(); fig.savefig(f'{G}/{nome}.png'); plt.close(fig)
rotulo = {'health': 'Health', 'dashboard': 'Dashboard', 'ferramentas_lista': 'Ferramentas (lista)', 'ferramentas_busca': 'Ferramentas (busca)',
          'ferramenta_por_codigo': 'Ferramenta por código', 'ferramenta_historico': 'Histórico da ferramenta', 'emprestimos_lista': 'Empréstimos (lista)',
          'emprestimos_atrasados': 'Empréstimos atrasados', 'emprestimos_busca': 'Empréstimos (busca)', 'calendario': 'Calendário',
          'colaborador_identificar': 'Identificar colaborador', 'notificacoes': 'Notificações', 'opcoes': 'Opções (selects)', 'consulta_quiosque': 'Quiosque (consulta)'}

# 1) linha de base por endpoint
base = []
for n in rotulo:
    p = f'{O}/base-{n}.json'
    if os.path.exists(p):
        t = json.load(open(p))['total']; base.append((rotulo[n], t['p50'], t['p95']))
base.sort(key=lambda x: x[2])
fig, ax = plt.subplots(figsize=(7, 4.2))
y = range(len(base))
ax.barh([i + .2 for i in y], [b[1] for b in base], height=.38, color=C1, label='p50 (mediana)')
ax.barh([i - .2 for i in y], [b[2] for b in base], height=.38, color=C2, label='p95')
ax.set_yticks(list(y)); ax.set_yticklabels([b[0] for b in base]); ax.grid(axis='y', visible=False)
for i, b in enumerate(base): ax.text(b[2] + .8, i - .2, f'{b[2]:.0f} ms', va='center', fontsize=7, color='#52514e')
ax.set_xlabel('Latência (ms) — 1 usuário, 6 s por rota, 50.300 empréstimos no banco'); ax.legend(loc='lower right')
ax.set_title('Latência por rota (linha de base)')
salvar(fig, 'baseline')

# 2) carga: vazão e latência por concorrência
cs = [1, 5, 10, 25, 50, 100, 200]
L = [json.load(open(f'{O}/load-{c}.json'))['total'] for c in cs]
for sp in ['spike-500', 'spike-1000']:
    if os.path.exists(f'{O}/{sp}.json'):
        cs.append(int(sp.split('-')[1])); L.append(json.load(open(f'{O}/{sp}.json'))['total'])
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 3.2))
a1.plot(cs, [l['rps'] for l in L], color=C1, lw=2, marker='o', ms=4)
a1.set_xscale('log'); a1.set_xticks(cs); a1.set_xticklabels(cs, fontsize=7); a1.set_xlabel('Usuários simultâneos (sem pausa)'); a1.set_ylabel('Requisições/s')
a1.set_title('Vazão'); a1.set_ylim(0)
for k, cor, nome in [('p50', C1, 'p50'), ('p95', C2, 'p95'), ('p99', C3, 'p99')]:
    a2.plot(cs, [l[k] for l in L], color=cor, lw=2, marker='o', ms=4, label=nome)
a2.set_xscale('log'); a2.set_yscale('log'); a2.set_xticks(cs); a2.set_xticklabels(cs, fontsize=7); a2.set_xlabel('Usuários simultâneos'); a2.set_ylabel('Latência (ms, escala log)')
a2.axhline(1000, color=CRIT, lw=1, ls='--'); a2.text(1000, 1150, 'limite de 1 s', fontsize=7, color=CRIT, ha='right')
a2.set_title('Latência'); a2.legend(loc='lower right')
salvar(fig, 'carga')

# 3) recursos durante rampa de carga
mon = list(csv.DictReader(open(f'{O}/monitor.csv')))
t0 = float(open(f'{O}/load-start.txt').read()); t1 = float(open(f'{O}/load-end.txt').read())
rows = [m for m in mon if t0 - 2 <= float(m['ts']) <= t1 + 2]
ts = [float(m['ts']) - t0 for m in rows]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 2.8))
a1.plot(ts, [float(m['cpu']) for m in rows], color=C1, lw=1.6); a1.set_ylabel('CPU do processo da API (%)'); a1.set_xlabel('segundos'); a1.set_title('CPU (100% = 1 núcleo)'); a1.set_ylim(0, 110)
a2.plot(ts, [int(m['pg_conns'] or 0) for m in rows], color=C2, lw=1.6); a2.axhline(20, color=CRIT, ls='--', lw=1)
a2.text(2, 20.6, 'pool máx. = 20', fontsize=7, color=CRIT); a2.set_ylabel('Sessões no Postgres*'); a2.set_xlabel('segundos'); a2.set_title('Conexões ao banco')
off = 0
for c in [1, 5, 10, 25, 50, 100, 200]:
    a1.text(off + 1, 103, str(c), fontsize=6, color='#52514e'); off += 18
salvar(fig, 'recursos')

# 4) soak
if os.path.exists(f'{O}/soak.json'):
    sk = json.load(open(f'{O}/soak.json'))
    bins = {}
    for _, t, lat, st in sk['samples']:
        bins.setdefault(t // 10000, []).append(lat)
    xs = sorted(bins); p50 = [sorted(bins[x])[len(bins[x]) // 2] for x in xs]; p95 = [sorted(bins[x])[int(len(bins[x]) * .95)] for x in xs]
    s0 = float(open(f'{O}/soak-start.txt').read()); s1 = float(open(f'{O}/soak-end.txt').read())
    rs = [m for m in mon if s0 <= float(m['ts']) <= s1]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 2.8))
    a1.plot([x * 10 for x in xs], p50, color=C1, lw=2, label='p50'); a1.plot([x * 10 for x in xs], p95, color=C2, lw=2, label='p95')
    a1.set_xlabel('segundos'); a1.set_ylabel('ms'); a1.set_title('Latência ao longo de 4 min (25 usuários)'); a1.legend(); a1.set_ylim(0)
    a2.plot([float(m['ts']) - s0 for m in rs], [int(m['rss_mb']) for m in rs], color=C3, lw=2); a2.set_ylim(0, max(int(m['rss_mb']) for m in rs) * 1.4)
    a2.set_xlabel('segundos'); a2.set_ylabel('MB'); a2.set_title('Memória (RSS) do processo')
    salvar(fig, 'soak')

# 5) importação: antes x depois
imp = list(csv.DictReader(open(f'{O}/import-bench2.csv')))
antes = [(int(r['linhas']), float(r['segundos'])) for r in imp if r['cenario'] == 'tabela_vazia']
depois = [(int(r['linhas']), float(r['segundos'])) for r in imp if r['cenario'] == 'corrigido']
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 3.0))
a1.plot(*zip(*antes), color=CRIT, lw=2, marker='o', ms=4, label='gatilho atual')
a1.plot(*zip(*depois), color=C3, lw=2, marker='o', ms=4, label='gatilho corrigido')
a1.axhline(60, color=NEU, ls='--', lw=1); a1.text(2000, 62, 'timeout típico de proxy (60 s)', fontsize=7, color='#52514e', ha='right')
a1.set_xlabel('Linhas do CSV (banco vazio)'); a1.set_ylabel('segundos'); a1.set_title('Importação em lote (/v1/importacoes)'); a1.set_ylim(0, 70); a1.legend(loc='center right')
fa = json.load(open(f'{O}/front-import.json')); fd = json.load(open(f'{O}/front-import-fix.json'))
xb = [i * 50 + 25 for i in range(len(fa['mediaPorBlocoDe50']))]
a2.plot(xb, fa['mediaPorBlocoDe50'], color=CRIT, lw=2, marker='o', ms=4, label=f"atual ({fa['segundos']:.0f} s no total)")
a2.plot(xb, fd['mediaPorBlocoDe50'], color=C3, lw=2, marker='o', ms=4, label=f"corrigido ({fd['segundos']:.1f} s)")
a2.set_xlabel('Ferramenta nº (cadastro 1 a 1, como a tela faz)'); a2.set_ylabel('ms por cadastro'); a2.set_title('Cadastro de 500 ferramentas pela tela'); a2.legend(loc='upper left')
salvar(fig, 'importacao')

# 6) testes automatizados
for nome in ['api', 'web']:
    d = json.load(open(f'{O}/{nome}-tests.json'))
    globals()[nome] = d
fig, ax = plt.subplots(figsize=(7, 1.6))
ax.barh(['API (Vitest + Supertest)', 'Web (Vitest)'], [api['numPassedTests'], web['numPassedTests']], color=C3, height=.5)
for i, d in enumerate([api, web]): ax.text(d['numPassedTests'] + 4, i, f"{d['numPassedTests']}/{d['numTotalTests']} passaram", va='center', fontsize=8)
ax.set_xlim(0, 420); ax.grid(axis='y', visible=False); ax.set_title('Testes automatizados'); ax.set_xlabel('testes')
salvar(fig, 'testes')
print('ok', os.listdir(G))
