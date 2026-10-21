"""
Gera o relatório da entrega em PDF a partir de ../../ENTREGA.md, no padrão dos relatórios anteriores
(capa UNIFEOB e seções numeradas), usando o Chrome em modo headless.

    python gerar-pdf.py

Saída: docs/entregas-pi/integracao-de-dados-max-vallim/entrega-max-20-10-2026.pdf
Requer: markdown-it-py (pip install markdown-it-py) e o Google Chrome ou o Microsoft Edge instalado.
O diagrama Mermaid é desenhado pelo próprio navegador (biblioteca carregada da CDN jsdelivr).
"""
import html
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from markdown_it import MarkdownIt

AQUI = Path(__file__).resolve().parent
ENTREGA = AQUI.parent.parent / 'ENTREGA.md'
SAIDA = AQUI.parent.parent.parent / 'entrega-max-20-10-2026.pdf'

NAVEGADORES = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]

CAPA = """
<section class="capa">
  <p class="negrito">UNIFEOB</p>
  <p class="negrito">CENTRO UNIVERSITÁRIO DA FUNDAÇÃO DE<br>ENSINO OCTÁVIO BASTOS</p>
  <p class="negrito">ESCOLA DE NEGÓCIOS</p>
  <div class="espaco"></div>
  <p class="negrito">ANÁLISE E DESENVOLVIMENTO DE SISTEMAS<br>CIÊNCIAS DA COMPUTAÇÃO</p>
  <div class="espaco"></div>
  <p class="negrito">Transformação, validação e qualidade dos dados – Entrega Prof.<br>Max Vallim 20/10/2026</p>
  <div class="espaco"></div>
  <p class="negrito sublinhado">ESTUDANTES:</p>
  <p>25000151 - Guilherme P. da Rosa Santi<br>25001176 - Henrique de Oliveira Molinari<br>25000019 - João Augusto de Freitas<br>25000795 - Kauan Leander Leandrini</p>
  <div class="espaco grande"></div>
  <p>São João da Boa Vista–SP<br>2026</p>
</section>
"""

CSS = """
@page { size: Letter; margin: 2.2cm 2.2cm 2.4cm 2.2cm; @bottom-center { content: counter(page); font: 9pt Arial, sans-serif; color: #666; } }
@page :first { margin: 2.2cm; @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { font: 10.5pt/1.5 Arial, Helvetica, sans-serif; color: #222; margin: 0; }
.capa { text-align: center; height: 22.6cm; overflow: hidden; page-break-after: always; padding-top: 1cm; }
.capa p { margin: 0.3cm 0; font-size: 11.5pt; text-align: center; }
.capa .negrito { font-weight: 700; }
.capa .sublinhado { text-decoration: underline; }
.capa .espaco { height: 2.1cm; }
.capa .espaco.grande { height: 2.6cm; }
h1 { font-size: 17pt; margin: 1.1cm 0 0.3cm; padding-bottom: 4px; border-bottom: 1px solid #ddd; page-break-after: avoid; }
h1:first-of-type { margin-top: 0; }
h2 { font-size: 13.5pt; margin: 0.8cm 0 0.2cm; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 0.6cm 0 0.15cm; page-break-after: avoid; }
p { margin: 0.22cm 0; text-align: left; }
ul, ol { margin: 0.2cm 0; padding-left: 0.9cm; }
li { margin: 0.07cm 0; }
code { font: 9pt Consolas, 'Courier New', monospace; background: #f1f3f5; padding: 1px 3px; border-radius: 3px; }
pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 4px; padding: 8px 10px; margin: 0.3cm 0; font: 8.2pt/1.4 Consolas, 'Courier New', monospace; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
pre.mermaid { background: #fff; border: 1px solid #e1e4e8; text-align: center; font-family: Arial, sans-serif; white-space: normal; page-break-inside: avoid; }
pre.mermaid { margin: 0.2cm 0; padding: 4px; }
pre.mermaid svg { max-width: 100% !important; max-height: 15.5cm; width: auto; height: auto; }
table { border-collapse: collapse; width: 100%; margin: 0.3cm 0; font-size: 8.8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th, td { border: 1px solid #d0d7de; padding: 4px 6px; vertical-align: top; text-align: left; }
th { background: #eef1f4; }
strong { font-weight: 700; }
"""


def encontrar_navegador() -> str:
    for caminho in NAVEGADORES:
        if os.path.exists(caminho):
            return caminho
    sys.exit('Chrome ou Edge não encontrado: ajuste NAVEGADORES em gerar-pdf.py')


def renderizar() -> str:
    md = MarkdownIt('commonmark', {'html': False}).enable('table')
    corpo = md.render(ENTREGA.read_text(encoding='utf-8'))
    # o bloco ```mermaid vira um <pre class="mermaid"> que a biblioteca desenha
    def trocar(m):
        return '<pre class="mermaid">' + html.unescape(m.group(1)) + '</pre>'
    corpo = re.sub(r'<pre><code class="language-mermaid">(.*?)</code></pre>', trocar, corpo, flags=re.S)
    return f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Transformação, validação e qualidade dos dados – Entrega Prof. Max Vallim 20/10/2026</title>
<style>{CSS}</style></head>
<body>{CAPA}<main>{corpo}</main>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs';
  mermaid.initialize({{ startOnLoad: false, theme: 'neutral', flowchart: {{ htmlLabels: true, useMaxWidth: true }} }});
  await mermaid.run({{ querySelector: 'pre.mermaid' }});
  document.body.dataset.pronto = '1';
</script>
</body></html>"""


def main():
    pasta = Path(tempfile.mkdtemp(prefix='entrega-pdf-'))
    try:
        arquivo = pasta / 'entrega.html'
        arquivo.write_text(renderizar(), encoding='utf-8')
        perfil = pasta / 'perfil'
        saida_tmp = pasta / 'entrega.pdf'
        cmd = [
            encontrar_navegador(), '--headless=new', '--disable-gpu', '--no-sandbox',
            f'--user-data-dir={perfil}', '--no-pdf-header-footer',
            '--virtual-time-budget=20000', f'--print-to-pdf={saida_tmp}',
            arquivo.as_uri(),
        ]
        subprocess.run(cmd, check=True, timeout=180, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if not saida_tmp.exists() or saida_tmp.stat().st_size < 10_000:
            sys.exit('O navegador não gerou o PDF')
        shutil.copyfile(saida_tmp, SAIDA)
        print('PDF gerado:', SAIDA, f'({SAIDA.stat().st_size // 1024} KB)')
    finally:
        shutil.rmtree(pasta, ignore_errors=True)


if __name__ == '__main__':
    main()
