// maps/ruinas2.js — F3-Content :: Ala da Expedição das Ruínas do Norte (Cap. 3)
// Segundo andar: corredor de gelo escorregadio ('I') até o interruptor C,
// diários da expedição do pai ao sudoeste, passagem secreta (Fragmento Verde)
// ao norte, interruptor isolado no abismo (só a magia evoluída do Fragmento
// Azul alcança — abre o cofre do registro 5) e a porta selada do chefe
// ('G'→'d' com os 3 interruptores A/B/C). Portões: systems/mecanismos.js.
// Tiles: '#' parede · '.' piso · 'I' gelo escorregadio · 'O' abismo ·
// 'G' porta selada · 'd' porta aberta · 'D' passagem leste (ruinas1).
const MAP_RUINAS2 = {
  id: "ruinas2",
  name: "Ruínas do Norte — Ala da Expedição",
  w: 22,
  h: 14,
  tiles: [
    "##########GG##########",
    "#....................#",
    "#IIIII#IIIIIIIIIII...#",
    "#....................#",
    "#...#...##...#....#..#",
    "#....................#",
    "#...##.......##......#",
    "#....................#",
    "#.................#G##",
    "#..............OOO...#",
    "#..............O.O...#",
    "#..............OOO####",
    "#....................#",
    "######################",
  ],
  legend: {
    "#": { solid: true, label: "parede de pedra gelada" },
    ".": { solid: false, label: "piso de gelo" },
    I: { solid: false, label: "gelo escorregadio" },
    O: { solid: true, label: "abismo" },
    G: { solid: true, label: "porta selada do chefe" },
    d: { solid: false, label: "porta aberta" },
    D: { solid: false, label: "passagem leste" },
  },
  gates: [
    // Porta do Sentinela: só com os três interruptores ligados.
    { flags: ["sw_ruin_a", "sw_ruin_b", "sw_ruin_c"], cells: [[10, 0], [11, 0]], openChar: "d", closedChar: "G" },
    // Cofre do registro 5: interruptor isolado, só ao alcance da magia nova.
    { flags: ["sw_ruin_mag"], cells: [[19, 8]], openChar: "d", closedChar: "G" },
  ],
  spawns: {
    entrada_leste: { tx: 19, ty: 5 },
    saida_arena: { tx: 10, ty: 3 },
  },
  exits: [
    { tx: 20, ty: 4, w: 1, h: 2, to: "ruinas1", spawn: "vindo_de_ruinas2", transition: "fade" },
    { tx: 10, ty: 1, w: 2, h: 1, to: "arena3", spawn: "entrada", transition: "fade", enterDialog: "chefe3_intro" },
  ],
  npcs: [],
  objects: [
    { type: "sign", tx: 9, ty: 1, name: "Porta selada", dialog: "ruinas_porta_chefe" },
    { type: "passagem", tx: 13, ty: 1, name: "Parede desgastada", flagPass: "esconderijo_norte", recordId: "registro_f3_4" },
    { type: "diario", tx: 1, ty: 9, name: "Diário da expedição 1", dialog: "f3_diario1" },
    { type: "diario", tx: 1, ty: 10, name: "Diário da expedição 2", dialog: "f3_diario2" },
    { type: "diario", tx: 1, ty: 11, name: "Diário da expedição 3", dialog: "f3_diario3" },
    { type: "interruptor", flag: "sw_ruin_c", tx: 1, ty: 2, name: "Interruptor do corredor de gelo" },
    { type: "interruptor", flag: "sw_ruin_mag", tx: 16, ty: 10, name: "Interruptor isolado" },
    { type: "sign", tx: 14, ty: 10, name: "Fenda no abismo", dialog: "ruinas_magica_alcance" },
    { type: "registro", id: "registro_f3_3", tx: 2, ty: 12, name: "Registro antigo" },
    { type: "registro", id: "registro_f3_5", tx: 19, ty: 10, name: "Registro antigo" },
  ],
  enemies: [
    { kind: "corvo", tx: 12, ty: 4 },
    { kind: "corvo", tx: 8, ty: 6 },
    { kind: "slime_gelo", tx: 4, ty: 10 },
    { kind: "slime_gelo", tx: 10, ty: 12 },
  ],
  enemyDefs: {
    slime_gelo: { hp: 3, pursueRadius: 70, contactDamage: 1, heartDrop: 0.35 },
    corvo: { hp: 1, pursueRadius: 90, contactDamage: 1, heartDrop: 0.25, telegraph: 36, rest: 50, ai: "swoop" },
  },
  music: "ruin_theme",
  onEnter(game) {},
};

globalThis.MAP_RUINAS2 = MAP_RUINAS2;
