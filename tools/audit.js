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
  const sandbox = { globalThis: {} };
  vm.createContext(sandbox);
  for (const o of all) {
    if (/dialogs_f1|DIALOGS/.test(o.f) || /DIALOGS_F1\s*=/.test(o.code)) {
      try { vm.runInContext(o.code, sandbox, { timeout: 1000 }); } catch (e) {}
    }
  }
  const D = sandbox.DIALOGS_F1 || sandbox.globalThis.DIALOGS_F1;
  if (D) for (const k of Object.keys(D)) {
    for (const sp of (D[k].speakers || [])) {
      const txt = sp[1] || '';
      if (txt.length > 180) { dialogOk = false; dialogBad = k + ':' + txt.length; break; }
    }
    for (const ch of (D[k].choices || [])) {
      for (const rp of (ch.reply || [])) if ((rp[1] || '').length > 180) { dialogOk = false; dialogBad = k + '.reply'; }
    }
  }
  else { dialogOk = false; dialogBad = 'DIALOGS_F1 ausente'; }
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
  const ids = new Set(['brisamar', 'forest', 'ruin_entry', 'boss', 'arena', 'floresta']);
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
  const sandbox = { globalThis: {} };
  vm.createContext(sandbox);
  const dc = all.find(o => /dialogs_f1/.test(o.f));
  if (dc) vm.runInContext(dc.code, sandbox, { timeout: 1000 });
  const D = sandbox.DIALOGS_F1 || sandbox.globalThis.DIALOGS_F1 || {};
  for (const k of Object.keys(D)) {
    const c = D[k].choices;
    if (c && (c.length < 2 || c.length > 3)) { chOk = false; break; }
  }
} catch (e) { chOk = false; }
t('A14 choices com 2–3 opções', chOk, 'choice fora do padrão');
// A15: chefe 24HP / jogador 8HP preservados
t('A15 HP canônicos (jogador 8, guardião 24)',
  /hp:\s*24|vidaMaxima:\s*24|hp=8|hp:\s*8|MAX_HP\s*=\s*8/.test(joined),
  'valores de combate alterados sem decisão');

console.log('1..' + n);
console.log(fail === 0 ? '# SEVERA PASS ' + n + '/' + n : '# SEVERA FAIL (' + fail + ' falhas)');
process.exit(fail === 0 ? 0 : 1);
