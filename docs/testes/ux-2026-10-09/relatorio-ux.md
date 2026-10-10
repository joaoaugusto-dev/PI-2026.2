# Teste de uso real — SOUFER Tools (visão do operador do balcão)

**Data:** 09/10/2026 · **Versão:** `0.0.2-beta` (branch `feat/web-avisos-navegador-resumo-diario`)
**Como foi feito:** app rodando local (API + front + `soufer_dev`), Chrome real controlado por script,
leitor de código simulado (digitação rápida + Enter), prints em 360 / 768 / 1280 px.
**Persona:** operador da manutenção no balcão — de luva, com fila, leitor na mão, pouca
paciência para ler. Também testei o quiosque de consulta (colaborador) e as telas do admin.

> Os prints citados estão nesta mesma pasta.

---

## Resumo

O fluxo principal já está **bom de verdade**: o leitor avança sozinho entre os campos, o setor
vem preenchido pelo colaborador, a devolução mostra claramente quem estava com a ferramenta e a
avaria explica o que vai acontecer antes de confirmar. Nada travou nem perdeu dado.

O que impede de ser "bipa, bipa, pronto" são **três bugs** e **um punhado de cliques que
podiam vir prontos**:

| Hoje | Proposta |
|---|---|
| **Retirada:** bipa ferramenta → bipa crachá → rola a tela → clica na data → clica Confirmar → espera 2,2 s → clica no campo para a próxima | bipa ferramenta → bipa crachá → **Enter** (já pronto para a próxima) |
| **Devolução:** bipa → pega o mouse → clica "OK" → clica Confirmar | bipa → **Enter** (OK já marcado) |

---

## Prioridades

### P0 — quebra o uso no balcão (corrigir antes da entrega)

| # | Problema | Onde | Solução |
|---|---|---|---|
| 1 | **Depois de confirmar a retirada o cursor some** (foco fica no `<body>` por tempo indefinido). A próxima bipada do leitor não vai para lugar nenhum — o operador acha que o leitor quebrou. Na devolução isso não acontece. | `RetiradaPage.tsx` | Focar `ferramentaCodigo` (e rolar ao topo) também no `aoTerminarAnimacao`, quando a tela de sucesso sai. Verificado 4 s depois do sucesso: foco ainda no `BODY`. |
| 2 | **A atividade digitada na retirada nunca aparece na devolução** — mostra "—". A tela lê `atividade_nome` (atividade do catálogo) e ignora `atividade_observacao`, que é justamente o que a retirada grava. A API devolve os dois. | `DevolucaoPage.tsx:104`, tipo `Emprestimo` em `useEmprestimos.ts` | `atividade: encontrado.atividade_nome ?? encontrado.atividade_observacao` e incluir o campo no tipo. Mostrar também no Histórico. |
| 3 | **Tela rolando para o lado.** Em 1280: Histórico (1530 px — "Situação" e "Devolução" ficam fora da tela) e Cadastro de colaboradores (1363 px — "Inativar" e "Novo registro" cortados). Em 768: Ferramentas, Detalhe da ferramenta, Indisponíveis, Histórico e Cadastros de colaboradores/ferramentas. | `11-historico.png`, `14-cad-colaboradores.png` | Tabela dentro de `overflow-x-auto` no próprio card (nunca na página) e, abaixo de `md`, virar lista de cards (ver item 12). |
| 4 | **Cadastro rápido de colaborador estoura o card** (botão "Usar" e setor saem para fora) — grade fixa `1fr 8rem 10rem auto` dentro de meia tela. E a matrícula que o operador acabou de digitar **não vem preenchida**: tem que digitar de novo. | `CadastroRapidoColaborador.tsx`, `06-colab-novo.png` | Empilhar (nome em linha inteira; matrícula + setor; botão largo "Cadastrar e usar"). Receber o termo digitado como `matricula` inicial (se for número) ou `nome` (se for texto). |

### P1 — atrito alto no dia a dia

| # | Experiência | Solução |
|---|---|---|
| 5 | **Previsão de devolução vazia e abaixo da dobra** (em 1280×800 precisa rolar). É o único campo que sempre exige mouse. | Vir marcada **"Hoje"** (a maioria volta no mesmo turno); o operador só mexe se for diferente. Com isso o Enter no colaborador já pode confirmar. |
| 6 | **Devolução sem condição marcada.** Depois de bipar, o foco some e o Enter não faz nada; precisa do mouse para "OK" e de novo para "Confirmar". | **OK pré-selecionado** e Enter confirma. Avaria/Perda continuam a um toque e trocam o botão (já trocam: "Confirmar e abrir ocorrência"). Atalhos 1/2/3 são um bônus barato. |
| 7 | **Enter no campo "Atividade" quebra linha** em vez de seguir. Depois do crachá o foco cai ali; o operador aperta Enter achando que acabou. | Enter = confirmar (Shift+Enter quebra linha), ou trocar por `input` de uma linha. |
| 8 | **Ferramenta já emprestada:** "Só um empréstimo aberto por ferramenta — não é possível retirar." É a regra do sistema, não o que o operador precisa saber. | "Esta ferramenta está com **PEDRO H. R. DOS SANTOS** desde 21:53 (Controle Qualidade)." + botão **"Registrar devolução dela"**. Mesma ideia para bipar na devolução uma ferramenta disponível: hoje diz "Nenhum empréstimo aberto encontrado" → "Esta ferramenta já está no estoque." |
| 9 | **Devolução por nome com vários empréstimos** vira um texto corrido vermelho e não clicável ("…digite ou bipe o código: 000021 Extensão… · 000020 Extensão…"). Na retirada a mesma situação tem botões. | Reaproveitar `OpcoesAmbiguas` (já existe e funciona na retirada). |
| 10 | **Devolução: tela vazia enquanto espera o código.** Com etiqueta gasta/ilegível (ponto levantado na visita técnica, DB-01) o operador fica sem saída. | Mostrar abaixo do campo a lista **"Em uso agora"** (ferramenta + quem está com ela), tocável. Resolve etiqueta ilegível sem depender do leitor. |
| 11 | **Animação de sucesso segura a tela ~2,2 s** a cada operação. Bonita na primeira vez; com fila no balcão vira espera. | Encurtar para ~0,8 s ou não bloquear (faixa verde grande + som, campo já liberado para a próxima bipada). |
| 12 | **Celular/listas cortam o que importa:** "Chave All…" em Ferramentas e "Chave Allen 1…" no quiosque — a **medida** é a informação, e é ela que some. Histórico no celular esconde colaborador e situação. | Abaixo de `md`: cards com nome em até 2 linhas, código e status embaixo. Nunca `truncate` no nome da ferramenta. |
| 13 | **Tablet (768 px)**: a sidebar fica aberta e come 1/3 da tela; cabeçalho espremido (nome do usuário cortado e "Matrícula 9901" vazando). | Sidebar recolhida (ícones ou gaveta) abaixo de 1024 px; no cabeçalho, esconder a data longa abaixo de 1024. |
| 14 | **Celular: o rodapé fixo ocupa ~27% da tela** na retirada ("Falta preencher: ferramenta, colaborador, setor de destino, previsão de devolução" quebra em 5 linhas). | No celular: só o botão largo + "Faltam 4 itens". A lista completa fica no desktop. |
| 15 | **Quiosque:** depois de entrar com a matrícula, a busca não recebe foco (digitei "extens" e não foi para lugar nenhum). A lista mostra "Chave Allen 10 mm" 5 vezes seguidas. | `autoFocus` na busca. Agrupar por nome: **"Chave Allen 10 mm — 5 disponíveis, 1 em uso"**. É a pergunta real de quem vai ao quiosque: "tem?". O mesmo `autoFocus` vale para a busca em Ferramentas. |
| 16 | **Login:** com senha errada, o aviso aparece só no canto superior direito (longe dos olhos, que estão no centro), a senha errada continua preenchida e o foco volta para a matrícula. | Mensagem também embaixo do PIN; limpar o PIN e focar o 1º dígito. Enviar sozinho ao digitar o 6º dígito, como no celular. |

### P2 — polimento (rápido de fazer, melhora a leitura)

- **Zeros pintados de alarme no dashboard:** "0" em vermelho (Indisponíveis, Ocorrências) e âmbar (Atrasadas) parece problema. Cor só quando > 0; zero em cinza.
- **No celular o dashboard abre com 6 números** e os botões Retirada/Devolução ficam abaixo. Ações primeiro no celular.
- **Textos de desenvolvedor → textos de balcão:**
  - "Dispare o leitor no código de patrimônio ou digite o código / nome" → "Bipe a etiqueta ou digite o nome"
  - "Abertas · a lista mostra ferramentas" (KPI Ocorrências) → "Abertas"
  - "Nada aqui está com um colaborador em uso — é estoque parado com tratativa aberta." → "Ferramentas paradas por avaria ou perda."
  - "Avançar tratativa" → nome da próxima etapa: "Mandar para reparo", "Marcar como resolvida"
  - "Saída · há 09/10/2026 · 0 dias", "parada há 0d" → "hoje às 21:53", "parada desde hoje"
- **Escolha entre vários resultados aparece em vermelho** ("Vários resultados para…"). Não é erro; usar texto neutro.
- **Setor de destino:** 15 botões ocupam meia tela, e o valor já vem preenchido pelo colaborador. Mostrar "Destino: **Controle Qualidade** · trocar" e abrir a grade só ao tocar. "Administração do Sistema" não deveria ser destino de ferramenta.
- **Busca por nome na retirada não mostra status** — "Chave Allen 10 mm" aparece 5×, sem dizer quais estão disponíveis. Badge de status e disponíveis primeiro.
- **Avaria/Perda:** o checkbox "Confirmo que…" repete o que o botão "Confirmar e abrir ocorrência" já diz — é um toque a mais sem proteção extra. Manter o texto explicativo e tirar o checkbox.
- **Detalhe da ferramenta não tem ação.** Se está em uso, mostrar no topo "Com JAIME D. M. FILHO · atrasada 2 dias" + botão "Registrar devolução"; se disponível, "Registrar retirada". O badge do topo diz "Em uso" enquanto o histórico logo abaixo diz "Atrasado".
- **Etiqueta:** o botão diz "Imprimir etiqueta (90×60 mm)"; o guia do projeto fala em 50×25 mm. Alinhar com a decisão da DB-01.
- **Coluna "Localização"** toda com "—" em Ferramentas: esconder enquanto não houver dado.
- **Cadastro de colaboradores (admin):** 4 botões por linha, um deles "Link de acesso e troca de senha". Deixar "Editar" e mover o resto para um menu "⋯". Os formulários do admin usam campos de 32 px, fora da regra de 56 px do design system. Aceitável no admin, mas inconsistente.
- **Sino:** com 1 atrasado e 1 vencendo hoje, mostrava "Nada novo por aqui". Se for proposital (resumo só às 08:30), tudo bem; senão, vale olhar.

---

## O que está bom (manter)

- Leitor: campo já focado ao abrir, pula sozinho ferramenta → colaborador → próximo campo; Enter funciona.
- Setor de destino puxado do colaborador; busca por nome parcial do colaborador com opções clicáveis.
- Dashboard com ações gigantes (vermelho = retirar, preto = devolver) e botões "Devolver" que já abrem a devolução com o código preenchido.
- Cartão de devolução: quem retirou, matrícula, setor, quem registrou. Lê-se de longe.
- Avaria explica, com o nome da pessoa, o que vai acontecer antes de confirmar.
- Status com forma além da cor; som de confirmação; calendário com legenda clara.
- 360 px sem nenhuma rolagem lateral em todas as telas do balcão.

---

## Ordem sugerida de ataque

1. P0 #1 e #2: são duas linhas cada.
2. P1 #5, #6 e #7 juntos: transformam retirada e devolução em "bipa, bipa, Enter". É o maior ganho para o operador e o melhor momento da demonstração ao vivo com o leitor físico.
3. P0 #3/#4 e P1 #12/#13: responsividade, que é item de nota no PI.
4. Textos (P2): meia hora, muda a impressão de quem nunca viu o sistema.

---

### Dados de teste criados no `soufer_dev` local

- Usuários `9901` (manutenção) e `9902` (admin), senha `123456`: colaboradores "TESTE UX BALCAO" e "TESTE UX ADMIN".
- Empréstimos 18–23 (ferramentas 5, 20, 21, 30, 40, 50, 60). O 21 foi retrodatado para ficar atrasado e o 22 vence hoje. A ferramenta 50 está com ocorrência de avaria.

---

## Status das correções (09/10/2026, mesma data)

Todas validadas no navegador com leitor simulado, e sem rolagem lateral em 360 / 768 / 1280 em todas as telas
(balcão e admin). Testes, lint, build e `check:motion` passando.

| Item | Status | Como ficou |
|---|---|---|
| P0 #1 foco perdido após retirada | ✅ | Foco volta ao campo de código depois do `reset` (0,7 s após confirmar já aceita a próxima bipada). |
| P0 #2 atividade sumida | ✅ | Devolução e Histórico mostram `atividade_nome ?? atividade_observacao`. |
| P0 #3 rolagem lateral | ✅ | Causa raiz: `SidebarInset` sem `min-w-0`. Uma linha resolveu as 7 telas. |
| P0 #4 cadastro rápido | ✅ | Empilhado, campos de 56 px, matrícula/nome digitados já vêm preenchidos, botão "Cadastrar e usar". |
| P1 #5 previsão | ✅ | Nasce "Hoje"; tudo cabe em 1280×800 sem rolar. |
| P1 #6 devolução | ✅ | "OK" marcado, foco no botão: bipa → Enter. |
| P1 #7 Enter na atividade | ✅ | Virou campo de uma linha no fim do formulário; Enter confirma. |
| P1 #8 ferramenta em uso | ✅ | "Está com FULANO desde hoje às 22:10 (setor)" + botão "Registrar a devolução dela". Indisponível tem mensagem e atalho próprios. |
| P1 #9 vários empréstimos | ✅ | Opções tocáveis (reaproveita `OpcoesAmbiguas`), com o nome de quem está com cada uma. |
| P1 #10 tela vazia na devolução | ✅ | Lista "Em uso agora", atrasados primeiro, tocável. |
| P1 #11 animação longa | ✅ | Balcão: ~0,7 s, sem digitação, não bloqueia. Login/convite inalterados. |
| P1 #12 nomes cortados | ✅ | Ferramentas, quiosque e Histórico (cartões no celular). |
| P1 #13 tablet | ✅ | Sidebar vira gaveta < 1024 px; cabeçalho não espreme. |
| P1 #14 rodapé no celular | ✅ | "Faltam 3 itens" + botão. |
| P1 #15 quiosque | ✅ | Busca focada e maior; unidades iguais agrupadas ("Chave Allen 10 mm · 5 unidades · 4 de 5 livres"). |
| P1 #16 login | ✅ | Erro embaixo do PIN, PIN limpo e focado, 6º dígito entra sozinho. |
| P2 zeros em vermelho / ações no celular / textos | ✅ | Zero em cinza; ações antes dos números no celular; textos de balcão. |
| P2 opções em vermelho / setores / status na busca | ✅ | Texto neutro; setor colapsado ("Controle Qualidade · Trocar setor"); badge de status e disponíveis primeiro. |
| P2 checkbox da avaria | ✅ | Removido; o aviso fica visível e o toast pós-confirmação cumpre o FE-15 (passo 4). |
| P2 detalhe sem ação | ✅ | Faixa "Com FULANO… devolver hoje" + botão Registrar devolução/retirada (retirada abre com o código preenchido). |
| P2 coluna Localização vazia / link de acesso | ✅ | Coluna só aparece se houver dado; botão virou "Link de acesso" (explicação no tooltip). |
| Admin com controles de 32 px | ✅ | Corrigido na raiz, nos primitivos (`Button`, `Input`, `Select`, `Textarea`): campo/botão 56 px, ação de linha 44 px, sino com área de toque de 44 px. Quem está no admin também pode estar de luva, no meio da manutenção. |
| P2 "Avançar tratativa" | ✅ | Diz o próximo passo: "Marcar em reparo", "Marcar resolvida"… |

### Encontrados durante as correções

- **FE-14 pedia resumo do que foi registrado** e a retirada só dizia "Retirada registrada!": agora o toast mostra "Chave X com FULANO · Devolver hoje · destino Setor".
- **Quiosque mentia com filtro ativo**: com "Disponível" (o padrão), "4 de 4 livres" escondia a unidade emprestada. A contagem agora respeita o filtro ("4 disponíveis agora").
- **Ferramentas não tinha foco na busca**: digitar ao abrir a tela não ia a lugar nenhum. Corrigido.

### Ficou de fora (de propósito)

- **"Administração do Sistema" como destino**: com o setor colapsado, quase não aparece mais. O certo é tratar no dado (setor do admin), não esconder por nome no front.
- **Etiqueta 90×60 mm × 50×25 mm do guia**: depende da decisão da DB-01. Só tirei a medida do rótulo do botão.
- **Sino sem o atraso de teste**: é por design. A API gera os avisos a cada 30 min, e o atraso foi criado direto no banco.

