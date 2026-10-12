# 03 — Arquitetura do código (estado atual: `src/cristal-cap1.html`)

Arquivo único (~19 KB): HTML + CSS + JS, **sem dependências**, sem assets externos. Canvas 2D.

## 1. Estrutura do arquivo
1. `<style>` — layout mobile: canvas no topo (proporção 3:2), `#pad` embaixo com D-pad (`#dp`) e botões de ação (`#ac`). `touch-action:none`, `user-select:none`, safe-area via `env()`.
2. HTML — `<canvas id="c" width="240" height="160">` + botões `data-k` (direção: u/d/l/r) e `data-a` (ação: a/b/c).
3. `<script>` — todo o jogo (ordem: constantes/estado → utilitários → mapas → ações → update → render → input → loop).

## 2. Constantes
`W=240, H=160, T=16 (tile)`, `DX=[0,0,-1,1]`, `DY=[1,-1,0,0]` (direção `d`: 0=baixo, 1=cima, 2=esquerda, 3=direita), `OBJ[]` (textos de objetivo).

## 3. Estado global (variáveis `let`)
| Var | Significado |
|---|---|
| `st` | máquina de estados: `'title' \| 'play' \| 'talk' \| 'over' \| 'end'` |
| `P` | jogador `{x,y,s:10,d,hp(máx 8),inv,at,dash,cd,kx,ky}` |
| `E[]` | inimigos (slimes) `{x,y,s:10,hp,t,vx,vy,kx,ky,fl,sw}` |
| `B` | chefe `{x,y,s:28,hp:24,m:'walk\|tel\|slam\|rest',t,fl,dc,end,sw}` ou `null` |
| `S[]` | projéteis da Lumi `{x,y,vx,vy,l}` · `RT[]` raízes do chefe `{x,y,vx,vy,l}` |
| `items[]` | `{x,y,t:'k'(chave)\|'h'(coração)}` |
| `M, MW, MH` | mapa atual (matriz de chars), largura/altura em tiles |
| `inBoss` | flag: está na arena (muda cores, desliga runas/placa na colisão) |
| `runes[]`, `step`, `hasKey`, `obj` | progresso do enigma/objetivo (`obj` indexa `OBJ`) |
| `q, ql, tc, done, prev` | fila de diálogo, linha atual, contador typewriter, callback, estado anterior |
| `mt, tt` | toast (texto, timer) · `fr` frame global · `swing` id do golpe atual · `gcd` cooldown do aviso do portão |
| `CX, CY` | câmera (clamp ao mapa) |

## 4. Mapas
- Chars: `'#'` sólido (árvore/parede), `'.'` chão, `'G'` portão (sólido).
- `forest()`: 30×20, **procedural determinístico** (`rnd()` = LCG com `seed=7`): borda + 20% árvores, depois "esculpe" corredores com `cl(x1,y1,x2,y2)` (retângulo) e `ln(a,b,c,d)` (L de largura 2). Coloca portão em (27,3), runas, 7 slimes (spawn válido via `blk`).
- `arena()`: 15×10 (tela cheia), borda sólida, reseta jogador/chefe/listas.
- **Limitação:** mapas/entidades são variáveis globais únicas, não um registro de mapas.

## 5. Colisão
- `solidAt(px,py)`: tile sólido ou fora do mapa.
- `blk(e,nx,ny)`: testa **4 cantos** da caixa `e.s` + retângulos da placa/runas (se `!inBoss`). Válido para entidades ≤ 16 px; o chefe (28 px) usa *clamp* manual dentro da arena.
- `mv(e,dx,dy)`: move por eixos separados (desliza em paredes).
- `ov(a,b)`: AABB `{x,y,w,h}`.

## 6. Loop e tempo
`loop(t)`: acumulador de **passo fixo 60 Hz** (16.67 ms, `min(100,dt)` evita espiral); `update()` só roda em `st=='play'`; `render()` roda sempre por `requestAnimationFrame`.
⚠️ O contador `tc` do typewriter é incrementado **dentro de `render()`** (dívida técnica: mover para update/passo fixo).

## 7. Funções principais
- **Fluxo:** `begin()` (reset + intro), `retry()`, `toBoss()`, `say(lista,cb)`, `nextLine()`, `msg(txt)`.
- **Ações:** `attack()` (lê placa se perto), `dash()`, `shoot()`, `act(a)` (despacha conforme `st`).
- **Dano:** `hurtP(sx,sy)`, `hurtE(e,n)`, `hitRune(r)`, `hitBoss(n)`.
- **Núcleo:** `update()` (jogador, golpes, projéteis, inimigos, itens, portão, chefe, raízes, câmera).
- **Render:** `R()` (retângulo com câmera), `F()` (retângulo de tela/HUD), `txt()` (texto com sombra), `wrap()`, `render()`.
- **Áudio:** `snd(freq,dur,tipo)` — oscilador WebAudio criado sob demanda (primeiro toque).

## 8. Formato de diálogo
`say([[falante, texto], ...], callback)`; ao terminar, `st` volta ao estado anterior e chama `callback` (que pode mudar `st`, ex.: `()=>{st='end'}`).

## 9. Input
- Direções: `K={u,d,l,r}` ligado por `pointerdown/up/cancel` + `setPointerCapture` nos botões `[data-k]`; teclado em `kk`.
- Ações: `[data-a]` chamam `act()` no `pointerdown`; teclado em `ka`. Toque no canvas avança diálogo/telas (`st!='play'`).

## 10. Dívidas técnicas conhecidas
1. Sem **save/load** (usar `localStorage` sempre em `try/catch`).
2. Sem **música**; só bipes. Sem botão de mudo.
3. Sem **pausa** (`visibilitychange`) nem menu.
4. Estado/mapas globais; sem registro de mapas, portais, NPCs, flags persistentes.
5. Diálogo sem escolhas, sem retrato, sem condição por flag.
6. Sprites são retângulos; sem animação de andar.
7. `tc` no render; toast e objetivo podem sobrepor em telas pequenas.
8. Brisamar, mãe, Orin e Darius **não existem** no MVP (o Cap. 1 começa direto na floresta).
9. Randomização de combate usa `Math.random` (ok), mas o mapa usa LCG (determinístico) — manter essa separação.

## 10b. Convenções de código
- Português nos textos do jogo; identificadores curtos já existentes são tolerados no arquivo atual, mas **código novo deve usar nomes descritivos** (ver plano, fase F0).
- Nada de bibliotecas externas, imagens externas ou `fetch`. Tudo embutido.
- `localStorage`/`sessionStorage`: só em `try/catch` e com fallback quando vazio.
- Sem `<form>`. Eventos via pointer events.
- Cada mudança deve manter `node --check` e o smoke test passando (`tools/smoke.js`).

## 11. Arquitetura-alvo (para o jogo completo, ainda em arquivo único)
Refatorar na fase F0 mantendo o arquivo único (opcionalmente com `tools/build.js` que concatena módulos de `src/` em um HTML final):

```
Game = { state, flags, save }
World = { maps: { id: MapDef }, current, goto(mapId, spawnId) }
MapDef = { id, w, h, tiles[], tileset, spawns{}, exits[{x,y,to,spawn,req?}],
           npcs[], enemies[], objects[], music, onEnter(game) }
Entity types: Player, Enemy(kind), Boss(kind), NPC, Pickup, Switch, Door, Sign, Projectile
Systems: Input, Collision, Combat, Dialogue(with choices/flags), HUD, Audio(Music+SFX), Save, Camera
```
Tiles → tabela `TILES = { '#': {solid:1, draw}, '.': {...}, ... }` em vez de `if/else` no render.
Inimigos → tabela de definições `ENEMIES = { slime:{hp,speed,dmg,ai,draw}, ... }`.
Chefes → máquina de estados por chefe com tabela de padrões (`telegraph`, `active`, `rest`).
