# Gera os cenários de carga (mesmos da 1ª rodada). uso: python3 -I cenarios.py <outDir> <porta> <scenDir>
import json, os, sys
O, porta, D = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(D, exist_ok=True)
m = open(f'{O}/.mtoken').read(); c = open(f'{O}/.ctoken').read(); FID = open(f'{O}/.fid').read()
base = f'http://localhost:{porta}/v1'
eps = [('health', '/health', None), ('dashboard', '/dashboard', None), ('ferramentas_lista', '/ferramentas?page={rand20}&limit=20', None),
       ('ferramentas_busca', '/ferramentas?q=furadeira', None), ('ferramenta_por_codigo', '/ferramentas/por-codigo/{rand999}', None),
       ('ferramenta_historico', f'/ferramentas/{FID}/historico', None), ('emprestimos_lista', '/emprestimos?page={rand50}&limit=20', None),
       ('emprestimos_atrasados', '/emprestimos?situacao=atrasado', None), ('emprestimos_busca', '/emprestimos?q=colaborador%2015', None),
       ('calendario', '/emprestimos/calendario?mes=2026-10', None), ('colaborador_identificar', '/colaboradores/identificar?termo=0{rand399}', None),
       ('notificacoes', '/notificacoes', None), ('opcoes', '/opcoes', None), ('consulta_quiosque', '/consulta/ferramentas?q=furadeira', 'c')]
for n, p, t in eps:
    if n == 'colaborador_identificar':
        p = '/colaboradores/identificar?termo=Colaborador%20Ensaio%20{rand400}'
    json.dump({'base': base, 'duration': 6, 'concurrency': 1, 'token': c if t else m, 'requests': [{'name': n, 'path': p}]}, open(f'{D}/base-{n}.json', 'w'))
pesos = {'dashboard': 10, 'notificacoes': 15, 'ferramentas_lista': 15, 'ferramentas_busca': 10, 'ferramenta_por_codigo': 15, 'colaborador_identificar': 10,
         'emprestimos_lista': 5, 'emprestimos_busca': 3, 'calendario': 3, 'ferramenta_historico': 4, 'opcoes': 5}
reqs = [{'name': n, 'path': json.load(open(f'{D}/base-{n}.json'))['requests'][0]['path'], 'weight': w} for n, w in pesos.items()]
reqs.append({'name': 'consulta_quiosque', 'path': '/consulta/ferramentas?q=furadeira', 'weight': 5, 'token': c})
for cc in [1, 5, 10, 25, 50, 100, 200]:
    json.dump({'base': base, 'duration': 15, 'concurrency': cc, 'token': m, 'requests': reqs}, open(f'{D}/load-{cc}.json', 'w'))
json.dump({'base': base, 'duration': 240, 'concurrency': 25, 'token': m, 'requests': reqs, 'keepSamples': True}, open(f'{D}/soak.json', 'w'))
for cc in [500, 1000]:
    json.dump({'base': base, 'duration': 20, 'concurrency': cc, 'token': m, 'requests': reqs}, open(f'{D}/spike-{cc}.json', 'w'))
print('ok')
