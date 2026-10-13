# Gráficos da 2ª rodada (antes = out/, depois = out2/). uso: python3 -I charts2.py <scratchpad>
import json, csv, sys, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager

S = sys.argv[1]; A, D = f'{S}/out', f'{S}/out2'; G = f'{S}/graficos2'
os.makedirs(G, exist_ok=True)
for f in ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf']:
    font_manager.fontManager.addfont(f'/usr/share/fonts/truetype/noto/{f}')
plt.rcParams.update({'font.family': 'Noto Sans', 'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.edgecolor': '#9a9994', 'axes.labelcolor': '#52514e', 'xtick.color': '#52514e', 'ytick.color': '#52514e',
                     'axes.grid': True, 'grid.color': '#e6e5e0', 'grid.linewidth': .6, 'axes.axisbelow': True, 'figure.dpi': 200,
                     'axes.titlesize': 10, 'axes.titleweight': 'bold', 'axes.titlelocation': 'left', 'legend.frameon': False})
ANTES, DEPOIS, C3, CRIT, NEU = '#9a9994', '#2a78d6', '#1baf7a', '#e34948', '#9a9994'
J = lambda p: json.load(open(p))
def salvar(fig, nome): fig.tight_layout(); fig.savefig(f'{G}/{nome}.png'); plt.close(fig)
rot = {'health': 'Health', 'dashboard': 'Dashboard', 'ferramentas_lista': 'Ferramentas (lista)', 'ferramentas_busca': 'Ferramentas (busca)',
       'ferramenta_por_codigo': 'Ferramenta por código', 'ferramenta_historico': 'Histórico da ferramenta', 'emprestimos_lista': 'Empréstimos (lista)',
       'emprestimos_atrasados': 'Empréstimos atrasados', 'emprestimos_busca': 'Empréstimos (busca)', 'calendario': 'Calendário',
       'colaborador_identificar': 'Identificar colaborador', 'notificacoes': 'Notificações', 'opcoes': 'Opções', 'consulta_quiosque': 'Quiosque'}

# 1) linha de base antes x depois (p95)
lin = [(rot[n], J(f'{A}/base-{n}.json')['total']['p50'], J(f'{D}/base-{n}.json')['total']['p50']) for n in rot]
lin.sort(key=lambda x: x[1])
fig, ax = plt.subplots(figsize=(7, 4.2)); y = range(len(lin))
ax.barh([i + .2 for i in y], [l[1] for l in lin], height=.38, color=ANTES, label='antes')
ax.barh([i - .2 for i in y], [l[2] for l in lin], height=.38, color=DEPOIS, label='depois')
ax.set_yticks(list(y)); ax.set_yticklabels([l[0] for l in lin]); ax.grid(axis='y', visible=False)
for i, l in enumerate(lin): ax.text(max(l[1], l[2]) + .8, i, f'{l[1]:.0f} / {l[2]:.0f} ms', va='center', fontsize=7, color='#52514e')
ax.set_xlabel('Latência mediana (p50, ms) — 1 usuário, 50 mil empréstimos no banco'); ax.legend(loc='lower right'); ax.set_title('Latência por rota: antes × depois')
salvar(fig, 'baseline')

# 2) carga antes x depois
cs = [1, 5, 10, 25, 50, 100, 200, 500, 1000]
def serie(base):
    out = []
    for c in cs:
        p = f'{base}/load-{c}.json' if c <= 200 else f'{base}/spike-{c}.json'
        out.append(J(p)['total'] if os.path.exists(p) else None)
    return out
la, ld = serie(A), serie(D)
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 3.2))
for s, cor, nome in [(la, ANTES, 'antes'), (ld, DEPOIS, 'depois')]:
    xs = [c for c, l in zip(cs, s) if l]; a1.plot(xs, [l['rps'] for l in s if l], color=cor, lw=2, marker='o', ms=4, label=nome)
    a2.plot(xs, [l['p95'] for l in s if l], color=cor, lw=2, marker='o', ms=4, label=nome)
for a in (a1, a2):
    a.set_xscale('log'); a.set_xticks(cs); a.set_xticklabels(cs, fontsize=7); a.set_xlabel('Usuários simultâneos'); a.legend(loc='lower right' if a is a2 else 'lower center')
a1.set_ylabel('Requisições/s'); a1.set_title('Vazão'); a1.set_ylim(0)
a2.set_yscale('log'); a2.set_ylabel('p95 (ms, escala log)'); a2.set_title('Latência p95')
a2.axhline(1000, color=CRIT, lw=1, ls='--'); a2.text(1000, 1150, 'limite de 1 s', fontsize=7, color=CRIT, ha='right')
salvar(fig, 'carga')

# 3) 1 núcleo
if os.path.exists(f'{D}/cpu1-1.json'):
    cc = [1, 5, 10, 25, 50, 100]; L = [J(f'{D}/cpu1-{c}.json')['total'] for c in cc]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 2.8))
    a1.plot(cc, [l['rps'] for l in L], color=DEPOIS, lw=2, marker='o', ms=4); a1.set_xscale('log'); a1.set_xticks(cc); a1.set_xticklabels(cc)
    a1.axhline(5, color=C3, ls='--', lw=1); a1.text(1, 25, 'uso real estimado da Soufer (< 5 req/s)', fontsize=7, color='#1b7a52')
    a1.set_ylim(0); a1.set_xlabel('Usuários simultâneos'); a1.set_ylabel('Requisições/s'); a1.set_title('Vazão com a API em 1 núcleo')
    for k, cor in [('p50', DEPOIS), ('p95', '#eb6834')]: a2.plot(cc, [l[k] for l in L], color=cor, lw=2, marker='o', ms=4, label=k)
    a2.set_xscale('log'); a2.set_xticks(cc); a2.set_xticklabels(cc); a2.set_xlabel('Usuários simultâneos'); a2.set_ylabel('ms'); a2.set_title('Latência'); a2.legend()
    salvar(fig, 'cpu1')

# 4) resiliência
if os.path.exists(f'{D}/resiliencia.json'):
    r = J(f'{D}/resiliencia.json'); kill = (float(open(f'{D}/resil-kill.txt').read()) - float(open(f'{D}/resil-start.txt').read())) * 1000
    b = {}
    for _, t, lat, st in r['samples']:
        k = int(t // 500); b.setdefault(k, [0, 0]); b[k][0 if (200 <= st < 500) else 1] += 1
    ks = sorted(b)
    fig, ax = plt.subplots(figsize=(7.2, 2.6))
    ax.bar([k / 2 for k in ks], [b[k][0] for k in ks], width=.45, color=DEPOIS, label='respondidas (2xx–4xx)')
    ax.bar([k / 2 for k in ks], [b[k][1] for k in ks], width=.45, bottom=[b[k][0] for k in ks], color=CRIT, label='erro 5xx / falha')
    ax.axvline(kill / 1000, color='#1D1D1B', ls='--', lw=1); ax.text(kill / 1000 + .3, ax.get_ylim()[1] * .9, 'todas as conexões do banco derrubadas', fontsize=7)
    ax.set_xlabel('segundos'); ax.set_ylabel('requisições a cada 0,5 s'); ax.set_title('Resiliência: queda das conexões com o banco sob carga'); ax.legend(loc='lower right')
    salvar(fig, 'resiliencia')

# 5) soak depois
sk = J(f'{D}/soak.json'); bins = {}
for _, t, lat, st in sk['samples']: bins.setdefault(t // 10000, []).append(lat)
xs = sorted(bins)
mon = list(csv.DictReader(open(f'{D}/monitor.csv'))); s0 = float(open(f'{D}/soak-start.txt').read()); s1 = float(open(f'{D}/soak-end.txt').read())
rs = [m for m in mon if s0 <= float(m['ts']) <= s1]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(7.4, 2.8))
a1.plot([x * 10 for x in xs], [sorted(bins[x])[len(bins[x]) // 2] for x in xs], color=DEPOIS, lw=2, label='p50')
a1.plot([x * 10 for x in xs], [sorted(bins[x])[int(len(bins[x]) * .95)] for x in xs], color='#eb6834', lw=2, label='p95')
a1.set_ylim(0); a1.set_xlabel('segundos'); a1.set_ylabel('ms'); a1.set_title('Latência em 4 min (25 usuários)'); a1.legend()
a2.plot([float(m['ts']) - s0 for m in rs], [int(m['rss_mb']) for m in rs], color=C3, lw=2); a2.set_ylim(0, max(int(m['rss_mb']) for m in rs) * 1.4)
a2.set_xlabel('segundos'); a2.set_ylabel('MB'); a2.set_title('Memória (RSS) do processo')
salvar(fig, 'soak')

# 6) importação: todas as medições
imp = list(csv.DictReader(open(f'{A}/import-bench2.csv')))
antes = [(int(r['linhas']), float(r['segundos'])) for r in imp if r['cenario'] == 'tabela_vazia']
depois = [(int(r['linhas']), float(r['segundos'])) for r in imp if r['cenario'] == 'corrigido']
ens = [p for p in J(f'{D}/ensaio.json')['passos'] if p['nome'].startswith('7.')][0]
fig, ax = plt.subplots(figsize=(7, 2.9))
ax.plot(*zip(*antes), color=CRIT, lw=2, marker='o', ms=4, label='gatilho antigo (0005)')
ax.plot(*zip(*depois), color=DEPOIS, lw=2, marker='o', ms=4, label='gatilho novo (0011)')
ax.plot([1000], [ens['ms'] / 1000], marker='*', ms=13, color=C3, ls='none', label=f"ensaio da terça: 1.000 linhas em {ens['ms'] / 1000:.1f} s")
ax.axhline(60, color=NEU, ls='--', lw=1); ax.text(2000, 62, 'timeout típico de proxy (60 s)', fontsize=7, color='#52514e', ha='right')
ax.set_ylim(0, 70); ax.set_xlabel('Linhas do CSV (banco vazio)'); ax.set_ylabel('segundos'); ax.set_title('Importação em lote de ferramentas'); ax.legend(loc='center right')
salvar(fig, 'importacao')

# 7) front: bundle e rede lenta
b2 = J(f'{D}/browser2.json')
fr = b2['frio']
fig, axs = plt.subplots(1, 2, figsize=(7.4, 2.9))
for ax, rede in zip(axs, ['4G', '3G']):
    tel = ['login', 'dashboard logado']
    for k, (build, cor) in enumerate([('antigo', ANTES), ('novo', DEPOIS)]):
        vals = [next(x['load'] for x in fr if x['rede'] == rede and x['build'] == build and x['tela'] == t) / 1000 for t in tel]
        ax.bar([i + (k - .5) * .38 for i in range(2)], vals, width=.36, color=cor, label='antes' if build == 'antigo' else 'depois')
        for i, v in enumerate(vals): ax.text(i + (k - .5) * .38, v + .05, f'{v:.1f}s', ha='center', fontsize=7)
    ax.set_xticks(range(2)); ax.set_xticklabels(tel); ax.set_ylabel('carga completa (s)'); ax.set_title(f'Primeira abertura em rede {rede}'); ax.grid(axis='x', visible=False)
axs[0].legend(loc='upper left')
salvar(fig, 'rede')
print('ok', sorted(os.listdir(G)))
