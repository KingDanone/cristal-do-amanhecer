/**
 * src/systems/ui.js — Pausa, menu, toast e fade de transição
 * Frente F0-Systems. Sem dependências externas, sem fetch, sem <form>.
 *
 * - Pausa automática em visibilitychange/blur + botão de menu.
 * - Menu: continuar, mudo, reiniciar sala.
 * - Toast posicionado para NÃO sobrepor a linha de objetivo nem a caixa
 *   de diálogo em telas pequenas (canvas 240x160).
 * - Fade helper para transição de mapa (padrão: 12 frames).
 *
 * Este módulo guarda estado e expõe dados; o render do jogo desenha
 * a partir de obterToast(), obterAlphaFade() e obterOpcoesMenu().
 */
(function sistemaUI() {
  'use strict';

  var ALTURA_LOGICA = 160;
  var Y_OBJETIVO = 22;
  var Y_TOAST_PADRAO = 38;
  var DURACAO_TOAST_PADRAO = 150;
  var DURACAO_FADE_PADRAO = 12;

  var jogoPausado = false;
  var menuAberto = false;
  var indiceOpcaoMenu = 0;
  var aoReiniciarSala = null;

  var textoToast = '';
  var tempoToast = 0;
  var filaToast = [];

  var alphaFade = 0;
  var faseFade = 'visivel'; // visivel | escurecendo | clareando
  var tempoFade = 0;
  var duracaoFade = DURACAO_FADE_PADRAO;
  var callbackFade = null;

  // ---------------------------------------------------------------------------
  // Pausa + menu
  // ---------------------------------------------------------------------------
  function pausarJogo() {
    jogoPausado = true;
    menuAberto = true;
    indiceOpcaoMenu = 0;
  }

  function continuarJogo() {
    jogoPausado = false;
    menuAberto = false;
  }

  function alternarPausa() {
    if (jogoPausado) continuarJogo();
    else pausarJogo();
  }

  function estaPausado() {
    return jogoPausado;
  }

  function menuEstaAberto() {
    return menuAberto;
  }

  /**
   * Pausa automática ao perder foco. Chamar uma vez na inicialização.
   * Seguro em ambiente sem DOM (testes node): não faz nada.
   */
  function iniciarPausaAutomatica(callbacks) {
    if (callbacks && typeof callbacks.aoReiniciarSala === 'function') {
      aoReiniciarSala = callbacks.aoReiniciarSala;
    }
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', function aoVisibilidade() {
      if (document.hidden) pausarJogo();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', function aoDesfocar() {
        pausarJogo();
      });
    }
  }

  function definirAcaoReiniciarSala(callback) {
    if (typeof callback === 'function') aoReiniciarSala = callback;
  }

  function obterOpcoesMenu(estaEmudecido) {
    return [
      { id: 'continuar', rotulo: 'Continuar' },
      { id: 'mudo', rotulo: estaEmudecido ? 'Som: desligado' : 'Som: ligado' },
      { id: 'reiniciar', rotulo: 'Reiniciar sala' }
    ];
  }

  function obterIndiceOpcaoMenu() {
    return indiceOpcaoMenu;
  }

  function moverOpcaoMenu(direcao) {
    var total = obterOpcoesMenu(false).length;
    indiceOpcaoMenu = (indiceOpcaoMenu + direcao + total) % total;
    return indiceOpcaoMenu;
  }

  /**
   * Executa a opção do menu. `jogo` pode trazer { audio } para o mudo.
   * Retorna o id executado.
   */
  function executarOpcaoMenu(idOuIndice, jogo) {
    var opcoes = obterOpcoesMenu(
      Boolean(jogo && jogo.audio && typeof jogo.audio.isMuted === 'function' && jogo.audio.isMuted())
    );
    var opcao = typeof idOuIndice === 'number' ? opcoes[idOuIndice] : null;
    if (!opcao && typeof idOuIndice === 'string') {
      for (var i = 0; i < opcoes.length; i++) {
        if (opcoes[i].id === idOuIndice) { opcao = opcoes[i]; break; }
      }
    }
    if (!opcao) return 'invalida';
    if (opcao.id === 'continuar') {
      continuarJogo();
      return 'continuar';
    }
    if (opcao.id === 'mudo') {
      if (jogo && jogo.audio && typeof jogo.audio.alternarMudo === 'function') {
        jogo.audio.alternarMudo();
      }
      return 'mudo';
    }
    if (opcao.id === 'reiniciar') {
      if (aoReiniciarSala) aoReiniciarSala();
      continuarJogo();
      return 'reiniciar';
    }
    return 'invalida';
  }

  /**
   * Liga um elemento DOM como botão de menu via pointer events
   * (sem <form>). Seguro sem DOM.
   */
  function ligarBotaoMenu(elemento, acao) {
    if (!elemento || typeof elemento.addEventListener !== 'function') return;
    if (typeof acao !== 'function') return;
    elemento.addEventListener('pointerdown', function aoPressionarMenu(evento) {
      if (evento && typeof evento.preventDefault === 'function') evento.preventDefault();
      acao();
    });
  }

  // ---------------------------------------------------------------------------
  // Toast (mensagem curta) — sem sobrepor objetivo nem diálogo
  // ---------------------------------------------------------------------------
  function mostrarToast(texto, duracao) {
    if (!texto) return;
    filaToast.push({ texto: String(texto), tempo: duracao || DURACAO_TOAST_PADRAO });
    if (tempoToast <= 0) exibirProximoToast();
  }

  function exibirProximoToast() {
    var proximo = filaToast.shift();
    if (!proximo) {
      textoToast = '';
      tempoToast = 0;
      return;
    }
    textoToast = proximo.texto;
    tempoToast = proximo.tempo;
  }

  /** Avança o timer no passo fixo. Suprime enquanto o diálogo está ativo. */
  function updateToast(dialogoAtivo) {
    if (tempoToast <= 0) {
      if (!dialogoAtivo) exibirProximoToast();
      return;
    }
    if (dialogoAtivo) return; // espera a caixa de diálogo fechar
    tempoToast -= 1;
    if (tempoToast <= 0) exibirProximoToast();
  }

  function toastVisivel(dialogoAtivo) {
    if (dialogoAtivo) return false;
    return tempoToast > 0 && textoToast !== '';
  }

  function obterToast() {
    return { texto: textoToast, tempo: tempoToast };
  }

  /**
   * Linha Y do toast: abaixo do objetivo (Y=22) e longe da caixa de
   * diálogo (y 100–156), funcionando no canvas 240x160.
   */
  function obterYDoToast() {
    return Y_TOAST_PADRAO;
  }

  // ---------------------------------------------------------------------------
  // Fade de transição de mapa
  // ---------------------------------------------------------------------------
  function iniciarTransicao(callback, duracao) {
    faseFade = 'escurecendo';
    tempoFade = 0;
    duracaoFade = duracao || DURACAO_FADE_PADRAO;
    callbackFade = typeof callback === 'function' ? callback : null;
  }

  /** Avança o fade no passo fixo. Troca o mapa no ponto mais escuro. */
  function updateFade() {
    if (faseFade === 'visivel') return;
    tempoFade += 1;
    if (faseFade === 'escurecendo') {
      alphaFade = Math.min(1, tempoFade / duracaoFade);
      if (alphaFade >= 1) {
        var callback = callbackFade;
        callbackFade = null;
        if (callback) callback();
        faseFade = 'clareando';
        tempoFade = 0;
      }
    } else if (faseFade === 'clareando') {
      alphaFade = Math.max(0, 1 - tempoFade / duracaoFade);
      if (alphaFade <= 0) {
        faseFade = 'visivel';
        tempoFade = 0;
      }
    }
  }

  function obterAlphaFade() {
    return alphaFade;
  }

  function transicaoAtiva() {
    return faseFade !== 'visivel';
  }

  function alturaLogica() {
    return ALTURA_LOGICA;
  }

  var SistemaUI = {
    pausarJogo: pausarJogo,
    continuarJogo: continuarJogo,
    alternarPausa: alternarPausa,
    estaPausado: estaPausado,
    menuEstaAberto: menuEstaAberto,
    iniciarPausaAutomatica: iniciarPausaAutomatica,
    definirAcaoReiniciarSala: definirAcaoReiniciarSala,
    obterOpcoesMenu: obterOpcoesMenu,
    obterIndiceOpcaoMenu: obterIndiceOpcaoMenu,
    moverOpcaoMenu: moverOpcaoMenu,
    executarOpcaoMenu: executarOpcaoMenu,
    ligarBotaoMenu: ligarBotaoMenu,
    mostrarToast: mostrarToast,
    updateToast: updateToast,
    toastVisivel: toastVisivel,
    obterToast: obterToast,
    obterYDoToast: obterYDoToast,
    iniciarTransicao: iniciarTransicao,
    updateFade: updateFade,
    obterAlphaFade: obterAlphaFade,
    transicaoAtiva: transicaoAtiva,
    Y_OBJETIVO: Y_OBJETIVO,
    DURACAO_FADE_PADRAO: DURACAO_FADE_PADRAO
  };

  // Evita referência não definida em ambientes sem altura fixa.
  void alturaLogica;

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.UI = SistemaUI;
})();
