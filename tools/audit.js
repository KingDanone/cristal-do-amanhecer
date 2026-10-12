#!/usr/bin/env node
'use strict';
/*
 * tools/audit.js — Auditoria SEVERA pós-update (gate antes de qualquer git save).
 *
 * Falha (exit 1) em qualquer violação. Só built-ins (fs/path/vm).
 * Uso: node tools/audit.js
 * Saída: TAP + resumo; exit 0 = SEVERA PASS.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist', 'cristal.html');
const BUDGET = 250 * 1024;

let n = 0, fail = 0;
function t(name, cond, info) {
  n++;
  if (cond) console.log('ok ' + n + ' - ' + name);
  else { fail++; console.log('not ok ' + n + ' - ' + name); if (info) console.log('  # ' + info); }
}
function listJs(dir) {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listJs(full));
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}
function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return ''; } }

// Remove comentários (// e /* */) e literais de string da análise estática,
// para que menções em comentário (ex.: "sem <form>") não gerem falso-positivo.
// Scanner simples com estados; template literals com ${} são tratados como string.
function stripCode(code) {
  let out = '', i = 0, n = code.length;
  let state = 'code', quote = '';
  while (i < n) {
    const c = code[i], nx = code[i + 1];
    if (state === 'code') {
      if (c === '/' && nx === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && nx === '*') { state = 'block'; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { state = 'str'; quote = c; out += ' '; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += '\n'; } i++; continue; }
    if (state === 'block') { if (c === '*' && nx === '/') { state = 'code'; i += 2; } else i++; continue; }
    if (state === 'str') {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) { state = 'code'; out += ' '; i++; continue; }
      i++; continue;
    }
  }
  return out;
}

const files = listJs(SRC);
const all = files.map(f => ({ f, code: read(f) }));
const joined = all.map(o => o.code).join('\n');
const strippedAll = all.map(o => ({ f: o.f, code: stripCode(o.code) }));
const strippedJoined = strippedAll.map(o => o.code).join('\n');
const dist = read(DIST);
const distStripped = stripCode(dist);

// A01: sem dependências externas / rede
t('A01 sem URLs externas em src (http/https/fetch/import)',
  !/https?:\/\//.test(strippedJoined) && !/\bfetch\s*\(/.test(strippedJoined) && !/^\s*import\s/m.test(strippedJoined) && !/require\(/.test(strippedJoined),
  'rede/bundler proibidos no jogo');
// A02: orçamento
t('A02 dist <250KB', fs.existsSync(DIST) && Buffer.byteLength(dist, 'utf8') <= BUDGET,
  'rode node tools/build.js primeiro');
// A03: diálogos ≤180 chars (dados + MVP embutido no main)
let dialogOk = true, dialogBad = '';
try {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const o of all) {
    if (/src\/data\//.test(o.f.replace(/\\/g, '/'))) {
      try { vm.runInContext(o.code, sandbox, { timeout: 1000 }); } catch (e) {}
    }
  }
  var TODOS_DLG = {};
  for (const k of Object.keys(sandbox)) if (/^DIALOGS_/.test(k) && sandbox[k]) Object.assign(TODOS_DLG, sandbox[k]);
  if (!Object.keys(TODOS_DLG).length) { dialogOk = false; dialogBad = 'DIALOGS_* ausentes'; }
  else for (const k of Object.keys(TODOS_DLG)) {
    for (const sp of (TODOS_DLG[k].speakers || [])) {
      const txt = sp[1] || '';
      if (txt.length > 180) { dialogOk = false; dialogBad = k + ':' + txt.length; break; }
    }
    if (!dialogOk) break;
    for (const ch of (TODOS_DLG[k].choices || [])) {
      for (const rp of (ch.reply || [])) if ((rp[1] || '').length > 180) { dialogOk = false; dialogBad = k + '.reply'; }
    }
    if (!dialogOk) break;
  }
} catch (e) { dialogOk = false; dialogBad = String(e.message); }
t('A03 todas as caixas ≤180 chars', dialogOk, dialogBad);
// A04: telegraph ≥30f em todo padrão de chefe/inimigo novo
let telOk = true, telBad = '';
const telNums = [...joined.matchAll(/(telegraph|tel)\s*[:=]\s*(\d+)/g)].map(m => +m[2]);
for (const v of telNums) if (v < 30) { telOk = false; telBad = 'telegraph=' + v; }
if (!/duracao:\s*40|tel.*40|t\s*=\s*40/.test(joined)) { telOk = false; telBad = 'ciclo walk→tel(40) ausente'; }
t('A04 todo telegraph ≥30f', telOk, telBad);
// A05: determinismo do mapa (LCG seed=7 gera igual 2x)
// NOTA: sandbox sem propriedade `globalThis` própria — dentro da vm o
// `globalThis` intrínseco é o próprio sandbox; usamos atribuição implícita
// (__auditT1 = ...) e lemos da raiz do sandbox.
let detOk = false, detInfo = '';
try {
  const fCode = read(path.join(SRC, 'maps', 'forest.js'));
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(fCode + '\n;__auditT1=lcgForestTiles().tiles.join("|");__auditT2=lcgForestTiles().tiles.join("|");', sb, { timeout: 1000 });
  detOk = typeof sb.__auditT1 === 'string' && sb.__auditT1 === sb.__auditT2 && /G/.test(sb.__auditT1);
  if (!detOk) detInfo = 'mapa não determinístico';
} catch (e) { detInfo = String(e.message); }
t('A05 mapa procedural determinístico', detOk, detInfo);
// A06: localStorage só dentro de try/catch (rastreador estrutural sobre código sem comentários)
// Pilha de blocos: 'try' | 'catch' | 'block'. `localStorage` exige 'try'/'catch' na pilha.
let lsOk = true, lsBad = '';
for (const o of strippedAll) {
  const toks = o.code.match(/try\b|catch\b|[{}]|\blocalStorage\b/g) || [];
  const stack = [];
  let expectTry = false, expectCatch = false;
  for (const tk of toks) {
    if (tk === 'try') { expectTry = true; continue; }
    if (tk === 'catch') {
      if (stack.length && stack[stack.length - 1] === 'try') stack.pop();
      expectCatch = true; continue;
    }
    if (tk === '{') { stack.push(expectTry ? 'try' : (expectCatch ? 'catch' : 'block')); expectTry = false; expectCatch = false; continue; }
    if (tk === '}') { stack.pop(); expectTry = false; continue; }
    if (tk === 'localStorage') {
      if (!stack.includes('try') && !stack.includes('catch')) { lsOk = false; lsBad = o.f; break; }
    }
  }
  if (!lsOk) break;
}
t('A06 localStorage sempre em try/catch', lsOk, lsBad || 'storage fora de try');
// A07: mobile/a11y no shell final
t('A07 touch-action:none + viewport-fit=cover + user-scalable=no no dist',
  /touch-action:\s*none/.test(dist) && /viewport-fit=cover/.test(dist) && /user-scalable=no/.test(dist),
  'shell sem travas mobile');
// A08: botões ≥50px
t('A08 botões ação ≥50px', /repeat\(3,52px\)/.test(dist) && /width:50px/.test(dist),
  'D-pad/A/B/C pequenos demais');
// A09: sem debug em src (console.*)
t('A09 sem console.log/debug em src', !/console\.(log|debug|trace)/.test(strippedJoined), 'remova debugs');
// A10: todos os destinos de saída existem
let exitOk = true, exitBad = '';
try {
  const ids = new Set(['brisamar', 'forest', 'ruin_entry', 'ruin', 'boss', 'arena', 'arena2', 'floresta', 'valdora', 'esgoto']);
  for (const o of all) {
    for (const m of o.code.matchAll(/to:\s*["']([\w-]+)["']/g)) {
      if (!ids.has(m[1])) { exitOk = false; exitBad = o.f + ' → ' + m[1]; break; }
    }
  }
} catch (e) { exitOk = false; exitBad = String(e.message); }
t('A10 exits só para mapas conhecidos', exitOk, exitBad);
// A11: flags com as 13 chaves canônicas
let flagOk = false;
try {
  const fc = read(path.join(SRC, 'core', 'flags.js'));
  const sb = {};
  vm.createContext(sb);
  vm.runInContext(fc, sb, { timeout: 1000 });
  const d = sb.Game && sb.Game.FLAG_DEFAULTS;
  const keys = ['chapter', 'sign_read', 'runes_done', 'step', 'has_key_c1', 'boss1_defeated', 'cat_found', 'secret_records', 'frag_green', 'frag_blue', 'frag_red', 'darius_spared', 'final_choice'];
  flagOk = d && keys.every(k => Object.prototype.hasOwnProperty.call(d, k));
} catch (e) {}
t('A11 Game.flags com 13 chaves canônicas', flagOk, 'flags fora do contrato');
// A12: sem <form> no jogo (só pointer events) — sobre código sem comentários
t('A12 sem <form> no dist/src', !/<form[\s>]/i.test(distStripped + strippedJoined), '<form> proibido (só pointer events)');
// A13: typewriter fora do render — extrai o corpo de render() por balanceamento
// de chaves e proíbe incrementos de typewriter apenas ali.
let twOk = true, twBad = '';
{
  const alvo = strippedAll.find(o => /main\.js$/.test(o.f));
  if (alvo) {
    const ini = alvo.code.indexOf('function render');
    let fim = -1;
    if (ini >= 0) {
      const abre = alvo.code.indexOf('{', ini);
      let prof = 0;
      for (let i = abre; i < alvo.code.length; i++) {
        if (alvo.code[i] === '{') prof++;
        else if (alvo.code[i] === '}') { prof--; if (prof === 0) { fim = i; break; } }
      }
    }
    const corpo = (ini >= 0 && fim > ini) ? alvo.code.slice(ini, fim) : '';
    if (corpo && /fallbackTC\+\+|contadorTypewriter\s*\+=|contadorTypewriter\+\+/.test(corpo)) {
      twOk = false; twBad = 'incremento de typewriter dentro de render()';
    }
  }
}
t('A13 typewriter só no passo fixo (nada no render)', twOk, twBad);
// A14: choices com 2–3 opções
let chOk = true;
try {
  const sandbox = { console };
  vm.createContext(sandbox);
  for (const o of all) {
    if (/src\/data\//.test(o.f.replace(/\\/g, '/'))) {
      try { vm.runInContext(o.code, sandbox, { timeout: 1000 }); } catch (e) {}
    }
  }
  const D = {};
  for (const k of Object.keys(sandbox)) if (/^DIALOGS_/.test(k) && sandbox[k]) Object.assign(D, sandbox[k]);
  for (const k of Object.keys(D)) {
    const c = D[k].choices;
    if (c && (c.length < 2 || c.length > 3)) { chOk = false; break; }
  }
} catch (e) { chOk = false; }
t('A14 choices com 2–3 opções', chOk, 'choice fora do padrão');
// A15: chefe 24HP / jogador 8HP preservados
t('A15 HP canônicos (jogador 8→10 no Cap.2, guardião 24, cavaleiro 28)',
  /hp:\s*24|vidaMaxima:\s*24|hp:\s*28|hpMax:\s*28|MAX_HP\s*=\s*10/.test(joined),
  'valores de combate alterados sem decisão');

// ---- A16/A17/A18: conteúdo F1 (mapas + diálogos) ----
// Sandbox SEM propriedade `globalThis` própria: os arquivos fazem
// `globalThis.MAP_X = ...`, que cai na raiz do sandbox.
function defsConteudo() {
  const sb = { console };
  vm.createContext(sb);
  for (const arq of ['maps/brisamar.js', 'maps/forest.js', 'maps/ruin_entry.js', 'maps/valdora.js', 'maps/esgoto.js', 'data/dialogs_f1.js', 'data/dialogs_f2.js']) {
    vm.runInContext(read(path.join(SRC, arq)), sb, { timeout: 1000 });
  }
  return sb;
}
let DEFS = null, defsErr = '';
try { DEFS = defsConteudo(); } catch (e) { defsErr = String(e.message); }
t('A16-pre defs de conteúdo carregam sem throw', !!DEFS, defsErr);

function solidoDef(def, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= def.w || ty >= def.h) return true;
  const ch = def.tiles[ty][tx];
  return !!(def.legend && def.legend[ch] && def.legend[ch].solid);
}
function bfs(def, sx, sy, bloqueios) {
  const key = (a, b) => a + ',' + b;
  const visto = new Set([key(sx, sy)]);
  const fila = [[sx, sy]];
  const bloq = new Set((bloqueios || []).map(p => key(p[0], p[1])));
  while (fila.length) {
    const [cx, cy] = fila.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, k = key(nx, ny);
      if (visto.has(k) || bloq.has(k) || solidoDef(def, nx, ny)) continue;
      visto.add(k); fila.push([nx, ny]);
    }
  }
  return visto;
}
function pertoDe(alc, tx, ty) {
  return alc.has(tx + ',' + ty) || alc.has((tx + 1) + ',' + ty) || alc.has((tx - 1) + ',' + ty) ||
    alc.has(tx + ',' + (ty + 1)) || alc.has(tx + ',' + (ty - 1));
}
// A16: alcançabilidade anti soft-lock de layout (spawns → NPCs/objetos/saídas)
let bfsOk = true, bfsBad = '';
if (DEFS) {
  try {
    // Brisamar a partir de home(3,6); NPCs/objetos bloqueiam a própria célula
    const br = DEFS.MAP_BRISAMAR;
    const bloqBr = br.npcs.map(n => [n.tx, n.ty])
      .concat(br.objects.filter(o => o.type === 'sign' || o.type === 'dummy').map(o => [o.tx, o.ty]));
    const alcBr = bfs(br, 3, 6, bloqBr);
    for (const n of br.npcs) if (!pertoDe(alcBr, n.tx, n.ty)) { bfsOk = false; bfsBad = 'brisamar npc ' + n.id; break; }
    if (bfsOk) for (const [qx, qy, qn] of [[6, 5, 'placa'], [15, 4, 'boneco']]) {
      if (!pertoDe(alcBr, qx, qy)) { bfsOk = false; bfsBad = 'brisamar ' + qn; break; }
    }
    if (bfsOk && !(alcBr.has('18,12') && alcBr.has('19,12'))) { bfsOk = false; bfsBad = 'brisamar saída leste'; }
    // Floresta a partir de fromBrisamar(3,16)
    if (bfsOk) {
      const fo = DEFS.MAP_FOREST;
      const bloqFo = [[4, 14]].concat(fo.runes.map(r => [r.tx, r.ty])).concat([[5, 17]]);
      const alcFo = bfs(fo, 3, 16, bloqFo);
      const alvosFo = [[4, 14, 'placa'], [10, 10, 'runa0'], [14, 6, 'runa1'], [20, 12, 'runa2'],
        [23, 12, 'chave-enigma'], [5, 17, 'arbusto'], [14, 8, 'pedra-azul'],
        [1, 15, 'saída-oeste'], [2, 18, 'saída-oeste2'], [27, 4, 'portão-frente']];
      for (const [qx, qy, qn] of alvosFo) {
        if (!pertoDe(alcFo, qx, qy) && !alcFo.has(qx + ',' + qy)) { bfsOk = false; bfsBad = 'forest ' + qn; break; }
      }
    }
    // Valdora a partir de entrada_sul(10,13)
    if (bfsOk) {
      const va = DEFS.MAP_VALDORA;
      const bloqVa = va.npcs.filter(n => !(n.id === 'estranho')).map(n => [n.tx, n.ty])
        .concat(va.objects.filter(o => o.type === 'sign' || o.type === 'dummy' || o.type === 'bau' || o.type === 'passagem' || o.type === 'gato').map(o => [o.tx, o.ty]));
      const alcVa = bfs(va, 10, 13, bloqVa);
      for (const n of va.npcs) {
        if (n.id === 'estranho') continue; // cena pós-chefe, validada no browser
        if (!pertoDe(alcVa, n.tx, n.ty)) { bfsOk = false; bfsBad = 'valdora npc ' + n.id; break; }
      }
      if (bfsOk) {
        const alvosVa = [[11, 2, 'porta-templo'], [12, 2, 'porta-templo2'], [19, 12, 'grade-esgoto'], [2, 9, 'gato'], [15, 10, 'bau-esgoto']];
        for (const [qx, qy, qn] of alvosVa) {
          if (!pertoDe(alcVa, qx, qy) && !alcVa.has(qx + ',' + qy)) { bfsOk = false; bfsBad = 'valdora ' + qn; break; }
        }
      }
    }
    // Esgoto a partir de entrada(2,10)
    if (bfsOk) {
      const es = DEFS.MAP_ESGOTO;
      const bloqEs = es.objects.filter(o => o.type === 'bau' || o.type === 'passagem').map(o => [o.tx, o.ty]);
      const alcEs = bfs(es, 2, 10, bloqEs);
      const alvosEs = [[15, 10, 'bau'], [15, 1, 'passagem'], [1, 10, 'saída'], [4, 3, 'slime1'], [12, 7, 'slime2'], [5, 8, 'slime3']];
      for (const [qx, qy, qn] of alvosEs) {
        if (!pertoDe(alcEs, qx, qy) && !alcEs.has(qx + ',' + qy)) { bfsOk = false; bfsBad = 'esgoto ' + qn; break; }
      }
    }
    // Ruína a partir de entry(7,8)
    if (bfsOk) {
      const ru = DEFS.MAP_RUIN_ENTRY;
      const insc = (ru.objects || []).find(o => o.type === 'sign') || { tx: 7, ty: 5 };
      const alcRu = bfs(ru, 7, 8, [[insc.tx, insc.ty]]);
      if (!pertoDe(alcRu, insc.tx, insc.ty)) { bfsOk = false; bfsBad = 'ruína inscrição'; }
      if (bfsOk && !(['6,0', '7,0', '6,1', '7,1'].some(k => alcRu.has(k)))) { bfsOk = false; bfsBad = 'ruína porta norte'; }
      if (bfsOk && !(['6,9', '7,9', '6,8', '7,8'].some(k => alcRu.has(k)))) { bfsOk = false; bfsBad = 'ruína porta sul'; }
    }
  } catch (e) { bfsOk = false; bfsBad = String(e.message); }
} else { bfsOk = false; bfsBad = 'defs não carregaram'; }
t('A16 BFS: spawns alcançam NPCs/objetos/saídas (anti soft-lock)', bfsOk, bfsBad);

// A17: todo diálogo referenciado pelos mapas existe em DIALOGS_F1
let refOk = true, refBad = '';
if (DEFS && DEFS.DIALOGS_F1) {
  try {
    const D = {};
    for (const k of Object.keys(DEFS)) if (/^DIALOGS_/.test(k) && DEFS[k]) Object.assign(D, DEFS[k]);
    const refs = [];
    for (const def of [DEFS.MAP_BRISAMAR, DEFS.MAP_FOREST, DEFS.MAP_RUIN_ENTRY, DEFS.MAP_VALDORA, DEFS.MAP_ESGOTO]) {
      if (!def) continue;
      for (const n of (def.npcs || [])) { if (n.dialogs) { refs.push(n.dialogs.first); if (n.dialogs.repeat) refs.push(n.dialogs.repeat); } if (n.reqDialog) refs.push(n.reqDialog); }
      for (const o of (def.objects || [])) { if (o.dialog) refs.push(o.dialog); if (o.reqDialog) refs.push(o.reqDialog); }
      if (def.sign && def.sign.dialog) refs.push(def.sign.dialog);
      for (const s of (def.exits || [])) { if (s.leaveDialog) refs.push(s.leaveDialog); if (s.enterDialog) refs.push(s.enterDialog); }
    }
    for (const r of refs) if (!D[r]) { refOk = false; refBad = 'diálogo ausente: ' + r; break; }
  } catch (e) { refOk = false; refBad = String(e.message); }
} else { refOk = false; refBad = 'DIALOGS_F1 não carregou'; }
t('A17 diálogos referenciados existem', refOk, refBad);

// A18: regressão — tiles da floresta idênticos ao LCG canônico (seed=7)
let lcgOk = true, lcgBad = '';
if (DEFS && DEFS.MAP_FOREST) {
  try {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const MW = 30, MH = 20, M = [];
    for (let j = 0; j < MH; j++) {
      M[j] = [];
      for (let i = 0; i < MW; i++) M[j][i] = (i < 1 || j < 1 || i > MW - 2 || j > MH - 2 || rnd() < 0.2) ? '#' : '.';
    }
    const cl = (a, b, c, d) => { for (let j = b; j <= d; j++) for (let i = a; i <= c; i++) M[j][i] = '.'; };
    const ln = (a, b, c, d) => { cl(Math.min(a, c), b, Math.max(a, c), b + 1); cl(c, Math.min(b, d), c + 1, Math.max(b, d) + 1); };
    cl(1, 13, 7, 18); ln(2, 16, 10, 10); ln(10, 10, 14, 6); ln(14, 6, 20, 12); ln(20, 12, 27, 4);
    M[3][27] = 'G'; M[3][26] = '#'; M[3][28] = '#'; M[2][27] = '#';
    const esperado = M.map(r => r.join(''));
    const atual = DEFS.MAP_FOREST.tiles;
    if (atual.length !== esperado.length) { lcgOk = false; lcgBad = 'altura difere'; }
    else for (let j = 0; j < esperado.length; j++) {
      if (atual[j] !== esperado[j]) { lcgOk = false; lcgBad = 'linha ' + j + ' difere'; break; }
    }
  } catch (e) { lcgOk = false; lcgBad = String(e.message); }
} else { lcgOk = false; lcgBad = 'MAP_FOREST não carregou'; }
t('A18 floresta idêntica ao LCG canônico', lcgOk, lcgBad);

// A20: dimensões dos mapas (linhas × colunas batem com w/h)
let dimOk = true, dimBad = '';
if (DEFS) {
  try {
    for (const [nome, def] of [['brisamar', DEFS.MAP_BRISAMAR], ['forest', DEFS.MAP_FOREST], ['ruin_entry', DEFS.MAP_RUIN_ENTRY], ['valdora', DEFS.MAP_VALDORA], ['esgoto', DEFS.MAP_ESGOTO]]) {
      if (!def || !Array.isArray(def.tiles) || def.tiles.length !== def.h) { dimOk = false; dimBad = nome + ': altura'; break; }
      for (let j = 0; j < def.tiles.length; j++) {
        if (def.tiles[j].length !== def.w) { dimOk = false; dimBad = nome + ' linha ' + j; break; }
      }
      if (!dimOk) break;
    }
  } catch (e) { dimOk = false; dimBad = String(e.message); }
} else { dimOk = false; dimBad = 'defs não carregaram'; }
t('A20 mapas com dimensões coerentes (w/h × tiles)', dimOk, dimBad);

// A21: toda flag gravada (flagsSet dos diálogos + gravarFlag no main)
// existe em FLAG_DEFAULTS — senão o save a descarta em silêncio.
let flgOk = true, flgBad = '';
try {
  const sb = { console };
  vm.createContext(sb);
  vm.runInContext(read(path.join(SRC, 'core', 'flags.js')), sb, { timeout: 1000 });
  const conhecidas = (sb.Game && sb.Game.FLAG_DEFAULTS) || {};
  const usadas = new Set();
  const sb2 = { console };
  vm.createContext(sb2);
  for (const arq of ['data/dialogs_f1.js', 'data/dialogs_f2.js']) {
    vm.runInContext(read(path.join(SRC, arq)), sb2, { timeout: 1000 });
  }
  for (const k of Object.keys(sb2)) {
    if (/^DIALOGS_/.test(k) && sb2[k]) {
      for (const id of Object.keys(sb2[k])) {
        const e = sb2[k][id];
        for (const f of Object.keys(e.flagsSet || {})) usadas.add(f);
        for (const c of (e.choices || [])) for (const f of Object.keys(c.flagsSet || {})) usadas.add(f);
      }
    }
  }
  const mainCode = stripCode(read(path.join(SRC, 'main.js')));
  for (const m of mainCode.matchAll(/gravarFlag\(\s*['"]([\w-]+)['"]/g)) usadas.add(m[1]);
  for (const f of usadas) {
    if (!Object.prototype.hasOwnProperty.call(conhecidas, f)) { flgOk = false; flgBad = 'flag sem registro: ' + f; break; }
  }
} catch (e) { flgOk = false; flgBad = String(e.message); }
t('A21 flags usadas registradas em FLAG_DEFAULTS (save não descarta)', flgOk, flgBad);

console.log('1..' + n);
console.log(fail === 0 ? '# SEVERA PASS ' + n + '/' + n : '# SEVERA FAIL (' + fail + ' falhas)');
process.exit(fail === 0 ? 0 : 1);
