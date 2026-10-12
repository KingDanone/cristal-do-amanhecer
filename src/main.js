// src/main.js — F0 Integração: Cap.1 idêntico ao MVP sobre o motor novo.
// D-12: main é o único lugar que toca DOM/canvas/loop. Módulos core/systems/maps/data
// são puros e seguros em node. Aqui fazemos a ponte com graceful fallback:
// se um módulo não carregou (ordem de concat quebrada), o jogo segue com o MVP.
// Aceite F0 = Cap.1 idêntico ao MVP (ver 04_DEV_PLAN.md D-13). Nenhuma trava nova (sem soft-lock).
(function jogoPrincipal() {
'use strict';
if (typeof document === 'undefined' || typeof window === 'undefined') return; // node/smoke: só syntax-check
var cv = document.getElementById('c');
if (!cv) return;
var x = cv.getContext('2d');
var W = 240, H = 160, T = 16;
var DX = [0, 0, -1, 1], DY = [1, -1, 0, 0];
var OBJ = ['Explore a floresta', 'Ative as runas na ordem certa', 'Pegue a chave', 'Abra o portão das ruínas', 'Derrote o Guardião das Raízes'];

// ---- atalhos p/ módulos (com fallback) ----
var Dlg = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Dialogue) || null;
var Ent = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Entities) || null;
var Aud = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.Audio) || null;
var UI = (typeof globalThis !== 'undefined' && globalThis.Cristal && globalThis.Cristal.UI) || null;
var G = (typeof Game !== 'undefined') ? Game : null;
var Wd = (typeof World !== 'undefined') ? World : null;
var Sv = (typeof SaveSystem !== 'undefined') ? SaveSystem : null;
var DIALOGS = (typeof DIALOGS_F1 !== 'undefined') ? DIALOGS_F1 : ((typeof globalThis !== 'undefined' && globalThis.DIALOGS_F1) || null);

var AC = null, seed = 7, st = 'title', P = null, E = [], S = [], RT = [], items = [], B = null;
var M = null, MW = 0, MH = 0, CX = 0, CY = 0, runes = [], obj = 0, mt = '', tt = 0, fr = 0;
var inBoss = false, swing = 0, gcd = 0, menuIdx = 0, menuOpen = false;
var sign = { x: 4 * T, y: 14 * T };
var K = { u: 0, d: 0, l: 0, r: 0 };
// expõe ponte p/ World._applyToMvp (ele lê M/MW/MH/P/inBoss via typeof em escopo global;
// como estamos em IIFE, espelhamos nas globals para a ponte funcionar)
function espelharGlobals() {
  try { window.M = M; } catch (e) {}
  try { window.MW = MW; } catch (e) {}
  try { window.MH = MH; } catch (e) {}
  try { window.P = P; } catch (e) {}
  try { window.inBoss = inBoss; } catch (e) {}
  try { globalThis.M = M; globalThis.MW = MW; globalThis.MH = MH; globalThis.P = P; globalThis.inBoss = inBoss; } catch (e) {}
}

function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
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
// Diálogo: usa Cristal.Dialogue (typewriter no passo fixo) ou fallback local.
var fallbackQ = [], fallbackQL = 0, fallbackTC = 0, fallbackDone = null, fallbackPrev = 'play';
function say(lines, cb) {
  if (Dlg && typeof Dlg.startDialogue === 'function') {
    try {
      var norm = lines.map(function (l) {
        if (Array.isArray(l)) return { name: l[0], text: l[1] };
        return l;
      });
      Dlg.startDialogue(norm, cb || null);
      st = 'talk';
      return;
    } catch (e) {}
  }
  fallbackQ = lines; fallbackQL = 0; fallbackTC = 0; fallbackDone = cb || null; fallbackPrev = st; st = 'talk';
}
function advanceTalk() {
  if (Dlg && typeof Dlg.isDialogueActive === 'function') {
    try { if (Dlg.isDialogueActive()) { Dlg.advanceDialogue(); if (!Dlg.isDialogueActive()) { var cb = null; st = 'play'; } return; } } catch (e) {}
  }
  if (fallbackTC / 2 < (fallbackQ[fallbackQL] ? fallbackQ[fallbackQL][1].length : 0)) { fallbackTC = 999; return; }
  fallbackQL++; fallbackTC = 0;
  if (fallbackQL >= fallbackQ.length) { st = fallbackPrev; var f = fallbackDone; fallbackDone = null; if (f) f(); }
}
function playDialogId(id, cb) {
  if (DIALOGS && DIALOGS[id]) {
    var d = DIALOGS[id];
    say(d.speakers, function () {
      try {
        if (G && d.flagsSet) {
          for (var k in d.flagsSet) {
            if (k === 'has_key_c1' || k === 'sign_read' || k === 'boss1_defeated') G.setFlag(k, true);
            else { if (!G.flags) G.resetFlags(); G.flags[k] = d.flagsSet[k]; }
          }
          syncObjFromFlags();
        }
      } catch (e) {}
      if (cb) cb();
    });
    return true;
  }
  return false;
}
function syncObjFromFlags() {
  try {
    if (G && typeof G.indiceObjetivoCap1 === 'function') obj = G.indiceObjetivoCap1();
  } catch (e) {}
}

function solidAt(px, py) {
  var i = Math.floor(px / T), j = Math.floor(py / T);
  if (i < 0 || j < 0 || i >= MW || j >= MH) return 1;
  var c = M[j][i];
  if (typeof isSolidTile === 'function') { try { return isSolidTile(c) ? 1 : 0; } catch (e) {} }
  return (c === '#' || c === 'G') ? 1 : 0;
}
function blk(e, nx, ny) {
  var s = e.s;
  var corners = [[0, 0], [s, 0], [0, s], [s, s]];
  for (var k = 0; k < 4; k++) if (solidAt(nx + corners[k][0], ny + corners[k][1])) return 1;
  if (!inBoss) {
    var obstacles = [sign].concat(runes);
    for (var o = 0; o < obstacles.length; o++) {
      var ob = obstacles[o];
      if (nx < ob.x + T && nx + s > ob.x && ny < ob.y + T && ny + s > ob.y) return 1;
    }
  }
  return 0;
}
function mv(e, dx, dy) { if (!blk(e, e.x + dx, e.y)) e.x += dx; if (!blk(e, e.x, e.y + dy)) e.y += dy; }

function forest() {
  inBoss = false; MW = 30; MH = 20; seed = 7; M = [];
  for (var j = 0; j < MH; j++) { M[j] = []; for (var i = 0; i < MW; i++) M[j][i] = (i < 1 || j < 1 || i > MW - 2 || j > MH - 2 || rnd() < 0.2) ? '#' : '.'; }
  var cl = function (a, b, c, d) { for (var jj = b; jj <= d; jj++) for (var ii = a; ii <= c; ii++) M[jj][ii] = '.'; };
  var ln = function (a, b, c, d) { cl(Math.min(a, c), b, Math.max(a, c), b + 1); cl(c, Math.min(b, d), c + 1, Math.max(b, d) + 1); };
  cl(1, 13, 7, 18); ln(2, 16, 10, 10); ln(10, 10, 14, 6); ln(14, 6, 20, 12); ln(20, 12, 27, 4);
  M[3][27] = 'G'; M[3][26] = '#'; M[3][28] = '#'; M[2][27] = '#';
  runes = [
    { x: 10 * T, y: 10 * T, c: '#4a8cff', i: 0, on: 0 },
    { x: 14 * T, y: 6 * T, c: '#4ccf4c', i: 1, on: 0 },
    { x: 20 * T, y: 12 * T, c: '#ee4444', i: 2, on: 0 }
  ];
  E = [];
  for (var n = 0; n < 500 && E.length < 7; n++) {
    var si = 6 + Math.floor(rnd() * 22), sj = 2 + Math.floor(rnd() * 16);
    var e = { x: si * T + 3, y: sj * T + 3, s: 10, hp: 2, t: 0, vx: 0, vy: 0, kx: 0, ky: 0, fl: 0 };
    if (M[sj][si] === '.' && !blk(e, e.x, e.y) && Math.hypot(e.x - P.x, e.y - P.y) > 90) E.push(e);
  }
  espelharGlobals();
}
function arena() {
  inBoss = true; MW = 15; MH = 10; M = [];
  for (var j = 0; j < MH; j++) { M[j] = []; for (var i = 0; i < MW; i++) M[j][i] = (i < 1 || j < 1 || i > MW - 2 || j > MH - 2) ? '#' : '.'; }
  E = []; items = []; runes = []; S = []; RT = [];
  P.x = 7 * T; P.y = 8 * T; P.hp = 8; P.inv = 60;
  B = { x: 106, y: 28, s: 28, hp: 24, m: 'walk', t: 90, fl: 0, dc: 0, end: 0, sw: -1 };
  espelharGlobals();
}
function toBoss() {
  arena(); obj = 4;
  try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange('arena'); } catch (e) {}
  if (!playDialogId('boss_intro')) say([['Lumi', 'Cuidado, Kael! Essa coisa está viva! Esquive com B e use a minha magia com C!']]);
}
function begin() {
  try { if (G && typeof G.resetFlags === 'function') G.resetFlags(); } catch (e) {}
  obj = 0; items = []; S = []; RT = []; swing = 0; B = null;
  P = { x: 3 * T, y: 16 * T, s: 10, d: 1, hp: 8, inv: 0, at: 0, dash: 0, cd: 0, kx: 0, ky: 0 };
  forest(); st = 'play';
  try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange('forest'); } catch (e) {}
  say([
    ['Narrador', 'Uma estrela caiu atrás da floresta. O pingente de Kael brilha, e algo chama seu nome.'],
    ['Kael', 'Lumi, essas raízes negras estão por toda parte...'],
    ['Lumi', 'Não deviam estar tão perto da vila. Vamos investigar, herói.'],
    ['Kael', 'Eu não sou herói.'],
    ['Lumi', 'Anotado e ignorado. Dica: A ataca com a espada, B esquiva, C dispara minha magia.']
  ]);
}
function retry() {
  P.hp = 8; P.inv = 60; P.kx = P.ky = 0;
  if (inBoss) arena(); else { P.x = 3 * T; P.y = 16 * T; }
  st = 'play';
}
function read() {
  if (obj < 1) obj = 1;
  try { if (G && typeof G.setFlag === 'function') { G.setFlag('sign_read', true); syncObjFromFlags(); } } catch (e) {}
  if (!playDialogId('forest_sign')) say([['Inscrição', 'Primeiro o céu, depois a folha, por fim o sangue da terra.'], ['Lumi', 'Céu, folha, sangue... azul, verde, vermelho? Procure runas por aí!']]);
}
function attack() {
  if (P.at > 0) return;
  if (!inBoss && Math.hypot(P.x + 5 - sign.x - 8, P.y + 5 - sign.y - 8) < 22) { read(); return; }
  P.at = 14; swing++; playSnd(300, 0.06);
}
function dash() {
  if (P.dash > 0 || P.at > 0) return;
  P.dash = 9; P.inv = Math.max(P.inv, 12); playSnd(500, 0.05, 'triangle');
}
function shoot() {
  if (P.cd > 0) return;
  P.cd = 30;
  S.push({ x: P.x + 5, y: P.y + 5, vx: DX[P.d] * 2.6, vy: DY[P.d] * 2.6, l: 70 });
  playSnd(900, 0.07);
}
function stepOf() { try { if (G && G.flags) return G.flags.step | 0; } catch (e) {} return fallbackStep(); }
function fallbackStep() { var n = 0; for (var i = 0; i < runes.length; i++) if (runes[i].on) n++; return n; }
function hasKey() { try { if (G && G.flags) return G.flags.has_key_c1 === true; } catch (e) {} return fallbackHasKey(); }
function fallbackHasKey() { return obj >= 3; }
function setStep(n) { try { if (G && typeof G.setFlag === 'function' && n >= 0 && n <= 3) { G.setFlag('step', n); if (n >= 3) G.setFlag('runes_done', true); syncObjFromFlags(); return; } } catch (e) {} }
function setKey() {
  try {
    if (G && typeof G.setFlag === 'function') { G.setFlag('has_key_c1', true); syncObjFromFlags(); }
    else if (obj < 3) obj = 3;
  } catch (e) { if (obj < 3) obj = 3; }
  try { if (Sv && typeof Sv.saveOnKeyItem === 'function') Sv.saveOnKeyItem('chave-c1'); } catch (e) {}
}
function act(a) {
  if (Aud && typeof Aud.desbloquearAudio === 'function') { try { Aud.desbloquearAudio(); } catch (e) {} }
  if (menuOpen) {
    if (a === 'a') {
      if (menuIdx === 0) { menuOpen = false; if (UI) { try { UI.continuarJogo(); } catch (e) {} } }
      else if (menuIdx === 1) { if (Aud) { try { Aud.alternarMudo(); } catch (e) {} } }
      else { retry(); menuOpen = false; if (UI) { try { UI.continuarJogo(); } catch (e) {} } }
    }
    return;
  }
  if (st === 'title') {
    if (a === 'c' && Sv && typeof Sv.hasSave === 'function') {
      try {
        if (Sv.hasSave()) {
          begin();
          if (Sv.loadGame()) { syncObjFromFlags(); st = 'play'; showMsg('Progresso restaurado.'); return; }
        }
      } catch (e) {}
    }
    begin(); return;
  }
  if (st === 'end') { begin(); return; }
  if (st === 'talk') { advanceTalk(); if (Aud) { try { Aud.tocarEfeito('avancoDialogo'); } catch (e) {} } return; }
  if (st === 'over') { retry(); return; }
  if (st !== 'play') return;
  if (a === 'a') attack();
  if (a === 'b') dash();
  if (a === 'c') shoot();
}
function hurtP(sx, sy) {
  if (P.inv > 0 || P.dash > 0 || st !== 'play') return;
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
function hitRune(r) {
  if (r.on) return;
  if (r.i === stepOf()) {
    setStep(stepOf() + 1); r.on = 1; playSnd(700 + stepOf() * 150, 0.2, 'triangle'); showMsg('Runa ativada!');
    if (stepOf() === 3) {
      if (obj < 2) obj = 2; syncObjFromFlags();
      items.push({ x: 23 * T + 3, y: 12 * T + 3, t: 'k' });
      showMsg('Uma chave surgiu no chão!');
    }
  } else {
    setStep(0);
    runes.forEach(function (o) { o.on = 0; });
    playSnd(110, 0.3, 'sawtooth'); showMsg('As runas se apagaram...');
  }
}
function hitBoss(n) { if (B.fl > 0 || B.hp <= 0) return; B.hp -= n; B.fl = 10; playSnd(200, 0.1); }
function ov(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function update() {
  if (P.inv > 0) P.inv--;
  if (P.at > 0) P.at--;
  if (P.dash > 0) P.dash--;
  if (P.cd > 0) P.cd--;
  if (tt > 0) tt--;
  if (gcd > 0) gcd--;
  if (Dlg && typeof Dlg.updateDialogue === 'function') { try { Dlg.updateDialogue(); } catch (e) {} }
  else if (st === 'talk') { fallbackTC++; }
  if (UI && typeof UI.updateToast === 'function') { try { UI.updateToast(st === 'talk'); } catch (e) {} }
  if (Wd && typeof Wd.updateWorldTransition === 'function') { try { Wd.updateWorldTransition(); } catch (e) {} }
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
  if (P.at >= 4 && P.at <= 10) {
    var hb = { x: P.x + 5 + DX[P.d] * 11 - 7, y: P.y + 5 + DY[P.d] * 11 - 7, w: 14, h: 14 };
    for (var ei = 0; ei < E.length; ei++) {
      var en = E[ei];
      if (en.sw !== swing && ov(hb, { x: en.x, y: en.y, w: 10, h: 10 })) { en.sw = swing; hurtE(en, 2); }
    }
    for (var ri = 0; ri < runes.length; ri++) {
      var rr = runes[ri];
      if (rr.sw !== swing && ov(hb, { x: rr.x, y: rr.y, w: T, h: T })) { rr.sw = swing; hitRune(rr); }
    }
    if (B && B.hp > 0 && B.sw !== swing && ov(hb, { x: B.x, y: B.y, w: 28, h: 28 })) { B.sw = swing; hitBoss(2); }
  }
  for (var si = 0; si < S.length; si++) {
    var s = S[si];
    s.x += s.vx; s.y += s.vy; s.l--;
    if (solidAt(s.x, s.y)) s.l = 0;
    for (var q = 0; q < runes.length; q++) {
      var rq = runes[q];
      if (s.l > 0 && Math.abs(s.x - rq.x - 8) < 8 && Math.abs(s.y - rq.y - 8) < 8) { s.l = 0; hitRune(rq); }
    }
    for (var q2 = 0; q2 < E.length; q2++) {
      var e2 = E[q2];
      if (s.l > 0 && e2.hp > 0 && Math.hypot(s.x - e2.x - 5, s.y - e2.y - 5) < 9) { s.l = 0; hurtE(e2, 1); }
    }
    if (B && B.hp > 0 && s.l > 0 && s.x > B.x && s.x < B.x + 28 && s.y > B.y && s.y < B.y + 28) { s.l = 0; hitBoss(1); }
  }
  S = S.filter(function (s) { return s.l > 0; });
  for (var i = 0; i < E.length; i++) {
    var e = E[i];
    if (e.fl > 0) e.fl--;
    var ex = P.x - e.x, ey = P.y - e.y, d = Math.hypot(ex, ey) || 1;
    var vx, vy;
    if (d < 70) { vx = ex / d * 0.5; vy = ey / d * 0.5; }
    else {
      if (--e.t <= 0) { e.t = 50 + Math.random() * 60; e.vx = (Math.random() - 0.5) * 0.7; e.vy = (Math.random() - 0.5) * 0.7; }
      vx = e.vx; vy = e.vy;
    }
    mv(e, vx, vy);
    if (e.kx || e.ky) { mv(e, e.kx, e.ky); e.kx *= 0.8; e.ky *= 0.8; }
    if (d < 10) hurtP(e.x, e.y);
  }
  E = E.filter(function (e) { return e.hp > 0; });
  for (var it = 0; it < items.length; it++) {
    var item = items[it];
    if (!item.g && Math.hypot(P.x - item.x, P.y - item.y) < 11) {
      item.g = 1;
      if (item.t === 'k') { setKey(); showMsg('Chave obtida! Vá ao portão.'); playSnd(1000, 0.3, 'triangle'); }
      else { P.hp = Math.min(8, P.hp + 2); playSnd(800, 0.1); }
    }
  }
  items = items.filter(function (i) { return !i.g; });
  if (!inBoss && Math.hypot(P.x + 5 - 27 * T - 8, P.y + 5 - 3 * T - 8) < 20) {
    if (hasKey()) toBoss();
    else if (gcd <= 0) { showMsg('Trancado. Falta uma chave.'); gcd = 120; }
  }
  if (B) {
    if (B.fl > 0) B.fl--;
    if (B.hp <= 0) {
      if (++B.dc > 70 && !B.end) {
        B.end = 1; RT = [];
        try { if (G && typeof G.setFlag === 'function') { G.setFlag('boss1_defeated', true); syncObjFromFlags(); } } catch (e) {}
        try { if (Sv && typeof Sv.saveOnMapChange === 'function') Sv.saveOnMapChange('arena'); } catch (e) {}
        if (!playDialogId('boss_defeated', function () { st = 'end'; })) {
          say([
            ['Narrador', 'O Guardião das Raízes desmorona. Entre as raízes surge uma inscrição antiga.'],
            ['Inscrição', 'Quando a primeira estrela cair, aquele que carrega a lembrança abrirá o caminho.'],
            ['Lumi', 'Kael... esse símbolo é idêntico ao do seu pingente.'],
            ['Kael', 'Do meu pai...? Então ele sabia de tudo isso.'],
            ['Narrador', 'Do alto de uma colina, uma figura encapuzada observa a ruína... e desaparece quando Kael se vira.']
          ], function () { st = 'end'; });
        }
      }
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
  var parts = t.split(' ');
  for (var i = 0; i < parts.length; i++) {
    var s = parts[i];
    if (x.measureText(l + s).width > w) { o.push(l); l = s + ' '; }
    else l += s + ' ';
  }
  o.push(l); return o;
}
function txt(t, a, b, c, al) {
  x.textAlign = al || 'left';
  x.fillStyle = '#000'; x.fillText(t, a + 1, b + 1);
  x.fillStyle = c || '#fff'; x.fillText(t, a, b);
}
function linhaDialogoVisivel() {
  if (Dlg && typeof Dlg.obterLinhaAtual === 'function') {
    try {
      var linha = Dlg.obterLinhaAtual();
      if (!linha) return null;
      var vis = (typeof Dlg.obterTextoVisivel === 'function') ? Dlg.obterTextoVisivel() : linha.texto;
      return [linha.nome || '???', vis, (Dlg.linhaAtualCompleta ? Dlg.linhaAtualCompleta() : true)];
    } catch (e) { return null; }
  }
  if (!fallbackQ.length) return null;
  var l = fallbackQ[fallbackQL];
  if (!l) return null;
  return [l[0], l[1].slice(0, Math.floor(fallbackTC / 2)), fallbackTC / 2 >= l[1].length];
}

function render() {
  x.font = 'bold 8px monospace'; x.textBaseline = 'alphabetic';
  F('#000', 0, 0, W, H);
  if (st === 'title') {
    for (var i = 0; i < 40; i++) F('#fff', (i * 53) % W, (i * 37) % H, 1, 1);
    txt('A LENDA DO CRISTAL', W / 2, 44, '#ffd866', 'center');
    txt('DO AMANHECER', W / 2, 56, '#ffd866', 'center');
    txt('Capítulo 1: A Floresta dos Sussurros', W / 2, 78, '#9cf', 'center');
    var hasSave = false;
    try { hasSave = Sv && typeof Sv.hasSave === 'function' && Sv.hasSave(); } catch (e) {}
    if (fr % 60 < 40) {
      txt('A: Novo jogo', W / 2, 116, '#fff', 'center');
      if (hasSave) txt('C: Continuar', W / 2, 128, '#7f7', 'center');
      else txt('Toque para começar', W / 2, 128, '#fff', 'center');
    }
    var muted = false;
    try { muted = Aud && typeof Aud.isMuted === 'function' && Aud.isMuted(); } catch (e) {}
    txt(muted ? 'M: som off' : 'M: som on', W / 2, 144, '#888', 'center');
    return;
  }
  if (!P) return;
  var j, i;
  for (j = Math.max(0, Math.floor(CY / T)); j < Math.min(MH, Math.ceil((CY + H) / T) + 1); j++) {
    for (i = Math.max(0, Math.floor(CX / T)); i < Math.min(MW, Math.ceil((CX + W) / T) + 1); i++) {
      var c = M[j][i], a = i * T, b = j * T;
      R(inBoss ? '#5a5a6a' : '#3d8b37', a, b, T, T);
      if (c === '.') {
        if ((i * 7 + j * 13) % 5 === 0) R(inBoss ? '#666677' : '#4aa043', a + 4, b + 5, 2, 2);
        if (!inBoss && (i * 31 + j * 17) % 19 === 0) R('#2a1a30', a + 3, b + 4, 6, 4);
      } else if (c === '#') {
        if (inBoss) { R('#33334a', a, b, T, T); R('#444460', a + 1, b + 1, 14, 6); }
        else { R('#1c5a2a', a, b, T, 13); R('#2f7d3a', a + 2, b + 1, 12, 8); R('#5a3a1e', a + 6, b + 12, 4, 4); }
      } else if (c === 'G') { R('#666', a, b, T, T); R(hasKey() ? '#352' : '#222', a + 3, b + 3, 10, 13); R(hasKey() ? '#7f7' : '#fc4', a + 10, b + 9, 2, 2); }
    }
  }
  for (var ii = 0; ii < items.length; ii++) {
    var it = items[ii];
    if (it.t === 'k') { R('#fc4', it.x, it.y + 2, 8, 3); R('#fc4', it.x, it.y, 4, 7); }
    else { R('#f44', it.x, it.y, 3, 3); R('#f44', it.x + 4, it.y, 3, 3); R('#f44', it.x, it.y + 2, 7, 4); }
  }
  if (!inBoss) {
    R('#8a5a2a', sign.x + 3, sign.y + 3, 10, 7); R('#5a3a1e', sign.x + 7, sign.y + 10, 2, 6);
    for (var ri = 0; ri < runes.length; ri++) {
      var rn = runes[ri];
      R('#666', rn.x + 2, rn.y + 3, 12, 13); R(rn.on ? rn.c : '#333', rn.x + 4, rn.y + 5, 8, 8); R(rn.on ? '#fff' : rn.c, rn.x + 7, rn.y + 8, 2, 2);
    }
  }
  for (var ei = 0; ei < E.length; ei++) {
    var e = E[ei], f = e.fl > 0;
    R(f ? '#fff' : '#8a3fb5', e.x - 1, e.y + 2, 12, 9);
    R(f ? '#fff' : '#a65ad0', e.x + 1, e.y, 8, 4);
    R('#fff', e.x + 2, e.y + 4, 2, 2); R('#fff', e.x + 7, e.y + 4, 2, 2);
  }
  if (B && !B.end) {
    var bf = B.fl > 0 && fr % 4 < 2, tel = B.m === 'tel' && fr % 6 < 3;
    if (!(B.hp <= 0 && fr % 4 < 2)) {
      R(bf ? '#fff' : tel ? '#c66' : '#5a3a1e', B.x, B.y, 28, 28);
      R('#2f7d3a', B.x + 2, B.y + 2, 10, 6); R('#2f7d3a', B.x + 16, B.y + 18, 10, 8);
      R('#f33', B.x + 6, B.y + 9, 5, 5); R('#f33', B.x + 17, B.y + 9, 5, 5);
      R('#222', B.x + 8, B.y + 20, 12, 3);
    }
    if (B.m === 'slam') { x.strokeStyle = '#f55'; x.lineWidth = 2; x.beginPath(); x.arc(B.x + 14 - CX, B.y + 14 - CY, 46, 0, 7); x.stroke(); }
  }
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
  var lx = P.x - 6 + Math.sin(fr / 15) * 3, ly = P.y - 10 + Math.cos(fr / 12) * 2;
  R('#7ff', lx, ly, 5, 5); R('#fff', lx + 1, ly + 1, 2, 2);
  for (var hi = 0; hi < 8; hi++) F(hi < P.hp ? '#e33' : '#411', 4 + hi * 7, 4, 6, 6);
  x.font = 'bold 7px monospace';
  txt('▶ ' + OBJ[obj], 4, 22, '#ffd866');
  if (B && B.hp > 0) { F('#000', 60, H - 12, 120, 6); F('#c33', 61, H - 11, 118 * B.hp / 24, 4); }
  var toastOn = false, toastTxt = mt;
  if (UI && typeof UI.toastVisivel === 'function') {
    try {
      var dlgOn = (Dlg && Dlg.isDialogueActive && Dlg.isDialogueActive()) || st === 'talk';
      toastOn = UI.toastVisivel(dlgOn);
      if (toastOn && typeof UI.obterToast === 'function') toastTxt = UI.obterToast().texto;
    } catch (e) { toastOn = tt > 0; }
  } else toastOn = tt > 0;
  if (toastOn) { x.font = 'bold 8px monospace'; txt(toastTxt, W / 2, 38, '#fff', 'center'); }
  x.font = 'bold 8px monospace';
  if (st === 'talk') {
    F('#112', 4, 100, 232, 56);
    F('#aac', 4, 100, 232, 1); F('#aac', 4, 155, 232, 1); F('#aac', 4, 100, 1, 56); F('#aac', 235, 100, 1, 56);
    var cur = linhaDialogoVisivel();
    if (cur) {
      txt(cur[0], 10, 112, '#ffd866');
      var visLines = wrap(cur[1], 216).slice(0, 4);
      for (var li = 0; li < visLines.length; li++) txt(visLines[li], 10, 124 + li * 10);
      if (cur[2] && fr % 40 < 25) txt('▼', 226, 150, '#fff');
    } else if (Dlg && typeof Dlg.obterOpcoesEscolha === 'function') {
      try {
        var opts = Dlg.obterOpcoesEscolha();
        if (opts && opts.length) {
          txt('Escolha:', 10, 112, '#ffd866');
          for (var oi = 0; oi < opts.length; oi++) txt((oi === Dlg.obterIndiceEscolha() ? '▶ ' : '  ') + opts[oi].label, 10, 124 + oi * 10, '#fff');
        }
      } catch (e) {}
    }
    // NOTA: typewriter avança no passo fixo (update), nunca aqui no render (dívida 03 §10 quitada).
  }
  if (menuOpen) {
    F('rgba(0,0,0,.7)', 0, 0, W, H);
    var muted2 = false;
    try { muted2 = Aud && Aud.isMuted && Aud.isMuted(); } catch (e) {}
    var ops = ['Continuar', muted2 ? 'Som: desligado' : 'Som: ligado', 'Reiniciar sala'];
    txt('PAUSA', W / 2, 60, '#ffd866', 'center');
    for (var mi = 0; mi < ops.length; mi++) txt((mi === menuIdx ? '▶ ' : '  ') + ops[mi], W / 2, 78 + mi * 12, '#fff', 'center');
  }
  if (st === 'over') { F('rgba(0,0,0,.7)', 0, 0, W, H); txt('Você caiu...', W / 2, 76, '#f66', 'center'); txt('Toque para tentar de novo', W / 2, 92, '#fff', 'center'); }
  if (st === 'end') {
    F('#000', 0, 0, W, H);
    for (var sti = 0; sti < 30; sti++) F('#fff', (sti * 53) % W, (sti * 37) % H, 1, 1);
    txt('FIM DO CAPÍTULO 1', W / 2, 56, '#ffd866', 'center');
    txt('Próximo: A Cidade de Valdora', W / 2, 76, '#9cf', 'center');
    txt('(em breve)', W / 2, 88, '#9cf', 'center');
    if (fr % 60 < 40) txt('Toque para jogar de novo', W / 2, 126, '#fff', 'center');
  }
  var fadeA = 0;
  try { if (Wd && typeof Wd.getFadeAlpha === 'function') fadeA = Wd.getFadeAlpha() || 0; } catch (e) {}
  if (fadeA > 0) { x.fillStyle = 'rgba(0,0,0,' + Math.max(0, Math.min(1, fadeA)).toFixed(2) + ')'; x.fillRect(0, 0, W, H); }
}

var last = 0, acc = 0;
function loop(t) {
  requestAnimationFrame(loop);
  acc += Math.min(100, t - last); last = t;
  while (acc >= 16.67) { acc -= 16.67; fr++; if (st === 'play' && !menuOpen) update(); }
  render();
}

// ---- input ----
try {
document.querySelectorAll('[data-k]').forEach(function (b) {
  var k = b.dataset.k;
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) {} K[k] = 1; b.classList.add('on'); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { b.addEventListener(n, function () { K[k] = 0; b.classList.remove('on'); }); });
});
document.querySelectorAll('[data-a]').forEach(function (b) {
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); b.classList.add('on'); act(b.dataset.a); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { b.addEventListener(n, function () { b.classList.remove('on'); }); });
});
cv.addEventListener('pointerdown', function () { if (st !== 'play' || menuOpen) act('a'); });
var kk = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
var ka = { KeyZ: 'a', KeyJ: 'a', Space: 'a', Enter: 'a', KeyX: 'b', KeyK: 'b', KeyC: 'c', KeyL: 'c' };
addEventListener('keydown', function (e) {
  if (Aud && typeof Aud.desbloquearAudio === 'function') { try { Aud.desbloquearAudio(); } catch (err) {} }
  if (e.code === 'KeyM' && Aud && typeof Aud.alternarMudo === 'function') { try { Aud.alternarMudo(); } catch (err) {} return; }
  if ((e.code === 'KeyP' || e.code === 'Escape') && st === 'play') {
    menuOpen = !menuOpen; menuIdx = 0;
    if (UI) { try { if (menuOpen) UI.pausarJogo(); else UI.continuarJogo(); } catch (err) {} }
    e.preventDefault(); return;
  }
  if (menuOpen && (e.code === 'ArrowUp' || e.code === 'KeyW')) { menuIdx = (menuIdx + 2) % 3; e.preventDefault(); return; }
  if (menuOpen && (e.code === 'ArrowDown' || e.code === 'KeyS')) { menuIdx = (menuIdx + 1) % 3; e.preventDefault(); return; }
  if (kk[e.code]) { K[kk[e.code]] = 1; e.preventDefault(); }
  if (ka[e.code] && !e.repeat) { act(ka[e.code]); e.preventDefault(); }
});
addEventListener('keyup', function (e) { if (kk[e.code]) K[kk[e.code]] = 0; });
addEventListener('blur', function () { K.u = K.d = K.l = K.r = 0; });

// ---- wiring F0 ----
try { if (UI && typeof UI.iniciarPausaAutomatica === 'function') UI.iniciarPausaAutomatica({}); } catch (e) {}
try {
  if (UI && typeof UI.definirAcaoReiniciarSala === 'function') UI.definirAcaoReiniciarSala(function () { retry(); });
} catch (e) {}
try { if (Sv && typeof Sv.connectSaveToWorld === 'function') Sv.connectSaveToWorld(); } catch (e) {}
try {
  if (Wd && typeof Wd.registerMap === 'function' && typeof Wd.createMapDef === 'function') {
    P = P || { x: 3 * T, y: 16 * T, s: 10, d: 1, hp: 8, inv: 0, at: 0, dash: 0, cd: 0, kx: 0, ky: 0 };
    forest();
    try { Wd.snapshotMvpMap('forest', { spawns: { entrada: { tileX: 3, tileY: 16 } }, bossArena: false }); } catch (e) {}
    arena();
    try { Wd.snapshotMvpMap('arena', { spawns: { entrada: { tileX: 7, tileY: 8 } }, bossArena: true }); } catch (e) {}
    try { Wd.gotoImmediate('forest', 'entrada'); } catch (e) {}
    P = null;
  }
} catch (e) {}
try {
  if (Dlg && typeof Dlg.definirProvedorFlags === 'function' && G) Dlg.definirProvedorFlags(function () { return G.flags || {}; });
} catch (e) {}

try { requestAnimationFrame(loop); } catch (e) {}
} catch (erroInput) {
  try { requestAnimationFrame(loop); } catch (e2) {}
}
})();
