// src/core/save.js — F0-Core · Save/Load em slot único (localStorage + fallback).
//
// Decisões:
// - D-10: payload versionado {versao:1, salvoEm, mapa, jogador:{x,y,hp}, flags,
//   objetivo}; chave 'cristalAmanhecer.v1.<slot>'; slot default 'principal'.
//   Salva ao trocar de mapa (connectSaveToWorld() → World.onMapChanged) e ao pegar
//   item-chave (saveOnKeyItem()). A floresta é procedural determinística (seed=7),
//   então basta persistir o id do mapa + posição: os geradores atuais recriam o resto.
// - D-11: todo acesso a localStorage em try/catch com fallback em memória (aba
//   privada/headless); loadGame() valida TUDO antes de aplicar (nunca aplica parcial);
//   botão Continuar via setupContinueButton(botao, aoCarregar) com pointer events,
//   sem <form>. hp mínimo 1 ao carregar (nunca restaura morto).
//
// Uso (título): connectSaveToWorld(); setupContinueButton(el, function(){ st='play'; });
// API global: saveGame(slot?), loadGame(slot?), hasSave(slot?), saveOnMapChange(),
// saveOnKeyItem(), connectSaveToWorld(), setupContinueButton(), describeSave().

var SaveSystem = (typeof SaveSystem !== 'undefined' && SaveSystem !== null) ? SaveSystem : {};

SaveSystem.SAVE_VERSION = 1;
SaveSystem.DEFAULT_SLOT = 'principal';
SaveSystem.KEY_PREFIX = 'cristalAmanhecer.v1.';
SaveSystem.MAX_HP = 10; // F2: +1 coração após o Cavaleiro Corrompido (era 8)
SaveSystem._memoryFallback = (SaveSystem._memoryFallback && typeof SaveSystem._memoryFallback === 'object')
  ? SaveSystem._memoryFallback
  : {};

SaveSystem._slotName = function (slotBruto) {
  return (typeof slotBruto === 'string' && slotBruto.length > 0) ? slotBruto : SaveSystem.DEFAULT_SLOT;
};

SaveSystem._keyFor = function (slotBruto) {
  return SaveSystem.KEY_PREFIX + SaveSystem._slotName(slotBruto);
};

SaveSystem._storageGet = function (chave) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      var valorNativo = localStorage.getItem(chave);
      if (valorNativo !== null && valorNativo !== undefined) {
        return valorNativo;
      }
    }
  } catch (erroLeituraNativa) {
    // Cai para o fallback em memória.
  }
  var reserva = SaveSystem._memoryFallback[chave];
  return (typeof reserva === 'string') ? reserva : null;
};

SaveSystem._storageSet = function (chave, valorTexto) {
  var gravouNativo = false;
  try {
    if (typeof localStorage !== 'undefined' && localStorage !== null) {
      localStorage.setItem(chave, valorTexto);
      gravouNativo = true;
    }
  } catch (erroEscritaNativa) {
    gravouNativo = false;
  }
  if (!gravouNativo) {
    try {
      SaveSystem._memoryFallback[chave] = valorTexto;
    } catch (erroReserva) {
      return false;
    }
  }
  return true;
};

// Flags atuais: prefere Game.serializeFlags(); senão espelha o MVP (step/hasKey/obj).
SaveSystem._collectFlags = function () {
  var baseFlags = null;
  try {
    if (typeof Game !== 'undefined' && Game !== null) {
      if (typeof Game.serializeFlags === 'function') {
        return Game.serializeFlags();
      }
      if (Game.flags && typeof Game.flags === 'object') {
        return JSON.parse(JSON.stringify(Game.flags));
      }
      if (typeof Game.getDefaultFlags === 'function') {
        baseFlags = Game.getDefaultFlags();
      }
    }
  } catch (erroFlags) {
    baseFlags = null;
  }
  if (!baseFlags || typeof baseFlags !== 'object') {
    baseFlags = {
      chapter: 1, sign_read: false, runes_done: false, step: 0, has_key_c1: false,
      boss1_defeated: false, cat_found: false, secret_records: 0, frag_green: false,
      frag_blue: false, frag_red: false, darius_spared: false, final_choice: null
    };
  }
  try {
    if (typeof step !== 'undefined') {
      var passo = Math.floor(Number(step));
      baseFlags.step = (isFinite(passo) && passo >= 0 && passo <= 3) ? passo : 0;
      baseFlags.runes_done = baseFlags.step >= 3;
    }
    if (typeof hasKey !== 'undefined') {
      baseFlags.has_key_c1 = (hasKey === true);
    }
    if (typeof obj !== 'undefined' && Number(obj) >= 1) {
      baseFlags.sign_read = true;
    }
    if (typeof B !== 'undefined' && B !== null && B.end === 1) {
      baseFlags.boss1_defeated = true;
    }
  } catch (erroMvp) {
    // Espelho do MVP é best-effort; as flags base continuam válidas.
  }
  return baseFlags;
};

SaveSystem._collectMapId = function () {
  try {
    if (typeof World !== 'undefined' && World !== null && typeof World.getCurrentId === 'function') {
      var atual = World.getCurrentId();
      if (typeof atual === 'string' && atual.length > 0) {
        return atual;
      }
    }
  } catch (erroMundo) {
  }
  try {
    if (typeof inBoss !== 'undefined' && inBoss === true) {
      return 'arena';
    }
  } catch (erroArena) {
  }
  return 'floresta';
};

SaveSystem._collectPlayer = function () {
  var posicao = { x: 3 * 16, y: 16 * 16, hp: SaveSystem.MAX_HP, hpMax: 8 };
  try {
    if (typeof P !== 'undefined' && P !== null) {
      if (isFinite(Number(P.x))) {
        posicao.x = Number(P.x);
      }
      if (isFinite(Number(P.y))) {
        posicao.y = Number(P.y);
      }
      var vida = Math.floor(Number(P.hp));
      posicao.hp = (isFinite(vida) && vida >= 1 && vida <= SaveSystem.MAX_HP) ? vida : SaveSystem.MAX_HP;
      // B9: hpMax persiste (recompensa do Cap. 2); fallback por flag p/ saves antigos.
      var maximo = Math.floor(Number(P.hpMax));
      if (isFinite(maximo) && maximo >= 8 && maximo <= SaveSystem.MAX_HP) {
        posicao.hpMax = maximo;
      } else {
        try {
          posicao.hpMax = (typeof Game !== 'undefined' && Game && Game.flags && Game.flags.boss2_defeated) ? 10 : 8;
        } catch (erroMax) {
          posicao.hpMax = 8;
        }
      }
    }
  } catch (erroJogador) {
  }
  return posicao;
};

SaveSystem.collectSaveData = function () {
  var flagsCopia = SaveSystem._collectFlags();
  var objetivo = 0;
  try {
    if (typeof Game !== 'undefined' && Game !== null && typeof Game.indiceObjetivoCap1 === 'function') {
      objetivo = Game.indiceObjetivoCap1(flagsCopia);
    } else if (typeof obj !== 'undefined') {
      var bruto = Math.floor(Number(obj));
      objetivo = (isFinite(bruto) && bruto >= 0 && bruto <= 4) ? bruto : 0;
    }
  } catch (erroObjetivo) {
    objetivo = 0;
  }
  return {
    versao: SaveSystem.SAVE_VERSION,
    salvoEm: (typeof Date !== 'undefined' && Date !== null) ? Date.now() : 0,
    mapa: SaveSystem._collectMapId(),
    jogador: SaveSystem._collectPlayer(),
    flags: flagsCopia,
    objetivo: objetivo
  };
};

// Validação estrutural (a validação fina das flags é do Game.loadFlags).
SaveSystem.validateSaveData = function (dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return false;
  }
  if (dados.versao !== SaveSystem.SAVE_VERSION) {
    return false;
  }
  if (typeof dados.mapa !== 'string' || dados.mapa.length === 0) {
    return false;
  }
  if (!dados.jogador || typeof dados.jogador !== 'object') {
    return false;
  }
  if (!isFinite(Number(dados.jogador.x)) || !isFinite(Number(dados.jogador.y))) {
    return false;
  }
  var vida = Math.floor(Number(dados.jogador.hp));
  if (!isFinite(vida) || vida < 1 || vida > SaveSystem.MAX_HP) {
    return false;
  }
  if (dados.jogador.hpMax !== undefined && dados.jogador.hpMax !== null) {
    var maximo = Math.floor(Number(dados.jogador.hpMax));
    if (!isFinite(maximo) || maximo < 8 || maximo > SaveSystem.MAX_HP) {
      return false;
    }
  }
  if (!dados.flags || typeof dados.flags !== 'object' || Array.isArray(dados.flags)) {
    return false;
  }
  return true;
};

// Aplica dados já validados: flags → mapa (recria via World/MVP) → jogador.
SaveSystem.applySaveData = function (dados) {
  if (!SaveSystem.validateSaveData(dados)) {
    return false;
  }
  try {
    if (typeof Game !== 'undefined' && Game !== null) {
      if (typeof Game.loadFlags === 'function') {
        Game.loadFlags(dados.flags);
      } else {
        Game.flags = JSON.parse(JSON.stringify(dados.flags));
      }
    }
  } catch (erroFlags) {
    return false;
  }
  var mapaAplicado = false;
  try {
    if (typeof World !== 'undefined' && World !== null &&
        typeof World.gotoImmediate === 'function' && World.maps && World.maps[dados.mapa]) {
      mapaAplicado = World.gotoImmediate(dados.mapa) === true;
    }
  } catch (erroMundo) {
    mapaAplicado = false;
  }
  if (!mapaAplicado) {
    try {
      if (dados.mapa === 'arena' && typeof arena === 'function') {
        arena();
        mapaAplicado = true;
      } else if (typeof forest === 'function') {
        forest();
        mapaAplicado = true;
      }
    } catch (erroLegado) {
      mapaAplicado = false;
    }
  }
  try {
    if (typeof Game !== 'undefined' && Game !== null && Game.flags) {
      if (typeof step !== 'undefined') {
        step = Game.flags.step;
      }
    }
  } catch (erroPasso) {
  }
  try {
    if (typeof Game !== 'undefined' && Game !== null && Game.flags) {
      if (typeof hasKey !== 'undefined') {
        hasKey = (Game.flags.has_key_c1 === true);
      }
      if (typeof obj !== 'undefined') {
        if (typeof Game.indiceObjetivoCap1 === 'function') {
          obj = Game.indiceObjetivoCap1(Game.flags);
        } else if (isFinite(Number(dados.objetivo))) {
          obj = Math.max(0, Math.min(4, Math.floor(Number(dados.objetivo))));
        }
      }
    }
  } catch (erroMvp) {
  }
  try {
    if (typeof P !== 'undefined' && P !== null) {
      P.x = Number(dados.jogador.x);
      P.y = Number(dados.jogador.y);
      P.hp = Math.floor(Number(dados.jogador.hp));
      var maxSalvo = Math.floor(Number(dados.jogador.hpMax));
      if (isFinite(maxSalvo) && maxSalvo >= 8 && maxSalvo <= SaveSystem.MAX_HP) {
        P.hpMax = maxSalvo;
      } else if (typeof Game !== 'undefined' && Game && Game.flags && Game.flags.boss2_defeated) {
        P.hpMax = 10;
      }
      P.hp = Math.min(P.hp, P.hpMax || SaveSystem.MAX_HP);
      P.inv = 60;
      P.kx = 0;
      P.ky = 0;
    }
  } catch (erroPosicao) {
    return false;
  }
  return true;
};

SaveSystem.saveGame = function (slotBruto) {
  try {
    var dados = SaveSystem.collectSaveData();
    var texto = JSON.stringify(dados);
    return SaveSystem._storageSet(SaveSystem._keyFor(slotBruto), texto);
  } catch (erroSave) {
    return false;
  }
};

SaveSystem.loadGame = function (slotBruto) {
  var textoBruto = SaveSystem._storageGet(SaveSystem._keyFor(slotBruto));
  if (typeof textoBruto !== 'string' || textoBruto.length === 0) {
    return false;
  }
  var dados = null;
  try {
    dados = JSON.parse(textoBruto);
  } catch (erroParse) {
    return false;
  }
  return SaveSystem.applySaveData(dados);
};

SaveSystem.hasSave = function (slotBruto) {
  var textoBruto = SaveSystem._storageGet(SaveSystem._keyFor(slotBruto));
  if (typeof textoBruto !== 'string' || textoBruto.length === 0) {
    return false;
  }
  try {
    return SaveSystem.validateSaveData(JSON.parse(textoBruto));
  } catch (erroValidacao) {
    return false;
  }
};

// Resumo para a tela de título ("Continuar — Cap. X"). Null se não há save.
SaveSystem.describeSave = function (slotBruto) {
  var textoBruto = SaveSystem._storageGet(SaveSystem._keyFor(slotBruto));
  if (typeof textoBruto !== 'string' || textoBruto.length === 0) {
    return null;
  }
  try {
    var dados = JSON.parse(textoBruto);
    if (!SaveSystem.validateSaveData(dados)) {
      return null;
    }
    return {
      capitulo: (dados.flags && isFinite(Number(dados.flags.chapter))) ? Number(dados.flags.chapter) : 1,
      mapa: dados.mapa,
      salvoEm: dados.salvoEm,
      vida: dados.jogador.hp
    };
  } catch (erroResumo) {
    return null;
  }
};

// Chamado ao trocar de mapa (hook de World.onMapChanged). Salva no slot único.
SaveSystem.saveOnMapChange = function (idMapa, spawnId) {
  return SaveSystem.saveGame(SaveSystem.DEFAULT_SLOT);
};

// Chamado ao pegar item-chave (ex.: chave do Cap. 1). Salva no slot único.
SaveSystem.saveOnKeyItem = function (itemChave) {
  return SaveSystem.saveGame(SaveSystem.DEFAULT_SLOT);
};

// Liga o autosave à troca de mapa. Retorna false se World ainda não carregou
// (aí o integrador chama de novo após concatenar world.js).
SaveSystem.connectSaveToWorld = function () {
  try {
    if (typeof World === 'undefined' || World === null) {
      return false;
    }
    World.onMapChanged = function (idMapa, spawnId) {
      try {
        SaveSystem.saveOnMapChange(idMapa, spawnId);
      } catch (erroHook) {
        // Autosave nunca pode quebrar a troca de mapa.
      }
    };
    return true;
  } catch (erroConexao) {
    return false;
  }
};

// Botão Continuar: esconde sem save; com save, carrega e chama aoCarregar().
// Sem <form>; só pointer events. Retorna true se o botão foi ligado.
SaveSystem.setupContinueButton = function (botaoElemento, aoCarregar) {
  if (!botaoElemento) {
    return false;
  }
  var temSave = SaveSystem.hasSave(SaveSystem.DEFAULT_SLOT);
  try {
    botaoElemento.style.display = temSave ? '' : 'none';
  } catch (erroEstilo) {
    // Estilo é cosmético; segue para o listener.
  }
  try {
    botaoElemento.addEventListener('pointerdown', function (eventoClique) {
      try {
        if (eventoClique && typeof eventoClique.preventDefault === 'function') {
          eventoClique.preventDefault();
        }
      } catch (erroEvento) {
      }
      var carregou = SaveSystem.loadGame(SaveSystem.DEFAULT_SLOT);
      if (carregou && typeof aoCarregar === 'function') {
        try {
          aoCarregar();
        } catch (erroCallback) {
        }
      }
    });
  } catch (erroBotao) {
    return false;
  }
  return true;
};

try {
  SaveSystem.connectSaveToWorld();
} catch (erroAuto) {
  // World pode carregar depois; o integrador chama connectSaveToWorld().
}

function saveGame(slotBruto) {
  return SaveSystem.saveGame(slotBruto);
}

function loadGame(slotBruto) {
  return SaveSystem.loadGame(slotBruto);
}

function hasSave(slotBruto) {
  return SaveSystem.hasSave(slotBruto);
}

function saveOnMapChange(idMapa, spawnId) {
  return SaveSystem.saveOnMapChange(idMapa, spawnId);
}

function saveOnKeyItem(itemChave) {
  return SaveSystem.saveOnKeyItem(itemChave);
}

function connectSaveToWorld() {
  return SaveSystem.connectSaveToWorld();
}

function setupContinueButton(botaoElemento, aoCarregar) {
  return SaveSystem.setupContinueButton(botaoElemento, aoCarregar);
}

function describeSave(slotBruto) {
  return SaveSystem.describeSave(slotBruto);
}
