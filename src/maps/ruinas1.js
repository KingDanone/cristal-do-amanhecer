// maps/ruinas1.js — F3-Content :: Saguão Selado das Ruínas do Norte (Cap. 3)
// Primeiro andar das ruínas: hall sul com o enigma dos 3 painéis (ordem
// sol → estrela → lua, muda o portão 'G'→'d' via flag f3_enigma) e hall
// norte com interruptores A/B ligados por uma ponte sobre o abismo ('O'→'V'
// via flag sw_ruin_a). Portões dinâmicos: ver `gates` + systems/mecanismos.js.
// Tiles: '#' parede · '.' piso · 'O' abismo · 'V' ponte · 'G' porta selada ·
// 'd' porta aberta · 'T' tocha · 'D' passagem (vai/volta ruinas2 e montanha).
const MAP_RUINAS1 = {
  id: "ruinas1",
  name: "Ruínas do Norte — Saguão",
  w: 22,
  h: 14,
  tiles: [
    "######################",
    "#..T.....T..##.......#",
    "#............##......#",
    "#.............OOO....#",
    "#...#....#....#......#",
    "#.............#......#",
    "##########GG##########",
    "#.....T.....T........#",
    "#....................#",
    "D....................#",
    "D....................#",
    "#....................#",
    "#..........T.........#",
    "######################",
  ],
  legend: {
    "#": { solid: true, label: "parede de pedra gelada" },
    ".": { solid: false, label: "piso de gelo" },
    O: { solid: true, label: "abismo" },
    V: { solid: false, label: "ponte de gelo" },
    G: { solid: true, label: "porta selada" },
    d: { solid: false, label: "porta aberta" },
    T: { solid: false, label: "tocha azul" },
    D: { solid: false, label: "passagem oeste" },
  },
  // Portões por flag (systems/mecanismos.js): enigma abre o hall norte;
  // interruptor A arma a ponte para o interruptor B (e o registro 2).
  gates: [
    { flags: ["f3_enigma"], cells: [[10, 6], [11, 6]], openChar: "d", closedChar: "G" },
    { flags: ["sw_ruin_a"], cells: [[14, 3], [15, 3], [16, 3]], openChar: "V", closedChar: "O" },
  ],
  spawns: {
    entrada: { tx: 11, ty: 12 },
    vindo_de_ruinas2: { tx: 2, ty: 10 },
  },
  exits: [
    { tx: 10, ty: 12, w: 2, h: 1, to: "montanha", spawn: "de_ruinas", transition: "fade" },
    { tx: 1, ty: 9, w: 1, h: 2, to: "ruinas2", spawn: "entrada_leste", transition: "fade" },
  ],
  npcs: [],
  objects: [
    { type: "sign", tx: 6, ty: 12, name: "Inscrição dos painéis", dialog: "ruinas_paineis_ordem" },
    { type: "painel", simbolo: "sol", ordem: 0, tx: 4, ty: 9, name: "Painel do Sol" },
    { type: "painel", simbolo: "estrela", ordem: 1, tx: 11, ty: 10, name: "Painel da Estrela" },
    { type: "painel", simbolo: "lua", ordem: 2, tx: 17, ty: 9, name: "Painel da Lua" },
    { type: "interruptor", flag: "sw_ruin_a", tx: 6, ty: 2, name: "Interruptor norte" },
    { type: "interruptor", flag: "sw_ruin_b", tx: 18, ty: 2, name: "Interruptor do alcove" },
    { type: "registro", id: "registro_f3_2", tx: 19, ty: 4, name: "Registro antigo" },
  ],
  enemies: [
    { kind: "corvo", tx: 15, ty: 10 },
    { kind: "corvo", tx: 8, ty: 8 },
    { kind: "slime_gelo", tx: 17, ty: 11 },
    { kind: "slime_gelo", tx: 5, ty: 2 },
    { kind: "slime_gelo", tx: 12, ty: 5 },
  ],
  enemyDefs: {
    slime_gelo: { hp: 3, pursueRadius: 70, contactDamage: 1, heartDrop: 0.35 },
    corvo: { hp: 1, pursueRadius: 90, contactDamage: 1, heartDrop: 0.25, telegraph: 36, rest: 50, ai: "swoop" },
  },
  music: "ruin_theme",
  onEnter(game) {},
};

globalThis.MAP_RUINAS1 = MAP_RUINAS1;
