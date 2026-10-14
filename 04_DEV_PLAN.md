# 04 — Plano de Desenvolvimento

Objetivo: transformar o MVP do Cap. 1 no jogo completo (5 capítulos, 3 finais, 1–2 h), **jogável no celular**, em **um único arquivo HTML** sem dependências.

**Estado atual (✅ feito):** Cap. 1 jogável (floresta procedural, 7 slimes, enigma de 3 runas, chave, portão, chefe Guardião com 2 fases, diálogos, game over/retry, fim de capítulo). Controles touch + teclado. Smoke test headless passa.

## Regras de ouro
1. Cada fase termina **jogável e auditada** (`06_QA_AUDIT.md`). Nunca deixar o jogo quebrado entre fases.
2. Uma fase = um conjunto pequeno de commits; rodar `sh tools/validate.sh` (portão único: `node --check` + `build --check-size` + `smoke` + `audit` severa) antes de cada commit. **Commit só com VALIDATE PASS.** Git save imediato após validação; hook pre-commit bloqueia commit com validate vermelho.
3. Respeitar o orçamento: arquivo final **< 250 KB**, 60 FPS em celular médio, sem assets externos.
4. Texto de jogo sempre coerente com `01_STORY_BIBLE.md`. Mudou a história? Atualize o doc no mesmo commit.
5. Qualquer decisão nova entra em "Registro de decisões" (fim deste arquivo).

---

## F0 — Fundação do motor (pré-requisito) · ~1–2 sessões
**Meta:** sair de "um mapa global" para um motor multi-mapa com flags e save, sem mudar o que o jogador vê.
- [ ] Introduzir `Game.flags` (objeto serializável) e migrar `step/hasKey/obj` para flags.
- [ ] Registro de mapas `World.maps` + `goto(mapId, spawn)` com transição (fade 12 frames).
- [ ] Tabela `TILES` e tabela `ENEMIES`; remover `if/else` de tile no render.
- [ ] Entidades genéricas: `NPC`, `Sign`, `Switch`, `Door`, `Pickup` com `interact()`.
- [ ] Diálogo v2: **escolhas** (`choice([...])`), condição por flag, `portrait` opcional, typewriter no passo fixo.
- [ ] Save/Load: `localStorage` em `try/catch`, slot único + botão "Continuar" no título; salvar ao trocar de mapa e ao pegar item-chave.
- [ ] Pausa: `visibilitychange` + botão Start/menu simples (continuar, mudo, reiniciar).
- [ ] Botão de mudo e volume mestre no `snd()`.
- [ ] Refatorar Cap. 1 para o novo motor (mesma jogabilidade).
- [ ] (Opcional) `tools/build.js`: concatena `src/*.js|css|html` em `dist/cristal.html`. Se adotado, o **entregável continua sendo 1 arquivo**.
**Aceite:** Cap. 1 idêntico ao MVP; recarregar a página com "Continuar" restaura mapa/flags; smoke test passa.

## F1 — Prólogo e Cap. 1 completo · ~2 sessões
**Meta:** Cap. 1 fiel à Bíblia, incluindo o que o MVP pulou.
- [ ] **Brisamar** (mapa pequeno ~20×15): casa de Kael (mãe: "Levanta! Você vai perder o festival!"), praça com festival, Darius se despede (cena), casa/pesca do **Mestre Orin** (espada enferrujada + tutorial de combate), saída para a floresta.
- [ ] Cena da estrela caindo (céu escurece, estrelas somem, tremor de tela, luz vermelha).
- [ ] Encontro com **Lumi** (pedra azul, pingente brilha, "Finalmente... alguém que ainda consegue ouvir.").
- [ ] Floresta: adicionar **chave escondida** (secreto/arbusto) além do enigma; raízes negras decorativas animadas; 2º tipo de inimigo (ex.: *morcego de raiz*).
- [ ] Entrada da **ruína subterrânea** como transição de mapa (mini-sala) antes do chefe.
- [ ] Chefe: manter 2 fases; polir telegraph/sons; barra de vida com nome.
- [ ] Cena final: inscrição, pingente, **figura encapuzada na colina** (sprite visível por 1s).
- [ ] Música: tema de Brisamar (alegre) + tema da floresta (tenso) em WebAudio.
- [ ] Nome do jogador editável (padrão **Kael**) na tela de título.
**Aceite:** jogo vai da casa de Kael até o gancho do encapuzado em ~15–20 min; roteiro bate com a Bíblia.

## F2 — Cap. 2: Valdora · ~2 sessões
Ver `05_CHAPTER_SPECS.md` §Cap. 2. Hub urbano com NPCs/refugiados, Darius (cena de provocação), missão do gato (esgotos + baú), investigação do fragmento, **Cavaleiro Corrompido** (chefe), gancho da proposta a Darius. Entrega **Fragmento Verde** (ver passagens secretas) e +1 coração.
**Aceite:** cidade navegável, 1 missão secundária completa e rastreada por flag `cat_found`.

## F3 — Cap. 3: Ruínas do Norte · ~3 sessões (maior calabouço)
Ver specs. Interruptores, portas, plataformas, enigmas, **registros secretos (colecionável)**, diários do pai, **Sentinela de Ferro**, gravação com a escolha moral apresentada, cena de Darius de armadura negra. Entrega **Fragmento Azul**.
**Aceite:** contador de registros no HUD do menu; calabouço sem soft-lock (ver QA §Soft-locks).

## F4 — Cap. 4 e Cap. 5 · ~3 sessões
- Cap. 4: santuário da cachoeira, diálogo Darius×Malachar, **duelo com Darius** (padrões rápidos), cena de poupar, espada entregue, Malachar ativa o mecanismo.
- Cap. 5: capital corrompida (corredores com inimigos e raízes), salão do cristal, **luta final em 2 fases**, Lumi lembra quem é, **escolha dos 3 finais** (Final 3 condicionado), cenas finais, créditos.
**Aceite:** os 3 finais alcançáveis; Final 3 só com `cat_found && secret_records==N`.

## F5 — Polimento, arte e áudio · ~2–3 sessões
- [ ] Sprites reais embutidos (strings de pixels → `ImageData`/canvas offscreen): Kael (4 dir, 2 frames de andar), Lumi, inimigos, chefes, NPCs, tiles por região.
- [ ] Retratos de diálogo (Kael, Lumi, Darius, Orin, Malachar), 32×32.
- [ ] Música completa por região + variações da melodia de Brisamar; SFX revisados.
- [ ] Efeitos: tremor de tela, flash, partículas simples, transições.
- [ ] Balanceamento de dificuldade (ver QA §Balanceamento); modo "fácil" (dano reduzido).
- [ ] Acessibilidade: tamanho do texto, reduzir flashes, trocar A/B.
**Aceite:** passa na checklist visual e de áudio; 60 FPS em aparelho médio.

## F6 — Release · ~1 sessão
- [ ] Auditoria completa (`06_QA_AUDIT.md`), correção de bugs, otimização de tamanho.
- [ ] Tela de título final, créditos, versão no rodapé, ícone/emoji, metadados `<title>`.
- [ ] Publicar como artifact/hospedagem estática; teste em iOS Safari e Android Chrome.

---

## Dependências entre fases
`F0 → F1 → F2 → F3 → F4 → F5 → F6`. F5 (arte/áudio) pode começar em paralelo após F1 para o que já existir.

## Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Arquivo único cresce demais | Orçamento de 250 KB; sprites em strings compactas; build opcional que minifica sem libs |
| Soft-locks (chave/porta/NPC) | Flags idempotentes + checklist de soft-lock + botão "Reiniciar sala" no menu |
| Dificuldade desigual no mobile | Testes em tela real; modo fácil; hitboxes generosas; telegraph ≥ 30 frames |
| Áudio bloqueado por autoplay | Criar `AudioContext` só após o 1º toque; mudo persistente |
| iOS Safari (safe-area, `dvh`, gestos) | Manter `viewport-fit=cover`, `touch-action:none`, fallback `vh` |
| Quebra de regressão ao refatorar | `tools/smoke.js` + cenários por capítulo; auditar a cada fase |
| Texto fora de tom | Revisar tudo contra a Bíblia (humor da Lumi; momentos sem piada) |

## Definição de pronto (por fase)
1. Requisitos de aceite cumpridos. 2. `sh tools/validate.sh` PASS (check + build + smoke 36/36 + audit severa 15/15). 3. **Browser check MCP Chromium conforme §Browser de `06_QA_AUDIT.md`** (BCs aplicáveis PASS + evidências em `evidence/F<n>-browser/` + console limpo). 4. Checklist QA da fase ok + `06_QA_AUDIT.md` com log do run. 5. Docs atualizados (`CLAUDE.md` seção "Estado atual", Bíblia se mudou algo). 6. Sem regressão em fases anteriores. 7. Git save com mensagem `F<n>: <o-que-mudou> (validate+audit+browser pass)` — só depois dos 3 portões verdes; testes impossíveis ficam listados como pendentes, nunca aprovados.

## Registro de decisões
| ID | Decisão | Data |
|---|---|---|
| D-01 | MVP dá a magia de Lumi desde o início; Fragmento Azul a evolui | 2026-10-12 |
| D-02 | Entregável final = **1 arquivo HTML**; dev pode usar `src/` + build opcional | 2026-10-12 |
| D-03 | Resolução lógica 240×160, tile 16 (estilo GBA) | 2026-10-12 |
| D-04 | Idioma do jogo: pt-BR | 2026-10-12 |
| D-05 | `Game.flags` com 13 chaves fixas | 2026-10-12 |
| D-06 | `loadFlags` tolerante/idempotente (ignora desconhecidas, nunca lança) | 2026-10-12 |
| D-07 | `TILES` como única fonte de verdade; char desconhecido = sólido | 2026-10-12 |
| D-08 | `World.goto` com fade de 12 frames (troca no ponto escuro) | 2026-10-12 |
| D-09 | `snapshotMvpMap` como ponte multi-mapa sem mudar a jogabilidade | 2026-10-12 |
| D-10 | Save em slot único versionado; salva em troca de mapa + item-chave | 2026-10-12 |
| D-11 | `localStorage` só em `try/catch` com fallback em memória; load valida tudo antes de aplicar | 2026-10-12 |
| D-12 | `src/main.js` (IIFE) é o único que toca DOM/loop; módulos puros com fallback gracioso; typewriter fora do render | 2026-10-12 |
| D-13 | F1-Content fiel ao MVP (mesmo LCG/posições/valores); novidades só aditivas, sem soft-lock, sem mudança de lore | 2026-10-12 |
| D-14 | Portão `sh tools/validate.sh` + auditoria severa `tools/audit.js` (15 checks); commit só com VALIDATE PASS; git save imediato | 2026-10-12 |
| D-15 | Auditoria de navegador via MCP Chromium (BC-01..BC-10 em `06_QA_AUDIT.md`) é obrigatória por fase para superfícies jogáveis; evidências em `evidence/F<n>-browser/`; commit de fase só após: testes automatizados (validate) + auditoria severa + browser check, os 3 verdes. Testes impossíveis na sessão ficam registrados como NÃO aprovados (nunca "ok por enquanto") | 2026-10-12 |
| D-16 | Fixes de integração F0 achados pelo browser check: B1 typewriter/toast no passo fixo fora de `update()` (rodar também em `talk`); B2 boot não autossalva nem vaza `P` global; B3 `World.currentId` sincronizado nas transições do `main` + `continuarSalvo()` reconstrói a sala correta sem diálogo zumbi; B4 `syncObjFromFlags` não regride `obj` durante chefe | 2026-10-12 |
| D-17 | Gating de progressão F1: espada exige `got_sword`, magia exige `met_lumi`, saída leste de Brisamar exige `got_sword` (só aviso, sem trava); flags de história F1 canônicas e persistidas (cenas idempotentes) | 2026-10-12 |
| D-18 | Música procedural em `src/systems/music.js` (`Cristal.Music`: `tocarTema` idempotente, `aoGestoDoUsuario` único criador de AudioContext, mudo lido por nota); temas `title/brisamar/forest/ruin/boss`; Melodia de Brisamar compartilhada (vila/título/floresta em variação) | 2026-10-12 |
| D-19 | Fixes F1 do browser check: B5 A escolhe o alvo mais próximo (NPC não sombreia objeto); B6 `advanceTalk` não sobrescreve `st` do callback (fim de capítulo); B7 fila de toasts descartada na troca de sala | 2026-10-12 |
| D-20 | F2: entrada pelo fim do Cap.1 (C preserva flags, chapter=2); portas com `reqMsg`; portão sul bloqueado por toast (sem mapa novo); +1 coração (hpMax 8→10) e Lâmina da Guarda (dano 3); chefe 2 com investida (tel 35f); `proposta` auto no retorno + `voltarPraca` | 2026-10-12 |
| D-21 | Fixes F2 do browser check: B8 `irParaValdora` não clobbera diálogo do `onEnter`; B9 `hpMax` persiste no save (c/ fallback por flag); A21 exige flags registradas; Darius F1/F2 com visibilidade por capítulo; objetivo da arena2 por `kind` | 2026-10-12 |
| D-22 | F2.5 experimental (branch): casca fullscreen paisagem + overlay translúcido (some fora do jogo/pausa); D-pad vetorial 8 direções c/ zona morta; Gamepad API padrão; fontes curtas 7→8px e título 8→10px (corpo do diálogo fica 8px p/ não quebrar o wrap); retrato como fallback | 2026-10-12 |
| D-23 | Feedback de teste na branch: overlay SEMPRE visível; fim virou menu de 2 opções (padrão Valdora, toque confirma); navegação cima/baixo unificada no passo fixo (escolhas+menus+fim p/ touch/gamepad/teclado); rótulos por dispositivo (toque=A/B/C, teclado=Z/X/C) | 2026-10-12 |
| D-24 | F3 (Ruínas do Norte): 3 mapas (`montanha` 20×13, `ruinas1`/`ruinas2` 22×14) + `arena3`; portões por flag via `systems/mecanismos.js` (mesma fonte p/ jogo e auditoria A23); enigma ordenado sem flag intermediária (erro zera, nunca trava); gelo `I` desliza até sair/bater; registros = flag própria + contador `secret_records` (requisito Final 3); Sentinela 32 HP (tel 40 f, investida→trava na parede); Fragmento Azul = magia perfura + cruza abismo + ativa interruptor; cadeia vitória→gravação→Darius→Valdora idempotente (retomada se reload no meio); fragmentos físicos roubados, HABILIDADES ficam; +1 coração (hpMax 12); espelhos `E`/`S` p/ a camada de navegador | 2026-10-14 |
