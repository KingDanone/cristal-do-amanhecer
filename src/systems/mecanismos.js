// src/systems/mecanismos.js — Mecanismos de calabouço do Cap. 3 (puros).
//
// Única fonte de verdade para os três mecanismos das Ruínas do Norte,
// usada pelo jogo (src/main.js) e pela auditoria (tools/audit.js) — assim o
// que o teste prova é exatamente o que roda no browser.
//
// - Portões por flag (`gates` no MapDef): células de parede que trocam de
//   char quando TODAS as flags do portão estão ligadas. Aplicado ao carregar
//   o mapa (contínuar/salvar/retry reabrem o que já foi aberto) e ao ligar
//   um interruptor. Idempotente por construção.
// - Painéis ordenados (enigma do saguão): acertar na ordem acende; errar
//   zera o progresso do jogador (sem flag intermediária: o enigma é contido
//   numa única sala, então recomeçar é trivial e nunca trava — D-24).
// - Registros secretos: ids fixos; o contador canônico continua sendo a
//   flag numérica `secret_records` (contrato de `02_GAME_DESIGN.md` §7).
//
// Sem DOM, sem efeitos colaterais fora dos argumentos; seguro em node (vm).

(function sistemaMecanismos() {
  'use strict';

  var REGISTRO_FLAGS = ['registro_f3_1', 'registro_f3_2', 'registro_f3_3', 'registro_f3_4', 'registro_f3_5'];

  // Um portão abre quando TODAS as flags listadas estão verdadeiras.
  function portaoAberto(flags, listaFlags) {
    var lista = listaFlags || [];
    for (var i = 0; i < lista.length; i++) {
      if (!flags || !flags[lista[i]]) return false;
    }
    return true;
  }

  // Aplica todos os portões do def na matriz M (char a char). Retorna o
  // número de células alteradas. Idempotente: rodar 2x = mesmo mapa.
  // Formato do gate: { flags: ['sw_ruin_a', ...], cells: [[tx,ty],...],
  //   openChar: 'd' (padrão '.'), closedChar: 'G' (opcional: "." express) }.
  function aplicarPortoes(def, M, flags) {
    if (!def || !M || !Array.isArray(def.gates)) return 0;
    var alteradas = 0;
    for (var g = 0; g < def.gates.length; g++) {
      var gate = def.gates[g];
      var aberto = portaoAberto(flags, gate.flags);
      var celulas = gate.cells || [];
      for (var c = 0; c < celulas.length; c++) {
        var tx = celulas[c][0], ty = celulas[c][1];
        if (!M[ty] || tx < 0 || tx >= M[ty].length) continue;
        var alvo = aberto
          ? (typeof gate.openChar === 'string' ? gate.openChar : '.')
          : (typeof gate.closedChar === 'string' ? gate.closedChar : 'G');
        if (M[ty][tx] !== alvo) { M[ty][tx] = alvo; alteradas++; }
      }
    }
    return alteradas;
  }

  // Enigma dos painéis: acertar o painel esperado avança; qualquer outro
  // reseta. Retorna { prog, completo, erro } — puro, sem tocar no mundo.
  function acertarPainel(progAtual, ordemDoPainel, total) {
    var prog = Math.max(0, Math.floor(Number(progAtual)) || 0);
    if (ordemDoPainel === prog) {
      prog++;
      return { prog: prog, completo: prog >= total, erro: false };
    }
    return { prog: 0, completo: false, erro: true };
  }

  // Conta registros coletados a partir das flags (derivado do save, O(5)).
  function contarRegistros(flags) {
    var n = 0;
    for (var i = 0; i < REGISTRO_FLAGS.length; i++) {
      if (flags && flags[REGISTRO_FLAGS[i]]) n++;
    }
    return n;
  }

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.Mecanismos = {
    aplicarPortoes: aplicarPortoes,
    portaoAberto: portaoAberto,
    acertarPainel: acertarPainel,
    contarRegistros: contarRegistros,
    REGISTRO_FLAGS: REGISTRO_FLAGS,
    TOTAL_REGISTROS: REGISTRO_FLAGS.length
  };
})();
