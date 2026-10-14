# 05 — Specs de Capítulos

Fonte narrativa: `01_STORY_BIBLE.md`. Valores de combate: `02_GAME_DESIGN.md` §4.
Flags canônicas: `chapter`, `sign_read`, `runes_done`, `has_key_c1`, `boss1_defeated`,
`cat_found`, `secret_records`, `frag_green`, `frag_blue`, `frag_red`,
`darius_spared`, `final_choice` (ver `02_GAME_DESIGN.md` §7).

Estado em 2026-10-12: Cap. 1 = MVP jogável em `cristal-cap1.html`
(floresta + enigma + chefe). O conteúdo F1 (Brisamar etc.) está marcado **[F1]**.

---

## Cap. 1 — A Floresta dos Sussurros (~15–20 min no F1; MVP atual ~5–8 min)

**Objetivo:** investigar onde a estrela caiu; achar a ruína; derrotar o Guardião.

### Mapas
| Mapa | Tamanho | Geração | Notas |
|---|---|---|---|
| Floresta | 30×20 | Procedural determinística, LCG `seed=7` (`rnd()`): borda + 20% árvores, corredores esculpidos via `cl`/`ln` | Cadeia de corredores conectada: `(1,13)-(7,18)` → `(2,16)-(10,10)` → `(10,10)-(14,6)` → `(14,6)-(20,12)` → `(20,12)-(27,4)` |
| Arena do Guardião | 15×10 (tela cheia) | Fixa, borda sólida | Transição pelo portão; reseta jogador/chefe/listas |
| **[F1]** Brisamar | ~20×15 | Fixa | Casa de Kael → praça do festival → casa do Mestre Orin (pesca) → saída p/ floresta |
| **[F1]** Ante-sala da ruína | pequena | Fixa | Transição de mapa antes do chefe (ver F1) |

Pontos fixos (tiles, origem 0,0 no canto superior):
- Spawn do jogador: `(3,16)` · Placa/inscrição: `(4,14)` · Runas: azul `(10,10)` i=0,
  verde `(14,6)` i=1, vermelha `(20,12)` i=2 (ordem: céu → folha → sangue).
- Chave: surge em `(23,12)` ao completar as runas · Portão `G`: `(27,3)`
  (vizinhos forçados `#`: `(26,3)`, `(28,3)`, `(27,2)`; acesso por `(27,4)`).

### NPCs / pontos de interação
- Placa: lê inscrição ("Primeiro o céu, depois a folha, por fim o sangue da terra."),
  Lumi traduz (azul/verde/vermelho). Seta `sign_read`, `obj=1`.
- Lumi (tutorial): diálogo do chefe ("Esquive com B e use a minha magia com C!").
- **[F1]** Mãe ("Levanta! Você vai perder o festival!") · Darius (despedida:
  "Não precisa vir atrás de mim…") · Mestre Orin (espada enferrujada + tutorial)
  · Encontro Lumi na pedra azul ("Finalmente... alguém que ainda consegue ouvir.")
  · Cena da estrela (céu escurece, tremor, luz vermelha) · Encapuzado na colina (1 s).

### Inimigos
- Slime corrompido ×7: 2 HP, persegue a <70 px (0.5 px/f), contato = 1 dano,
  30% dropa coração (+2). Spawn válido via `blk`, a >90 px do jogador.
- **[F1]** Morcego de raiz (2º tipo) + raízes negras decorativas animadas.

### Chefe — Guardião das Raízes (24 HP)
Arena 15×10, contato a <22 px = 1 dano. Ciclo (frames a 60 Hz):

| Estado | Duração | Comportamento |
|---|---|---|
| `walk` | 90 f (65 f na fase 2) +0–30 aleatório | Persegue a 0.4 px/f |
| `tel` | **40 f** (piscar vermelho) | Telegraph ≥30 f ✓ |
| `slam` | 14 f, raio 46 | Dano em área |
| `rest` | 50 f | Janela de punição |

- **Fase 2** (hp ≤ 12): no `slam` dispara **8 raízes radiais** (1.3 px/f, 140 f)
  e o ciclo acelera. **[F1]** barra de vida com nome + sons polidos.
- Pós-vitória: inscrição ("Quando a primeira estrela cair, aquele que carrega
  a lembrança abrirá o caminho." — símbolo = pingente), gancho do encapuzado,
  seta `boss1_defeated`, `st='end'`.

### Flags do capítulo
`sign_read`, `runes_done` (step==3), `has_key_c1`, `boss1_defeated`.
(Migrar `step/hasKey/obj` para `Game.flags` em F0.)

### Roteiro de diálogos (texto canônico atual)
1. Intro (5 falas: Narrador → Kael → Lumi → Kael → Lumi, tutorial A/B/C).
2. Placa (Inscrição + Lumi). 3. Pré-chefe (Lumi). 4. Vitória (5 falas + `end`).

### Aceite
- MVP: floresta → runas → chave → portão → chefe → fim, sem soft-lock
  (chave e portão alcançáveis por BFS; portão trava com aviso sem chave).
- F1 completo: da casa de Kael ao encapuzado em ~15–20 min, roteiro = Bíblia.
  **STATUS 2026-10-12: ENTREGUE E VERIFICADO** (validate + audit 19/19 + smoke 37/37
  + browser BC-F1-01..BC-F1-16, evidências em `evidence/f1-browser/01..06`):
  Brisamar jogável (mãe/morador/Darius c/ escolha/Orin/boneco), nome editável,
  cena da estrela c/ overlay, floresta (placa, arbusto-chave, runas, Lumi, magia,
  morcegos), ruin_entry, chefe c/ barra nomeada + figura encapuzada + fim,
  continue multi-mapa, temas musicais por mapa. Bugs B5–B7 corrigidos no ciclo.

---

## Cap. 2 — A Cidade de Valdora (esqueleto, ver F2)

- **Objetivo:** hub urbano (ruas, refugiados, boatos: rei desaparecido, fragmento
  roubado por ex-guardião fugido p/ o norte). Darius na guarda real (provocação:
  "Você atravessou uma floresta? Impressionante…").
- **Missão secundária do gato:** menina → vielas → esgotos (passagem secreta) →
  baú c/ equipamento opcional. Flag **`cat_found`** (requisito do Final 3).
- **Chefe: Cavaleiro Corrompido** — padrões a definir em F2 (seguir princípio:
  telegraph ≥30 f, descanso pós-golpe, vencível com esquiva+espada). Ao cair:
  "O rei não foi sequestrado... ele está tentando impedir que abram a porta."
- **Recompensa:** Fragmento Verde (`frag_green`, Lumi revela passagens) + +1 coração.
- **Gancho:** Darius recebe a proposta do homem misterioso.
- **Aceite:** cidade navegável, secundária completa e rastreada por `cat_found`.
  **STATUS 2026-10-12: ENTREGUE E VERIFICADO** (validate + audit 21/21 + smoke 40/40
  + browser BC-F2-01..BC-F2-15, evidências em `evidence/f2-browser/01..06`):
  entrada pelo fim do Cap.1, NPCs/refugiados, Darius, gato→esgotos→baú
  (`cat_found`), Cavaleiro Corrompido (tel 35f) com fala do rei, Fragmento Verde
  + Lâmina da Guarda + coração, proposta com volta à praça. Bugs B8/B9 corrigidos.

## Cap. 3 — As Ruínas do Norte (esqueleto, ver F3)

- **Objetivo:** maior calabouço (neve): interruptores, portas, plataformas, enigmas.
- Diários da expedição (nome do pai; ele ficou p/ impedir o mecanismo) + anotação
  ("…a coragem de sua mãe, e não minha teimosia." — **Lumi sem piada**).
- **Coletáveis:** registros secretos (`secret_records`, contados no HUD do menu).
- **Chefe: Sentinela de Ferro** — padrões a definir em F3 (mesmo princípio).
- Pós-chefe: Fragmento Azul (`frag_blue`, magia perfura + ativa interruptores) +
  **gravação do pai: escolha moral** (restaurar × destruir; pai buscava 3ª via).
- **Gancho:** Darius de armadura negra toma os fragmentos
  ("Desculpa, Kael. Mas alguém precisa fazer o que deve ser feito.").
- **Aceite:** contador de registros no menu; calabouço sem soft-lock.
- **STATUS 2026-10-14: ENTREGUE E VERIFICADO** (validate + audit 23/23 + smoke 45/45
  + browser BC-F3-01..BC-F3-18, evidências em `evidence/f3-browser/01..18`):
  montanha (gelo escorregadio, acampamento, registro 1) → saguão (enigma ordenado
  sol→estrela→lua, interruptores A/B, ponte sobre o abismo, registro 2) → ala da
  expedição (corredor de gelo, diários 1–3 do pai, passagem secreta c/ registro 4,
  interruptor isolado só p/ magia evoluída, registro 5 no cofre) → Sentinela de Ferro
  (32 HP, investida que trava na parede, tel 40 f) → Fragmento Azul (magia perfura
  + cruza abismo + ativa interruptor à distância) + gravação do pai (dilema moral,
  3ª via em aberto) → Darius de armadura negra toma os fragmentos → volta a Valdora
  (objetivo "Aguarde o Capítulo 4"). Contador "Registros antigos: n/5" no menu de
  pausa; portões por flag reaplicados do save (sem soft-lock); Continue restaura
  mapa/flags/posição/HP. Sem regressão (F0–F2 intactos).

## Cap. 4 — O Amigo que Escolheu as Sombras (esqueleto, ver F4)

- Santuário da cachoeira; diálogo Darius×Malachar (Darius não sabe o plano real).
- **Chefe: Darius, o Cavaleiro das Sombras** — rápido mas justo
  (investidas, golpes carregados; timings em F4, telegraph ≥30 f).
- Cena de poupar ("Você não precisa provar nada para mim.") → `darius_spared`,
  Darius entrega a espada (Fragmento Vermelho, `frag_red`: quebra barreiras).
- Malachar ativa o mecanismo; Kael segue sozinho à capital.

## Cap. 5 — O Último Amanhecer (esqueleto, ver F4)

- Capital corrompida (corredores, raízes) → salão do cristal.
- **Luta final em 2 fases:** Malachar humano (magia sombria) → entidade o absorve
  (criatura). Lumi lembra quem é (escudo de Lumi, 4ª habilidade).
- **Escolha dos 3 finais** (`final_choice`): 1 restaurar · 2 destruir ·
  3 entregar poder a Lumi, **só se `cat_found && secret_records==N_TOTAL`**.
- Cenas finais + créditos (textos = `01_STORY_BIBLE.md` §5).

---

## Registro de decisões de spec
| ID | Decisão | Data |
|---|---|---|
| S-01 | MVP dá a magia desde o início (D-01); Fragmento Azul a evolui | 2026-10-12 |
| S-02 | Coordenadas do MVP congeladas como referência (portão 27,3; runas; chave 23,12) | 2026-10-12 |
