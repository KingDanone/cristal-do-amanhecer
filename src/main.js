// src/main.js — F1: Prólogo + Cap.1 completo sobre o motor F0.
// D-12: main (IIFE) é o único que toca DOM/canvas/loop; módulos são puros.
// Fluxo: título (nome editável) → Brisamar → cena da estrela → floresta →
// entrada da ruína → arena do Guardião. Números de combate idênticos ao MVP.
// D-17: magia de Lumi (C) só após conhecê-la (met_lumi); espada (A) só após
// Orin (got_sword). Na floresta a saída leste exige got_sword (aviso, sem trava).
(function jogoPrincipal() {
'use strict';
if (typeof document === 'undefined' || typeof window === 'undefined') return;
var cv = document.getElementById('c');
if (!cv) return;
var x = cv.getContext('2d');
var W = 240, H = 160, T = 16;
var DX = [0, 0, -1, 1], DY = [1, -1, 0, 0];
var MVP_OBJ = ['Explore a floresta', 'Ative as runas na ordem certa', 'Pegue a chave', 'Abra o portão das ruínas', 'Derrote o Guardião das Raízes'];

// ---- pontes p/ módulos (com fallback gracioso) ----
var Dlg = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Dialogue) || null;
var Ent = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Entities) || null;
var Aud = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Audio) || null;
var UI = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.UI) || null;
var Mus = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Music) || null;
var G = (typeof Game !== 'undefined') ? Game : null;
var Wd = (typeof World !== 'undefined') ? World : null;
var Sv = (typeof SaveSystem !== 'undefined') ? SaveSystem : null;
var DIALOGS = (typeof DIALOGS_F1 !== 'undefined') ? DIALOGS_F1 : ((typeof globalThis !== 'undefined' && globalThis.DIALOGS_F1) || null);
var DIALOGS2 = (typeof DIALOGS_F2 !== 'undefined') ? DIALOGS_F2 : ((typeof globalThis !== 'undefined' && globalThis.DIALOGS_F2) || null);
function buscarDialogo(id) {
  if (DIALOGS && DIALOGS[id]) return DIALOGS[id];
  if (DIALOGS2 && DIALOGS2[id]) return DIALOGS2[id];
  return null;
}

// ---- estado ----
var AC = null, seed = 7, st = 'title', P = null, E = [], S = [], RT = [], items = [], B = null;
var M = null, MW = 0, MH = 0, CX = 0, CY = 0, runes = [], mt = '', tt = 0, fr = 0;
var inBoss = false, swing = 0, gcd = 0, menuIdx = 0, menuOpen = false;
var mapaId = '', mapaTileset = 'floresta', solides = {}, obstaculos = [];
var npcs = [], objetos = [], saidas = [], raizesDeco = [];
var pedraAzul = null, bush = null, saidaArmada = false;
var cenaT = 0, cenaDepois = null;
var titleNome = false, nomeJogador = 'Kael', nomeChars = [], nomeCursor = 0;
var K = { u: 0, d: 0, l: 0, r: 0 };
var LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function espelharGlobals() {
  try { globalThis.M = M; globalThis.MW = MW; globalThis.MH = MH; globalThis.P = P; globalThis.inBoss = inBoss; globalThis.B = B; } catch (e) {}
  try { window.M = M; window.MW = MW; window.MH = MH; window.P = P; window.inBoss = inBoss; window.B = B; } catch (e) {}
}
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function gestoAudio() {
  if (Aud && typeof Aud.desbloquearAudio === 'function') { try { Aud.desbloquearAudio(); } catch (e) {} }
  if (Mus && typeof Mus.aoGestoDoUsuario === 'function') { try { Mus.aoGestoDoUsuario(); } catch (e) {} }
}
function playSnd(f, d, t) {
  if (Aud && typeof Aud.snd === 'function') { try { Aud.snd(f, d, t); return; } catch (e) {} }
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = t || 'square'; o.frequency.value = f; g.gain.value = 0.05;
    o.connect(g); g.connect(AC.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + (d || 0.08));
    o.stop(AC.currentTime + (d || 0.08));
  } catch (e) {}
}
function showMsg(t) {
  if (UI && typeof UI.mostrarToast === 'function') { try { UI.mostrarToast(t); } catch (e) {} }
  mt = t; tt = 150;
}
// ---- diálogo (v2 com fallback local) ----
var fbQ = [], fbQL = 0, fbTC = 0, fbDone = null, fbPrev = 'play';
function say(linhas, cb) {
  if (Dlg && typeof Dlg.startDialogue === 'function') {
    try {
      var norm = linhas.map(function (l) {
        if (Array.isArray(l)) return { name: l[0], text: l[1] };
        return l;
      });
      Dlg.startDialogue(norm, cb || null);
      st = 'talk';
      return;
    } catch (e) {}
  }
  fbQ = linhas; fbQL = 0; fbTC = 0; fbDone = cb || null; fbPrev = st; st = 'talk';
}
function advanceTalk() {
  if (Dlg && typeof Dlg.isDialogueActive === 'function') {
    try {
      if (Dlg.isDialogueActive()) {
        if (typeof Dlg.estaEmEscolha === 'function' && Dlg.estaEmEscolha()) { Dlg.confirmarEscolha(); return; }
        Dlg.advanceDialogue();
        // B6: o callback de conclusão pode trocar st (ex.: 'end'); só voltar
        // para 'play' se ainda estivermos em 'talk'.
        try { if (!Dlg.isDialogueActive() && st === 'talk') st = 'play'; } catch (e) {}
        return;
      }
    } catch (e) {}
  }
  if (fbTC / 2 < (fbQ[fbQL] ? fbQ[fbQL][1].length : 0)) { fbTC = 999; return; }
  fbQL++; fbTC = 0;
  if (fbQL >= fbQ.length) { st = fbPrev; var f = fbDone; fbDone = null; if (f) f(); }
}
function aplicarFlagsDialogo(flagsSet) {
  if (!flagsSet) return;
  for (var k in flagsSet) {
    if (!Object.prototype.hasOwnProperty.call(flagsSet, k)) continue;
    try {
      if (G && typeof G.setFlag === 'function') {
        if (!G.setFlag(k, flagsSet[k] ? true : false)) { if (!G.flags) G.resetFlags(); G.flags[k] = flagsSet[k] ? 1 : 0; }
      }
    } catch (e) {}
  }
  syncObj();
}
function playDialogId(id, cb) {
  var d = buscarDialogo(id);
  if (d) {
    say(d.speakers, function () {
      aplicarFlagsDialogo(d.flagsSet);
      if (d.choices && d.choices.length >= 2 && Dlg && typeof Dlg.choice === 'function') {
        var ops = d.choices.map(function (c, i) { return { label: c.text, value: i }; });
        try {
          if (Dlg.choice(ops, function (v) {
            var esc = d.choices[v];
            if (esc) {
              aplicarFlagsDialogo(esc.flagsSet);
              if (esc.reply && esc.reply.length) say(esc.reply, cb || null);
              else if (cb) cb();
            } else if (cb) cb();
          }, (G && G.flags) ? G.flags : {})) return true;
        } catch (e) {}
      }
      if (cb) cb();
    });
    return true;
  }
  return false;
}
function flagsConcluidas(flagsSet) {
  if (!flagsSet) return true;
  for (var k in flagsSet) {
    if (!Object.prototype.hasOwnProperty.call(flagsSet, k)) continue;
    try { if (!(G && G.flags && G.flags[k])) return false; } catch (e) { return false; }
  }
  return true;
}
function lerFlag(n) { try { if (G && G.flags) return !!G.flags[n]; } catch (e) {} return false; }
function gravarFlag(n, v) {
  try {
    if (G && typeof G.setFlag === 'function') { if (G.setFlag(n, v ? true : false)) return; }
    if (G) { if (!G.flags) G.resetFlags(); G.flags[n] = v ? 1 : 0; }
  } catch (e) {}
}
// ---- nome do jogador ----
function lerNomeSalvo() {
  try {
    if (typeof localStorage === 'undefined') return 'Kael';
    var n = localStorage.getItem('cristal_amanhecer_nome');
    if (typeof n === 'string' && /^[A-Za-z]{1,8}$/.test(n)) return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  } catch (e) {}
  return 'Kael';
}
function salvarNome() {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem('cristal_amanhecer_nome', nomeJogador); } catch (e) {}
}
nomeJogador = lerNomeSalvo();
function nomeNoTexto(t) { return String(t || '').split('Kael').join(nomeJogador); }
function nomeDoFalante(n) { return n === 'Kael' ? nomeJogador : n; }
function syncObj() { /* objetivo é derivado na hora (textoObjetivo); sem estado numérico */ }
function ehToque() {
  try {
    if (('ontouchstart' in window) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) return true;
  } catch (e) {}
  return false;
}
// ---- colisão ----
function solidoEm(c) {
  if (Object.prototype.hasOwnProperty.call(solides, c)) return solides[c] ? 1 : 0;
  if (typeof isSolidTile === 'function') { try { return isSolidTile(c) ? 1 : 0; } catch (e) {} }
  return (c === '#' || c === 'G') ? 1 : 0;
}
function solidAt(px, py) {
  var i = Math.floor(px / T), j = Math.floor(py / T);
  if (i < 0 || j < 0 || i >= MW || j >= MH) return 1;
  return solidoEm(M[j][i]);
}
function blk(e, nx, ny) {
  var s = e.s;
  var cantos = [[0, 0], [s, 0], [0, s], [s, s]];
  for (var k = 0; k < 4; k++) if (solidAt(nx + cantos[k][0], ny + cantos[k][1])) return 1;
  for (var o = 0; o < obstaculos.length; o++) {
    var ob = obstaculos[o];
    if (nx < ob.x + ob.w && nx + s > ob.x && ny < ob.y + ob.h && ny + s > ob.y) return 1;
  }
  return 0;
}
function mv(e, dx, dy) { if (!blk(e, e.x + dx, e.y)) e.x += dx; if (!blk(e, e.x, e.y + dy)) e.y += dy; }
function ov(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
// ---- mapas ----
function defMapa(id) {
  try {
    if (id === 'brisamar' && typeof MAP_BRISAMAR !== 'undefined') return MAP_BRISAMAR;
    if (id === 'forest' && typeof MAP_FOREST !== 'undefined') return MAP_FOREST;
    if (id === 'ruin_entry' && typeof MAP_RUIN_ENTRY !== 'undefined') return MAP_RUIN_ENTRY;
    if (id === 'valdora' && typeof MAP_VALDORA !== 'undefined') return MAP_VALDORA;
    if (id === 'esgoto' && typeof MAP_ESGOTO !== 'undefined') return MAP_ESGOTO;
    if (typeof globalThis !== 'undefined') {
      if (id === 'brisamar' && globalThis.MAP_BRISAMAR) return globalThis.MAP_BRISAMAR;
      if (id === 'forest' && globalThis.MAP_FOREST) return globalThis.MAP_FOREST;
      if (id === 'ruin_entry' && globalThis.MAP_RUIN_ENTRY) return globalThis.MAP_RUIN_ENTRY;
      if (id === 'valdora' && globalThis.MAP_VALDORA) return globalThis.MAP_VALDORA;
      if (id === 'esgoto' && globalThis.MAP_ESGOTO) return globalThis.MAP_ESGOTO;
    }
  } catch (e) {}
  return null;
}
function statsInimigo(kind, def) {
  if (def && def.enemyDefs && def.enemyDefs[kind]) return def.enemyDefs[kind];
  if (kind === 'slime') return { hp: 2, pursueRadius: 70, contactDamage: 1, heartDrop: 0.3 };
  return { hp: 2, pursueRadius: 90, contactDamage: 1, heartDrop: 0.3, telegraph: 36, rest: 50, ai: 'swoop' };
}
function criarJogador() {
  return { x: 3 * T, y: 16 * T, s: 10, d: 1, hp: 8, hpMax: 8, inv: 0, at: 0, dash: 0, cd: 0, kx: 0, ky: 0 };
}
function danoEspada() { try { if (G && G.flags && G.flags.espada_guarda) return 3; } catch (e) {} return 2; }
function marcarMapaAtual(id) {
  try { if (Wd) Wd.currentId = id; } catch (e) {}
}
function montarArena(qual) {
  inBoss = true; MW = 15; MH = 10; M = [];
  for (var j = 0; j < MH; j++) { M[j] = []; for (var i = 0; i < MW; i++) M[j][i] = (i < 1 || j < 1 || i > MW - 2 || j > MH - 2) ? '#' : '.'; }
  mapaTileset = qual === 'arena2' ? 'arena2' : 'arena'; solides = { '#': true, '.': false };
  obstaculos = []; npcs = []; objetos = []; saidas = []; raizesDeco = []; runes = [];
  pedraAzul = null; bush = null;
  E = []; items = []; S = []; RT = [];
  P.x = 7 * T; P.y = 8 * T; P.hp = P.hpMax || 8; P.inv = 60; P.kx = 0; P.ky = 0;
  if (qual === 'arena2') {
    // D-20: Cavaleiro Corrompido — investidas rápidas, rajada em cruz na fase 2.
    B = { kind: 'cavaleiro', nome: 'Cavaleiro Corrompido', x: 106, y: 28, s: 28, hp: 28, hpMax: 28, m: 'walk', t: 70, fl: 0, dc: 0, end: 0, sw: -1, vx: 0, vy: 0 };
  } else {
    B = { kind: 'guardiao', nome: 'Guardião das Raízes', x: 106, y: 28, s: 28, hp: 24, hpMax: 24, m: 'walk', t: 90, fl: 0, dc: 0, end: 0, sw: -1 };
  }
  if (Mus && typeof Mus.tocarTema === 'function') { try { Mus.tocarTema('boss_theme'); } catch (e) {} }
  espelharGlobals();
}
function carregarMapa(id, spawnNome, opts) {
  var op = opts || {};
  var posicionar = op.posicionar !== false, ganchos = op.ganchos !== false;
  mapaId = id;
  if (id === 'arena' || id === 'arena2') {
    if (!P) P = criarJogador();
    montarArena(id);
    saidaArmada = false;
    marcarMapaAtual(id);
    if (ganchos) { try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange(id); } catch (e) {} }
    espelharGlobals();
    return true;
  }
  var def = defMapa(id);
  if (!def) return false;
  inBoss = false;
  MW = def.w; MH = def.h;
  M = def.tiles.slice();
  mapaTileset = id;
  solides = {};
  if (def.legend) for (var c in def.legend) {
    if (Object.prototype.hasOwnProperty.call(def.legend, c)) solides[c] = !!def.legend[c].solid;
  }
  obstaculos = []; npcs = []; objetos = []; saidas = []; raizesDeco = []; runes = [];
  pedraAzul = null; bush = null;
  E = []; items = []; S = []; RT = []; B = null;
  if (!P) P = criarJogador();
  // NPCs (darius F1 sai após a despedida; darius/estranho F2 seguem a proposta)
  if (def.npcs) for (var ni = 0; ni < def.npcs.length; ni++) {
    var nd = def.npcs[ni];
    if (nd.id === 'darius' && id === 'brisamar' && lerFlag('darius_left')) continue;
    if (nd.id === 'darius' && id === 'valdora' && lerFlag('proposta_vista')) continue;
    if (nd.id === 'estranho' && !(lerFlag('boss2_defeated') && !lerFlag('proposta_vista'))) continue;
    var npc = { id: nd.id, nome: nd.name, x: nd.tx * T + 3, y: nd.ty * T + 6, w: 10, h: 10, first: nd.dialogs.first, repeat: nd.dialogs.repeat || null, reqFlag: nd.reqFlag || null, reqDialog: nd.reqDialog || null };
    npcs.push(npc);
    obstaculos.push({ x: npc.x, y: npc.y, w: 10, h: 10 });
  }
  // objetos
  if (def.objects) for (var oi = 0; oi < def.objects.length; oi++) {
    var od = def.objects[oi];
    if (od.type === 'deco' && od.kind === 'darkroot') { raizesDeco.push({ tx: od.tx, ty: od.ty, phase: od.phase || 0 }); continue; }
    if (od.type === 'deco') continue;
    if (od.type === 'landmark' && od.kind === 'pedra_azul') { pedraAzul = { x: od.tx * T, y: od.ty * T, dialog: od.dialog }; continue; }
    if (od.type === 'gato') {
      if (lerFlag('gato_achado')) continue; // Miau já voltou para a dona
      var gt = { tipo: 'gato', x: od.tx * T + 4, y: od.ty * T + 6, w: 8, h: 8, dialog: od.dialog || null, nome: od.name || 'Miau', reqFlag: od.reqFlag || null, reqDialog: od.reqDialog || null };
      objetos.push(gt);
      obstaculos.push({ x: gt.x, y: gt.y, w: 8, h: 8 });
      continue;
    }
    if (od.type === 'pickup' && od.kind === 'key') {
      if (lerFlag('bush_key_found')) continue;
      bush = { x: od.tx * T, y: od.ty * T, dialog: od.dialog };
      obstaculos.push({ x: bush.x, y: bush.y, w: T, h: T });
      continue;
    }
    var ob2 = { tipo: od.type, x: od.tx * T, y: od.ty * T, w: T, h: T, dialog: od.dialog || null, nome: od.name || od.kind || od.type, reqFlag: od.reqFlag || null, reqDialog: od.reqDialog || null };
    if (od.type === 'sign' || od.type === 'dummy' || od.type === 'bau' || od.type === 'passagem') obstaculos.push({ x: ob2.x, y: ob2.y, w: T, h: T });
    objetos.push(ob2);
  }
  if (def.sign) {
    // placa da floresta (compat com o MVP: obstáculo + leitura por A)
    var sg = { tipo: 'sign', x: def.sign.tx * T, y: def.sign.ty * T, w: T, h: T, dialog: def.sign.dialog, nome: 'Inscrição' };
    objetos.push(sg);
    obstaculos.push({ x: sg.x, y: sg.y, w: T, h: T });
  }
  // runas (floresta)
  if (def.runes) {
    var cores = {};
    for (var ri = 0; ri < def.runes.length; ri++) {
      var rd = def.runes[ri];
      runes.push({ x: rd.tx * T, y: rd.ty * T, c: rd.color, i: rd.order, on: 0 });
      obstaculos.push({ x: rd.tx * T, y: rd.ty * T, w: T, h: T });
    }
    var passo = 0;
    try { if (G && G.flags) passo = G.flags.step | 0; } catch (e) {}
    for (var rj = 0; rj < runes.length; rj++) runes[rj].on = (runes[rj].i < passo) ? 1 : 0;
  }
  // saídas
  if (def.exits) for (var ei = 0; ei < def.exits.length; ei++) {
    var ed = def.exits[ei];
    saidas.push({ tx: ed.tx, ty: ed.ty, w: ed.w || 1, h: ed.h || 1, to: ed.to, spawn: ed.spawn, req: ed.req || null, reqMsg: ed.reqMsg || null, leaveDialog: ed.leaveDialog || null, enterDialog: ed.enterDialog || null });
  }
  // inimigos
  if (def.enemies) for (var ki = 0; ki < def.enemies.length; ki++) {
    var kd = def.enemies[ki];
    var stt = statsInimigo(kd.kind, def);
    E.push({ kind: kd.kind || 'slime', x: kd.tx * T + 3, y: kd.ty * T + 3, s: 10, hp: stt.hp, t: 0, vx: 0, vy: 0, kx: 0, ky: 0, fl: 0, tl: 0, sd: 0, cd: 0, sw: -1 });
  }
  // spawn
  if (posicionar && def.spawns) {
    var sp = def.spawns[spawnNome] || def.spawns.home || def.spawns.fromBrisamar || def.spawns.entry;
    if (sp) { P.x = sp.tx * T; P.y = sp.ty * T; }
  }
  saidaArmada = false;
  try { if (UI && typeof UI.limparToasts === 'function') UI.limparToasts(); } catch (e) {}
  mt = ''; tt = 0;
  if (Mus && typeof Mus.tocarTema === 'function' && ganchos) {
    try { Mus.tocarTema(def.music || (id === 'forest' ? 'forest_theme' : id === 'ruin_entry' ? 'ruin_theme' : 'brisamar_theme')); } catch (e) {}
  }
  marcarMapaAtual(id);
  if (ganchos) {
    try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange(id); } catch (e) {}
    try {
      if (typeof def.onEnter === 'function') def.onEnter({
        flags: (G && G.flags) ? G.flags : {},
        playDialog: function (d, cb) { playDialogId(d, cb); },
        voltarPraca: function () { transicaoPara('valdora', 'praca'); }
      });
    } catch (e) {}
    if (id === 'forest' && spawnNome === 'fromBrisamar' && !lerFlag('intro_floresta')) {
      gravarFlag('intro_floresta', true);
      say([
        ['Narrador', nomeNoTexto('Uma estrela caiu atrás da floresta. O pingente de Kael brilha, e algo chama seu nome.')],
        ['Narrador', 'Criaturas normalmente mansas rosnam entre as árvores. Raízes negras cobrem os troncos.']
      ]);
    }
    if (id === 'ruin_entry' && !lerFlag('entered_ruin')) playDialogId('ruin_enter');
  }
  espelharGlobals();
  return true;
}
// ---- transições com fade ----
function transicaoPara(id, spawnNome, enterDialog) {
  var trocar = function () {
    carregarMapa(id, spawnNome, { posicionar: true, ganchos: true });
    if (enterDialog) playDialogId(enterDialog);
    espelharGlobals();
  };
  if (UI && typeof UI.iniciarTransicao === 'function') { try { UI.iniciarTransicao(trocar, 12); return; } catch (e) {} }
  trocar();
}
function emTransicao() {
  try { if (UI && typeof UI.transicaoAtiva === 'function' && UI.transicaoAtiva()) return true; } catch (e) {}
  return false;
}
// ---- cena da estrela (st='cena') ----
function iniciarCenaEstrela(cbDepois) {
  st = 'cena'; cenaT = 0; cenaDepois = cbDepois || null;
  playSnd(80, 0.6, 'sawtooth');
}
// ---- fluxo ----
function begin() {
  try { if (G && typeof G.resetFlags === 'function') G.resetFlags(); } catch (e) {}
  try { if (Sv && typeof Sv.connectSaveToWorld === 'function') Sv.connectSaveToWorld(); } catch (e) {}
  items = []; S = []; RT = []; swing = 0; B = null; menuOpen = false;
  P = criarJogador();
  st = 'play'; // antes de carregar: o onEnter (wake_up) pode trocar para 'talk'
  carregarMapa('brisamar', 'home', { posicionar: true, ganchos: true });
  espelharGlobals();
}
function continuarSalvo() {
  try {
    if (!Sv || typeof Sv.describeSave !== 'function' || typeof Sv.loadGame !== 'function') return false;
    var desc = Sv.describeSave();
    if (!desc || typeof desc.mapa !== 'string') return false;
    try { if (Sv.connectSaveToWorld) Sv.connectSaveToWorld(); } catch (e) {}
    P = criarJogador(); items = []; S = []; RT = []; B = null; swing = 0; menuOpen = false;
    espelharGlobals();
    if (!Sv.loadGame()) return false;
    var id = 'forest';
    try {
      var conhecidos = ['arena', 'arena2', 'brisamar', 'ruin_entry', 'forest', 'valdora', 'esgoto'];
      if (typeof World !== 'undefined' && World && World.maps && World.maps[desc.mapa]) id = desc.mapa;
      else if (conhecidos.indexOf(desc.mapa) !== -1) id = desc.mapa;
    } catch (e) {}
    if (id === 'arena' || id === 'arena2') {
      carregarMapa(id, 'entrada', { posicionar: false, ganchos: false });
      try {
        var pos = (Sv.collectSaveData) ? null : null;
        void pos;
      } catch (e) {}
    } else {
      carregarMapa(id, null, { posicionar: false, ganchos: false });
    }
    // re-sincroniza runas/arbusto a partir das flags carregadas
    try {
      var passo = (G && G.flags) ? (G.flags.step | 0) : 0;
      for (var ri = 0; ri < runes.length; ri++) runes[ri].on = (runes[ri].i < passo) ? 1 : 0;
      if (mapaId === 'forest' && (passo >= 3 || lerFlag('runes_done')) && !lerFlag('has_key_c1')) {
        items.push({ x: 23 * T + 3, y: 12 * T + 3, t: 'k' });
      }
    } catch (e) {}
    marcarMapaAtual(inBoss ? mapaId : mapaId);
    try { if (Mus && typeof Mus.tocarTema === 'function') Mus.tocarTema(id === 'arena' || id === 'arena2' ? 'boss_theme' : id === 'ruin_entry' ? 'ruin_theme' : id === 'brisamar' ? 'brisamar_theme' : id === 'valdora' ? 'valdora_theme' : 'forest_theme'); } catch (e) {}
    espelharGlobals();
    st = 'play';
    return true;
  } catch (e) { return false; }
}
function retry() {
  P.hp = P.hpMax || 8; P.inv = 60; P.kx = 0; P.ky = 0; menuOpen = false;
  if (UI && typeof UI.continuarJogo === 'function') { try { UI.continuarJogo(); } catch (e) {} }
  if (inBoss || mapaId === 'arena' || mapaId === 'arena2') { carregarMapa(mapaId, 'entrada', { posicionar: true, ganchos: false }); }
  else {
    var sp = mapaId === 'brisamar' ? 'home' : mapaId === 'ruin_entry' ? 'entry' : mapaId === 'valdora' ? 'entrada_sul' : mapaId === 'esgoto' ? 'entrada' : 'fromBrisamar';
    carregarMapa(mapaId || 'forest', sp, { posicionar: true, ganchos: false });
  }
  st = 'play';
}
// ---- interações (A) ----
function npcMaisProximo() {
  var melhor = null, melhorD = 24;
  for (var i = 0; i < npcs.length; i++) {
    var n = npcs[i];
    var d = Math.hypot(P.x + 5 - (n.x + 5), P.y + 5 - (n.y + 5));
    if (d < melhorD) { melhorD = d; melhor = n; }
  }
  return melhor ? { alvo: melhor, dist: melhorD } : null;
}
function dialogParaNpc(n) {
  if (n.reqFlag && !lerFlag(n.reqFlag) && n.reqDialog) return n.reqDialog;
  // D-20: menina tem 3 estados (início → meio → fim → agradecimento).
  if (n.id === 'menina') {
    if (lerFlag('cat_found')) return 'menina_obrigada';
    if (lerFlag('gato_achado')) return 'menina_fim';
    var prim0 = buscarDialogo(n.first);
    if (prim0 && flagsConcluidas(prim0.flagsSet)) return 'menina_meio';
    return n.first;
  }
  var prim = buscarDialogo(n.first);
  if (prim && flagsConcluidas(prim.flagsSet) && n.repeat && buscarDialogo(n.repeat)) return n.repeat;
  return n.first;
}
function objetoMaisProximo() {
  var melhor = null, melhorD = 24;
  var todos = objetos.slice();
  if (pedraAzul && !lerFlag('met_lumi')) todos.push({ tipo: 'pedra', x: pedraAzul.x, y: pedraAzul.y, w: T, h: T, dialog: pedraAzul.dialog });
  if (bush) todos.push({ tipo: 'bush', x: bush.x, y: bush.y, w: T, h: T, dialog: bush.dialog });
  for (var i = 0; i < todos.length; i++) {
    var o = todos[i];
    var d = Math.hypot(P.x + 5 - (o.x + 8), P.y + 5 - (o.y + 8));
    if (d < melhorD) { melhorD = d; melhor = o; }
  }
  return melhor ? { alvo: melhor, dist: melhorD } : null;
}
function usarObjeto(o) {
  if (!o) return false;
  if (o.tipo === 'sign') { playDialogId(o.dialog); return true; }
  if (o.tipo === 'pedra') { playDialogId(o.dialog); return true; }
  if (o.tipo === 'dummy') {
    if (!lerFlag('got_sword')) { showMsg('Um boneco de treino. Melhor falar com Orin primeiro.'); return true; }
    playDialogId(o.dialog || 'orin_tutorial'); return true;
  }
  if (o.tipo === 'stall') { showMsg('Cheiro de pão doce e tinta fresca. É dia de festa!'); return true; }
  if (o.tipo === 'gato') {
    if (o.reqFlag && !lerFlag(o.reqFlag)) { playDialogId(o.reqDialog || 'gato_hint'); return true; }
    playDialogId(o.dialog || 'gato_achado_dlg');
    return true;
  }
  if (o.tipo === 'grade') { showMsg('Uma grade de ferro sobre o esgoto. Há um brilho lá embaixo...'); return true; }
  if (o.tipo === 'bau') {
    if (lerFlag('bau_esgoto')) { showMsg('O baú está vazio.'); return true; }
    playDialogId(o.dialog || 'bau');
    return true;
  }
  if (o.tipo === 'passagem') {
    if (!lerFlag('frag_green')) { showMsg('Parede sólida... mas Lumi sente algo estranho.'); return true; }
    if (lerFlag('esconderijo')) { showMsg('O esconderijo está vazio.'); return true; }
    gravarFlag('esconderijo', true);
    items.push({ x: o.x + 1, y: o.y + 3, t: 'h' });
    items.push({ x: o.x + 8, y: o.y + 3, t: 'h' });
    showMsg('Passagem secreta! Corações à vista.');
    playSnd(1000, 0.3, 'triangle');
    return true;
  }
  return false;
}
function temEspada() { return lerFlag('got_sword'); }
function attack() {
  if (P.at > 0 || !P) return;
  // A interage com o alvo mais próximo (NPC ou objeto) — B5: NPC não
  // sombreia mais um objeto vizinho (ex.: Orin x boneco de treino).
  var candN = npcMaisProximo(), candO = objetoMaisProximo();
  var usaNpc = candN && (!candO || candN.dist <= candO.dist);
  if (usaNpc) { playDialogId(dialogParaNpc(candN.alvo)); return; }
  if (candO && candO.alvo.tipo !== 'bush' && usarObjeto(candO.alvo)) return;
  if (!temEspada()) {
    if (gcd <= 0) { showMsg('Sem espada... O Mestre Orin pode ajudar.'); gcd = 90; }
    return;
  }
  P.at = 14; swing++; playSnd(300, 0.06);
}
function dash() {
  if (!P || P.dash > 0 || P.at > 0) return;
  P.dash = 9; P.inv = Math.max(P.inv, 12); playSnd(500, 0.05, 'triangle');
}
function shoot() {
  if (!P || P.cd > 0) return;
  if (!lerFlag('met_lumi')) {
    if (gcd <= 0) { showMsg('Seu pingente pulsa, mas nada acontece... ainda.'); gcd = 120; }
    return;
  }
  P.cd = 30;
  S.push({ x: P.x + 5, y: P.y + 5, vx: DX[P.d] * 2.6, vy: DY[P.d] * 2.6, l: 70 });
  playSnd(900, 0.07);
}
function passoAtual() { try { if (G && G.flags) return G.flags.step | 0; } catch (e) {} var n = 0; for (var i = 0; i < runes.length; i++) if (runes[i].on) n++; return n; }
function temChave() { try { if (G && G.flags) return G.flags.has_key_c1 === true; } catch (e) {} return false; }
function marcarPasso(n) {
  try {
    if (G && typeof G.setFlag === 'function' && n >= 0 && n <= 3) {
      G.setFlag('step', n);
      if (n >= 3) G.setFlag('runes_done', true);
      return;
    }
  } catch (e) {}
}
function marcarChave() {
  gravarFlag('has_key_c1', true);
  try { if (Sv && typeof Sv.saveOnKeyItem === 'function') Sv.saveOnKeyItem('chave-c1'); } catch (e) {}
}
function moverSelecaoDialogo(dir) {
  try {
    if (Dlg && typeof Dlg.estaEmEscolha === 'function' && Dlg.estaEmEscolha() && typeof Dlg.moverSelecaoEscolha === 'function') {
      Dlg.moverSelecaoEscolha(dir); return true;
    }
  } catch (e) {}
  return false;
}
function alternarNomeLetra(dir) {
  var c = LETRAS.indexOf(nomeChars[nomeCursor] || 'A');
  c = (c + dir + 26) % 26;
  nomeChars[nomeCursor] = LETRAS.charAt(c);
}
function act(a) {
  gestoAudio();
  if (st === 'title') {
    if (titleNome) {
      if (a === 'a') {
        nomeJogador = nomeChars.join('').replace(/ +$/, '') || 'Kael';
        nomeJogador = nomeJogador.charAt(0).toUpperCase() + nomeJogador.slice(1).toLowerCase();
        salvarNome(); titleNome = false; playSnd(1000, 0.15, 'triangle');
      }
      return;
    }
    if (a === 'b') {
      titleNome = true;
      nomeChars = (nomeJogador.toUpperCase() + '        ').slice(0, 8).split('');
      nomeCursor = 0; playSnd(600, 0.08);
      return;
    }
    if (a === 'c') {
      if (continuarSalvo()) { showMsg('Progresso restaurado.'); return; }
    }
    if (a === 'a') { begin(); return; }
    return;
  }
  if (menuOpen) {
    if (a === 'a') {
      if (menuIdx === 0) { menuOpen = false; if (UI) { try { UI.continuarJogo(); } catch (e) {} } }
      else if (menuIdx === 1) { if (Aud) { try { Aud.alternarMudo(); } catch (e) {} } }
      else { retry(); menuOpen = false; if (UI) { try { UI.continuarJogo(); } catch (e) {} } }
    }
    return;
  }
  if (st === 'cena') { cenaT = 160; return; }
  if (st === 'end') {
    // D-23: fim virou menu de 2 opções (padrão: Valdora) — toque/clique confirma
    // a seleção em vez de sempre reiniciar; C continua atalho direto.
    if (a === 'c') { irParaValdora(); return; }
    if (endIdx === 1) irParaValdora();
    else begin();
    return;
  }
  if (st === 'talk') {
    advanceTalk();
    if (Aud && typeof Aud.tocarEfeito === 'function') { try { Aud.tocarEfeito('avancoDialogo'); } catch (e) {} }
    return;
  }
  if (st === 'over') { retry(); return; }
  if (st !== 'play' || !P) return;
  if (a === 'a') attack();
  if (a === 'b') dash();
  if (a === 'c') shoot();
}
function hurtP(sx, sy) {
  if (!P || P.inv > 0 || P.dash > 0 || st !== 'play') return;
  P.hp--; P.inv = 60;
  var dx = P.x - sx, dy = P.y - sy, d = Math.hypot(dx, dy) || 1;
  P.kx = dx / d * 3; P.ky = dy / d * 3;
  playSnd(110, 0.2, 'sawtooth');
  if (P.hp <= 0) st = 'over';
}
function hurtE(e, n) {
  e.hp -= n; e.fl = 8;
  var dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
  e.kx = dx / d * 3; e.ky = dy / d * 3;
  playSnd(220, 0.08);
  if (e.hp <= 0 && Math.random() < 0.3) items.push({ x: e.x, y: e.y, t: 'h' });
}
function hitRuna(r) {
  if (r.on) return;
  if (r.i === passoAtual()) {
    marcarPasso(passoAtual() + 1); r.on = 1; playSnd(700 + passoAtual() * 150, 0.2, 'triangle'); showMsg('Runa ativada!');
    if (passoAtual() === 3) {
      items.push({ x: 23 * T + 3, y: 12 * T + 3, t: 'k' });
      showMsg('Uma chave surgiu no chão!');
    }
  } else {
    marcarPasso(0);
    runes.forEach(function (o) { o.on = 0; });
    playSnd(110, 0.3, 'sawtooth'); showMsg('As runas se apagaram...');
  }
}
function hitChefe(n) { if (!B || B.fl > 0 || B.hp <= 0) return; B.hp -= n; B.fl = 10; playSnd(200, 0.1); }
function textoObjetivo() {
  if (mapaId === 'arena2' || (inBoss && B && B.kind === 'cavaleiro')) return 'Derrote o Cavaleiro Corrompido';
  if (inBoss || mapaId === 'arena') return MVP_OBJ[4];
  if (mapaId === 'brisamar') {
    if (!lerFlag('darius_left')) return 'Vá ao festival e fale com o pessoal';
    if (!lerFlag('got_sword')) return 'Visite o Mestre Orin na lagoa';
    return 'Siga para a floresta, a leste';
  }
  if (mapaId === 'ruin_entry') return 'Desça pelo corredor ao norte';
  if (mapaId === 'valdora') {
    if (!lerFlag('darius_prov')) return 'Explore Valdora e fale com o pessoal';
    if (!lerFlag('fragmento_pista')) return 'Descubra a pista do fragmento';
    if (!lerFlag('boss2_defeated')) return 'Entre no templo, ao norte';
    if (!lerFlag('proposta_vista')) return 'Volte à praça';
    return 'Aguarde o Capítulo 3';
  }
  if (mapaId === 'esgoto') return 'Explore os esgotos';
  try { if (G && typeof G.indiceObjetivoCap1 === 'function') return MVP_OBJ[G.indiceObjetivoCap1()]; } catch (e) {}
  return MVP_OBJ[0];
}
// D-20: entrada do Cap. 2 pela tela de fim (preserva flags; não reseta).
function irParaValdora() {
  try { if (G && typeof G.setFlag === 'function') G.setFlag('chapter', 2); } catch (e) {}
  items = []; S = []; RT = []; swing = 0; B = null; menuOpen = false;
  P = criarJogador();
  carregarMapa('valdora', 'entrada_sul', { posicionar: true, ganchos: true });
  // B8 (= B2 do F0): o onEnter (chegada) pode ter aberto diálogo ('talk');
  // só voltar para 'play' se estivermos vindo do 'end' sem diálogo ativo.
  try { if (st === 'end' && !(Dlg && Dlg.isDialogueActive && Dlg.isDialogueActive())) st = 'play'; } catch (e) { st = 'play'; }
  espelharGlobals();
}
// ---- linha de diálogo visível (com nome do jogador aplicado) ----
function linhaDialogoVisivel() {
  if (Dlg && typeof Dlg.obterLinhaAtual === 'function') {
    try {
      var linha = Dlg.obterLinhaAtual();
      if (!linha) return null;
      var vis = (typeof Dlg.obterTextoVisivel === 'function') ? Dlg.obterTextoVisivel() : linha.texto;
      var completa = true;
      try { completa = Dlg.linhaAtualCompleta ? Dlg.linhaAtualCompleta() : true; } catch (e) {}
      return [nomeDoFalante(linha.nome || '???'), nomeNoTexto(vis), completa];
    } catch (e) { return null; }
  }
  if (!fbQ.length) return null;
  var l = fbQ[fbQL];
  if (!l) return null;
  return [nomeDoFalante(l[0]), nomeNoTexto(l[1].slice(0, Math.floor(fbTC / 2))), fbTC / 2 >= l[1].length];
}
// ---- update ----
function update() {
  if (P.inv > 0) P.inv--;
  if (P.at > 0) P.at--;
  if (P.dash > 0) P.dash--;
  if (P.cd > 0) P.cd--;
  if (tt > 0) tt--;
  if (gcd > 0) gcd--;
  var dx = K.r - K.l, dy = K.d - K.u;
  if (dx || dy) {
    var n = Math.hypot(dx, dy); dx /= n; dy /= n;
    if (P.dash <= 0) {
      if (Math.abs(dx) > Math.abs(dy)) P.d = dx > 0 ? 3 : 2;
      else P.d = dy > 0 ? 0 : 1;
    }
  }
  if (P.dash > 0) { dx = DX[P.d]; dy = DY[P.d]; }
  var sp = P.dash > 0 ? 2.6 : (P.at > 0 ? 0.5 : 1.1);
  mv(P, dx * sp, dy * sp);
  if (P.kx || P.ky) { mv(P, P.kx, P.ky); P.kx *= 0.8; P.ky *= 0.8; }
  // golpe de espada
  if (P.at >= 4 && P.at <= 10) {
    var hb = { x: P.x + 5 + DX[P.d] * 11 - 7, y: P.y + 5 + DY[P.d] * 11 - 7, w: 14, h: 14 };
    for (var ei = 0; ei < E.length; ei++) {
      var en = E[ei];
      if (en.sw !== swing && ov(hb, { x: en.x, y: en.y, w: 10, h: 10 })) { en.sw = swing; hurtE(en, danoEspada()); }
    }
    for (var ri = 0; ri < runes.length; ri++) {
      var rr = runes[ri];
      if (rr.sw !== swing && ov(hb, { x: rr.x, y: rr.y, w: T, h: T })) { rr.sw = swing; hitRuna(rr); }
    }
    if (B && B.hp > 0 && B.sw !== swing && ov(hb, { x: B.x, y: B.y, w: 28, h: 28 })) { B.sw = swing; hitChefe(danoEspada()); }
    if (bush && ov(hb, { x: bush.x, y: bush.y, w: T, h: T })) {
      gravarFlag('bush_key_found', true);
      items.push({ x: bush.x + 4, y: bush.y + 4, t: 'k' });
      obstaculos = obstaculos.filter(function (o) { return !(o.x === bush.x && o.y === bush.y); });
      bush = null;
      playDialogId('key_bush_found');
      playSnd(420, 0.15, 'triangle');
    }
  }
  // projéteis de Lumi
  for (var si = 0; si < S.length; si++) {
    var s = S[si];
    s.x += s.vx; s.y += s.vy; s.l--;
    if (solidAt(s.x, s.y)) s.l = 0;
    for (var q = 0; q < runes.length; q++) {
      var rq = runes[q];
      if (s.l > 0 && Math.abs(s.x - rq.x - 8) < 8 && Math.abs(s.y - rq.y - 8) < 8) { s.l = 0; hitRuna(rq); }
    }
    for (var q2 = 0; q2 < E.length; q2++) {
      var e2 = E[q2];
      if (s.l > 0 && e2.hp > 0 && Math.hypot(s.x - e2.x - 5, s.y - e2.y - 5) < 9) { s.l = 0; hurtE(e2, 1); }
    }
    if (B && B.hp > 0 && s.l > 0 && s.x > B.x && s.x < B.x + 28 && s.y > B.y && s.y < B.y + 28) { s.l = 0; hitChefe(1); }
  }
  S = S.filter(function (s) { return s.l > 0; });
  // inimigos
  for (var i = 0; i < E.length; i++) {
    var e = E[i];
    if (e.fl > 0) e.fl--;
    var ex = P.x - e.x, ey = P.y - e.y, d = Math.hypot(ex, ey) || 1;
    if (e.kind === 'rootbat') {
      var spd = 0.8;
      if (e.tl > 0) { e.tl--; if (e.tl === 0) { e.vx = ex / d * spd * 2.2; e.vy = ey / d * spd * 2.2; e.sd = 25; } }
      else if (e.sd > 0) { e.sd--; mv(e, e.vx, e.vy); if (e.sd === 0) e.cd = 120; }
      else {
        if (e.cd > 0) e.cd--;
        if (d < 90 && e.cd <= 0) { e.tl = 36; playSnd(1200, 0.15); }
        else if (d < 90) mv(e, ex / d * 0.4, ey / d * 0.4);
        else {
          if (--e.t <= 0) { e.t = 50 + Math.random() * 60; e.vx = (Math.random() - 0.5) * 0.7; e.vy = (Math.random() - 0.5) * 0.7; }
          mv(e, e.vx, e.vy);
        }
      }
    } else {
      var vx, vy;
      if (d < 70) { vx = ex / d * 0.5; vy = ey / d * 0.5; }
      else {
        if (--e.t <= 0) { e.t = 50 + Math.random() * 60; e.vx = (Math.random() - 0.5) * 0.7; e.vy = (Math.random() - 0.5) * 0.7; }
        vx = e.vx; vy = e.vy;
      }
      mv(e, vx, vy);
    }
    if (e.kx || e.ky) { mv(e, e.kx, e.ky); e.kx *= 0.8; e.ky *= 0.8; }
    if (d < 10) hurtP(e.x, e.y);
  }
  E = E.filter(function (e) { return e.hp > 0; });
  // itens
  for (var it = 0; it < items.length; it++) {
    var item = items[it];
    if (!item.g && Math.hypot(P.x - item.x, P.y - item.y) < 11) {
      item.g = 1;
      if (item.t === 'k') { marcarChave(); showMsg('Chave obtida! Vá ao portão.'); playSnd(1000, 0.3, 'triangle'); }
      else { P.hp = Math.min(P.hpMax || 8, P.hp + 2); playSnd(800, 0.1); }
    }
  }
  items = items.filter(function (i) { return !i.g; });
  // pedra azul → encontro com Lumi
  if (pedraAzul && !lerFlag('met_lumi') && Math.hypot(P.x + 5 - (pedraAzul.x + 8), P.y + 5 - (pedraAzul.y + 8)) < 18) {
    playDialogId('lumi_meet');
  }
  // portão da floresta → entrada da ruína (lógica do MVP)
  if (mapaId === 'forest' && !inBoss && Math.hypot(P.x + 5 - 27 * T - 8, P.y + 5 - 3 * T - 8) < 20) {
    if (temChave()) { if (gcd <= 0) { gcd = 200; transicaoPara('ruin_entry', 'entry'); } }
    else if (gcd <= 0) { showMsg('Trancado. Falta uma chave.'); gcd = 120; }
  }
  // saídas retangulares
  var ctx = Math.floor((P.x + 5) / T), cty = Math.floor((P.y + 5) / T);
  var dentroAlguma = false;
  for (var gi = 0; gi < saidas.length; gi++) {
    var gs = saidas[gi];
    if (mapaId === 'forest' && gs.to === 'ruin_entry') continue; // portão tem lógica própria
    var dentro = ctx >= gs.tx && ctx < gs.tx + gs.w && cty >= gs.ty && cty < gs.ty + gs.h;
    if (dentro) dentroAlguma = true;
    if (dentro && saidaArmada && gcd <= 0) {
      if (gs.req && !lerFlag(gs.req)) {
        showMsg(gs.reqMsg || 'Trancado.'); gcd = 150; continue;
      }
      if (mapaId === 'brisamar' && gs.to === 'forest' && !temEspada()) {
        showMsg('Melhor falar com o Mestre Orin antes de sair da vila.'); gcd = 150; continue;
      }
      gcd = 200;
      (function (saida) {
        var ir = function () { transicaoPara(saida.to, saida.spawn, saida.enterDialog); };
        if (saida.leaveDialog && !flagsConcluidas(DIALOGS && DIALOGS[saida.leaveDialog] ? DIALOGS[saida.leaveDialog].flagsSet : null)) {
          playDialogId(saida.leaveDialog, function () {
            iniciarCenaEstrela(function () { transicaoPara(saida.to, saida.spawn, saida.enterDialog); });
          });
        } else ir();
      })(gs);
      break;
    }
  }
  if (!dentroAlguma) saidaArmada = true;
  // portão sul de Valdora: estrada bloqueada (sem mapa novo em F2)
  if (mapaId === 'valdora' && Math.hypot(P.x + 5 - 160, P.y + 5 - 232) < 22 && gcd <= 0) {
    showMsg('A estrada está bloqueada por monstros. Melhor não sair da cidade.'); gcd = 150;
  }
  // chefe
  if (B) {
    if (B.fl > 0) B.fl--;
    if (B.hp <= 0) {
      if (++B.dc > 70 && !B.end) {
        B.end = 1; RT = [];
        if (B.kind === 'cavaleiro') {
          // D-20: Fragmento Verde + coração extra; volta à praça p/ o gancho.
          gravarFlag('boss2_defeated', true);
          gravarFlag('frag_green', true);
          P.hpMax = 10; P.hp = 10;
          try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange('arena2'); } catch (e) {}
          playDialogId('vitoria2', function () { transicaoPara('valdora', 'templo'); });
        } else {
          gravarFlag('boss1_defeated', true);
          try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange('arena'); } catch (e) {}
          if (!playDialogId('boss_defeated', function () { st = 'end'; endIdx = 1; })) {
            say([
              ['Narrador', 'O Guardião das Raízes desmorona. Entre as raízes surge uma inscrição antiga.'],
              ['Inscrição', 'Quando a primeira estrela cair, aquele que carrega a lembrança abrirá o caminho.']
            ], function () { st = 'end'; endIdx = 1; });
          }
        }
      }
    } else if (B.kind === 'cavaleiro') {
      var cx2 = B.x + 14, cy2 = B.y + 14;
      var ddx = P.x + 5 - cx2, ddy = P.y + 5 - cy2, dd = Math.hypot(ddx, ddy) || 1;
      var furioso = B.hp <= 14;
      B.t--;
      if (B.m === 'walk') { B.x += ddx / dd * 0.55; B.y += ddy / dd * 0.55; if (B.t <= 0) { B.m = 'tel'; B.t = 35; playSnd(660, 0.2, 'triangle'); } }
      else if (B.m === 'tel') {
        if (B.t <= 0) {
          B.m = 'golpe'; B.t = 18; B.vx = ddx / dd * 2.2; B.vy = ddy / dd * 2.2; playSnd(80, 0.4, 'sawtooth');
          if (furioso) {
            var angulos = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
            for (var qx = 0; qx < 4; qx++) RT.push({ x: cx2, y: cy2, vx: Math.cos(angulos[qx]) * 1.4, vy: Math.sin(angulos[qx]) * 1.4, l: 140 });
          }
        }
      }
      else if (B.m === 'golpe') { B.x += B.vx; B.y += B.vy; if (dd < 24) hurtP(cx2, cy2); if (B.t <= 0) { B.m = 'rest'; B.t = furioso ? 45 : 55; } }
      else if (B.t <= 0) { B.m = 'walk'; B.t = (furioso ? 55 : 70) + Math.random() * 20; }
      B.x = Math.max(T, Math.min(MW * T - T - 28, B.x));
      B.y = Math.max(T, Math.min(MH * T - T - 28, B.y));
      if (dd < 20 && B.m !== 'golpe') hurtP(cx2, cy2);
    } else {
      var bx = B.x + 14, by = B.y + 14;
      var pdx = P.x + 5 - bx, pdy = P.y + 5 - by, pd = Math.hypot(pdx, pdy) || 1;
      B.t--;
      if (B.m === 'walk') { B.x += pdx / pd * 0.4; B.y += pdy / pd * 0.4; if (B.t <= 0) { B.m = 'tel'; B.t = 40; } }
      else if (B.m === 'tel') {
        if (B.t <= 0) {
          B.m = 'slam'; B.t = 14; playSnd(80, 0.4, 'sawtooth');
          if (B.hp <= 12) for (var a = 0; a < 8; a++) RT.push({ x: bx, y: by, vx: Math.cos(a * Math.PI / 4) * 1.3, vy: Math.sin(a * Math.PI / 4) * 1.3, l: 140 });
        }
      }
      else if (B.m === 'slam') { if (pd < 46) hurtP(bx, by); if (B.t <= 0) { B.m = 'rest'; B.t = 50; } }
      else if (B.t <= 0) { B.m = 'walk'; B.t = (B.hp <= 12 ? 65 : 90) + Math.random() * 30; }
      B.x = Math.max(T, Math.min(MW * T - T - 28, B.x));
      B.y = Math.max(T, Math.min(MH * T - T - 28, B.y));
      if (pd < 22 && B.m !== 'slam') hurtP(bx, by);
    }
  }
  for (var rti = 0; rti < RT.length; rti++) {
    var rt = RT[rti];
    rt.x += rt.vx; rt.y += rt.vy; rt.l--;
    if (solidAt(rt.x, rt.y)) rt.l = 0;
    if (Math.hypot(P.x + 5 - rt.x, P.y + 5 - rt.y) < 8) { rt.l = 0; hurtP(rt.x, rt.y); }
  }
  RT = RT.filter(function (r) { return r.l > 0; });
  CX = Math.max(0, Math.min(MW * T - W, P.x + 5 - W / 2));
  CY = Math.max(0, Math.min(MH * T - H, P.y + 5 - H / 2));
  espelharGlobals();
}
function R(c, a, b, w, h) { x.fillStyle = c; x.fillRect(Math.round(a - CX), Math.round(b - CY), w, h); }
function F(c, a, b, w, h) { x.fillStyle = c; x.fillRect(a, b, w, h); }
function wrap(t, w) {
  var o = [], l = '';
  var parts = String(t).split(' ');
  for (var i = 0; i < parts.length; i++) {
    var s = parts[i];
    if (x.measureText(l + s).width > w) { o.push(l); l = s + ' '; }
    else l += s + ' ';
  }
  o.push(l); return o;
}
function txt(t, a, b, c, al) {
  // Legibilidade profissional: contorno preto em 8 direções (funciona sobre
  // grama clara, areia de Valdora, flash branco e céu). Mesmo tamanho de
  // fonte dos balões — só o contorno ficou mais forte.
  x.textAlign = al || 'left';
  x.fillStyle = '#000';
  x.fillText(t, a - 1, b); x.fillText(t, a + 1, b);
  x.fillText(t, a, b - 1); x.fillText(t, a, b + 1);
  x.fillText(t, a - 1, b - 1); x.fillText(t, a + 1, b - 1);
  x.fillText(t, a - 1, b + 1); x.fillText(t, a + 1, b + 1);
  x.fillStyle = c || '#fff'; x.fillText(t, a, b);
}
// Faixa escura atrás de textos de HUD (objetivo/toast/chefe): garante
// contraste mesmo sobre tiles claros. Retorna a caixa desenhada.
function faixaHud(bx, by, bw, bh) {
  F('rgba(0,0,16,0.72)', bx, by, bw, bh);
  try {
    x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 1;
    x.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  } catch (e) {}
}
var COR_NPC = { 'Mãe': '#4a9c5d', 'Darius': '#c0392b', 'Morador': '#9aa0a6', 'Mestre Orin': '#5d6d7e', 'Menina': '#e88ec9', 'Capitão': '#3a6ea5', 'Refugiado': '#8a7a5a', 'Estranho': '#2a1a3a' };
function desenharNpc(n) {
  if (n.id === 'gato') return; // gato é objeto (desenhado em desenharObjetos)
  var cor = COR_NPC[n.nome] || '#9aa0a6';
  if (n.id === 'estranho') {
    R('#2a1a3a', n.x, n.y - 2, 10, 14);
    R('#e8dcc0', n.x + 3, n.y + 1, 4, 4); R('#1a0a1a', n.x + 1, n.y - 2, 8, 4);
    return;
  }
  R(cor, n.x, n.y + 4, 10, 8);
  R('#f2c9a0', n.x + 1, n.y - 2, 8, 7);
  R('#3a2a1a', n.x + 1, n.y - 2, 8, 3);
  if (n.id === 'orin') { R('#7a4a1a', n.x + 8, n.y - 6, 2, 10); R('#888', n.x + 10, n.y - 6, 6, 1); }
  if (n.id === 'darius') R('#e6c34a', n.x + 2, n.y + 5, 6, 2);
}
function desenharInimigo(e) {
  if (e.kind === 'rootbat') {
    var f = e.fl > 0 || (e.tl > 0 && fr % 6 < 3);
    var asa = (fr + e.x) % 20 < 10 ? -2 : 2;
    R(f ? '#fff' : '#3a2a4a', e.x - 3, e.y + 2 + asa, 5, 3);
    R(f ? '#fff' : '#3a2a4a', e.x + 8, e.y + 2 - asa, 5, 3);
    R(f ? '#fff' : '#5a3a6a', e.x + 1, e.y + 2, 8, 6);
    R('#f66', e.x + 3, e.y + 4, 2, 2); R('#f66', e.x + 6, e.y + 4, 2, 2);
    return;
  }
  var g = e.fl > 0;
  R(g ? '#fff' : '#8a3fb5', e.x - 1, e.y + 2, 12, 9);
  R(g ? '#fff' : '#a65ad0', e.x + 1, e.y, 8, 4);
  R('#fff', e.x + 2, e.y + 4, 2, 2); R('#fff', e.x + 7, e.y + 4, 2, 2);
}
function desenharChefe() {
  var f = B.fl > 0 && fr % 4 < 2, tel = B.m === 'tel' && fr % 6 < 3;
  if (B.kind === 'cavaleiro') {
    if (!(B.hp <= 0 && fr % 4 < 2)) {
      R(f ? '#fff' : tel ? '#e88' : '#7a8aa0', B.x, B.y, 28, 28);
      R(f ? '#fff' : '#4a5a70', B.x + 4, B.y + 2, 20, 10);
      R('#c22', B.x + 12, B.y - 2, 4, 8);
      R('#f33', B.x + 7, B.y + 12, 5, 4); R('#f33', B.x + 16, B.y + 12, 5, 4);
      R('#222', B.x + 4, B.y + 20, 20, 4);
      R('#aac', B.x + 22, B.y + 8, 4, 12);
    }
    if (B.m === 'golpe') { x.strokeStyle = '#fa3'; x.lineWidth = 2; x.beginPath(); x.arc(B.x + 14 - CX, B.y + 14 - CY, 24, 0, 7); x.stroke(); }
    return;
  }
  if (!(B.hp <= 0 && fr % 4 < 2)) {
    R(f ? '#fff' : tel ? '#c66' : '#5a3a1e', B.x, B.y, 28, 28);
    R('#2f7d3a', B.x + 2, B.y + 2, 10, 6); R('#2f7d3a', B.x + 16, B.y + 18, 10, 8);
    R('#f33', B.x + 6, B.y + 9, 5, 5); R('#f33', B.x + 17, B.y + 9, 5, 5);
    R('#222', B.x + 8, B.y + 20, 12, 3);
  }
  if (B.m === 'slam') { x.strokeStyle = '#f55'; x.lineWidth = 2; x.beginPath(); x.arc(B.x + 14 - CX, B.y + 14 - CY, 46, 0, 7); x.stroke(); }
}
function desenharTiles() {
  for (var j = Math.max(0, Math.floor(CY / T)); j < Math.min(MH, Math.ceil((CY + H) / T) + 1); j++) {
    for (var i = Math.max(0, Math.floor(CX / T)); i < Math.min(MW, Math.ceil((CX + W) / T) + 1); i++) {
      var c = M[j][i], a = i * T, b = j * T;
      if (mapaTileset === 'forest') {
        R('#3d8b37', a, b, T, T);
        if (c === '.') {
          if ((i * 7 + j * 13) % 5 === 0) R('#4aa043', a + 4, b + 5, 2, 2);
          if ((i * 31 + j * 17) % 19 === 0) R('#2a1a30', a + 3, b + 4, 6, 4);
        } else if (c === '#') { R('#1c5a2a', a, b, T, 13); R('#2f7d3a', a + 2, b + 1, 12, 8); R('#5a3a1e', a + 6, b + 12, 4, 4); }
        else if (c === 'G') { R('#666', a, b, T, T); R(temChave() ? '#352' : '#222', a + 3, b + 3, 10, 13); R(temChave() ? '#7f7' : '#fc4', a + 10, b + 9, 2, 2); }
      } else if (mapaTileset === 'arena' || mapaTileset === 'arena2') {
        R(mapaTileset === 'arena2' ? '#565664' : '#5a5a6a', a, b, T, T);
        if (c === '.') { if ((i * 7 + j * 13) % 5 === 0) R('#666677', a + 4, b + 5, 2, 2); }
        else if (c === '#') { R('#33334a', a, b, T, T); R('#444460', a + 1, b + 1, 14, 6); }
        if (mapaTileset === 'arena2' && c === '.' && i >= 6 && i <= 8 && j === 1) R('#7a2a2a', a + 2, b + 1, 12, 4);
      } else if (mapaTileset === 'valdora') {
        R('#8a8a96', a, b, T, T);
        if (c === '.' || c === 'F') { if ((i * 5 + j * 11) % 7 === 0) R('#7c7c88', a + 6, b + 6, 3, 2); }
        if (c === 'F') { R('#e88', a + 3, b + 3, 2, 2); R('#ee4', a + 11, b + 9, 2, 2); }
        if (c === 'P') { R('#b8b0a0', a, b, T, T); R('#9a927e', a, b, T, 2); R('#9a927e', a, b + 14, T, 2); }
        if (c === '#') { R('#d8c8a8', a, b, T, 11); R('#b05038', a, b, 16, 5); R('#7a3a28', a, b + 11, T, 5); }
        if (c === 'T') { R('#7a2a1a', a, b, T, 4); R('#2a7a3a', a, b + 4, T, 6); R('#eee', a + 2, b + 6, 12, 2); R('#5a3a1e', a + 2, b + 10, 12, 6); }
        if (c === 'D') { R('#3a3a4a', a, b, T, T); R('#c9a13a', a + 2, b, 2, T); R('#c9a13a', a + 12, b, 2, T); }
        if (c === 'G') { R('#555560', a, b, T, T); R('#888899', a + 3, b + 1, 10, 12); R('#33333c', a + 5, b + 3, 2, 10); R('#33333c', a + 9, b + 3, 2, 10); }
      } else if (mapaTileset === 'esgoto') {
        R('#4a4a55', a, b, T, T);
        if (c === '.') { if ((i * 11 + j * 7) % 6 === 0) R('#3c3c48', a + 5, b + 7, 3, 2); }
        if (c === '#') { R('#2c2c38', a, b, T, T); R('#3c3c4c', a + 1, b + 1, 14, 6); }
        if (c === 'W') { R('#1a3a5a', a, b, T, T); var wv2 = Math.sin(fr / 16 + i * 2 + j) > 0 ? 1 : 0; R('#3a6a9a', a + 2, b + 5 + wv2 * 4, 12, 2); }
        if (c === 'T') { R('#4a4a55', a, b, T, T); var fl3 = (fr + i * 3 + j * 5) % 12 < 6; R('#22222c', a + 7, b + 6, 2, 10); R(fl3 ? '#fa3' : '#c72', a + 5, b + 1, 6, 5); }
      } else if (mapaTileset === 'brisamar') {
        R('#3d8b37', a, b, T, T);
        if (c === '.' || c === 'F') { if ((i * 7 + j * 13) % 5 === 0) R('#4aa043', a + 4, b + 5, 2, 2); }
        if (c === 'F') { R('#e88', a + 3, b + 3, 2, 2); R('#ee4', a + 11, b + 9, 2, 2); }
        if (c === 'P') { R('#c9b17a', a, b, T, T); R('#b39a63', a, b + 12, T, 4); }
        if (c === '#') { R('#8a5a2a', a, b, T, 12); R('#5a3a1e', a, b + 12, T, 4); R('#a0714a', a + 2, b + 2, 12, 4); }
        if (c === 'T') { R('#7a2a1a', a, b, T, 4); R('#c0392b', a, b + 4, T, 6); R('#eee', a + 2, b + 6, 12, 2); R('#5a3a1e', a + 2, b + 10, 12, 6); }
        if (c === 'W') { R('#2f6fbf', a, b, T, T); var wv = Math.sin(fr / 18 + i + j) > 0 ? 1 : 0; R('#5a9cdf', a + 2, b + 4 + wv * 4, 12, 2); }
        if (c === 'D') { R('#8a5a2a', a, b, T, T); R('#6a421f', a, b + 5, T, 2); R('#6a421f', a, b + 11, T, 2); }
      } else {
        // ruin_entry
        R('#5a5a6a', a, b, T, T);
        if (c === '.') { if ((i * 11 + j * 7) % 6 === 0) R('#4c4c5c', a + 5, b + 7, 3, 2); }
        if (c === '#') { R('#33334a', a, b, T, T); R('#444460', a + 1, b + 1, 14, 6); }
        if (c === 'D') { R('#2a2a3a', a, b, T, T); R('#7a6a3a', a + 2, b, 2, T); R('#7a6a3a', a + 12, b, 2, T); }
        if (c === 'T') { R('#5a5a6a', a, b, T, T); var fl2 = (fr + i * 3 + j * 5) % 12 < 6; R('#6a421f', a + 7, b + 8, 2, 8); R(fl2 ? '#fa3' : '#c72', a + 5, b + 3, 6, 5); }
        if (c === 'S') { R('#444460', a, b, T, T); R('#4cf', a + 4, b + 4, 8, 2); R('#4cf', a + 7, b + 2, 2, 12); }
      }
    }
  }
  // raízes negras animadas (overlay, nunca sólidas)
  for (var k = 0; k < raizesDeco.length; k++) {
    var rz = raizesDeco[k];
    var ox = Math.round(Math.sin(fr / 30 + rz.phase) * 1.5);
    R('#2a1a30', rz.tx * T + 3 + ox, rz.ty * T + 4, 10, 4);
    R('#1c1020', rz.tx * T + 1, rz.ty * T + 9 - ox, 8, 3);
  }
}
function desenharObjetos() {
  for (var i = 0; i < objetos.length; i++) {
    var o = objetos[i];
    if (o.tipo === 'sign') { R('#8a5a2a', o.x + 3, o.y + 3, 10, 7); R('#5a3a1e', o.x + 7, o.y + 10, 2, 6); }
    else if (o.tipo === 'dummy') {
      R('#6a5a3a', o.x + 6, o.y + 2, 4, 12);
      R('#c9a06a', o.x + 2, o.y + 1, 12, 5);
      R('#8a2a2a', o.x + 4, o.y + 6, 8, 6);
    }
    else if (o.tipo === 'stall') { R('#c0392b', o.x + 1, o.y + 8, 14, 8); R('#eee', o.x + 1, o.y + 8, 14, 3); }
    else if (o.tipo === 'gato') {
      R('#d08a2a', o.x, o.y + 2, 8, 6);
      R('#d08a2a', o.x + 1, o.y, 2, 3); R('#d08a2a', o.x + 5, o.y, 2, 3);
      R('#7a4a1a', o.x + 8, o.y + 3, 3, 2);
      R('#222', o.x + 2, o.y + 4, 1, 1); R('#222', o.x + 5, o.y + 4, 1, 1);
    }
    else if (o.tipo === 'grade') { R('#33333c', o.x + 1, o.y + 2, 14, 12); R('#888899', o.x + 3, o.y + 2, 2, 12); R('#888899', o.x + 7, o.y + 2, 2, 12); R('#888899', o.x + 11, o.y + 2, 2, 12); }
    else if (o.tipo === 'bau') { R('#6a421f', o.x + 2, o.y + 5, 12, 9); R('#8a5a2a', o.x + 2, o.y + 5, 12, 4); R('#c9a13a', o.x + 7, o.y + 8, 2, 4); }
    else if (o.tipo === 'passagem') {
      R('#2c2c38', o.x, o.y, T, T);
      if (lerFlag('frag_green') && fr % 40 < 25) { R('#7f7', o.x + 3, o.y + 4, 2, 2); R('#7f7', o.x + 10, o.y + 9, 2, 2); }
    }
  }
  if (pedraAzul && !lerFlag('met_lumi')) {
    var pu = Math.sin(fr / 14) > 0 ? 0 : 1;
    R('#224', pedraAzul.x + 2, pedraAzul.y + 4, 12, 10);
    R('#4a8cff', pedraAzul.x + 4, pedraAzul.y + 5 - pu, 8, 7);
    R('#fff', pedraAzul.x + 6, pedraAzul.y + 6 - pu, 2, 2);
  }
  if (bush) {
    R('#1c5a2a', bush.x, bush.y + 3, 16, 13);
    R('#2f7d3a', bush.x + 2, bush.y + 1, 12, 6);
    if (fr % 50 < 25) R('#fc4', bush.x + 7, bush.y + 7, 2, 2);
  }
}
function render() {
  x.font = 'bold 8px monospace'; x.textBaseline = 'alphabetic';
  // D-23: overlay SEMPRE visível (pedido de teste): esconder os botões no fim
  // prendia o jogador no repeat (sem C não há como ir a Valdora) e o D-pad
  // parado impedia navegar escolhas/menus no touch. Sem .ocultar-touch.
  F('#000', 0, 0, W, H);
  if (st === 'title') {
    for (var i = 0; i < 40; i++) F('#fff', (i * 53) % W, (i * 37) % H, 1, 1);
    x.font = 'bold 10px monospace';
    txt('A LENDA DO CRISTAL', W / 2, 40, '#ffd866', 'center');
    txt('DO AMANHECER', W / 2, 54, '#ffd866', 'center');
    x.font = 'bold 8px monospace';
    var cap2 = false;
    try { cap2 = G && G.flags && G.flags.chapter === 2; } catch (e) {}
    txt(cap2 ? 'Cap. 2: A Cidade de Valdora' : 'Prólogo + Cap. 1: Brisamar e a Floresta', W / 2, 70, '#9cf', 'center');
    txt('Nome: ' + nomeJogador.toUpperCase(), W / 2, 88, '#ffd866', 'center');
    var hasSave = false;
    try { hasSave = Sv && typeof Sv.hasSave === 'function' && Sv.hasSave(); } catch (e) {}
    if (!titleNome) {
      var ehT = false;
      try { ehT = ehToque(); } catch (e) {}
      if (fr % 60 < 40) {
        x.font = 'bold 9px monospace';
        txt(ehT ? 'A: Novo jogo' : 'Z: Novo jogo', W / 2, 110, '#ffffff', 'center');
        txt(hasSave ? (ehT ? 'C: Continuar' : 'C: Continuar') : 'Toque para começar', W / 2, 122, hasSave ? '#8cff8c' : '#ffffff', 'center');
        x.font = 'bold 8px monospace';
        txt(ehT ? 'B: mudar nome' : 'X: mudar nome', W / 2, 134, '#cccccc', 'center');
      }
    } else {
      x.font = 'bold 8px monospace';
      txt('B: cancelar   A: confirmar', W / 2, 106, '#cccccc', 'center');
      x.font = 'bold 8px monospace';
      for (var li = 0; li < 8; li++) {
        var ch2 = nomeChars[li] || ' ';
        txt(ch2, W / 2 - 42 + li * 12, 124, li === nomeCursor ? '#8cff8c' : '#ffffff', 'center');
        if (li === nomeCursor && fr % 40 < 25) txt('▲', W / 2 - 42 + li * 12, 136, '#8cff8c', 'center');
      }
    }
    var muted = false;
    try { muted = Aud && typeof Aud.isMuted === 'function' && Aud.isMuted(); } catch (e) {}
    x.font = 'bold 8px monospace';
    txt(muted ? 'M: som off' : 'M: som on', W / 2, 144, '#bbbbbb', 'center');
    txt('WASD move · J=A K=B L=C · gamepad ok', W / 2, 154, '#999999', 'center');
    return;
  }
  if (!P) return;
  desenharTiles();
  desenharObjetos();
  for (var rni = 0; rni < runes.length; rni++) {
    var rn = runes[rni];
    R('#666', rn.x + 2, rn.y + 3, 12, 13); R(rn.on ? rn.c : '#333', rn.x + 4, rn.y + 5, 8, 8); R(rn.on ? '#fff' : rn.c, rn.x + 7, rn.y + 8, 2, 2);
  }
  for (var ii = 0; ii < items.length; ii++) {
    var it = items[ii];
    if (it.t === 'k') { R('#fc4', it.x, it.y + 2, 8, 3); R('#fc4', it.x, it.y, 4, 7); }
    else { R('#f44', it.x, it.y, 3, 3); R('#f44', it.x + 4, it.y, 3, 3); R('#f44', it.x, it.y + 2, 7, 4); }
  }
  for (var nni = 0; nni < npcs.length; nni++) desenharNpc(npcs[nni]);
  for (var ei = 0; ei < E.length; ei++) desenharInimigo(E[ei]);
  if (B && !B.end) desenharChefe();
  for (var ri2 = 0; ri2 < RT.length; ri2++) { var r2 = RT[ri2]; R('#a22', r2.x - 2, r2.y - 2, 5, 5); }
  for (var si = 0; si < S.length; si++) { var sp2 = S[si]; R('#9ff', sp2.x - 2, sp2.y - 2, 4, 4); }
  if (!(P.inv > 0 && fr % 6 < 3)) {
    R('#2a5fd0', P.x, P.y + 4, 10, 8);
    R('#f2c9a0', P.x + 1, P.y - 2, 8, 7);
    R('#7a4a1a', P.x + 1, P.y - 2, 8, 3);
  }
  if (P.at > 0) {
    var sx = P.x + 5 + DX[P.d] * 10, sy = P.y + 5 + DY[P.d] * 10, h = DX[P.d] !== 0;
    R('#ddd', sx - (h ? 5 : 1), sy - (h ? 1 : 5), h ? 10 : 2, h ? 2 : 10);
  }
  if (lerFlag('met_lumi')) {
    var lx = P.x - 6 + Math.sin(fr / 15) * 3, ly = P.y - 10 + Math.cos(fr / 12) * 2;
    R('#7ff', lx, ly, 5, 5); R('#fff', lx + 1, ly + 1, 2, 2);
  }
  // figura encapuzada: aparece na linha do diálogo que a menciona
  if (inBoss && st === 'talk') {
    var linFig = linhaDialogoVisivel();
    if (linFig && /figura encapuzada/.test(linFig[1])) {
      R('#221122', 96, 10, 16, 22); R('#221122', 92, 30, 24, 8);
      R('#e8dcc0', 101, 16, 6, 6); R('#000', 99, 8, 10, 6);
    }
  }
  for (var hi = 0; hi < (P.hpMax || 8); hi++) F(hi < P.hp ? '#e33' : '#411', 4 + hi * 7, 4, 6, 6);
  // Objetivo: mesma fonte dos balões (8px), mas sobre faixa escura + amarelo
  // de alto contraste. Quebra em 2 linhas se passar de 228px.
  x.font = 'bold 8px monospace';
  (function desenharObjetivo() {
    var linhasObj = wrap('▶ ' + textoObjetivo(), 224);
    if (linhasObj.length > 2) linhasObj = linhasObj.slice(0, 2);
    var hObj = linhasObj.length * 10 + 5;
    faixaHud(2, 12, 236, hObj + 2);
    for (var oi2 = 0; oi2 < linhasObj.length; oi2++) txt(linhasObj[oi2], 6, 22 + oi2 * 10, '#ffd866');
  })();
  if (B && B.hp > 0) {
    // Chefe: nome + barra sobre faixa escura, com borda clara na barra.
    x.font = 'bold 8px monospace';
    var rotChefe = B.nome || 'Chefe';
    var wChefe = Math.min(150, Math.max(70, x.measureText(rotChefe).width + 14));
    faixaHud(60 - 4, H - 26, 128, 20);
    txt(rotChefe, 62, H - 15, '#ffb3b3');
    F('#000', 60, H - 12, 120, 6);
    try { x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1; x.strokeRect(60.5, (H - 12) + 0.5, 119, 5); } catch (e) {}
    F('#c33', 61, H - 11, 118 * B.hp / (B.hpMax || 24), 4);
    void wChefe;
  }
  var toastOn = false, toastTxt = mt;
  if (UI && typeof UI.toastVisivel === 'function') {
    try {
      var dlgOn = (Dlg && Dlg.isDialogueActive && Dlg.isDialogueActive()) || st === 'talk';
      toastOn = UI.toastVisivel(dlgOn);
      if (toastOn && typeof UI.obterToast === 'function') toastTxt = UI.obterToast().texto;
    } catch (e) { toastOn = tt > 0; }
  } else toastOn = tt > 0;
  if (toastOn) {
    // Toast/aviso: fonte MAIOR que antes (9px bold), branco puro sobre faixa
    // escura, com quebra em até 2 linhas centralizadas. Nada de texto solto
    // sobre o cenário — era isso que ficava ilegível.
    x.font = 'bold 9px monospace';
    var linhasToast = wrap(String(toastTxt || ''), 200).slice(0, 2);
    var maxToast = 0;
    for (var ti2 = 0; ti2 < linhasToast.length; ti2++) maxToast = Math.max(maxToast, x.measureText(linhasToast[ti2]).width);
    var wToast = Math.min(232, Math.max(60, maxToast + 16));
    var hToast = linhasToast.length * 11 + 7;
    faixaHud(Math.round(W / 2 - wToast / 2), 28, Math.round(wToast), hToast);
    for (var ti3 = 0; ti3 < linhasToast.length; ti3++) txt(linhasToast[ti3], W / 2, 37 + ti3 * 11, '#ffffff', 'center');
  }
  x.font = 'bold 8px monospace';
  if (st === 'talk') {
    F('#112', 4, 100, 232, 56);
    F('#aac', 4, 100, 232, 1); F('#aac', 4, 155, 232, 1); F('#aac', 4, 100, 1, 56); F('#aac', 235, 100, 1, 56);
    var cur = linhaDialogoVisivel();
    if (cur) {
      txt(cur[0], 10, 112, '#ffd866');
      var visLines = wrap(cur[1], 216).slice(0, 4);
      for (var vi = 0; vi < visLines.length; vi++) txt(visLines[vi], 10, 124 + vi * 10);
      if (cur[2] && fr % 40 < 25) txt('▼', 226, 150, '#fff');
    } else if (Dlg && typeof Dlg.obterOpcoesEscolha === 'function') {
      try {
        var opts = Dlg.obterOpcoesEscolha();
        if (opts && opts.length) {
          txt('Escolha:', 10, 112, '#ffd866');
          for (var oi = 0; oi < opts.length; oi++) {
            var selOi = oi === Dlg.obterIndiceEscolha();
            if (selOi) faixaHud(8, 114 + oi * 10, 224, 11);
            txt((selOi ? '▶ ' : '  ') + opts[oi].label, 10, 124 + oi * 10, selOi ? '#8cff8c' : '#ffffff');
          }
        }
      } catch (e) {}
    }
  }
  if (st === 'cena') {
    var alfa = Math.min(0.85, cenaT / 50 * 0.85);
    x.fillStyle = 'rgba(0,0,10,' + alfa.toFixed(2) + ')'; x.fillRect(0, 0, W, H);
    if (cenaT > 70) {
      var band = Math.min(1, (cenaT - 70) / 40);
      x.fillStyle = 'rgba(200,40,40,' + (band * (0.5 + 0.3 * Math.sin(cenaT / 4))).toFixed(2) + ')';
      x.fillRect(0, 0, W, 26);
      if (fr % 8 < 4) { F('#fff', 30 + (cenaT * 2) % 180, 8, 2, 2); }
    }
    if (cenaT > 100) { x.fillStyle = 'rgba(255,60,60,0.25)'; x.fillRect(0, 0, W, 3); x.fillRect(0, H - 3, W, 3); }
  }
  if (menuOpen) {
    F('rgba(0,0,0,.7)', 0, 0, W, H);
    var muted2 = false;
    try { muted2 = Aud && Aud.isMuted && Aud.isMuted(); } catch (e) {}
    var ops = ['Continuar', muted2 ? 'Som: desligado' : 'Som: ligado', 'Reiniciar sala'];
    x.font = 'bold 10px monospace';
    txt('PAUSA', W / 2, 58, '#ffd866', 'center');
    x.font = 'bold 9px monospace';
    for (var mi = 0; mi < ops.length; mi++) {
      var selMi = mi === menuIdx;
      if (selMi) faixaHud(W / 2 - 90, 68 + mi * 13, 180, 13);
      txt((selMi ? '▶ ' : '  ') + ops[mi], W / 2, 78 + mi * 13, selMi ? '#8cff8c' : '#ffffff', 'center');
    }
  }
  if (st === 'over') {
    F('rgba(0,0,0,.7)', 0, 0, W, H);
    x.font = 'bold 11px monospace';
    txt('Você caiu...', W / 2, 76, '#ff6666', 'center');
    x.font = 'bold 9px monospace';
    txt('Toque para tentar de novo', W / 2, 94, '#ffffff', 'center');
  }
  if (st === 'end') {
    F('#000', 0, 0, W, H);
    for (var ti = 0; ti < 30; ti++) F('#fff', (ti * 53) % W, (ti * 37) % H, 1, 1);
    x.font = 'bold 11px monospace';
    txt('FIM DO CAPÍTULO 1', W / 2, 50, '#ffd866', 'center');
    x.font = 'bold 9px monospace';
    txt('A Cidade de Valdora o aguarda', W / 2, 70, '#99ccff', 'center');
    var toque = false;
    try { toque = ehToque(); } catch (e) {}
    // D-23: rótulos conforme o dispositivo (no toque valem os botões da tela).
    var rotA = toque ? 'A: jogar de novo' : 'Z: jogar de novo';
    var rotC = toque ? 'C: seguir para Valdora' : 'C: seguir para Valdora';
    if (endIdx === 0) faixaHud(W / 2 - 90, 96, 180, 13);
    else faixaHud(W / 2 - 90, 110, 180, 13);
    txt((endIdx === 0 ? '▶ ' : '  ') + rotA, W / 2, 106, endIdx === 0 ? '#8cff8c' : '#ffffff', 'center');
    txt((endIdx === 1 ? '▶ ' : '  ') + rotC, W / 2, 120, endIdx === 1 ? '#8cff8c' : '#ffffff', 'center');
    if (fr % 60 < 40) { x.font = 'bold 8px monospace'; txt(toque ? 'Toque p/ confirmar' : 'Cima/baixo escolhe · Z confirma', W / 2, 138, '#cccccc', 'center'); }
  }
  var fadeA = 0;
  try {
    if (UI && typeof UI.obterAlphaFade === 'function') fadeA = UI.obterAlphaFade() || 0;
    else if (Wd && typeof Wd.getFadeAlpha === 'function') fadeA = Wd.getFadeAlpha() || 0;
  } catch (e) {}
  if (fadeA > 0) { x.fillStyle = 'rgba(0,0,0,' + Math.max(0, Math.min(1, fadeA)).toFixed(2) + ')'; x.fillRect(0, 0, W, H); }
}
var last = 0, acc = 0, penU = 0, penD = 0, endIdx = 1;
function loop(t) {
  requestAnimationFrame(loop);
  acc += Math.min(100, t - last); last = t;
  while (acc >= 16.67) {
    acc -= 16.67; fr++;
    // B1: typewriter/toast/passos de cena rodam no passo fixo SEMPRE (também em talk/cena).
    if (Dlg && typeof Dlg.updateDialogue === 'function') { try { Dlg.updateDialogue(); } catch (e) {} }
    else if (st === 'talk') fbTC++;
    var dlgAtivo = false;
    try { dlgAtivo = (Dlg && typeof Dlg.isDialogueActive === 'function' && Dlg.isDialogueActive()) || st === 'talk'; } catch (e) { dlgAtivo = st === 'talk'; }
    if (UI && typeof UI.updateToast === 'function') { try { UI.updateToast(dlgAtivo); } catch (e) {} }
    if (UI && typeof UI.updateFade === 'function') { try { UI.updateFade(); } catch (e) {} }
    // D-23: navegação cima/baixo unificada (teclado + touch + gamepad escrevem K;
    // a borda decide). Cobre escolhas de diálogo, menu de pausa e menu do fim.
    try {
      var emEscolha = st === 'talk' && Dlg && Dlg.estaEmEscolha && Dlg.estaEmEscolha();
      if (emEscolha || menuOpen || st === 'end') {
        if (K.u && !penU) {
          if (st === 'end') endIdx = 0;
          else if (menuOpen) menuIdx = (menuIdx + 2) % 3;
          else Dlg.moverSelecaoEscolha(-1);
        }
        if (K.d && !penD) {
          if (st === 'end') endIdx = 1;
          else if (menuOpen) menuIdx = (menuIdx + 1) % 3;
          else Dlg.moverSelecaoEscolha(1);
        }
        penU = K.u; penD = K.d;
      } else { penU = 0; penD = 0; }
    } catch (e) {}
    if (st === 'cena') {
      cenaT++;
      if (cenaT >= 160) { st = 'play'; var cb = cenaDepois; cenaDepois = null; if (cb) cb(); }
    }
    else if (st === 'play' && !menuOpen && !emTransicao() && P) update();
    try { lerGamepad(); } catch (e) {}
  }
  render();
}
// ---- input (F2.5: direcional vetorial + gamepad + overlay) ----
try {
// D-pad vetorial de 8 direções: arrasto a partir do centro da zona;
// zona morta 0.25; soltar zera. Multitoque ok (um pointer por controle).
var dzoneEl = null, dbaseEl = null, dstickEl = null, dPadId = null;
try {
  dzoneEl = document.getElementById('dzone');
  dbaseEl = document.getElementById('dbase');
  dstickEl = document.getElementById('dstick');
} catch (e) {}
function zerarDirecional() { K.u = K.d = K.l = K.r = 0; }
function aplicarVetor(dx, dy) {
  var mag = Math.hypot(dx, dy);
  if (mag < 0.25) { zerarDirecional(); return; }
  var nx = dx / (mag || 1), ny = dy / (mag || 1);
  K.r = nx > 0.35 ? 1 : 0; K.l = nx < -0.35 ? 1 : 0;
  K.d = ny > 0.35 ? 1 : 0; K.u = ny < -0.35 ? 1 : 0;
}
function centroZona() {
  var r = dzoneEl.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, raio: Math.max(20, r.width / 2) };
}
function moverPalito(dx, dy, raio) {
  if (!dstickEl || !dbaseEl) return;
  try {
    var m = Math.min(1, Math.hypot(dx, dy) / raio);
    var d = Math.max(28, dbaseEl.getBoundingClientRect().width / 2);
    dstickEl.style.transform = 'translate(' + (dx / (Math.hypot(dx, dy) || 1) * m * d * 0.55) + 'px,' + (dy / (Math.hypot(dx, dy) || 1) * m * d * 0.55) + 'px)';
  } catch (e) {}
}
if (dzoneEl) {
  dzoneEl.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    try { dzoneEl.setPointerCapture(e.pointerId); } catch (err) {}
    dPadId = e.pointerId;
    var c = centroZona();
    aplicarVetor(e.clientX - c.x, e.clientY - c.y);
    moverPalito(e.clientX - c.x, e.clientY - c.y, c.raio);
  });
  dzoneEl.addEventListener('pointermove', function (e) {
    if (e.pointerId !== dPadId) return;
    e.preventDefault();
    var c = centroZona();
    aplicarVetor(e.clientX - c.x, e.clientY - c.y);
    moverPalito(e.clientX - c.x, e.clientY - c.y, c.raio);
  });
  var soltarDirecional = function (e) {
    if (e && e.pointerId !== undefined && e.pointerId !== dPadId) return;
    dPadId = null; zerarDirecional();
    try { if (dstickEl) dstickEl.style.transform = ''; } catch (err) {}
  };
  dzoneEl.addEventListener('pointerup', soltarDirecional);
  dzoneEl.addEventListener('pointercancel', soltarDirecional);
  dzoneEl.addEventListener('lostpointercapture', function () { dPadId = null; zerarDirecional(); });
}
document.querySelectorAll('[data-a]').forEach(function (b) {
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.classList.add('on'); act(b.dataset.a); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { b.addEventListener(n, function () { b.classList.remove('on'); }); });
});
function alternarMenu() {
  if (!(st === 'play' || menuOpen)) return;
  menuOpen = !menuOpen; menuIdx = 0;
  if (UI) { try { if (menuOpen) UI.pausarJogo(); else UI.continuarJogo(); } catch (err) {} }
}
try {
  var menuBtn = document.getElementById('menubtn');
  if (menuBtn) menuBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); gestoAudio(); alternarMenu(); });
} catch (e) {}
// Fullscreen na paisagem no 1º gesto (mobile); desktop ignora sem erro.
var telaCheiaTentada = false;
function tentarFullscreen() {
  if (telaCheiaTentada) return;
  telaCheiaTentada = true;
  try {
    if (document.documentElement && document.documentElement.requestFullscreen) {
      var p = document.documentElement.requestFullscreen();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
  } catch (e) {}
}
try { document.addEventListener('pointerdown', function () { tentarFullscreen(); }, { capture: true }); } catch (e) {}
// Gamepad (padrão: DualShock/Xbox/genéricos no Chrome): A=0, B=1, X/Y=2/3,
// Start=9 pausa, direcional 12–15 + analógico. Polling com borda de subida.
var padPrev = [];
function lerGamepad() {
  var pads = null;
  try {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    pads = navigator.getGamepads();
  } catch (e) { return; }
  if (!pads) return;
  var gp = null;
  for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { gp = pads[i]; break; }
  if (!gp) return;
  var b = function (n) { try { return !!(gp.buttons[n] && gp.buttons[n].pressed); } catch (e) { return false; } };
  var eixo = function (n) { try { var v = gp.axes[n] || 0; return Math.abs(v) > 0.35 ? v : 0; } catch (e) { return 0; } };
  var ax = eixo(0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  var ay = eixo(1) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
  K.r = ax > 0.3 ? 1 : 0; K.l = ax < -0.3 ? 1 : 0;
  K.d = ay > 0.3 ? 1 : 0; K.u = ay < -0.3 ? 1 : 0;
  var beira = function (n) { var agora = b(n), antes = !!padPrev[n]; padPrev[n] = agora; return agora && !antes; };
  if (beira(0)) act('a');
  if (beira(1)) act('b');
  if (beira(2) || beira(3)) act('c');
  if (beira(9)) { gestoAudio(); alternarMenu(); }
}
if (cv && typeof cv.addEventListener === 'function') cv.addEventListener('pointerdown', function () { if (st !== 'play' || menuOpen) act('a'); });
var kk = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
var ka = { KeyZ: 'a', KeyJ: 'a', Space: 'a', Enter: 'a', KeyX: 'b', KeyK: 'b', KeyC: 'c', KeyL: 'c' };
addEventListener('keydown', function (e) {
  gestoAudio();
  if (e.code === 'KeyM' && Aud && typeof Aud.alternarMudo === 'function') { try { Aud.alternarMudo(); } catch (err) {} return; }
  if (st === 'title' && titleNome) {
    if (kk[e.code]) {
      var dir = kk[e.code];
      if (dir === 'u') alternarNomeLetra(1);
      else if (dir === 'd') alternarNomeLetra(-1);
      else if (dir === 'l') nomeCursor = (nomeCursor + 7) % 8;
      else if (dir === 'r') nomeCursor = (nomeCursor + 1) % 8;
      playSnd(700, 0.04);
      e.preventDefault(); return;
    }
    if (ka[e.code] && !e.repeat) { act(ka[e.code]); e.preventDefault(); }
    return;
  }
  // (D-23: navegação de menu/escolha/fim sai do passo fixo via K; sem duplicar aqui.)
  if ((e.code === 'KeyP' || e.code === 'Escape') && (st === 'play' || menuOpen)) {
    alternarMenu();
    e.preventDefault(); return;
  }
  // (D-23: idem para escolhas de diálogo.)
  if (kk[e.code]) { K[kk[e.code]] = 1; if (st !== 'talk') e.preventDefault(); }
  if (ka[e.code] && !e.repeat) { act(ka[e.code]); e.preventDefault(); }
});
addEventListener('keyup', function (e) { if (kk[e.code]) K[kk[e.code]] = 0; });
addEventListener('blur', function () { K.u = K.d = K.l = K.r = 0; });
// ---- boot F1 (sem autosave, sem estado vivo — B2) ----
try { if (UI && typeof UI.iniciarPausaAutomatica === 'function') UI.iniciarPausaAutomatica({}); } catch (e) {}
try { if (UI && typeof UI.definirAcaoReiniciarSala === 'function') UI.definirAcaoReiniciarSala(function () { retry(); }); } catch (e) {}
try {
  if (Wd && typeof Wd.registerMap === 'function') {
    var ids = ['brisamar', 'forest', 'ruin_entry', 'valdora', 'esgoto'];
    for (var bi = 0; bi < ids.length; bi++) {
      var dd = defMapa(ids[bi]);
      if (dd) { try { Wd.registerMap(ids[bi], dd); } catch (e2) {} }
    }
  }
} catch (e) {}
try {
  if (Dlg && typeof Dlg.definirProvedorFlags === 'function' && G) Dlg.definirProvedorFlags(function () { return G.flags || {}; });
} catch (e) {}
try { if (Mus && typeof Mus.tocarTema === 'function') Mus.tocarTema('title_theme'); } catch (e) {}
try { requestAnimationFrame(loop); } catch (e) {}
} catch (erroInput) {
  try { requestAnimationFrame(loop); } catch (e2) {}
}
})();




