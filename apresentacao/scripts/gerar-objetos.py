# python3 scripts/gerar-objetos.py  (com `npm run dev -- --port 5199` no ar)
# Mede onde está cada objeto marcado com data-objeto em cada slide e grava
# src/objetos.js. Rode de novo quando mudar o layout de um slide ou
# criar/remover um objeto.
import json, sys
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:5199'
TOTAL = int(sys.argv[1]) if len(sys.argv) > 1 else 19
saida = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'], executable_path='/usr/bin/google-chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    for n in range(1, TOTAL + 1):
        pg.goto(f'{URL}/#slide-{n}'); pg.reload(); pg.wait_for_timeout(3000)
        titulo = pg.evaluate("() => document.querySelector('.topo-titulo')?.textContent || ''")
        dados = pg.evaluate("""() => {
          const raiz = document.querySelector('[data-slide]'); const cont = {}
          return [...raiz.querySelectorAll('[data-objeto]')].map((el) => {
            const t = el.dataset.objeto; cont[t] = (cont[t] || 0) + 1
            const r = el.getBoundingClientRect(), q = (v, m) => Math.round(v / m * 10000) / 10000
            return [`${t}-${cont[t]}`, t, el.dataset.nome || t, q(r.left, 1920), q(r.top, 1080), q(r.width, 1920), q(r.height, 1080)]
          })
        }""")
        saida[n] = dados
    b.close()
with open('src/objetos.js', 'w') as f:
    f.write("/* GERADO por scripts/gerar-objetos.py: não editar à mão.\n   Objetos de cada slide (por número), com a posição na tela (fração de 1920x1080).\n   Lista fixa: o celular mostra na hora, sem medir nada. O id é tipo-N, na ordem do slide. */\n")
    f.write("export const OBJETOS = {\n")
    for n, ob in saida.items():
        f.write(f"  {n}: [\n")
        for o in ob: f.write(f"    {json.dumps(o, ensure_ascii=False)},\n")
        f.write("  ],\n")
    f.write("}\n")
print('ok', sum(len(v) for v in saida.values()), 'objetos')
