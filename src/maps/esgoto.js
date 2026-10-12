// maps/esgoto.js — F2-Content :: Esgotos de Valdora (missão do gato)
// Mini-masmorra 18x12: canal de água com ponte, tochas, 3 slimes, baú com a
// Lâmina da Guarda e um esconderijo (passagem secreta, exige Fragmento Verde).
// Tiles: '#' pedra · '.' piso · 'W' água (sólida) · 'T' tocha (passável).
const MAP_ESGOTO = {
  id: "esgoto",
  name: "Esgotos de Valdora",
  w: 18,
  h: 12,
  tiles: [
    "##################",
    "#.....WW.....T...#",
    "#.....WW.........#",
    "#.....WW.........#",
    "#.....WW.........#",
    "#................#",
    "#.....WW.........#",
    "#.....WW.........#",
    "#.....WW.........#",
    "#.T...WW.......T.#",
    "#................#",
    "##################",
  ],
  legend: {
    "#": { solid: true, label: "parede de pedra" },
    ".": { solid: false, label: "piso úmido" },
    W: { solid: true, label: "canal de água" },
    T: { solid: false, label: "tocha" },
  },
  spawns: {
    entrada: { tx: 2, ty: 10 },
  },
  exits: [
    { tx: 1, ty: 10, w: 2, h: 1, to: "valdora", spawn: "grade", transition: "fade" },
  ],
  npcs: [],
  objects: [
    { type: "bau", tx: 15, ty: 10, name: "Baú velho", dialog: "bau" },
    { type: "passagem", tx: 15, ty: 1, name: "Parede suspeita" },
  ],
  enemies: [
    { kind: "slime", tx: 4, ty: 3 },
    { kind: "slime", tx: 12, ty: 7 },
    { kind: "slime", tx: 5, ty: 8 },
  ],
  music: "ruin_theme",
  onEnter(game) {},
};

globalThis.MAP_ESGOTO = MAP_ESGOTO;
