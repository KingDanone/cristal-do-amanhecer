// ruin_entry.js — F1-Content :: Entrada da ruína (transição antes do chefe)
// Mini-sala 15x10 (tela cheia, como a arena do MVP): porta sul vinda da
// floresta → porta norte para a arena do Guardião das Raízes.
// Sem combate: é respiro + tensão antes do chefe. Ao cruzar a porta norte,
// o motor deve aplicar fade (transition: "fade") e abrir o diálogo
// boss_intro; ao entrar na arena, o MVP restaura a vida (P.hp=8) — manter.
//
// Propostas D-0X: nenhuma. Nenhuma mudança de lore nesta frente.

const MAP_RUIN_ENTRY = {
  id: "ruin_entry",
  name: "Entrada da Ruína",
  w: 15,
  h: 10,
  tiles: [
    "######DD#######",
    "#.............#",
    "#.T........T..#",
    "#.............#",
    "#.....###.....#",
    "#.....#S#.....#",
    "#.....###.....#",
    "#.............#",
    "#.............#",
    "######DD#######",
  ],
  legend: {
    "#": { solid: true, label: "parede de pedra" },
    ".": { solid: false, label: "piso" },
    D: { solid: false, label: "porta" },
    T: { solid: false, label: "tocha (luz)" },
    S: { solid: true, label: "inscrição antiga" },
  },
  zones: [
    { id: "saguao", tx: 1, ty: 1, w: 13, h: 8, name: "Saguão da ruína" },
  ],
  spawns: {
    entry: { tx: 7, ty: 8 },
    fromBoss: { tx: 7, ty: 2 },
  },
  exits: [
    // Porta norte → arena do chefe (fade + diálogo de abertura).
    { tx: 6, ty: 0, w: 3, h: 2, to: "boss", spawn: "enter", transition: "fade", enterDialog: "boss_intro" },
    // Porta sul → volta à floresta, junto ao portão.
    { tx: 6, ty: 8, w: 3, h: 2, to: "forest", spawn: "fromRuin", transition: "fade" },
  ],
  objects: [
    { type: "sign", tx: 7, ty: 5, name: "Inscrição gasta", dialog: "ruin_sign" },
    { type: "deco", kind: "tocha", tx: 2, ty: 2, anim: true, solid: false },
    { type: "deco", kind: "tocha", tx: 12, ty: 2, anim: true, solid: false },
  ],
  enemies: [],
  music: "ruin_theme",
  onEnter(game) {
    if (game && game.flags && !game.flags.entered_ruin) game.playDialog("ruin_enter");
  },
};

globalThis.MAP_RUIN_ENTRY = MAP_RUIN_ENTRY;
