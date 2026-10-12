/**
 * src/systems/audio.js — Áudio: SFX + volume mestre + mudo persistente
 * Frente F0-Systems. Sem dependências externas, sem fetch.
 *
 * Regras (04_DEV_PLAN.md / 03_ARCHITECTURE.md):
 * - AudioContext criado SÓ após o 1º toque (respeita o autoplay).
 *   Chamar desbloquearAudio() dentro de um handler de pointerdown/tecla.
 * - Mudo persistente em localStorage, sempre em try/catch.
 * - snd(freq, dur, tipo) mantida por compatibilidade com o MVP.
 */
(function sistemaAudio() {
  'use strict';

  var CHAVE_MUDO = 'cristal_amanhecer_mudo';
  var CHAVE_VOLUME = 'cristal_amanhecer_volume';

  var contextoAudio = null;
  var ganhoMestre = null;
  var volumeMestre = 1.0;
  var emudecido = lerMudoSalvo();
  volumeMestre = lerVolumeSalvo();

  function lerMudoSalvo() {
    try {
      if (typeof localStorage === 'undefined') return false;
      return localStorage.getItem(CHAVE_MUDO) === '1';
    } catch (erro) {
      return false;
    }
  }

  function lerVolumeSalvo() {
    try {
      if (typeof localStorage === 'undefined') return 1.0;
      var bruto = parseFloat(localStorage.getItem(CHAVE_VOLUME));
      if (isNaN(bruto)) return 1.0;
      return Math.max(0, Math.min(1, bruto));
    } catch (erro) {
      return 1.0;
    }
  }

  function salvarPreferencias() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(CHAVE_MUDO, emudecido ? '1' : '0');
      localStorage.setItem(CHAVE_VOLUME, String(volumeMestre));
    } catch (erro) {
      // Armazenamento indisponível: segue sem persistir.
    }
  }

  /**
   * Deve ser chamado no 1º gesto do jogador (pointerdown/tecla).
   * Cria o AudioContext de forma preguiçosa e retoma se suspenso.
   */
  function desbloquearAudio() {
    try {
      var Construtor = typeof window !== 'undefined' &&
        (window.AudioContext || window.webkitAudioContext);
      if (!Construtor) return false;
      if (!contextoAudio) {
        contextoAudio = new Construtor();
        ganhoMestre = contextoAudio.createGain();
        ganhoMestre.gain.value = emudecido ? 0 : volumeMestre * 0.05;
        ganhoMestre.connect(contextoAudio.destination);
      }
      if (contextoAudio.state === 'suspended') contextoAudio.resume();
      return true;
    } catch (erro) {
      return false;
    }
  }

  function aplicarVolumeAoGanho() {
    if (!ganhoMestre || !contextoAudio) return;
    try {
      ganhoMestre.gain.setTargetAtTime(
        emudecido ? 0 : volumeMestre * 0.05,
        contextoAudio.currentTime,
        0.01
      );
    } catch (erro) {
      // Ignora falhas de automação de parâmetro.
    }
  }

  function tocarSom(frequencia, duracao, tipo) {
    if (emudecido) return false;
    if (!contextoAudio) return false;
    try {
      var oscilador = contextoAudio.createOscillator();
      var ganhoNota = contextoAudio.createGain();
      oscilador.type = tipo || 'square';
      oscilador.frequency.value = frequencia;
      ganhoNota.gain.value = 1;
      oscilador.connect(ganhoNota);
      ganhoNota.connect(ganhoMestre || contextoAudio.destination);
      oscilador.start();
      ganhoNota.gain.exponentialRampToValueAtTime(0.001, contextoAudio.currentTime + (duracao || 0.08));
      oscilador.stop(contextoAudio.currentTime + (duracao || 0.08));
      return true;
    } catch (erro) {
      return false;
    }
  }

  // Compatível com o MVP: snd(freq, dur, tipo).
  function snd(frequencia, duracao, tipo) {
    return tocarSom(frequencia, duracao === undefined ? 0.08 : duracao, tipo || 'square');
  }

  function setMuted(valor) {
    emudecido = Boolean(valor);
    aplicarVolumeAoGanho();
    salvarPreferencias();
  }

  function isMuted() {
    return emudecido;
  }

  function alternarMudo() {
    setMuted(!emudecido);
    return emudecido;
  }

  function definirVolumeMestre(valor) {
    volumeMestre = Math.max(0, Math.min(1, Number(valor) || 0));
    aplicarVolumeAoGanho();
    salvarPreferencias();
  }

  function obterVolumeMestre() {
    return volumeMestre;
  }

  // SFX revisados: presets nomeados em vez de números mágicos espalhados.
  var SFX = {
    ataque: { freq: 300, dur: 0.06, tipo: 'square' },
    esquiva: { freq: 500, dur: 0.05, tipo: 'triangle' },
    magia: { freq: 900, dur: 0.07, tipo: 'square' },
    danoJogador: { freq: 110, dur: 0.2, tipo: 'sawtooth' },
    acertoInimigo: { freq: 220, dur: 0.08, tipo: 'square' },
    runaOk: { freq: 850, dur: 0.2, tipo: 'triangle' },
    runaErro: { freq: 110, dur: 0.3, tipo: 'sawtooth' },
    coletar: { freq: 1000, dur: 0.3, tipo: 'triangle' },
    coracao: { freq: 800, dur: 0.1, tipo: 'triangle' },
    golpeChefe: { freq: 80, dur: 0.4, tipo: 'sawtooth' },
    acertoChefe: { freq: 200, dur: 0.1, tipo: 'square' },
    interruptorLiga: { freq: 700, dur: 0.15, tipo: 'triangle' },
    interruptorDesliga: { freq: 400, dur: 0.15, tipo: 'triangle' },
    avancoDialogo: { freq: 600, dur: 0.04, tipo: 'square' },
    escolha: { freq: 750, dur: 0.06, tipo: 'square' },
    porta: { freq: 350, dur: 0.25, tipo: 'triangle' }
  };

  function tocarEfeito(nome) {
    var preset = SFX[nome];
    if (!preset) return false;
    if (nome === 'runaOk') {
      // Arpejo ascendente de confirmação (variação do bip do MVP).
      tocarSom(preset.freq, preset.dur, preset.tipo);
      return true;
    }
    return tocarSom(preset.freq, preset.dur, preset.tipo);
  }

  var SistemaAudio = {
    desbloquearAudio: desbloquearAudio,
    tocarSom: tocarSom,
    snd: snd,
    setMuted: setMuted,
    isMuted: isMuted,
    alternarMudo: alternarMudo,
    definirVolumeMestre: definirVolumeMestre,
    obterVolumeMestre: obterVolumeMestre,
    tocarEfeito: tocarEfeito,
    SFX: SFX
  };

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.Audio = SistemaAudio;
})();
