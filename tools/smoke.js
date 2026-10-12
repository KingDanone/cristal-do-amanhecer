#!/usr/bin/env node
'use strict';
/*
 * tools/smoke.js — Teste headless SEM browser do Cap. 1.
 *
 * Carrega `cristal-cap1.html` (+ syntax-check de `src/**\/*.js`) num sandbox
 * `node:vm` com stubs de canvas / AudioContext / localStorage / document, e
 * valida os invariantes do MVP:
 *   - sem erro de sintaxe/execução;
 *   - forest() gera mapa 30×20 determinístico, com portão em (27,3);
 *   - 3 runas (ordem céu→folha→sangue), 7 slimes, chefe com 24 HP;
 *   - máquina do chefe: walk → tel(40f) → slam → rest, fase 2 com 8 raízes;
 *   - diálogo avança (say/nextLine + callback) e cabe em ≤180 chars;
 *   - sem soft-lock: chave alcançável (BFS), portão abre COM chave e trava SEM.
 *
 * Uso: node tools/smoke.js
 * Saída: TAP (ok / not ok) + linha-resumo; exit 0 = tudo PASS, 1 = falha.
 *
 * Só módulos built-in do node (fs/path/vm).
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'cristal-cap1.html');
const SRC = path.join(ROOT, 'src');
const T = 16; // tile (igual ao jogo)

let n = 0, fail = 0;
function t(name, cond, info) {
  n++;
  if (cond) console.log('ok ' + n + ' - ' + name);
  else {
    fail++;
    console.log('not ok ' + n + ' - ' + name);
    if (info) console.log('  # ' + info);
  }
}

function listJs(dir) {
  let out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) { return out; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listJs(full));
    else if (e.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// BFS em tiles: alvo alcançável a partir do spawn só por tiles '.'.
function bfsReach(M, MW, MH, sx, sy, isTarget) {
  const walk = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && M[y][x] === '.';
  if (!walk(sx, sy)) return false;
  const seen = new Set([sy * MW + sx]);
  const q = [[sx, sy]];
  while (q.length) {
    const cur = q.pop(), x = cur[0], y = cur[1];
    if (isTarget(x, y)) return true;
    const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let k = 0; k < nb.length; k++) {
      const nx = nb[k][0], ny = nb[k][1], key = ny * MW + nx;
      if (walk(nx, ny) && !seen.has(key)) { seen.add(key); q.push([nx, ny]); }
    }
  }
  return false;
}

function main() {
  console.log('TAP version 13');

  // --- 1. Carrega o HTML + extrai o <script> ---
  let html;
  try {
    html = fs.readFileSync(HTML, 'utf8');
  } catch (e) {
    console.log('Bail out! não foi possível ler cristal-cap1.html: ' + e.message);
    process.exit(1);
  }
  const blocks = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  if (!blocks.length) {
    console.log('Bail out! nenhum bloco <script> em cristal-cap1.html');
    process.exit(1);
  }
  const gameSrc = blocks.join('\n;\n');

  // --- 2. Syntax-check dos módulos futuros de src/ (pré-F0: pasta vazia) ---
  const srcFiles = listJs(SRC);
  if (!srcFiles.length) {
    t('src/: sem módulos ainda (só MVP em cristal-cap1.html)', true);
  }
  for (const f of srcFiles) {
    try {
      new vm.Script(fs.readFileSync(f, 'utf8'), { filename: path.relative(ROOT, f) });
      t('syntax ok: ' + path.relative(ROOT, f), true);
    } catch (e) {
      t('syntax ok: ' + path.relative(ROOT, f), false, e.message);
    }
  }

  // --- 3. Sandbox headless (stubs) ---
  const memStore = {};
  const memStorage = () => ({
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null),
    setItem: (k, v) => { try { memStore[String(k)] = String(v); } catch (e) { /* sem storage */ } },
    removeItem: (k) => { try { delete memStore[String(k)]; } catch (e) { /* sem storage */ } },
    clear: () => { try { for (const k of Object.keys(memStore)) delete memStore[k]; } catch (e) { /* sem storage */ } },
  });
  // ctx2d: absorve todo desenho; measureText retorna largura fixa.
  const ctxStub = new Proxy({ measureText: () => ({ width: 8 }) }, {
    get(target, p) { return p in target ? target[p] : function () {}; },
    set() { return true; },
  });
  const mkEl = () => ({
    addEventListener() {}, setPointerCapture() {},
    classList: { add() {}, remove() {} }, dataset: {}, style: {},
  });
  const canvasStub = { width: 240, height: 160, addEventListener() {}, setPointerCapture() {} };
  canvasStub.getContext = () => ctxStub;
  const sandbox = {
    console,
    document: {
      getElementById: (id) => (id === 'c' ? canvasStub : mkEl()),
      querySelectorAll: () => [],
      createElement: () => mkEl(),
      addEventListener() {},
    },
    window: {}, // sem AudioContext de propósito: snd() precisa cair no try/catch
    localStorage: memStorage(),
    sessionStorage: memStorage(),
    addEventListener() {},
    requestAnimationFrame: () => 0, // não roda o loop; o teste chama update() direto
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // Driver acoplado no MESMO escopo léxico do jogo (acessa lets/consts internos).
  const driver =
    '\n;globalThis.__T = {\n' +
    '  forest, arena, begin, retry, toBoss, say, nextLine, update, hitRune, hitBoss, attack, dash, shoot,\n' +
    '  snap(){ return {MW,MH,M,E,B,S,RT,items,runes,step,hasKey,obj,st,P,inBoss,q,ql,mt,tt}; },\n' +
    '  setHasKey(v){ hasKey = v; },\n' +
    '  setP(x, y){ P.x = x; P.y = y; },\n' +
    '  setB(mo, ti, hp){ if(!B) return false; if(mo!==undefined) B.m = mo; if(ti!==undefined) B.t = ti; if(hp!==undefined) B.hp = hp; return true; },\n' +
    '  skip(){ let n2 = 0; while(st === "talk" && n2++ < 500) nextLine(); return st; }\n' +
    '};\n';

  try {
    vm.runInContext(gameSrc + driver, sandbox, { filename: 'cristal-cap1.html<script>' });
  } catch (e) {
    console.log('Bail out! erro ao executar o script do jogo: ' + (e && e.stack || e));
    process.exit(1);
  }
  const G = sandbox.__T;
  if (!G) {
    console.log('Bail out! driver __T não instalado (o jogo mudou de estrutura?)');
    process.exit(1);
  }
  t('script carrega sem syntax/runtime error', true);

  // --- 4. Fluxo base: begin() → diálogo intro → play ---
  G.begin();
  let s = G.snap();
  t('begin() abre diálogo de intro (st=talk)', s.st === 'talk', 'st=' + s.st);
  const introQ = JSON.parse(JSON.stringify(s.q || []));
  t('diálogo de intro avança até play', G.skip() === 'play', 'st=' + G.skip());

  // --- 5. Mapa: 30×20, portão, runas, slimes, determinismo ---
  s = G.snap();
  const dimsOk = s.MW === 30 && s.MH === 20 && s.M.length === 20 && s.M[0].length === 30;
  t('forest() gera mapa 30×20', dimsOk, 'MW=' + s.MW + ' MH=' + s.MH);
  t('portão em (27,3)', s.M[3] && s.M[3][27] === 'G', 'M[3][27]=' + (s.M[3] && s.M[3][27]));
  const runesOk = s.runes.length === 3 &&
    s.runes[0].i === 0 && s.runes[1].i === 1 && s.runes[2].i === 2;
  t('3 runas na ordem (i=0,1,2)', runesOk, 'runes=' + s.runes.length);
  t('7 slimes no spawn', s.E.length === 7, 'E=' + s.E.length);
  const m1 = JSON.stringify(s.M) + '|' + s.E.length;
  G.begin(); G.skip();
  const s2 = G.snap();
  t('mapa determinístico (2× begin idêntico)', m1 === JSON.stringify(s2.M) + '|' + s2.E.length);
  const longIntro = introQ.filter((l) => l[1].length > 180);
  t('intro ≤180 chars por caixa', longIntro.length === 0,
    longIntro.length ? JSON.stringify(longIntro[0]).slice(0, 80) : 'max=' + Math.max.apply(null, introQ.map((l) => l[1].length)));

  // --- 6. Enigma → chave (sem soft-lock, parte 1) ---
  s = G.snap();
  G.hitRune(s.runes[0]); G.hitRune(s.runes[1]); G.hitRune(s.runes[2]);
  s = G.snap();
  const key = (s.items || []).filter((it) => it.t === 'k')[0];
  t('runas em ordem geram a chave', !!key && s.step === 3 && s.obj === 2,
    'step=' + s.step + ' obj=' + s.obj + ' items=' + s.items.length);
  let keyReach = false, gateReach = false;
  if (key) {
    const kx = Math.floor(key.x / T), ky = Math.floor(key.y / T);
    keyReach = bfsReach(s.M, s.MW, s.MH, 3, 16, (x, y) => x === kx && y === ky);
  }
  gateReach = bfsReach(s.M, s.MW, s.MH, 3, 16, (x, y) =>
    (x === 27 && y === 4) || (x === 26 && y === 3) || (x === 28 && y === 3) || (x === 27 && y === 2));
  t('chave alcançável a pé desde o spawn (BFS, sem atravessar parede)', keyReach);
  t('portão alcançável a pé desde o spawn (BFS)', gateReach);

  // --- 7. Portão abre COM chave / trava SEM chave ---
  G.setP(27 * T + 8 - 5, 4 * T + 8 - 5); // centro do tile (27,4), a 16px do portão
  G.setHasKey(true);
  for (let i = 0; i < 5 && !G.snap().inBoss; i++) G.update();
  s = G.snap();
  t('portão abre com a chave (vai ao chefe, obj=4)', s.inBoss === true && s.obj === 4,
    'inBoss=' + s.inBoss + ' obj=' + s.obj);
  G.begin(); G.skip(); // recomeça: sem chave
  G.setP(27 * T + 8 - 5, 4 * T + 8 - 5);
  for (let i = 0; i < 5; i++) G.update();
  s = G.snap();
  t('portão trava sem a chave (sem soft-lock silencioso: avisa)',
    s.inBoss === false && /Trancado/.test(s.mt || ''), 'inBoss=' + s.inBoss + ' mt=' + JSON.stringify(s.mt));

  // --- 8. Chefe: 24 HP + máquina walk→tel→slam→rest + fase 2 ---
  G.toBoss();
  const bossQ = JSON.parse(JSON.stringify(G.snap().q || []));
  G.skip();
  s = G.snap();
  t('chefe nasce com 24 HP em walk', !!s.B && s.B.hp === 24 && s.B.m === 'walk',
    'B=' + (s.B ? s.B.hp + '/' + s.B.m : 'null'));
  const longBoss = bossQ.filter((l) => l[1].length > 180);
  t('intro do chefe ≤180 chars por caixa', longBoss.length === 0);
  G.setB('walk', 1); G.update(); s = G.snap();
  const telOk = s.B.m === 'tel' && s.B.t === 40;
  t('walk → tel(40f)', telOk, 'm=' + s.B.m + ' t=' + s.B.t);
  t('telegraph ≥30f', s.B.t >= 30, 't=' + s.B.t);
  G.setB('tel', 1); G.update(); s = G.snap();
  const slamOk = s.B.m === 'slam';
  t('tel → slam', slamOk, 'm=' + s.B.m);
  G.setB('slam', 1); G.update(); s = G.snap();
  const restOk = s.B.m === 'rest' && s.B.t === 50;
  t('slam → rest(50f)', restOk, 'm=' + s.B.m + ' t=' + s.B.t);
  G.setB('rest', 1); G.update(); s = G.snap();
  t('rest → walk', s.B.m === 'walk', 'm=' + s.B.m);
  G.setB('tel', 1, 10); G.update(); s = G.snap(); // fase 2: hp<12
  t('fase 2 (hp<12) dispara 8 raízes radiais', s.B.m === 'slam' && s.RT.length === 8,
    'm=' + s.B.m + ' RT=' + s.RT.length);

  // --- 9. Diálogo genérico: avança + callback + restaura estado ---
  let cbCalled = false;
  sandbox.__cb = () => { cbCalled = true; };
  vm.runInContext('__T.say([["A","um"],["B","dois"]], __cb)', sandbox);
  const stTalk = G.snap().st === 'talk';
  G.skip();
  s = G.snap();
  t('say/nextLine avança, restaura st e chama callback',
    stTalk && cbCalled && s.st === 'play', 'st=' + s.st + ' cb=' + cbCalled);

  console.log('1..' + n);
  console.log(fail === 0 ? '# PASS ' + n + '/' + n : '# FAIL ' + fail + '/' + n);
  process.exit(fail === 0 ? 0 : 1);
}

main();
