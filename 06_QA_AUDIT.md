# 06 — Auditoria QA

Data base: 2026-10-12. Escopo: MVP Cap. 1 (`cristal-cap1.html`) + tooling
(`tools/build.js`, `tools/smoke.js`). Regras-mãe: `04_DEV_PLAN.md`
(Regras de ouro, Definição de pronto, Riscos).

## Como rodar
```
node --check tools/build.js && node --check tools/smoke.js && node --check tools/audit.js   # sintaxe
node tools/build.js [--check-size] [--out dist/cristal.html] # pacote 1 arquivo, teto 250 KB
node tools/smoke.js                                          # headless, saída TAP, exit 0/1
node tools/audit.js                                          # auditoria SEVERA (15 checks), exit 0/1
sh tools/validate.sh                                         # PORTÃO ÚNICO: check + build + smoke + audit
```
Portão antes de cada commit: `sh tools/validate.sh`. **Commit só com VALIDATE PASS** (D-14).

## Status atual (2026-10-12, F2 entregue)
- `node --check` em todos os `.js` (src + tools): **PASS**.
- `tools/build.js --check-size`: **PASS** (último run: ~170 KB / 250 KB, 17 módulos + shell).
- `tools/smoke.js`: **PASS 40/40**.
- `tools/audit.js` (severa): **PASS 21/21** (A16 BFS em 5 mapas, A17 refs, A18 LCG, A20 dimensões, A21 flags).
- Browser MCP Chromium F1 (BC-F1-01..BC-F1-16): **PASS**; evidências em `evidence/f1-browser/`.
- Browser MCP Chromium F2 (BC-F2-01..BC-F2-15): **PASS** (ver seção abaixo); evidências em `evidence/f2-browser/01..06`.
- `dist/cristal.html` é o entregável jogável atual (F2: Valdora + esgotos + Cavaleiro); `cristal-cap1.html` segue
  intacto como referência/régua do smoke. Próxima fase: F3 (Ruínas do Norte).

## Checklist por fase
Legenda: ✅ coberto por teste automatizado · 🔲 manual · — não se aplica.

| # | Item (origem) | Como testar | F0 | F1–F4 | F5 | F6 |
|---|---|---|---|---|---|---|
| QA-01 | Sem soft-lock: chave/porta/NPC sempre resolvíveis (Riscos) | Smoke BFS (chave + portão) + checklist de flags idempotentes + botão "Reiniciar sala" | ✅ | ✅ | ✅ | ✅ |
| QA-02 | Colisão: 4 cantos, sem atravessar parede/porta | Smoke (BFS só por `.`) + playthrough de borda em cada mapa novo | ✅ | ✅ | — | ✅ |
| QA-03 | Diálogo ≤180 chars/caixa, typewriter legível (02 §8) | Smoke (intro + chefe) + revisão manual p/ falas novas | ✅ | ✅ | — | ✅ |
| QA-04 | Telegraph de chefe ≥30 f + janela de descanso (02 §4) | Smoke (`tel` 40 f, `rest` 50 f) + medir padrões novos | ✅ | ✅ | — | ✅ |
| QA-05 | Mobile: botões ≥50 px, `touch-action:none`, sem zoom/scroll, `pointercancel`, zerar no `blur` (02 §3–4) | Medir CSS (D-pad 52 px, A/B/C 50–60 px) + teste em tela real | 🔲 | 🔲 | 🔲 | 🔲 |
| QA-06 | iOS Safari: `viewport-fit=cover`, safe-area `env()`, fallback `vh`/`dvh` (Riscos) | Inspecionar `<meta>`+CSS + teste em iOS Safari e Android Chrome (F6) | 🔲 | 🔲 | — | 🔲 |
| QA-07 | Áudio: `AudioContext` só após 1º toque; mudo persistente (Riscos) | Stub no smoke (snd cai no `try/catch`) + teste manual de autoplay/mudo | ✅ | 🔲 | 🔲 | 🔲 |
| QA-08 | Save/reload: `localStorage` em `try/catch`, "Continuar" restaura mapa/flags (F0) | Recarregar + Continuar; smoke futuro: round-trip de save | — | ✅ | — | ✅ |
| QA-09 | Orçamento: 1 arquivo <250 KB, 60 fps celular médio, sem assets externos | `build --check-size` + medição de fps em aparelho real (F5/F6) | ✅ | ✅ | ✅ | ✅ |
| QA-10 | Sem regressão: smoke + cenários por capítulo passam (Def. de pronto) | Tabela abaixo + `node tools/smoke.js` por fase | ✅ | ✅ | ✅ | ✅ |
| QA-11 | Texto fiel à Bíblia; mudou história → atualiza doc (Regras de ouro) | Revisão contra `01_STORY_BIBLE.md` a cada fase | — | ✅ | ✅ | ✅ |

## Tabela de regressão F0 (invariantes do MVP)
| Invariante | Onde é testado | Status |
|---|---|---|
| Script carrega sem erro | smoke #7 | PASS |
| Intro avança até `play` | smoke #8–9 | PASS |
| Floresta 30×20, determinística | smoke #10, #14 | PASS |
| Portão em (27,3) | smoke #11 | PASS |
| 3 runas ordenadas i=0,1,2 | smoke #12 | PASS |
| 7 slimes no spawn | smoke #13 | PASS |
| Diálogos ≤180 chars | smoke #15, #22 | PASS |
| Runas em ordem → chave (`step=3`, `obj=2`) | smoke #16 | PASS |
| Chave alcançável (BFS) | smoke #17 | PASS |
| Portão alcançável (BFS) | smoke #18 | PASS |
| Portão abre com chave (`inBoss`, `obj=4`) | smoke #19 | PASS |
| Portão trava sem chave (com aviso) | smoke #20 | PASS |
| Chefe 24 HP em `walk` | smoke #21 | PASS |
| Ciclo walk→tel(40)→slam→rest(50)→walk | smoke #23–27 | PASS |
| Fase 2: 8 raízes com hp<12 | smoke #28 | PASS |
| `say`/`nextLine`: avança + callback + restaura `st` | smoke #29 | PASS |
| `src/**/*.js` sem syntax error | smoke #1–6 | PASS |
| Bundle <250 KB | `build --check-size` | PASS |

## Dívidas e riscos observados (não corrigidos aqui — fora do escopo Tooling/QA)
1. `tc` do typewriter incrementado no `render()` (03 §10.1) — smoke não cobre timing. **QUITADA em 2026-10-12 (F0-integração, `src/main.js`).**
2. Toast/objetivo podem sobrepor em telas pequenas (03 §10.7) — **quitada**: fila em `UI.updateToast`, y=38 (F0).
3. Sem save/pausa/mudo/música (03 §10.1–3) — save/pausa/mudo entregues em F0; **música pendente (F1/F5)**.
4. `dist/cristal.html` ainda não jogável (sem `main`/input em `src/`) — **quitada**: `src/main.js` + verificação de navegador abaixo.
5. `04_DEV_PLAN.md` §"Estado atual" afirma "Smoke test headless passa" —
   verdadeiro a partir deste commit (antes, o script não existia).

## Auditoria de navegador (MCP Chromium) — camada obrigatória por fase (D-15)
Canal: `chrome-devtools` MCP desta sessão (Chromium real; servidor local
`python3 -m http.server 8901`). Cobre o que node/smoke/audit **não** cobrem:
runtime real de browser, render, timing de frame e storage real.

Severidade: qualquer BC FAIL bloqueia o commit da fase até corrigir e re-rodar.

| # | Item | Procedimento | F0 | Status F0 |
|---|---|---|---|---|
| BC-01 | Carrega sem erros de console | `list_console_messages` após navegar; 0 erros (favicon embutido) | ✅ | PASS (0 msgs) |
| BC-02 | Título renderiza | screenshot `01*` | ✅ | PASS |
| BC-03 | Título sem save novo mostra só "Novo jogo" | `localStorage.clear()` + reload; `hasSave()==false` | ✅ | PASS |
| BC-04 | Diálogo digita texto visível (typewriter passo fixo) | iniciar jogo, ler `obterTextoVisivel()` >0 em <1s | ✅ | PASS (27 chars em 900 ms) — **revelou e validou o fix do bug B1** |
| BC-05 | Movimento altera posição; ~60 fps | keydown 500 ms mede dx; rAF/1s ≈ 60 | ✅ | PASS (dx 33–38 px; 60–61 fps desktop) |
| BC-06 | Portão trava sem chave (anti soft-lock) | teleporte ao portão sem flag; toast exato | ✅ | PASS ("Trancado. Falta uma chave.") |
| BC-07 | Transição a arena + save com mapa certo | flag de chave; `inBoss`, 15×10, payload `mapa:'arena'` | ✅ | PASS — **revelou e validou o fix do bug B3** |
| BC-08 | Reload + Continuar restaura mapa/flags/posição, sem diálogo zumbi | reload; `KeyC`; conferir MW/HP/P | ✅ | PASS (arena 15×10, P(112,128), HP 8, flags coerentes) |
| BC-09 | Pausa renderiza e retoma | `KeyP` + screenshot + `KeyP` | ✅ | PASS (`06-pausa.png`) |
| BC-10 | Layout em viewport móvel (D-pad e A/B/C visíveis/≥50 px) | `resize_page(390,700)` + screenshot | ✅ | PASS (`07-mobile-390x700.png`) |
| BC-11 | i-frames: contato do chefe ≤1 hit/s aprox. | teleporte no chefe 2,2 s; perda ≤3 HP | ✅ | PASS (perdeu 3) |
| BC-12 | Mudo alterna e persiste | `KeyM`; estado + `localStorage` | ✅ | PASS (`cristal_amanhecer_mudo='1'`) |
| BC-13 | MVP legado (`cristal-cap1.html`) abre sem erros | navegar + console | ✅ | PASS (0 msgs) |

### Bugs descobertos pela camada de navegador (corrigidos no mesmo ciclo, D-16)
- **B1** — typewriter nunca aparecia (updateDialogue só rodava em `play`; diálogo é `talk`). Evidência: `02-arena-dialogo.png` (caixa vazia). Fix validado por `04-dialogo-visivel.png`.
- **B2** — save fantasma na 1ª visita + `P` global vazado no boot. Evidência: `01-title.png` mostrava "C: Continuar" sem save real. Fix validado por `01b-title-fresh.png` (só "Novo jogo").
- **B3** — save na arena gravava `mapa:'forest'` (`World.currentId` dessincronizado) e `Continuar` restaurava para a sala errada com diálogo zumbi. Fix validado por `05`-…: payload `{mapa:'arena'}` + BC-08.
- **B4** — concluir `boss_intro` regravava `obj` 4→3 no HUD durante a luta. Evidência: `03-arena-play.png`. Fix: guarda `inBoss` em `syncObjFromFlags`.

### Testes IMPOSSÍVEIS nesta sessão — registrados como NÃO aprovados (pendentes)
1. Toque real em tela física (tamanho de alvo, polegares, multi-toque) — BC-10 é só viewport.
2. `pointercancel` real durante gesto; zerar direções ao perder foco em hardware real (handler sintético existe; `blur` coberto por código, não por hardware).
3. Áudio **audível** (autoplay com gesto humano, timbre, volume) — validado apenas "não lança erro" e persistência do mudo.
4. iOS Safari (safe-area real, gestos do sistema) e Android Chrome em aparelhos reais — planejado no F6.
5. 60 fps em **celular médio** real (desktop Chromium ≠ alvo).
6. `visibilitychange` real (troca de aba) — `document.hidden` é imutável via devtools; pausa automática revisada só em código.
7. Rota dos chefes 100% orgânica **no navegador** (mortes validadas com cirurgia de estado `hp=2`; ciclos completos provados no smoke 40/40; spawn/arena/barra/dano/morte/vitória/fim provados no browser para os 2 chefes).
8. (F1, novo) Timbre/arranjo musical **audível** por tema — validado só troca de `temaAtual()` por mapa + ausência de throw; audição humana pendente.
9. (F1, novo) Playthrough cronometrado de ~15–20 min por humano (aceite de duração) — fluxo completo provado por teleporte+estados, não em tempo real.

### Auditoria de navegador F1 (BC-F1-01..BC-F1-16) — 2026-10-12, PASS
Roteiro executado no bundle F1 (`dist/cristal.html`, Chromium MCP, teclado sintético):

| # | Item | Evidência/resultado |
|---|---|---|
| BC-F1-01 | Boot limpo + `title_theme` pendente pré-gesto | console 0 msgs; `temaAtual()=='title_theme'` |
| BC-F1-02 | Nome editável persiste e substitui nos diálogos | título `Nome: LBEL`; intro/arena mostram "Lbel" |
| BC-F1-03 | `wake_up` aparece (sem clobber) + typewriter visível | 1ª fala em <1 s; `brisamar_theme` ao entrar |
| BC-F1-04 | Mãe (1ª + repeat), morador, Darius | falas exatas; repeat idêntico |
| BC-F1-05 | Escolha de Darius (2 opções) + reply + flag | UI de escolha; `darius_left=true` |
| BC-F1-06 | Leste sem espada = aviso, sem transição | toast exato; MW segue 20 |
| BC-F1-07 | Orin + boneco (tutorial) + flags | `got_sword`, `tutorial_done` — **revelou B5** (NPC sombreava objeto; fix validado) |
| BC-F1-08 | Starfall (diálogo) → cena (overlay) → floresta + intro | `02-cena-estrela.png` (faixa vermelha + sombra); `star_seen`, `intro_floresta` |
| BC-F1-09 | Placa da floresta + flag | inscrição exata; `sign_read` — **revelou placa ausente** (condição `!pedraAzul`; fix validado) |
| BC-F1-10 | Arbusto-chave (golpe revela + coleta) | `bush_key_found`, diálogo, `has_key_c1` |
| BC-F1-11 | Runas em ordem via espada → chave do enigma | step 1→2→3, `runes_done` |
| BC-F1-12 | Pedra azul → Lumi (6 falas) + magia C | `met_lumi`; `P.cd>0` após C |
| BC-F1-13 | Portão → ruína + `ruin_enter`; placa; norte → arena + `boss_intro` | MW 15; `boss_theme`; barra nomeada visível |
| BC-F1-14 | Morte do chefe → vitória → figura → fim | `boss1_defeated`; `04-figura-encapuzada.png`; `05-fim-cap1.png` — **revelou B6** (clobber de `st='end'`; fix validado) |
| BC-F1-15 | Reload + Continuar (floresta, HP/flags/posição) | MW 30, HP 2 preservado, `met_lumi`, sem diálogo zumbi |
| BC-F1-16 | Pausa durante fade não quebra transição | chegada + retomada + volta íntegras |

Bugs do ciclo F1 (D-19): **B5** (alvo-A por proximidade), **B6** (`advanceTalk` preserva `st` do callback), **B7** (toasts descartados na troca de sala).
Anomalia F1 não-reproduzida: 1 ocorrência de cena→ficar em Brisamar com flags zeradas em meio a screenshots (suspeita: visibilidade da aba durante captura MCP + corrida de transição; 10+ transições seguintes ok, incluindo pausa-no-fade). Registrada, sem workaround cego; camada BC-F1-16 cobre a interação pausa×fade.

### Auditoria de navegador F2 (BC-F2-01..BC-F2-15) — 2026-10-12, PASS
Roteiro no bundle F2 (Chromium MCP, teclado sintético, HP disciplinado p/ waits):

| # | Item | Evidência/resultado |
|---|---|---|
| BC-F2-01 | Entrada pelo fim do Cap.1 (C) | chapter=2, Valdora 22×16, arrival, `valdora_theme` |
| BC-F2-02 | Chegada aplica flag (sem clobber) | `chegou_valdora=true` — **revelou B8** (fix validado) |
| BC-F2-03 | NPCs + Darius + escolha de rota do capitão | provocação exata; `capitao_antes` antes / `pista` depois; `darius_prov`, `fragmento_pista` — **revelou colisão `darius_left`** (fix: visibilidade por capítulo) |
| BC-F2-04 | Missão do gato completa | quest → achado → `cat_found`; grade abre |
| BC-F2-05 | Esgotos: baú (Lâmina, dano 3), passagem, volta | `bau_esgoto`, `espada_guarda`; dica sem fragmento; corações com fragmento (uso único) |
| BC-F2-06 | Templo tranca sem pista (reqMsg) | toast exato, sem transição |
| BC-F2-07 | Arena2: intro, ciclo walk→tel35→golpe→rest | `cavaleiro` 28HP, `boss_theme` |
| BC-F2-08 | Morte → vitória (fala do rei) → prêmios | `boss2_defeated`, `frag_green`, hpMax 10/HP 10, volta a Valdora |
| BC-F2-09 | Proposta auto + saída de Darius | `proposta_vista`; praça sem Darius; objetivo "Aguarde o Capítulo 3"; 5 corações no HUD |
| BC-F2-10 | Reload + Continuar em Valdora/esgoto | mapa/HP/flags/posição; `hpMax` — **revelou B9** (fix + fallback p/ saves antigos, ambos verificados) |
| BC-F2-11 | Pausa durante fade | transição completa + retomada íntegras |
| BC-F2-12 | Console limpo em toda a rodada | 0 mensagens (só favicon, já embutido) |
| BC-F2-13 | MVP legado intacto | `cristal-cap1.html` abre sem erros |
| BC-F2-14 | Objetivo certo por sala | arena2 mostra "Cavaleiro Corrompido" (fix de precedência validado em screenshot) |
| BC-F2-15 | Save antigo sem `hpMax` | fallback por `boss2_defeated` → 10 |

Bugs do ciclo (D-21): **B8** (clobber em `irParaValdora`), **B9** (`hpMax` no save), **A21** (`esconderijo` sem registro), colisão `darius_left`, objetivo da arena2.
Lições de harness (sem impacto no jogo): intervalos ≥300 ms (recuperação do golpe engole teclas); curar (`P.hp`+`inv`) antes de waits em áreas com inimigos; mortes em teletransporte cego viram `over` (retry provado no processo).

### Auditoria de navegador F2.5 experimental (branch `exp/f2.5-apresentacao`) — 2026-10-12, PASS
Roteiro (Chromium MCP; paisagem 844×390 + retrato 390×700):

| # | Item | Evidência/resultado |
|---|---|---|
| BC-X1 | Shell novo carrega sem erros | console 0 msgs; `#dzone`, 3×`[data-a]`, `#menubtn` presentes |
| BC-X2 | Paisagem: jogo centralizado + overlay translúcido | `01-landscape-play.png`; canvas 573px; opacidade .62; A=106px |
| BC-X3 | D-pad vetorial: direita + diagonal normalizada + soltar para | dx 33; diag 23.3/23.3; parado após soltar |
| BC-X4 | Botão ☰ pausa/retoma | `estaPausado` true→false |
| BC-X5 | Overlay some no diálogo e volta depois | classe `ocultar-touch`; `02-landscape-dialogo.png` limpo |
| BC-X6 | Gamepad: API existe, poll sem controle não move nem quebra | `dx=0`, sem throw (hardware real pendente) |
| BC-X7 | Retrato: barra opaca embaixo, canvas no topo | `03-portrait.png` |
| BC-X8 | Fontes curtas maiores sem quebrar wrap | objetivo 8px, título 10px; corpo do diálogo mantido 8px (caixa 216px/4 linhas) |

Impossíveis (NÃO aprovados): gamepad com hardware real (DualShock/Xbox/genérico);
fullscreen real em celular (headless não valida); gesto multitoque simultâneo
(D-pad + A ao mesmo tempo) com dedos reais; iOS Safari.

Evidências desta rodada: `evidence/f0-browser/01..07` (+ variantes `01b`, `04`, `06`).
Evidências F2.5 (branch): `evidence/exp-f2.5/01-landscape-play.png`,
`02-landscape-dialogo.png`, `03-portrait.png`.

## Log de runs
| Data | Comando | Resultado |
|---|---|---|
| 2026-10-12 | `node --check tools/build.js && node --check tools/smoke.js` | PASS |
| 2026-10-12 | `node tools/build.js --check-size` | PASS (85,9 KB, 12 módulos) |
| 2026-10-12 | `node tools/smoke.js` | PASS 35/35 |
| 2026-10-12 | `sh tools/validate.sh` (F0 integrado: check 15 arquivos + build 115,6 KB + smoke 36/36 + audit severa 15/15) | VALIDATE PASS |
| 2026-10-12 | Browser MCP Chromium rodada 1 (BC-01..12) | **FAIL** — achou B1–B4 |
| 2026-10-12 | Fixes B1–B4 + `sh tools/validate.sh` (build 116,1 KB) | VALIDATE PASS |
| 2026-10-12 | Browser MCP Chromium rodada 2 (BC-01..13, evidências 01b/04/05/06/07) | **PASS tudo; console 0 msgs** |
| 2026-10-12 | `sh tools/validate.sh` (F1: build ~147 KB + smoke 37/37 + audit 19/19) | VALIDATE PASS |
| 2026-10-12 | Browser MCP Chromium F1 rodada 1 (BC-F1) | **FAIL** — achou B5 (sombra de NPC), placa ausente, clobber de `begin()` |
| 2026-10-12 | Fixes + rodada 2 | **FAIL** — achou B6 (clobber de `st='end'`) + backlog de toasts (B7) |
| 2026-10-12 | Fixes B6/B7 + rodada 3 (BC-F1-01..16, evidências 01..06) | **PASS tudo; console 0 msgs** |
| 2026-10-12 | `sh tools/validate.sh` (F2: build ~170 KB + smoke 40/40 + audit 21/21) | VALIDATE PASS |
| 2026-10-12 | Browser MCP Chromium F2 rodada 1 (BC-F2) | **FAIL** — achou B8 (clobber `irParaValdora`), colisão `darius_left`, placa? não — baú/placa ok; + B9 (`hpMax`), A21 (`esconderijo`), objetivo arena2 |
| 2026-10-12 | Fixes + rodada 2 (BC-F2-01..15, evidências 01..06) | **PASS tudo; console 0 msgs** |
| 2026-10-12 | Browser MCP Chromium F2.5 (branch `exp/f2.5-apresentacao`, BC-X1..X8) | **PASS tudo; console 0 msgs** |
