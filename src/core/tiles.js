// src/core/tiles.js — F0-Core · Tabela de tiles (única fonte de verdade).
//
// Decisões:
// - D-07: TILES é a única fonte de verdade sobre solidez; o render futuro usa
//   lookup (TILES[caractere]) em vez de if/else por caractere. Caractere
//   desconhecido = sólido (falha segura: nunca deixa atravessar parede).
//   Compatível com os mapas atuais: '#' árvore/parede, '.' chão, 'G' portão.
//
// Uso (render futuro, sem if/else):
//   var definicao = getTileDef(caractere); // {solid, isGate?}
//   // solidez: isSolidTile(caractere); portão: isGateTile(caractere)
//   // colisão por pixel: isBlockedPixel(mapa, largura, altura, px, py, 16)
// Sem DOM/canvas; O(1) por consulta, sem alocação no caminho quente.

var TILES = (typeof TILES !== 'undefined' && TILES !== null) ? TILES : {
  '#': { solid: 1 },
  '.': { solid: 0 },
  'G': { solid: 1, isGate: 1 }
};

var TILE_DESCONHECIDO = { solid: 1 };

// Lookup com fallback seguro; nunca retorna undefined.
function getTileDef(caractere) {
  return TILES[caractere] || TILE_DESCONHECIDO;
}

function isSolidTile(caractere) {
  return getTileDef(caractere).solid === 1;
}

function isGateTile(caractere) {
  return getTileDef(caractere).isGate === 1;
}

// Equivalente ao solidAt() do MVP, mas puro (recebe a matriz). Fora do mapa = sólido.
function isBlockedPixel(mapaMatriz, larguraTiles, alturaTiles, pixelX, pixelY, tamanhoTile) {
  var tamanho = tamanhoTile || 16;
  var coluna = Math.floor(pixelX / tamanho);
  var linha = Math.floor(pixelY / tamanho);
  var foraDoMapa = coluna < 0 || linha < 0 || coluna >= larguraTiles || linha >= alturaTiles;
  var linhaTiles = foraDoMapa ? null : mapaMatriz[linha];
  var caractere = linhaTiles ? linhaTiles[coluna] : '#';
  return foraDoMapa || isSolidTile(caractere);
}
