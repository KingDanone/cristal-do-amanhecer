// maps/valdora.js — F2-Content :: A Cidade de Valdora (Cap. 2)
// Hub urbano 22x16: templo ao norte (porta p/ arena2), praça central, mercado,
// viela oeste (gato), grade do esgoto a leste, portão sul bloqueado.
// Tiles: '#' prédio/muro · '.' rua · 'P' praça · 'T' barraca (sólida) ·
// 'D' porta (passável) · 'G' portão (sólido) · 'F' flores (passável).
// Coordenadas em TILES (tx, ty). Propostas D-0X: nenhuma.
const MAP_VALDORA = {
  id: "valdora",
  name: "Cidade de Valdora",
  w: 22,
  h: 16,
  tiles: [
    "######################",
    "#...####.######.###..#",
    "#...####.##DD##.###..#",
    "#....................#",
    "#..T....T..T..T......#",
    "#....................#",
    "#.......PPPPPP.......#",
    "#.......PPPPPP.......#",
    "#.......PPPPPP.......#",
    "#....................#",
    "#....................#",
    "#..F..........F......#",
    "#....................#",
    "#....................#",
    "#........GG..........#",
    "######################",
  ],
  legend: {
    "#": { solid: true, label: "prédio/muro" },
    ".": { solid: false, label: "rua" },
    P: { solid: false, label: "praça" },
    T: { solid: true, label: "barraca do mercado" },
    D: { solid: false, label: "porta do templo" },
    G: { solid: true, label: "portão sul" },
    F: { solid: false, label: "flores" },
  },
  spawns: {
    entrada_sul: { tx: 10, ty: 13 },
    templo: { tx: 11, ty: 5 },
    grade: { tx: 17, ty: 12 },
    praca: { tx: 10, ty: 8 },
  },
  exits: [
    // Porta do templo → arena do Cavaleiro Corrompido (exige a pista).
    { tx: 11, ty: 2, w: 2, h: 1, to: "arena2", spawn: "entrada", req: "fragmento_pista", reqMsg: "O templo está trancado. A guarda não deixa passar.", transition: "fade", enterDialog: "chefe2_intro" },
    // Grade do esgoto → esgotos (exige completar a missão do gato).
    { tx: 19, ty: 12, w: 1, h: 1, to: "esgoto", spawn: "entrada", req: "cat_found", reqMsg: "A grade está presa. Alguém da praça pode saber de algo.", transition: "fade" },
  ],
  npcs: [
    { id: "menina", name: "Menina", tx: 13, ty: 7, face: "left", dialogs: { first: "menina_inicio", repeat: "menina_obrigada" } },
    { id: "darius", name: "Darius", tx: 10, ty: 7, face: "down", dialogs: { first: "darius_prov", repeat: "darius_prov" } },
    { id: "estranho", name: "Estranho", tx: 9, ty: 8, face: "right", dialogs: { first: "proposta", repeat: "proposta" } },
    { id: "capitao", name: "Capitão", tx: 11, ty: 3, face: "down", dialogs: { first: "capitao_pista", repeat: "capitao_pista" }, reqFlag: "darius_prov", reqDialog: "capitao_antes" },
    { id: "refugiado1", name: "Refugiado", tx: 6, ty: 8, face: "right", dialogs: { first: "refugiado1", repeat: "refugiado1" } },
    { id: "refugiado2", name: "Refugiado", tx: 15, ty: 8, face: "left", dialogs: { first: "refugiado2", repeat: "refugiado2" } },
    { id: "refugiado3", name: "Refugiado", tx: 9, ty: 11, face: "up", dialogs: { first: "refugiado3", repeat: "refugiado3" } },
  ],
  objects: [
    { type: "stall", tx: 3, ty: 4, solid: true, name: "Barraca de frutas" },
    { type: "stall", tx: 8, ty: 4, solid: true, name: "Barraca de tecidos" },
    { type: "stall", tx: 11, ty: 4, solid: true, name: "Barraca de mapas" },
    { type: "stall", tx: 14, ty: 4, solid: true, name: "Barraca de doces" },
    { type: "gato", tx: 2, ty: 9, name: "Miau", dialog: "gato_achado_dlg", reqFlag: "gato_quest", reqDialog: "gato_hint" },
    { type: "grade", tx: 19, ty: 12, name: "Grade do esgoto" },
  ],
  enemies: [],
  music: "valdora_theme",
  onEnter(game) {
    if (!game || !game.flags) return;
    if (!game.flags.chegou_valdora) { game.playDialog("valdora_arrival"); return; }
    if (game.flags.boss2_defeated && !game.flags.proposta_vista) {
      game.playDialog("proposta", function () {
        if (game.voltarPraca) game.voltarPraca();
      });
    }
  },
};

globalThis.MAP_VALDORA = MAP_VALDORA;
