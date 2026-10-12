#!/usr/bin/env node
'use strict';
/*
 * tools/build.js — Empacota o jogo em UM único arquivo HTML (entregável).
 *
 * Concatena os módulos de `src/` + CSS/HTML em `dist/cristal.html`:
 *   ordem do JS: core → systems → maps → data → main (top-level, main.js por último)
 *   CSS: todos os `src/**\/*.css` (ordem alfabética)
 *   HTML: `src/html/shell.html` se existir (tokens <!--BUILD:CSS-->, <!--BUILD:JS-->),
 *         senão um shell padrão (mesmo layout mobile do MVP: canvas 240×160, #pad).
 *
 * Sem libs externas — só `node:fs` + `node:path`.
 *
 * Uso:
 *   node tools/build.js [--check-size] [--out dist/cristal.html]
 *
 * Regras:
 *   - Falha (exit 1) se o arquivo final passar de 250 KB (orçamento do DEV_PLAN).
 *   - Se `src/` ainda não tem .js (pré-F0), usa `cristal-cap1.html` como fallback
 *     LEGADO e copia para o destino (com o mesmo teto de tamanho).
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LEGACY = path.join(ROOT, 'cristal-cap1.html');
const BUDGET = 250 * 1024; // 250 KB

const JS_RANK = { core: 0, systems: 1, maps: 2, data: 3 };

function fail(msg) {
  console.error('BUILD FAIL: ' + msg);
  process.exit(1);
}

function ok(msg) {
  console.log('BUILD: ' + msg);
}

// Lista recursiva de arquivos com a extensão dada, com paths relativos a SRC.
function listFiles(dir, ext, base) {
  base = base || dir;
  let out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out; // diretório ausente = lista vazia (src/ pode estar vazio pré-F0)
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(full, ext, base));
    else if (e.name.endsWith(ext)) out.push(path.relative(base, full));
  }
  return out;
}

function jsRankKey(rel) {
  const parts = rel.split(path.sep);
  if (parts.length === 1) {
    // top-level = "main": main.js sempre por último
    return parts[0] === 'main.js' ? [4, '￿'] : [4, rel];
  }
  const top = parts[0];
  if (Object.prototype.hasOwnProperty.call(JS_RANK, top)) return [JS_RANK[top], rel];
  return [5, rel]; // pastas futuras desconhecidas entram depois de data/, antes do main
}

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function escJsForHtml(js) {
  // Evita que "</script" dentro do JS feche o bloco <script> do HTML final.
  return js.replace(/<\/script/gi, '<\\/script');
}

const DEFAULT_CSS = [
  '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:none}',
  ':root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}',
  'html,body{margin:0;height:100%;background:#111;overflow:hidden;font-family:monospace;color:#fff}',
  'body{display:flex;flex-direction:column;align-items:center;justify-content:space-between;background:#111}',
  '#c{width:min(100vw,calc((100vh - 190px)*1.5));width:min(100vw,calc((100dvh - 190px)*1.5));aspect-ratio:3/2;image-rendering:pixelated;background:#000;display:block}',
  '#pad{display:flex;justify-content:space-between;align-items:center;width:100%;max-width:520px;padding:6px 18px 12px;height:170px}',
  '#dp{display:grid;grid-template:repeat(3,52px)/repeat(3,52px);gap:2px}',
  '#ac{position:relative;width:170px;height:140px}',
  '.b{display:flex;align-items:center;justify-content:center;background:#334;border:2px solid #667;border-radius:12px;font-style:normal;font-size:20px;color:#ccd}',
  '.b.on{background:#669}',
  '#ac .b{position:absolute;width:60px;height:60px;border-radius:50%;font-weight:bold}',
].join('\n');

function defaultShell(css, js) {
  return (
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n' +
    '<title>Cristal do Amanhecer</title>\n' +
    '<style>\n' + css + '\n</style></head><body>\n' +
    '<canvas id="c" width="240" height="160"></canvas>\n' +
    '<div id="pad">\n' +
    '<div id="dp"><i class="b" data-k="u" style="grid-area:1/2">▲</i>' +
    '<i class="b" data-k="l" style="grid-area:2/1">◀</i>' +
    '<i class="b" data-k="r" style="grid-area:2/3">▶</i>' +
    '<i class="b" data-k="d" style="grid-area:3/2">▼</i></div>\n' +
    '<div id="ac"><i class="b" data-a="a" style="right:0;top:55px">A</i>' +
    '<i class="b" data-a="b" style="right:62px;top:80px;width:50px;height:50px">B</i>' +
    '<i class="b" data-a="c" style="right:44px;top:0;width:50px;height:50px">C</i></div>\n' +
    '</div>\n' +
    '<script>\n' + js + '\n</script></body></html>\n'
  );
}

function main() {
  const args = process.argv.slice(2);
  let out = path.join(ROOT, 'dist', 'cristal.html');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) out = path.resolve(ROOT, args[++i]);
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Uso: node tools/build.js [--check-size] [--out dist/cristal.html]');
      return;
    } else if (args[i] !== '--check-size') {
      fail('argumento desconhecido: ' + args[i] + ' (ver --help)');
    }
  }

  const jsFiles = listFiles(SRC, '.js').sort((a, b) => {
    const ka = jsRankKey(a), kb = jsRankKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0;
  });
  const cssFiles = listFiles(SRC, '.css');

  let html;
  if (jsFiles.length === 0) {
    // Pré-F0: src/ ainda não tem módulos — fallback legado.
    if (!fs.existsSync(LEGACY)) fail('src/ vazio e ' + LEGACY + ' não encontrado; nada para empacotar.');
    html = fs.readFileSync(LEGACY, 'utf8');
    ok('LEGACY fallback: src/ sem .js — copiando cristal-cap1.html');
  } else {
    const css = cssFiles.length > 0 ? cssFiles.map(readSrc).join('\n') : DEFAULT_CSS;
    ok('CSS: ' + (cssFiles.length > 0 ? cssFiles.join(', ') : '(padrão embutido, src/ sem .css)'));
    const js = jsFiles
      .map((rel) => '/* === ' + rel + ' === */\n' + readSrc(rel))
      .join('\n;\n');
    ok('JS (' + jsFiles.length + '): ' + jsFiles.join(', '));
    const shellPath = path.join(SRC, 'html', 'shell.html');
    if (fs.existsSync(shellPath)) {
      const shell = fs.readFileSync(shellPath, 'utf8');
      if (shell.indexOf('<!--BUILD:JS-->') < 0) fail('src/html/shell.html sem o token <!--BUILD:JS-->');
      html = shell.split('<!--BUILD:CSS-->').join(css).split('<!--BUILD:JS-->').join(escJsForHtml(js));
      ok('shell: src/html/shell.html');
    } else {
      html = defaultShell(css, escJsForHtml(js));
      ok('shell: padrão embutido (src/html/shell.html ausente)');
    }
  }

  const size = Buffer.byteLength(html, 'utf8');
  const kb = (size / 1024).toFixed(1);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  ok('escrito ' + path.relative(ROOT, out) + ' — ' + size + ' bytes (' + kb + ' KB) / 250 KB');

  if (size > BUDGET) fail('tamanho ' + kb + ' KB excede o orçamento de 250 KB; reduza assets/código.');
  console.log('BUILD PASS: dentro do orçamento.');
}

main();
