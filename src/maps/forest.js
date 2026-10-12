// forest.js — F1-Content :: Floresta dos Sussurros (Cap. 1)
// Porte fiel do forest() do MVP (cristal-cap1.html) para MapDef, + novidades F1:
//   + chave escondida num arbusto (alternativa ao enigma; não o substitui)
//   + raízes negras decorativas animadas (overlay, não sólidas)
//   + 2º inimigo: morcego-de-raiz (mesma dificuldade do slime)
//   + pedra azul (marco que toca o diálogo de encontro da Lumi)
//
// COMPAT MVP (não mudar): LCG seed=7, corredores cl/ln idênticos, portão em
// (27,3), runas azul(10,10)/verde(14,6)/vermelha(20,12), 7 slimes com o mesmo
// algoritmo de spawn, inscrição, chave do enigma em (23,12), chefe 24HP.
// Dificuldade: slime 2HP/contato 1 dano; morcego igual, só que mais rápido e
// com telegraph >= 30f antes da investida. Hitboxes generosas (contato d<10).
//
// Propostas D-0X: nenhuma. Nenhuma mudança de lore nesta frente.

function lcgForestTiles() {
  const MW = 30, MH = 20;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const M = [];
  for (let j = 0; j < MH; j++) {
    M[j] = [];
    for (let i = 0; i < MW; i++) M[j][i] = (i < 1 || j < 1 || i > MW - 2 || j > MH - 2 || rnd() < .2) ? "#" : ".";
  }
  const cl = (a, b, c, d) => { for (let j = b; j <= d; j++) for (let i = a; i <= c; i++) M[j][i] = "."; };
  const ln = (a, b, c, d) => { cl(Math.min(a, c), b, Math.max(a, c), b + 1); cl(c, Math.min(b, d), c + 1, Math.max(b, d) + 1); };
  cl(1, 13, 7, 18); ln(2, 16, 10, 10); ln(10, 10, 14, 6); ln(14, 6, 20, 12); ln(20, 12, 27, 4);
  M[3][27] = "G"; M[3][26] = "#"; M[3][28] = "#"; M[2][27] = "#";
  return { tiles: M.map((row) => row.join("")), nextSeed: seed, rndState: () => seed };
}

// Spawns dos 7 slimes: algoritmo idêntico ao MVP (usa a sequência do LCG
// após a geração do mapa; P inicial em (3,16) p/ o teste de distância).
function slimeSpawns(grid) {
  const T = 16;
  const MW = 30, MH = 20;
  const M = grid.map((row) => row.split(""));
  const P = { x: 3 * T, y: 16 * T };
  // Reexecuta o LCG até o estado pós-mapa para replicar a sequência do MVP.
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) { if (!(i < 1 || j < 1 || i > MW - 2 || j > MH - 2)) rnd(); }
  const blocked = (ex, ey) => {
    const s = 10;
    const solidAt = (px, py) => {
      const i = Math.floor(px / T), j = Math.floor(py / T);
      if (i < 0 || j < 0 || i >= MW || j >= MH) return true;
      const c = M[j][i];
      return c === "#" || c === "G";
    };
    for (const [ax, ay] of [[0, 0], [s, 0], [0, s], [s, s]]) if (solidAt(ex + ax, ey + ay)) return true;
    for (const o of [{ x: 4 * T, y: 14 * T }, { x: 10 * T, y: 10 * T }, { x: 14 * T, y: 6 * T }, { x: 20 * T, y: 12 * T }])
      if (ex < o.x + T && ex + s > o.x && ey < o.y + T && ey + s > o.y) return true;
    return false;
  };
  const out = [];
  for (let n = 0; n < 500 && out.length < 7; n++) {
    const i = 6 + Math.floor(rnd() * 22), j = 2 + Math.floor(rnd() * 16);
    const e = { x: i * T + 3, y: j * T + 3 };
    if (M[j][i] === "." && !blocked(e.x, e.y) && Math.hypot(e.x - P.x, e.y - P.y) > 90) out.push({ tx: i, ty: j });
  }
  return out;
}

const FOREST_TILES = lcgForestTiles().tiles;

const MAP_FOREST = {
  id: "forest",
  name: "Floresta dos Sussurros",
  w: 30,
  h: 20,
  tiles: FOREST_TILES,
  legend: {
    "#": { solid: true, label: "árvore" },
    ".": { solid: false, label: "chão" },
    G: { solid: true, label: "portão das ruínas" },
  },
  spawns: {
    fromBrisamar: { tx: 3, ty: 16 },
    fromRuin: { tx: 25, ty: 4 },
  },
  exits: [
    // Casa ao sul do portão; exige a chave (do enigma OU do arbusto).
    { tx: 27, ty: 4, to: "ruin_entry", spawn: "entry", req: "has_key_c1", transition: "fade" },
    { tx: 1, ty: 15, w: 2, h: 4, to: "brisamar", spawn: "fromForest", transition: "fade" },
  ],
  sign: { tx: 4, ty: 14, dialog: "forest_sign" },
  runes: [
    { tx: 10, ty: 10, color: "#4a8cff", order: 0, name: "céu" },
    { tx: 14, ty: 6, color: "#4ccf4c", order: 1, name: "folha" },
    { tx: 20, ty: 12, color: "#ee4444", order: 2, name: "sangue da terra" },
  ],
  gate: { tx: 27, ty: 3 },
  // Chave do enigma (compat MVP): surge em (23,12) ao ativar as 3 runas.
  runeKeyDrop: { tx: 23, ty: 12 },
  objects: [
    { type: "landmark", kind: "pedra_azul", tx: 14, ty: 8, name: "Pedra azul", dialog: "lumi_meet", solid: false },
    { type: "pickup", kind: "key", hidden: true, tx: 5, ty: 17, name: "Arbusto suspeito", dialog: "key_bush_found", setsFlag: "has_key_c1" },
    // Raízes negras: overlay decorativo animado (nunca sólido, nunca bloqueia).
    ...[
      [3, 15], [8, 12], [12, 9], [13, 10], [15, 7],
      [9, 8], [21, 10], [23, 12], [25, 10], [24, 6],
    ].map(([tx, ty], k) => ({ type: "deco", kind: "darkroot", tx, ty, anim: true, phase: k % 4, solid: false })),
  ],
  enemyDefs: {
    // Valores do MVP: 2HP, persegue a 70px, contato = 1 dano, 30% drop coração.
    slime: { hp: 2, pursueRadius: 70, contactDamage: 1, heartDrop: 0.3 },
    // Novo F1, mesma dificuldade: 2HP, contato 1 dano; investida com
    // telegraph de 36f (pisca + guincho) e descanso de 50f após errar.
    rootbat: { hp: 2, pursueRadius: 90, contactDamage: 1, heartDrop: 0.3, telegraph: 36, rest: 50, ai: "swoop" },
  },
  enemies: [
    ...slimeSpawns(FOREST_TILES).map((s) => ({ kind: "slime", ...s })),
    { kind: "rootbat", tx: 12, ty: 10 },
    { kind: "rootbat", tx: 20, ty: 9 },
    { kind: "rootbat", tx: 24, ty: 12 },
  ],
  music: "forest_theme",
  onEnter(game) {
    if (game && game.flags && !game.flags.met_lumi) { /* pedra azul (14,8) toca lumi_meet */ }
  },
};

globalThis.MAP_FOREST = MAP_FOREST;
globalThis.lcgForestTiles = lcgForestTiles;
globalThis.slimeSpawns = slimeSpawns;
