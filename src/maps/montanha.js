// maps/montanha.js — F3-Content :: Trilha da montanha nevada (Cap. 3)
// Caminho de Valdora até a entrada das Ruínas do Norte: serpenteia entre
// rochas/pinheiros ('#') e precipícios ('O'), passa pelo acampamento
// abandonado da expedição ('T' tenda sólida, 'F' fogueira) e termina na
// porta das ruínas ('D', norte). Registro secreto 1 no canto noroeste.
// Tiles: '#' rocha/pinheiro · '.' neve · 'O' precipício · 'D' porta ·
// 'T' tenda · 'F' fogueira apagada. Coordenadas em TILES (tx, ty).
const MAP_MONTANHA = {
  id: "montanha",
  name: "Montanha do Norte",
  w: 20,
  h: 13,
  tiles: [
    "#########DD#########",
    "#................OO#",
    "#..####....####..O.#",
    "#..####.##.####..O.#",
    "#....T..##..#....O.#",
    "#.##.#####..#.##.O.#",
    "#.##.....####.##..O#",
    "#....F........###..#",
    "#.####.#####..###..#",
    "#.####.#####..###..#",
    "#......#####....#..#",
    "#.##.........##....#",
    "####################",
  ],
  legend: {
    "#": { solid: true, label: "rocha/pinheiro nevado" },
    ".": { solid: false, label: "neve" },
    O: { solid: true, label: "precipício" },
    D: { solid: false, label: "entrada das ruínas" },
    T: { solid: true, label: "tenda da expedição" },
    F: { solid: false, label: "fogueira apagada" },
  },
  spawns: {
    de_valdora: { tx: 10, ty: 11 },
    de_ruinas: { tx: 10, ty: 2 },
  },
  exits: [
    // Porta norte → saguão das ruínas.
    { tx: 9, ty: 0, w: 2, h: 1, to: "ruinas1", spawn: "entrada", transition: "fade", enterDialog: "montanha_porta" },
    // Trilha de volta a Valdora (sul).
    { tx: 9, ty: 11, w: 2, h: 1, to: "valdora", spawn: "montanha", transition: "fade" },
  ],
  npcs: [],
  objects: [
    { type: "sign", tx: 4, ty: 7, name: "Acampamento abandonado", dialog: "montanha_acamp" },
    { type: "registro", id: "registro_f3_1", tx: 1, ty: 1, name: "Registro antigo" },
  ],
  enemies: [
    { kind: "corvo", tx: 7, ty: 3 },
    { kind: "corvo", tx: 13, ty: 4 },
    { kind: "corvo", tx: 16, ty: 6 },
    { kind: "slime_gelo", tx: 3, ty: 10 },
    { kind: "slime_gelo", tx: 12, ty: 11 },
  ],
  enemyDefs: {
    slime_gelo: { hp: 2, pursueRadius: 70, contactDamage: 1, heartDrop: 0.3 },
    corvo: { hp: 1, pursueRadius: 90, contactDamage: 1, heartDrop: 0.25, telegraph: 36, rest: 50, ai: "swoop" },
  },
  music: "montanha_theme",
  onEnter(game) {
    if (!game || !game.flags) return;
    if (!game.flags.chegou_montanha) game.playDialog("montanha_arrival");
  },
};

globalThis.MAP_MONTANHA = MAP_MONTANHA;
