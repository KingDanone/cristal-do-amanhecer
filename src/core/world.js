// src/core/world.js — F0-Core · Registro multi-mapa e transição com fade.
//
// Decisões:
// - D-08: goto(idMapa, spawnId) abre transição de 12 frames (6 de saída + 6 de
//   entrada); o mapa é aplicado no meio (fadeTimer chega a 6) e getFadeAlpha()
//   devolve 0..1 para o render desenhar o véu preto. updateWorldTransition() deve
//   ser chamado 1x por passo fixo (60 Hz). Spawns são {tileX, tileY}; a ponte com
//   o MVP converte para pixels (× TILE_PIXELS).
// - D-09: snapshotMvpMap() embrulha os mapas atuais (forest()/arena()) como MapDef
//   sem mudar a jogabilidade: World nunca chama os geradores no load; entidades
//   (runas, slimes, placa, chefe) continuam com o código atual até a refatoração F0.
//   MapDef segue 03_ARCHITECTURE.md §11, mais o opcional bossArena (ponte p/ inBoss).
//
// Formato MapDef: {id, w, h, tiles, tileset, spawns, exits, npcs, enemies, objects,
//   music, onEnter}. exits: [{x, y, to, spawn}]; spawns: {id: {tileX, tileY}}.
// Uso (integrador): registerMap('floresta', createMapDef(...)); goto('arena',
//   'entrada'); no update(): updateWorldTransition(); no render(): getFadeAlpha().
// Sem DOM; seguro em node (ponte com o MVP via typeof + try/catch).

var World = (typeof World !== 'undefined' && World !== null) ? World : {};

World.maps = (World.maps && typeof World.maps === 'object') ? World.maps : {};
World.currentId = (typeof World.currentId === 'string') ? World.currentId : null;
World.pendingTransition = World.pendingTransition || null;
World.fadeTimer = World.fadeTimer || 0;
World.onMapChanged = (typeof World.onMapChanged === 'function') ? World.onMapChanged : null;

World.FADE_TOTAL_FRAMES = 12;
World.FADE_HALF_FRAMES = 6;
World.TILE_PIXELS = 16;
World.DEFAULT_SPAWN_ID = 'entrada';

// Valida dimensões + matriz de tiles (w×h). Retorna true/false.
World._tilesValidos = function (largura, altura, matrizTiles) {
  if (typeof largura !== 'number' || typeof altura !== 'number') {
    return false;
  }
  if (Math.floor(largura) !== largura || Math.floor(altura) !== altura) {
    return false;
  }
  if (largura <= 0 || altura <= 0 || !matrizTiles || !matrizTiles.length) {
    return false;
  }
  if (matrizTiles.length !== altura || !matrizTiles[0]) {
    return false;
  }
  return matrizTiles[0].length === largura;
};

// Fábrica de MapDef com defaults. Retorna o def ou null se inválido.
World.createMapDef = function (idMapa, opcoes) {
  if (typeof idMapa !== 'string' || idMapa.length === 0) {
    return null;
  }
  var conf = (opcoes && typeof opcoes === 'object') ? opcoes : {};
  var largura = conf.w;
  var altura = conf.h;
  var matrizTiles = conf.tiles;
  if (!World._tilesValidos(largura, altura, matrizTiles)) {
    return null;
  }
  var onEnterFn = (typeof conf.onEnter === 'function') ? conf.onEnter : null;
  var musica = (typeof conf.music === 'string' || conf.music === null) ? conf.music : null;
  if (typeof conf.music !== 'string' && conf.music !== null && conf.music !== undefined) {
    musica = null;
  }
  return {
    id: idMapa,
    w: largura,
    h: altura,
    tiles: matrizTiles,
    tileset: (typeof conf.tileset === 'string' && conf.tileset.length > 0) ? conf.tileset : 'floresta',
    spawns: (conf.spawns && typeof conf.spawns === 'object') ? conf.spawns : {},
    exits: Array.isArray(conf.exits) ? conf.exits : [],
    npcs: Array.isArray(conf.npcs) ? conf.npcs : [],
    enemies: Array.isArray(conf.enemies) ? conf.enemies : [],
    objects: Array.isArray(conf.objects) ? conf.objects : [],
    music: (typeof conf.music === 'string') ? conf.music : musica,
    onEnter: onEnterFn,
    bossArena: (typeof conf.bossArena === 'boolean') ? conf.bossArena : undefined
  };
};

// Registra um MapDef. Idempotente: registrar o mesmo id 2x sobrescreve igual.
World.registerMap = function (idMapa, defMapa) {
  if (typeof idMapa !== 'string' || idMapa.length === 0) {
    return false;
  }
  if (!defMapa || typeof defMapa !== 'object') {
    return false;
  }
  if (!World._tilesValidos(defMapa.w, defMapa.h, defMapa.tiles)) {
    return false;
  }
  defMapa.id = idMapa;
  World.maps[idMapa] = defMapa;
  return true;
};

World.getMap = function (idMapa) {
  return World.maps[idMapa] || null;
};

World.listMapIds = function () {
  return Object.keys(World.maps);
};

World.getCurrentId = function () {
  return World.currentId;
};

World.getCurrentMap = function () {
  return World.currentId ? (World.maps[World.currentId] || null) : null;
};

// Resolve o spawn (cai para 'entrada', 'default' ou o 1º). Sempre retorna {tileX, tileY}.
World.resolveSpawnTile = function (defMapa, spawnId) {
  var padrao = { tileX: 1, tileY: 1 };
  if (!defMapa || !defMapa.spawns || typeof defMapa.spawns !== 'object') {
    return padrao;
  }
  var reservas = defMapa.spawns;
  var escolhido = reservas[spawnId] || reservas[World.DEFAULT_SPAWN_ID] || reservas.default || null;
  if (!escolhido) {
    for (var chave in reservas) {
      if (Object.prototype.hasOwnProperty.call(reservas, chave) && reservas[chave]) {
        escolhido = reservas[chave];
        break;
      }
    }
  }
  if (!escolhido || typeof escolhido !== 'object') {
    return padrao;
  }
  var coluna = Math.floor(Number(escolhido.tileX));
  var linha = Math.floor(Number(escolhido.tileY));
  return {
    tileX: (isFinite(coluna) && coluna >= 0) ? coluna : 1,
    tileY: (isFinite(linha) && linha >= 0) ? linha : 1
  };
};

// Saída (portal) na posição de tile, ou null.
World.findExitAtTile = function (idMapa, colunaTile, linhaTile) {
  var defMapa = World.maps[idMapa];
  if (!defMapa || !Array.isArray(defMapa.exits)) {
    return null;
  }
  for (var indice = 0; indice < defMapa.exits.length; indice++) {
    var saida = defMapa.exits[indice];
    if (saida && saida.x === colunaTile && saida.y === linhaTile) {
      return saida;
    }
  }
  return null;
};

// Troca de mapa com fade de 12 frames. Retorna false se o mapa não existe.
World.goto = function (idMapa, spawnId) {
  if (!World.maps[idMapa]) {
    return false;
  }
  var nomeSpawn = (typeof spawnId === 'string' && spawnId.length > 0)
    ? spawnId
    : World.DEFAULT_SPAWN_ID;
  World.pendingTransition = { mapId: idMapa, spawnId: nomeSpawn };
  World.fadeTimer = World.FADE_TOTAL_FRAMES;
  return true;
};

// Troca imediata, sem fade (retry, loadGame, testes). Retorna true/false.
World.gotoImmediate = function (idMapa, spawnId) {
  return World._applyMap(idMapa, spawnId);
};

// Avança a transição; chamar 1x por passo fixo. Retorna se ainda está em transição.
World.updateWorldTransition = function () {
  if (!World.fadeTimer || World.fadeTimer <= 0) {
    return false;
  }
  World.fadeTimer -= 1;
  if (World.fadeTimer === World.FADE_HALF_FRAMES && World.pendingTransition) {
    World._applyMap(World.pendingTransition.mapId, World.pendingTransition.spawnId);
  }
  if (World.fadeTimer <= 0) {
    World.fadeTimer = 0;
    World.pendingTransition = null;
  }
  return World.fadeTimer > 0;
};

World.isTransitioning = function () {
  return World.fadeTimer > 0;
};

// 0 = sem véu, 1 = tela preta (pico no meio da transição). Para o render.
World.getFadeAlpha = function () {
  if (!World.fadeTimer || World.fadeTimer <= 0) {
    return 0;
  }
  if (World.fadeTimer > World.FADE_HALF_FRAMES) {
    return (World.FADE_TOTAL_FRAMES - World.fadeTimer) / World.FADE_HALF_FRAMES;
  }
  return World.fadeTimer / World.FADE_HALF_FRAMES;
};

// Aplica o mapa: registra currentId, posiciona o jogador (ponte MVP), dispara
// onEnter(def) e o hook onMapChanged (onde save.js se conecta). Retorna bool.
World._applyMap = function (idMapa, spawnId) {
  var defMapa = World.maps[idMapa];
  if (!defMapa) {
    return false;
  }
  World.currentId = idMapa;
  var pontoTile = World.resolveSpawnTile(defMapa, spawnId);
  World._applyToMvp(defMapa, pontoTile);
  if (typeof defMapa.onEnter === 'function') {
    try {
      defMapa.onEnter((typeof Game !== 'undefined') ? Game : null);
    } catch (erroOnEnter) {
      // onEnter nunca pode quebrar a troca de mapa.
    }
  }
  if (typeof World.onMapChanged === 'function') {
    try {
      World.onMapChanged(idMapa, spawnId);
    } catch (erroHook) {
      // Hook de save nunca pode quebrar a troca de mapa.
    }
  }
  return true;
};

// Ponte com as globais do MVP (M/MW/MH/P/inBoss). Sem o MVP, só ignora.
World._applyToMvp = function (defMapa, pontoTile) {
  try {
    if (typeof M !== 'undefined' && defMapa.tiles) {
      M = defMapa.tiles.map(function (linhaTiles) {
        return linhaTiles.slice();
      });
    }
  } catch (erroTiles) {
    // Sem o MVP carregado, não há o que atualizar.
  }
  try {
    if (typeof MW !== 'undefined') {
      MW = defMapa.w;
    }
  } catch (erroLargura) {
  }
  try {
    if (typeof MH !== 'undefined') {
      MH = defMapa.h;
    }
  } catch (erroAltura) {
  }
  try {
    if (typeof P !== 'undefined' && P !== null && pontoTile) {
      P.x = pontoTile.tileX * World.TILE_PIXELS;
      P.y = pontoTile.tileY * World.TILE_PIXELS;
    }
  } catch (erroJogador) {
  }
  try {
    if (typeof inBoss !== 'undefined' && typeof defMapa.bossArena === 'boolean') {
      inBoss = defMapa.bossArena;
    }
  } catch (erroArena) {
  }
  return true;
};

// Fotografa o mapa atual do MVP (M/MW/MH) como MapDef registrado.
// Integrador: forest(); snapshotMvpMap('floresta', {spawns: {...}, bossArena: false});
//            arena(); snapshotMvpMap('arena', {spawns: {...}, bossArena: true});
World.snapshotMvpMap = function (idMapa, opcoes) {
  try {
    if (typeof M === 'undefined' || typeof MW === 'undefined' || typeof MH === 'undefined') {
      return false;
    }
    var conf = (opcoes && typeof opcoes === 'object') ? opcoes : {};
    var copiaTiles = M.map(function (linhaTiles) {
      return linhaTiles.slice();
    });
    var defMapa = World.createMapDef(idMapa, {
      w: MW,
      h: MH,
      tiles: copiaTiles,
      tileset: conf.tileset || 'floresta',
      spawns: conf.spawns || { entrada: { tileX: 3, tileY: 16 } },
      exits: conf.exits || [],
      npcs: [],
      enemies: [],
      objects: [],
      music: conf.music || null,
      onEnter: conf.onEnter || null,
      bossArena: conf.bossArena
    });
    if (!defMapa) {
      return false;
    }
    return World.registerMap(idMapa, defMapa);
  } catch (erroSnapshot) {
    return false;
  }
};
