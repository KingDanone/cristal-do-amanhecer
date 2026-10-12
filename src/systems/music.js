/**
 * src/systems/music.js — Música procedural (WebAudio, MIDI-like GBA)
 * Sem arquivos externos, sem fetch, sem DOM obrigatório.
 * - AudioContext criado SÓ em aoGestoDoUsuario() (autoplay seguro);
 *   tocarTema() antes do gesto apenas registra o tema pendente.
 * - "Melodia de Brisamar": alegre na vila, calma no título, tensa/menor
 *   na floresta (mesma sequência de graus em variação).
 * - Mudo lido a cada nota via Cristal.Audio.isMuted(); sem Audio, fallback
 *   próprio (localStorage try/catch, mesma chave).
 */
(function sistemaMusica() {
  'use strict';

  var ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];
  var ESCALA_MENOR = [0, 2, 3, 5, 7, 8, 10];

  // "grau,dur grau,dur ..." → [[grau,dur]]; passo = pulso / passosPorPulso;
  // grau -1 = pausa. Cada camada faz loop na própria soma de durações.
  function seq(s) {
    return s.split(' ').map(function (par) {
      var a = par.split(',');
      return [Number(a[0]), Number(a[1])];
    });
  }
  // Percussão: tipo → [onda, freqIni, freqFim, duração, ganho] (osc curtos).
  var PERC = {
    bumbo: ['sawtooth', 150, 45, 0.1, 0.55],
    chimbal: ['square', 6200, 0, 0.03, 0.18]
  };

  // Melodia de Brisamar: 3/4 alegre, 8 compassos — base de 3 temas.
  var MELODIA_BRISAMAR = seq(
    '4,2 4,1 5,1 7,2 6,2 5,2 4,2 2,2 4,2 4,2 3,3 2,3 ' +
    '4,2 4,1 5,1 7,2 9,2 7,2 6,2 7,2 6,2 5,2 7,3 7,3');
  var BAIXO_BRISAMAR = seq('0,3 4,3 3,3 0,3 0,3 4,3 4,3 1,3');
  var BAIXO_TITULO = seq('0,6 3,6 4,6 0,6');
  var BAIXO_FLORESTA = seq('0,6 0,6 1,6 4,6');
  var MELODIA_RUINAS = seq('0,4 -1,2 3,2 2,2 -1,2 1,4 -1,2 0,6');
  var BAIXO_RUINAS = seq('0,12 5,12');
  var MELODIA_VALDORA = seq(
    '0,1 2,1 4,1 5,1 7,2 5,1 4,1 2,1 0,2 2,2 4,2 5,2 7,2 9,2 7,2 5,1');
  var BAIXO_VALDORA = seq('0,2 0,2 4,2 3,2 0,2 0,2 4,2 4,2');
  var PERCUSSAO_VALDORA = { passoCiclo: 8, eventos: [
    [2, 'chimbal'], [4, 'bumbo'], [6, 'chimbal']
  ] };
  var MELODIA_CHEFE = seq(
    '0,1 0,1 1,1 0,1 3,1 3,1 1,1 0,1 0,1 0,1 1,1 0,1 5,1 4,1 3,1 7,1');
  var BAIXO_CHEFE = seq('0,1 0,1 0,1 0,1 0,1 0,1 3,1 1,1');
  var PERCUSSAO_CHEFE = { passoCiclo: 8, eventos: [
    [0, 'bumbo'], [2, 'chimbal'], [4, 'bumbo'], [4, 'chimbal'], [6, 'chimbal'], [7, 'chimbal']
  ] };

  // Definições; tônica em MIDI (69 = A4 = 440 Hz).
  function criarTema(bpm, pulsos, escala, tonica, gMel, gBaixo, melodia, baixo, perc) {
    return { bpm: bpm, pulsosPorCompasso: pulsos, passosPorPulso: 2,
      escala: escala, tonicaMidi: tonica, ganhoMelodia: gMel, ganhoBaixo: gBaixo,
      melodia: melodia, baixo: baixo, percussao: perc || null };
  }
  var TEMAS = {
    brisamar_theme: criarTema(132, 3, ESCALA_MAIOR, 76, 0.5, 0.4, MELODIA_BRISAMAR, BAIXO_BRISAMAR),
    forest_theme: criarTema(88, 3, ESCALA_MENOR, 69, 0.42, 0.42, MELODIA_BRISAMAR, BAIXO_FLORESTA),
    ruin_theme: criarTema(70, 3, ESCALA_MENOR, 57, 0.4, 0.36, MELODIA_RUINAS, BAIXO_RUINAS),
    boss_theme: criarTema(152, 4, ESCALA_MENOR, 64, 0.46, 0.4, MELODIA_CHEFE, BAIXO_CHEFE, PERCUSSAO_CHEFE),
    title_theme: criarTema(78, 3, ESCALA_MAIOR, 72, 0.42, 0.35, MELODIA_BRISAMAR, BAIXO_TITULO),
    valdora_theme: criarTema(126, 4, ESCALA_MAIOR, 72, 0.44, 0.38, MELODIA_VALDORA, BAIXO_VALDORA, PERCUSSAO_VALDORA)
  };

  var GANHO_DEDICADO = 0.02; // ~40% do mestre dos SFX — anti-clipping
  var contextoAudio = null, ganhoMusica = null;
  var idTemaAtual = null, tema = null, tocando = false, intervaloId = null;
  var passoAtual = 0, proximoTempo = 0, duracaoPasso = 0.2;
  var cursorMelodia = null, cursorBaixo = null;

  function obterAudio() { // Cristal.Audio opcional: nunca obrigatório
    return (typeof globalThis !== 'undefined' && globalThis.Cristal) ? globalThis.Cristal.Audio : null;
  }
  // Mudo lido por nota; sem Audio, fallback localStorage try/catch.
  function obterMudoEfetivo() {
    var A = obterAudio();
    if (A && typeof A.isMuted === 'function') {
      try { return !!A.isMuted(); } catch (erro) { /* fallback */ }
    }
    try {
      return typeof localStorage !== 'undefined' &&
        localStorage.getItem('cristal_amanhecer_mudo') === '1';
    } catch (erro) { return false; }
  }

  // Grau da escala → frequência (MIDI; A4 = 440).
  function frequenciaDoGrau(grau) {
    var n = tema.escala.length;
    var midi = tema.tonicaMidi + Math.floor(grau / n) * 12 + tema.escala[((grau % n) + n) % n];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Só chamado a partir do gesto do jogador (autoplay seguro).
  function garantirContexto() {
    if (contextoAudio) return true;
    try {
      var Construtor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!Construtor) return false;
      contextoAudio = new Construtor();
      ganhoMusica = contextoAudio.createGain();
      ganhoMusica.gain.value = GANHO_DEDICADO;
      ganhoMusica.connect(contextoAudio.destination);
      return true;
    } catch (erro) { contextoAudio = null; ganhoMusica = null; return false; }
  }

  // Emissor único: oscilador + envelope exponencial; mudo checado por nota.
  // freqFim > 0 faz rampa de afinação (bumbo); 0 = afinação fixa.
  function emitir(tipo, freqIni, freqFim, tempo, duracao, ganhoAlvo) {
    if (obterMudoEfetivo()) return;
    if (!contextoAudio || !ganhoMusica || freqIni <= 0) return;
    try {
      var osc = contextoAudio.createOscillator();
      var g = contextoAudio.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freqIni, tempo);
      if (freqFim > 0) osc.frequency.exponentialRampToValueAtTime(freqFim, tempo + duracao);
      g.gain.value = ganhoAlvo;
      g.gain.exponentialRampToValueAtTime(0.001, tempo + duracao);
      osc.connect(g); g.connect(ganhoMusica);
      osc.start(tempo); osc.stop(tempo + duracao + 0.03);
    } catch (erro) { /* ignora */ }
  }

  function agendarCamada(cursor, dados, tempo, tick, ehBaixo) {
    for (;;) {
      var ev = dados[cursor.indice];
      if (cursor.inicio > tick) break;
      if (cursor.inicio === tick && ev[0] >= 0) {
        emitir(ehBaixo ? 'triangle' : 'square',
          frequenciaDoGrau(ev[0]) * (ehBaixo ? 0.25 : 1), 0, tempo,
          ev[1] * duracaoPasso * 0.9, ehBaixo ? tema.ganhoBaixo : tema.ganhoMelodia);
      }
      cursor.inicio += ev[1]; // dur >= 1: sempre avança
      cursor.indice = (cursor.indice + 1) % dados.length;
    }
  }

  // Sequencer com lookahead de 0,1 s; se o timer pausou (aba inativa),
  // realinha em vez de disparar rajada de notas atrasadas.
  function cicloSequencer() {
    if (!contextoAudio || !tocando || !tema) return;
    try {
      var agora = contextoAudio.currentTime;
      if (proximoTempo < agora - 0.05) proximoTempo = agora + 0.02;
      var volume = 1, A = obterAudio();
      if (A && typeof A.obterVolumeMestre === 'function') {
        try { volume = Math.max(0, Math.min(1, Number(A.obterVolumeMestre()) || 0)); }
        catch (erroVol) { /* ignora */ }
      }
      ganhoMusica.gain.setTargetAtTime(GANHO_DEDICADO * volume, agora, 0.05);
      while (proximoTempo < agora + 0.1) {
        var tick = passoAtual, tempo = proximoTempo;
        agendarCamada(cursorMelodia, tema.melodia, tempo, tick, false);
        agendarCamada(cursorBaixo, tema.baixo, tempo, tick, true);
        if (tema.percussao) { // percussão opcional (ex.: chefe)
          var pos = tick % tema.percussao.passoCiclo;
          for (var i = 0; i < tema.percussao.eventos.length; i++) {
            var p = PERC[tema.percussao.eventos[i][1]];
            if (p && tema.percussao.eventos[i][0] === pos) emitir(p[0], p[1], p[2], tempo, p[3], p[4]);
          }
        }
        passoAtual++;
        proximoTempo += duracaoPasso;
      }
    } catch (erro) { /* tenta no próximo intervalo */ }
  }

  function iniciarReproducao() {
    if (!contextoAudio || !tema || tocando) return;
    tocando = true;
    passoAtual = 0;
    duracaoPasso = 60 / tema.bpm / tema.passosPorPulso;
    proximoTempo = contextoAudio.currentTime + 0.06;
    cursorMelodia = { indice: 0, inicio: 0 };
    cursorBaixo = { indice: 0, inicio: 0 };
    intervaloId = setInterval(cicloSequencer, 25);
    cicloSequencer();
  }

  function pararReproducao() {
    tocando = false;
    if (intervaloId !== null) { clearInterval(intervaloId); intervaloId = null; }
  }

  // Idempotente; antes do 1º gesto só registra o tema pendente (false).
  function tocarTema(id) {
    var def = TEMAS[id];
    if (!def) return false;
    if (id === idTemaAtual) return true;
    idTemaAtual = id;
    tema = def;
    if (!contextoAudio) return false;
    pararReproducao();
    iniciarReproducao();
    return true;
  }

  function parar() { idTemaAtual = null; pararReproducao(); }
  function temaAtual() { return idTemaAtual; }

  // Chamado pelo main em qualquer ação: cria/retoma o AudioContext e
  // inicia o tema pendente, se houver.
  function aoGestoDoUsuario() {
    if (!garantirContexto()) return false;
    try { if (contextoAudio.state === 'suspended') contextoAudio.resume(); }
    catch (erro) { /* ignora */ }
    if (idTemaAtual && !tocando) {
      tema = TEMAS[idTemaAtual];
      pararReproducao();
      iniciarReproducao();
    }
    return true;
  }

  // Metadados do tema (testes / futuros seletores); null se desconhecido.
  function obterDefinicaoTema(id) { return TEMAS[id] || null; }

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.Music = {
    tocarTema: tocarTema, parar: parar, temaAtual: temaAtual,
    aoGestoDoUsuario: aoGestoDoUsuario, obterDefinicaoTema: obterDefinicaoTema
  };
})();
