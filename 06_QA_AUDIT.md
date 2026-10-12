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

## Status atual (2026-10-12, pós-camada de navegador)
- `node --check` em todos os `.js` (src + tools): **PASS**.
- `tools/build.js --check-size`: **PASS** (último run: 116,2 KB / 250 KB, 13 módulos + shell).
- `tools/smoke.js`: **PASS 36/36**.
- `tools/audit.js` (severa): **PASS 15/15**.
- Browser MCP Chromium (BC-01..BC-13): **PASS**, console **0 mensagens**; evidências em `evidence/f0-browser/`.
- `dist/cristal.html` é o entregável jogável atual (F0 integrado); `cristal-cap1.html` segue
  intacto como referência/régua do smoke. Próxima fase: F1 (Brisamar → floresta → ruína → chefe).

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
7. Rota completa do chefe até a vitória **no navegador** (ciclo já provado no smoke headless 36/36; no browser foi validado spawn/arena/barra/dano; o MVP usa `cristal-cap1.html` como réguas).

Evidências desta rodada: `evidence/f0-browser/01..07` (+ variantes `01b`, `04`, `06`).

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
