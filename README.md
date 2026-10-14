# A Lenda do Cristal do Amanhecer

RPG 2D top-down em **um único arquivo HTML** (`dist/cristal.html`), sem
dependências, mobile-first, em pt-BR.

- **Jogar online:** `https://kingdanone.github.io/cristal-do-amanhecer/` (landing)
  ou direto em
  `https://kingdanone.github.io/cristal-do-amanhecer/dist/cristal.html`
  (GitHub Pages, branch `main`).
- **Jogar local:** `python3 -m http.server 8901` na raiz e abrir
  `http://localhost:8901/dist/cristal.html`.

## Controles

| Ação | Toque | Teclado | Gamepad |
|---|---|---|---|
| Mover | D-pad | Setas / WASD | Analógico / direcional |
| A — espada / interagir | botão A | Z, J, Espaço, Enter | A (0) |
| B — esquiva | botão B | X, K | B (1) |
| C — magia de Lumi | botão C | C, L | X/Y (2/3) |
| Pausa / menu | botão ☰ | P / Esc | Start (9) |

## Desenvolvimento

- `src/` (módulos) → `node tools/build.js` → `dist/cristal.html` (entregável < 250 KB).
- Portão antes de cada commit: `sh tools/validate.sh` (check + build + smoke + auditoria).
- Branches: **`main`** = produção (o que o Pages publica); **`dev`** = desenvolvimento
  (F4 em diante). Release = merge `dev` → `main`.
- Docs do projeto: `01_STORY_BIBLE.md` (história), `02_GAME_DESIGN.md`,
  `03_ARCHITECTURE.md`, `04_DEV_PLAN.md`, `05_CHAPTER_SPECS.md`, `06_QA_AUDIT.md`.
