# Prompt — próxima sessão: F4 (Cap. 4 + Cap. 5)

Cole o bloco abaixo num chat limpo, com este projeto como diretório ativo
(`/home/luisricardo/Projects/pages_estatics/A Lenda do Cristal do Amanhecer`).

---

Estou continuando o desenvolvimento do jogo web **"A Lenda do Cristal do Amanhecer"**
(RPG 2D top-down, arquivo HTML único em `dist/cristal.html`, sem dependências,
mobile-first, pt-BR). Branch atual: **`main`** (F3 já mergeada; não há branches
abertas). Servidor local de teste: `python3 -m http.server 8901` na raiz
(acesso na rede local via `http://<IP-da-máquina>:8901/dist/cristal.html`).

**Estado verificado (tudo comitado, árvore limpa):**
- F0 (motor multi-mapa, flags, save, diálogo v2), F1 (prólogo + Cap.1), F2
  (Valdora + esgotos + Cavaleiro Corrompido), F2.5 (casca fullscreen paisagem +
  overlay, D-pad vetorial, gamepad, legibilidade) e F3 (Ruínas do Norte: montanha,
  enigma ordenado, interruptores/portas, 5 registros secretos, diários do pai,
  Sentinela de Ferro, Fragmento Azul, gravação + Darius de armadura negra)
  concluídos e validados.
- Portão de qualidade obrigatório antes de cada commit: `sh tools/validate.sh`
  (node --check + `build --check-size` + `smoke` 45/45 + auditoria severa 23/23).
  Commit só com VALIDATE PASS + browser check MCP Chromium com evidências em
  `evidence/`. Regras em `04_DEV_PLAN.md`; checklist em `06_QA_AUDIT.md`.

**Sua tarefa: F4 — Cap. 4 + Cap. 5** (ver `04_DEV_PLAN.md` §F4,
`05_CHAPTER_SPECS.md` e `01_STORY_BIBLE.md` §§Cap. 4–5 e §5 Os três finais):
santuário da cachoeira (diálogo Darius×Malachar), duelo com Darius (padrões
rápidos, telegraph ≥30 f), cena de poupar (`darius_spared`, Fragmento Vermelho:
quebra barreiras), Malachar ativa o mecanismo; capital corrompida → salão do
cristal; luta final em 2 fases (Malachar humano → entidade; escudo de Lumi);
**escolha dos 3 finais** (`final_choice`; Final 3 só com
`cat_found && secret_records==5`); cenas finais + créditos.
Aceite: os 3 finais alcançáveis; Final 3 bloqueado sem os requisitos.

**Restrições que valem para tudo:**
- NÃO quebrar nem redefinir o plano (`01/02/03/04`) — só documentar o feito.
- Orçamento: `dist/cristal.html` < 250 KB (atual ~219 KB). Sem libs externas,
  sem `fetch`, sem assets externos. `localStorage` só em `try/catch`.
- Toda flag nova entra em `Game.FLAG_DEFAULTS` (A21 barra save que descarta).
- Testes impossíveis na sessão ficam registrados como NÃO aprovados, nunca "ok".
- Dívida conhecida: possível sobreposição faixa-objetivo 2 linhas + toast
  (ver `06_QA_AUDIT.md`, F2.5).
- Lições de harness F3 (ver `06_QA_AUDIT.md`, BC-F3): skip direto de diálogo
  exige Z restaurador de `st`; teleporte saída→saída não arma `saidaArmada`
  (estagiar por tile neutro); toast ler no mesmo bloco; `await rAF` in-page
  p/ waits determinísticos.
