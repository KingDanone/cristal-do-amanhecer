// src/core/flags.js — F0-Core · Estado de progressão serializável (Game.flags).
//
// Decisões:
// - D-05: Game.flags tem 13 chaves fixas. chapter (1..5); step (0..3, nº de runas
//   ativadas na ordem certa); secret_records (int >= 0); final_choice
//   (null | 'restaurar' | 'destruir' | 'lumi'); o resto boolean. Defaults = início
//   do Cap. 1. Mapeia o MVP: step→step, hasKey→has_key_c1, obj→derivado via
//   indiceObjetivoCap1() (0 explorar, 1 runas, 2 chave, 3 portão, 4 chefe).
// - D-06: loadFlags() é tolerante e idempotente: ignora chaves desconhecidas, troca
//   valor inválido pelo default e nunca lança; retorna false só se a entrada não for
//   objeto (aí preserva as flags atuais). Booleans aceitam 0/1 (legado/JSON antigo).
//
// Uso (integrador F0): Game.resetFlags() no begin(); ler step/hasKey via
// Game.getFlag('step') / Game.getFlag('has_key_c1'); salvar via Game.serializeFlags().
// Sem DOM/canvas/áudio; seguro em browser concatenado e em node (smoke).
// Custo: só acessos O(1); nenhuma alocação por frame (serialize só no save).

var Game = (typeof Game !== 'undefined' && Game !== null) ? Game : {};

Game.FLAG_DEFAULTS = {
  chapter: 1,
  sign_read: false,
  runes_done: false,
  step: 0,
  has_key_c1: false,
  boss1_defeated: false,
  cat_found: false,
  secret_records: 0,
  frag_green: false,
  frag_blue: false,
  frag_red: false,
  darius_spared: false,
  final_choice: null,
  // D-17: flags de história F1 (cenas do prólogo + Cap.1). Persistem no save
  // como as demais; mantêm cenas idempotentes (nunca repetem após reload).
  // D-17 também: gating de progressão — espada exige got_sword, magia exige
  // met_lumi, saída leste de Brisamar exige got_sword (só aviso, sem trava).
  woke_up: false,
  festival_seen: false,
  darius_left: false,
  kael_defiant: false,
  met_orin: false,
  got_sword: false,
  tutorial_done: false,
  star_seen: false,
  met_lumi: false,
  entered_ruin: false,
  boss_started: false,
  bush_key_found: false,
  intro_floresta: false
};

// Replica os defaults em getDefaultFlags (única fonte = FLAG_DEFAULTS).

Game.FINAL_CHOICES_VALIDOS = ['restaurar', 'destruir', 'lumi'];

// Devolve um objeto novo com os defaults (nunca a referência interna).
Game.getDefaultFlags = function () {
  var copia = {};
  for (var chave in Game.FLAG_DEFAULTS) {
    if (Object.prototype.hasOwnProperty.call(Game.FLAG_DEFAULTS, chave)) {
      copia[chave] = Game.FLAG_DEFAULTS[chave];
    }
  }
  return copia;
};

// Valida/coage um valor para uma chave conhecida. Retorna {ok, valor}.
Game._coerceFlag = function (nomeFlag, valorBruto) {
  var defaults = Game.FLAG_DEFAULTS;
  if (!Object.prototype.hasOwnProperty.call(defaults, nomeFlag)) {
    return { ok: false, valor: undefined };
  }
  if (nomeFlag === 'chapter') {
    var capitulo = Math.floor(Number(valorBruto));
    if (!isFinite(capitulo) || capitulo < 1 || capitulo > 5) {
      return { ok: false, valor: defaults.chapter };
    }
    return { ok: true, valor: capitulo };
  }
  if (nomeFlag === 'step') {
    var passo = Math.floor(Number(valorBruto));
    if (!isFinite(passo) || passo < 0 || passo > 3) {
      return { ok: false, valor: defaults.step };
    }
    return { ok: true, valor: passo };
  }
  if (nomeFlag === 'secret_records') {
    var registros = Math.floor(Number(valorBruto));
    if (!isFinite(registros) || registros < 0) {
      return { ok: false, valor: defaults.secret_records };
    }
    return { ok: true, valor: registros };
  }
  if (nomeFlag === 'final_choice') {
    if (valorBruto === null || valorBruto === undefined) {
      return { ok: true, valor: null };
    }
    if (Game.FINAL_CHOICES_VALIDOS.indexOf(valorBruto) !== -1) {
      return { ok: true, valor: valorBruto };
    }
    return { ok: false, valor: defaults.final_choice };
  }
  // Chaves booleanas restantes.
  if (valorBruto === true || valorBruto === 1) {
    return { ok: true, valor: true };
  }
  if (valorBruto === false || valorBruto === 0) {
    return { ok: true, valor: false };
  }
  return { ok: false, valor: defaults[nomeFlag] };
};

// Reseta para o início do Cap. 1. Idempotente: chamar 2x dá o mesmo resultado.
Game.resetFlags = function () {
  Game.flags = Game.getDefaultFlags();
  return Game.flags;
};

// Cópia JSON-segura só com as chaves conhecidas (para saveGame()).
Game.serializeFlags = function () {
  var atuais = (Game.flags && typeof Game.flags === 'object') ? Game.flags : {};
  var copia = Game.getDefaultFlags();
  for (var chave in copia) {
    if (Object.prototype.hasOwnProperty.call(atuais, chave)) {
      var convertido = Game._coerceFlag(chave, atuais[chave]);
      copia[chave] = convertido.ok ? convertido.valor : copia[chave];
    }
  }
  return copia;
};

// Substitui as flags a partir de um objeto (ex.: loadGame()). Chaves ausentes
// voltam ao default; desconhecidas são ignoradas. Retorna true/false.
Game.loadFlags = function (objetoBruto) {
  if (objetoBruto === null || typeof objetoBruto !== 'object' || Array.isArray(objetoBruto)) {
    return false;
  }
  var novas = Game.getDefaultFlags();
  for (var chave in novas) {
    if (Object.prototype.hasOwnProperty.call(objetoBruto, chave)) {
      var convertido = Game._coerceFlag(chave, objetoBruto[chave]);
      novas[chave] = convertido.ok ? convertido.valor : novas[chave];
    }
  }
  Game.flags = novas;
  return true;
};

// Atribui uma flag conhecida. Desconhecida/inválida → false sem efeito colateral.
Game.setFlag = function (nomeFlag, valorBruto) {
  if (!Object.prototype.hasOwnProperty.call(Game.FLAG_DEFAULTS, nomeFlag)) {
    return false;
  }
  var convertido = Game._coerceFlag(nomeFlag, valorBruto);
  if (!convertido.ok) {
    return false;
  }
  if (!Game.flags || typeof Game.flags !== 'object') {
    Game.flags = Game.getDefaultFlags();
  }
  Game.flags[nomeFlag] = convertido.valor;
  return true;
};

// Lê uma flag conhecida; desconhecida → undefined.
Game.getFlag = function (nomeFlag) {
  if (!Object.prototype.hasOwnProperty.call(Game.FLAG_DEFAULTS, nomeFlag)) {
    return undefined;
  }
  if (!Game.flags || typeof Game.flags !== 'object') {
    return Game.FLAG_DEFAULTS[nomeFlag];
  }
  return Game.flags[nomeFlag];
};

// Deriva o índice do OBJ[] do MVP (0..4) a partir das flags. Ponte p/ o HUD atual.
Game.indiceObjetivoCap1 = function (flagsOpcional) {
  var flagsAtuais = (flagsOpcional && typeof flagsOpcional === 'object')
    ? flagsOpcional
    : (Game.flags || Game.FLAG_DEFAULTS);
  if (flagsAtuais.boss1_defeated === true) {
    return 4;
  }
  if (flagsAtuais.has_key_c1 === true) {
    return 3;
  }
  if (flagsAtuais.runes_done === true || flagsAtuais.step >= 3) {
    return 2;
  }
  if (flagsAtuais.sign_read === true || flagsAtuais.step > 0) {
    return 1;
  }
  return 0;
};

if (!Game.flags || typeof Game.flags !== 'object') {
  Game.resetFlags();
}
