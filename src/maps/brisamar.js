// brisamar.js — F1-Content :: mapa da vila inicial
// Vila pacífica 20x15, sem combate (enemies: []).
// Locais: casa de Kael (mãe), praça do festival, casa + lagoa do Mestre Orin,
// saída leste para a floresta.
//
// Tiles: '#' sólido (muro/casa/árvore) · '.' grama · 'P' praça (passável) ·
// 'T' barraca (sólido) · 'F' flores (passável) · 'W' água (sólido) ·
// 'D' deck de pesca (passável).
// Coordenadas de NPCs/objetos/saídas em TILES (tx, ty); o motor converte (*16).
//
// Propostas D-0X: nenhuma. Nenhuma mudança de lore nesta frente.
// Sugestão p/ F0-Engine (opcional, sem quebrar nada se ignorado):
//   exit.leaveDialog toca o diálogo 1x ao sair (idempotente pela flag).

const MAP_BRISAMAR = {
  id: "brisamar",
  name: "Brisamar",
  w: 20,
  h: 15,
  tiles: [
    "####################",
    "#.####..........WWW#",
    "#.####..TPPPT...WWW#",
    "#.####..PPPPP....D.#",
    "#.......PPPPP......#",
    "#.......PPPPP......#",
    "#............####..#",
    "#FF..........####..#",
    "#............####..#",
    "#....#.........#...#",
    "#..................#",
    "#.........FF.......#",
    "#.##.......#........",
    "#.FF.#.............#",
    "####################",
  ],
  legend: {
    "#": { solid: true, label: "muro/casa/árvore" },
    ".": { solid: false, label: "grama" },
    P: { solid: false, label: "praça" },
    T: { solid: true, label: "barraca do festival" },
    F: { solid: false, label: "flores" },
    W: { solid: true, label: "água" },
    D: { solid: false, label: "deck de pesca" },
  },
  zones: [
    { id: "casa_kael", tx: 2, ty: 1, w: 4, h: 3, name: "Casa de Kael" },
    { id: "praca", tx: 8, ty: 2, w: 5, h: 4, name: "Praça do festival" },
    { id: "lagoa", tx: 16, ty: 1, w: 3, h: 2, name: "Lagoa do Orin" },
    { id: "casa_orin", tx: 13, ty: 6, w: 4, h: 3, name: "Casa do Mestre Orin" },
  ],
  spawns: {
    home: { tx: 3, ty: 6 },
    fromForest: { tx: 17, ty: 12 },
  },
  exits: [
    // Abertura na borda leste (tiles (18,12) e (19,12) são '.').
    { tx: 18, ty: 12, w: 2, h: 1, to: "forest", spawn: "fromBrisamar", transition: "fade", leaveDialog: "starfall" },
  ],
  npcs: [
    { id: "mae", name: "Mãe", tx: 3, ty: 4, face: "down", dialogs: { first: "wake_up", repeat: "mother_repeat" } },
    { id: "darius", name: "Darius", tx: 10, ty: 4, face: "left", dialogs: { first: "darius_farewell", repeat: "darius_repeat" } },
    { id: "morador", name: "Morador", tx: 9, ty: 5, face: "up", dialogs: { first: "festival_square" } },
    { id: "orin", name: "Mestre Orin", tx: 16, ty: 3, face: "left", dialogs: { first: "orin_meet", repeat: "orin_repeat" } },
  ],
  objects: [
    { type: "sign", tx: 6, ty: 5, dialog: "village_sign" },
    { type: "dummy", tx: 15, ty: 4, name: "Boneco de treino", dialog: "orin_tutorial" },
    { type: "stall", tx: 8, ty: 2, solid: true, name: "Barraca de doces" },
    { type: "stall", tx: 12, ty: 2, solid: true, name: "Barraca de enfeites" },
  ],
  enemies: [],
  music: "brisamar_theme",
  // Ordem sugerida de história (só documentação; sem travas p/ evitar soft-lock):
  // wake_up → festival_square → darius_farewell → orin_meet → orin_tutorial
  // → starfall (ao sair a leste) → forest.
  onEnter(game) {
    if (game && game.flags && !game.flags.woke_up) game.playDialog("wake_up");
  },
};

globalThis.MAP_BRISAMAR = MAP_BRISAMAR;
