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

## Status atual (2026-10-12)
- `node --check` nos dois scripts: **PASS**.
- `tools/build.js --check-size`: **PASS** (último run: 85,9 KB / 250 KB, 12 módulos).
- `tools/smoke.js`: **PASS 35/35** (12 módulos de `src/` com syntax ok + 23 invariantes do MVP).
- **Ressalva:** `src/` está em construção pela frente F0 (módulos `systems/*`,
  `maps/*`, `data/*` sem `core/`/`main.js`/`html/shell.html` ainda). O bundle
  `dist/cristal.html` **não é jogável até o `main`/input pousar** — o entregável
  jogável continua sendo `cristal-cap1.html`, que é o que o smoke cobre.
  Quando F0 concluir, o smoke deve passar a cobrir o bundle (ou o `src/` via build).

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
1. `tc` do typewriter incrementado no `render()` (03 §10.1) — smoke não cobre timing.
2. Toast/objetivo podem sobrepor em telas pequenas (03 §10.7) — manual em F5.
3. Sem save/pausa/mudo/música (03 §10.1–3) — dono: F0/F1.
4. `dist/cristal.html` ainda não jogável (sem `main`/input em `src/`) — dono: F0.
5. `04_DEV_PLAN.md` §"Estado atual" afirma "Smoke test headless passa" —
   verdadeiro a partir deste commit (antes, o script não existia).

## Log de runs
| Data | Comando | Resultado |
|---|---|---|
| 2026-10-12 | `node --check tools/build.js && node --check tools/smoke.js` | PASS |
| 2026-10-12 | `node tools/build.js --check-size` | PASS (85,9 KB, 12 módulos) |
| 2026-10-12 | `node tools/smoke.js` | PASS 35/35 |
| 2026-10-12 | `sh tools/validate.sh` (F0 integrado: check 15 arquivos + build 115,6 KB + smoke 36/36 + audit severa 15/15) | VALIDATE PASS |
