/**
 * src/systems/dialogue.js — Sistema de diálogo v2
 * Frente F0-Systems. Sem dependências externas, sem fetch.
 *
 * Corrige a dívida técnica do MVP (typewriter incrementado no render):
 * o contador do typewriter avança em updateDialogue(), que deve ser
 * chamado no passo fixo de 60 Hz. O render só LÊ o texto visível.
 *
 * Integração no loop principal (passo fixo):
 *   if (Dialogue.isDialogueActive()) Dialogue.updateDialogue();
 * No render, usar Dialogue.obterLinhaAtual() + Dialogue.obterTextoVisivel().
 *
 * Formatos de linha aceitos:
 *   ['Kael', 'Texto...']                       (legado, compatível com say())
 *   { name: 'Kael', text: 'Texto...', portrait: 'kael' }  (novo, retrato opcional)
 *
 * Regras de design (02_GAME_DESIGN.md §8): ≤180 caracteres por caixa,
 * ≤4 linhas de ~45 caracteres, typewriter 2 frames/letra.
 */
(function sistemaDialogo() {
  'use strict';

  var MAX_CARACTERES_POR_CAIXA = 180;
  var MAX_LINHAS_POR_CAIXA = 4;
  var CARACTERES_POR_LINHA = 45;
  var FRAMES_POR_LETRA = 2;

  var filaDialogo = [];
  var indiceLinhaAtual = 0;
  var contadorTypewriter = 0;
  var dialogoAtivo = false;
  var callbackAoConcluir = null;
  var provedorFlags = null;

  var modoEscolha = false;
  var opcoesEscolhaVisiveis = [];
  var indiceEscolhaAtual = 0;
  var callbackEscolha = null;

  function definirProvedorFlags(flagsOuFuncao) {
    provedorFlags = flagsOuFuncao;
  }

  function lerFlags() {
    if (typeof provedorFlags === 'function') return provedorFlags() || {};
    return provedorFlags || {};
  }

  function normalizarLinha(linha) {
    var nome = 'Narrador';
    var texto = '';
    var retrato = null;
    if (Array.isArray(linha)) {
      nome = String(linha[0] || 'Narrador');
      texto = String(linha[1] || '');
    } else if (linha && typeof linha === 'object') {
      nome = String(linha.name || linha.nome || linha.falante || 'Narrador');
      texto = String(linha.text || linha.texto || '');
      retrato = linha.portrait || linha.retrato || null;
    }
    if (texto.length > MAX_CARACTERES_POR_CAIXA) {
      texto = texto.slice(0, MAX_CARACTERES_POR_CAIXA);
    }
    return { nome: nome, texto: texto, retrato: retrato };
  }

  function startDialogue(linhas, callback) {
    if (!Array.isArray(linhas) || linhas.length === 0) return false;
    filaDialogo = linhas.map(normalizarLinha);
    indiceLinhaAtual = 0;
    contadorTypewriter = 0;
    callbackAoConcluir = typeof callback === 'function' ? callback : null;
    modoEscolha = false;
    opcoesEscolhaVisiveis = [];
    callbackEscolha = null;
    dialogoAtivo = true;
    return true;
  }

  // Alias compatível com o MVP: say([[falante, texto]], cb).
  function say(listaDePares, callback) {
    return startDialogue(listaDePares, callback);
  }

  function obterLinhaAtual() {
    if (!dialogoAtivo || filaDialogo.length === 0) return null;
    return filaDialogo[indiceLinhaAtual] || null;
  }

  function totalLetrasLinhaAtual() {
    var linha = obterLinhaAtual();
    return linha ? linha.texto.length : 0;
  }

  function linhaAtualCompleta() {
    return contadorTypewriter >= totalLetrasLinhaAtual() * FRAMES_POR_LETRA;
  }

  function obterTextoVisivel() {
    var linha = obterLinhaAtual();
    if (!linha) return '';
    var visiveis = Math.floor(contadorTypewriter / FRAMES_POR_LETRA);
    return linha.texto.slice(0, visiveis);
  }

  /**
   * Avança o typewriter no PASSO FIXO (chamar 1x por update a 60 Hz).
   * Nunca chamar no render.
   */
  function updateDialogue() {
    if (!dialogoAtivo || modoEscolha) return;
    if (!linhaAtualCompleta()) contadorTypewriter += 1;
  }

  function concluirDialogo() {
    dialogoAtivo = false;
    modoEscolha = false;
    var callback = callbackAoConcluir;
    callbackAoConcluir = null;
    filaDialogo = [];
    if (callback) callback();
  }

  /**
   * Avança o diálogo (toque / botão A / teclado).
   * Se o texto ainda está sendo digitado, completa a linha.
   * Senão, vai para a próxima linha ou conclui.
   * No modo escolha, confirma a opção selecionada.
   */
  function advanceDialogue() {
    if (!dialogoAtivo) return false;
    if (modoEscolha) return confirmarEscolha();
    if (!linhaAtualCompleta()) {
      contadorTypewriter = totalLetrasLinhaAtual() * FRAMES_POR_LETRA;
      return 'texto-completado';
    }
    indiceLinhaAtual += 1;
    contadorTypewriter = 0;
    if (indiceLinhaAtual >= filaDialogo.length) {
      concluirDialogo();
      return 'dialogo-concluido';
    }
    return 'linha-avancada';
  }

  function isDialogueActive() {
    return dialogoAtivo;
  }

  function estaEmEscolha() {
    return dialogoAtivo && modoEscolha;
  }

  /**
   * Apresenta 2–3 opções ao jogador.
   * Cada opção: { label, value, reqFlag? } — opções com reqFlag só
   * aparecem se a flag estiver ativa. Retrato do falante é opcional
   * e vem da linha de diálogo corrente ({ name, portrait }).
   */
  function choice(opcoes, callback, flags) {
    if (!Array.isArray(opcoes) || opcoes.length < 2) return false;
    var tabelaFlags = flags || lerFlags();
    var validas = opcoes
      .filter(function (opcao) {
        return opcao && typeof opcao.label === 'string' && 'value' in opcao;
      })
      .filter(function (opcao) {
        if (!opcao.reqFlag) return true;
        return Boolean(tabelaFlags[opcao.reqFlag]);
      })
      .slice(0, 3);
    if (validas.length < 2) return false;
    modoEscolha = true;
    dialogoAtivo = true;
    opcoesEscolhaVisiveis = validas.map(function (opcao) {
      return { label: opcao.label, value: opcao.value };
    });
    indiceEscolhaAtual = 0;
    callbackEscolha = typeof callback === 'function' ? callback : null;
    return true;
  }

  function obterOpcoesEscolha() {
    return opcoesEscolhaVisiveis.slice();
  }

  function obterIndiceEscolha() {
    return indiceEscolhaAtual;
  }

  function moverSelecaoEscolha(direcao) {
    if (!modoEscolha || opcoesEscolhaVisiveis.length === 0) return -1;
    var total = opcoesEscolhaVisiveis.length;
    indiceEscolhaAtual = (indiceEscolhaAtual + direcao + total) % total;
    return indiceEscolhaAtual;
  }

  function confirmarEscolha() {
    if (!modoEscolha) return false;
    var escolhida = opcoesEscolhaVisiveis[indiceEscolhaAtual];
    var callback = callbackEscolha;
    modoEscolha = false;
    callbackEscolha = null;
    opcoesEscolhaVisiveis = [];
    dialogoAtivo = false;
    filaDialogo = [];
    if (callback && escolhida) callback(escolhida.value);
    return 'escolha-confirmada';
  }

  /** Quebra o texto em linhas de ~45 caracteres (word wrap). */
  function quebrarTextoEmLinhas(texto, limite) {
    var largura = limite || CARACTERES_POR_LINHA;
    var linhas = [];
    var linhaCorrente = '';
    var palavras = String(texto || '').split(' ');
    for (var i = 0; i < palavras.length; i++) {
      var palavra = palavras[i];
      var candidata = linhaCorrente ? linhaCorrente + ' ' + palavra : palavra;
      if (candidata.length > largura && linhaCorrente) {
        linhas.push(linhaCorrente);
        linhaCorrente = palavra;
      } else {
        linhaCorrente = candidata;
      }
    }
    if (linhaCorrente) linhas.push(linhaCorrente);
    return linhas.slice(0, MAX_LINHAS_POR_CAIXA);
  }

  var SistemaDialogo = {
    startDialogue: startDialogue,
    say: say,
    advanceDialogue: advanceDialogue,
    updateDialogue: updateDialogue,
    isDialogueActive: isDialogueActive,
    estaEmEscolha: estaEmEscolha,
    choice: choice,
    obterOpcoesEscolha: obterOpcoesEscolha,
    obterIndiceEscolha: obterIndiceEscolha,
    moverSelecaoEscolha: moverSelecaoEscolha,
    confirmarEscolha: confirmarEscolha,
    obterLinhaAtual: obterLinhaAtual,
    obterTextoVisivel: obterTextoVisivel,
    linhaAtualCompleta: linhaAtualCompleta,
    quebrarTextoEmLinhas: quebrarTextoEmLinhas,
    definirProvedorFlags: definirProvedorFlags,
    MAX_CARACTERES_POR_CAIXA: MAX_CARACTERES_POR_CAIXA,
    MAX_LINHAS_POR_CAIXA: MAX_LINHAS_POR_CAIXA,
    CARACTERES_POR_LINHA: CARACTERES_POR_LINHA,
    FRAMES_POR_LETRA: FRAMES_POR_LETRA
  };

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.Dialogue = SistemaDialogo;
})();
