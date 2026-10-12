/**
 * src/systems/entities.js — Entidades genéricas + tabelas de inimigos e chefes
 * Frente F0-Systems. Sem dependências externas, sem fetch.
 *
 * Cada entidade interativa expõe interact(jogo), onde `jogo` é o contexto:
 *   { flags, dialogue, audio, ui, mostrarMensagem(texto), irParaMapa(id, spawn) }
 * As funções toleram campos ausentes (encadeamento defensivo) para que o
 * módulo funcione isolado em testes.
 *
 * Inimigos e chefes são 100% dirigidos por tabelas (ENEMIES / BOSS_PATTERNS):
 * nada de if/else espalhados pelo update para cada tipo.
 */
(function sistemaEntidades() {
  'use strict';

  // ---------------------------------------------------------------------------
  // Tabela de inimigos: ENEMIES = { tipo: { hp, speed, dmg, ai, descricao, draw } }
  // speed em px/frame (passo 60 Hz), dmg em pontos de vida (jogador tem 8).
  // ---------------------------------------------------------------------------
  var ENEMIES = {
    slime: {
      hp: 2,
      speed: 0.5,
      dmg: 1,
      ai: 'chase',
      raioPercepcao: 70,
      descricao: 'Slime corrompido: persegue o jogador quando perto.',
      draw: function desenharSlime(e, R) {
        var piscando = e.tempoFlash > 0;
        R(piscando ? '#fff' : '#8a3fb5', e.x - 1, e.y + 2, 12, 9);
        R(piscando ? '#fff' : '#a65ad0', e.x + 1, e.y, 8, 4);
        R('#fff', e.x + 2, e.y + 4, 2, 2);
        R('#fff', e.x + 7, e.y + 4, 2, 2);
      }
    },
    rootBat: {
      hp: 1,
      speed: 0.8,
      dmg: 1,
      ai: 'swoop',
      raioPercepcao: 90,
      descricao: 'Morcego de raiz: vagueia e investe em mergulho contra o jogador.',
      draw: function desenharMorcego(e, R) {
        var piscando = e.tempoFlash > 0;
        var asa = e.tempoAnimacao % 20 < 10 ? -2 : 2;
        R(piscando ? '#fff' : '#3a2a4a', e.x - 3, e.y + 2 + asa, 5, 3);
        R(piscando ? '#fff' : '#3a2a4a', e.x + 8, e.y + 2 - asa, 5, 3);
        R(piscando ? '#fff' : '#5a3a6a', e.x + 1, e.y + 2, 8, 6);
        R('#f66', e.x + 3, e.y + 4, 2, 2);
        R('#f66', e.x + 6, e.y + 4, 2, 2);
      }
    }
  };

  function criarInimigo(tipo, x, y) {
    var definicao = ENEMIES[tipo];
    if (!definicao) return null;
    return {
      kind: tipo,
      x: x,
      y: y,
      tamanho: 10,
      vida: definicao.hp,
      vidaMaxima: definicao.hp,
      velocidade: definicao.speed,
      dano: definicao.dmg,
      comportamento: definicao.ai,
      tempoPensar: 0,
      vx: 0,
      vy: 0,
      kx: 0,
      ky: 0,
      tempoFlash: 0,
      tempoAnimacao: 0,
      idGolpeRecebido: -1
    };
  }

  function definirDesenhoInimigo(inimigo, R) {
    var definicao = ENEMIES[inimigo.kind];
    if (definicao && typeof definicao.draw === 'function') definicao.draw(inimigo, R);
  }

  // Comportamentos de IA indexados por nome (despacho por tabela).
  var COMPORTAMENTOS_IA = {
    chase: function perseguir(inimigo, contexto) {
      var dx = contexto.jogador.x - inimigo.x;
      var dy = contexto.jogador.y - inimigo.y;
      var dist = Math.hypot(dx, dy) || 1;
      var alcance = (ENEMIES[inimigo.kind] || {}).raioPercepcao || 70;
      if (dist < alcance) return { vx: (dx / dist) * inimigo.velocidade, vy: (dy / dist) * inimigo.velocidade };
      return vagar(inimigo);
    },
    swoop: function mergulhar(inimigo, contexto) {
      var dx = contexto.jogador.x - inimigo.x;
      var dy = contexto.jogador.y - inimigo.y;
      var dist = Math.hypot(dx, dy) || 1;
      var alcance = (ENEMIES[inimigo.kind] || {}).raioPercepcao || 90;
      if (inimigo.tempoInvestida > 0) {
        inimigo.tempoInvestida -= 1;
        return { vx: inimigo.vx, vy: inimigo.vy };
      }
      if (dist < alcance && inimigo.tempoRecargaInvestida <= 0) {
        inimigo.tempoInvestida = 25;
        inimigo.tempoRecargaInvestida = 120;
        var forca = inimigo.velocidade * 2.2;
        inimigo.vx = (dx / dist) * forca;
        inimigo.vy = (dy / dist) * forca;
        return { vx: inimigo.vx, vy: inimigo.vy };
      }
      if (inimigo.tempoRecargaInvestida > 0) inimigo.tempoRecargaInvestida -= 1;
      return vagar(inimigo);
    }
  };

  function vagar(inimigo) {
    if (inimigo.tempoPensar <= 0) {
      inimigo.tempoPensar = 50 + Math.random() * 60;
      inimigo.vx = (Math.random() - 0.5) * 0.7;
      inimigo.vy = (Math.random() - 0.5) * 0.7;
    }
    inimigo.tempoPensar -= 1;
    return { vx: inimigo.vx, vy: inimigo.vy };
  }

  /** Atualiza a IA sem if/else por tipo: despacha pela tabela. */
  function atualizarInteligencia(inimigo, contexto) {
    var comportamento = COMPORTAMENTOS_IA[inimigo.comportamento];
    if (typeof comportamento !== 'function') comportamento = COMPORTAMENTOS_IA.chase;
    return comportamento(inimigo, contexto);
  }

  // ---------------------------------------------------------------------------
  // Entidades interativas (NPC, Sign, Switch, Door, Pickup)
  // ---------------------------------------------------------------------------
  function dialogoSeguro(jogo, linhas, callback) {
    if (jogo && jogo.dialogue && typeof jogo.dialogue.startDialogue === 'function') {
      jogo.dialogue.startDialogue(linhas, callback);
      return 'dialogo';
    }
    return 'sem-dialogo';
  }

  function mensagemSegura(jogo, texto) {
    if (jogo && typeof jogo.mostrarMensagem === 'function') jogo.mostrarMensagem(texto);
  }

  function criarNPC(dados) {
    var npc = {
      tipo: 'npc',
      x: dados.x || 0,
      y: dados.y || 0,
      nome: dados.nome || 'Aldeão',
      retrato: dados.retrato || null,
      falas: dados.falas || [['???', '...']],
      falaCondicional: dados.falaCondicional || null,
      interact: function interagirNPC(jogo) {
        var falas = npc.falas;
        if (
          npc.falaCondicional &&
          jogo && jogo.flags &&
          jogo.flags[npc.falaCondicional.flag]
        ) {
          falas = npc.falaCondicional.falas;
        }
        var linhas = falas.map(function (fala) {
          return { name: npc.nome, text: fala[1] || fala.text || '', portrait: npc.retrato };
        });
        return dialogoSeguro(jogo, linhas.length ? linhas : npc.falas);
      }
    };
    return npc;
  }

  function criarPlaca(dados) {
    var placa = {
      tipo: 'sign',
      x: dados.x || 0,
      y: dados.y || 0,
      titulo: dados.titulo || 'Inscrição',
      texto: dados.texto || '...',
      flagLeitura: dados.flagLeitura || 'sign_read',
      interact: function interagirPlaca(jogo) {
        if (jogo && jogo.flags) jogo.flags[placa.flagLeitura] = true;
        return dialogoSeguro(jogo, [
          { name: placa.titulo, text: placa.texto },
          { name: 'Lumi', text: 'Interessante... isso parece importante, herói.', portrait: 'lumi' }
        ]);
      }
    };
    return placa;
  }

  function criarInterruptor(dados) {
    var interruptor = {
      tipo: 'switch',
      x: dados.x || 0,
      y: dados.y || 0,
      id: dados.id || 'interruptor',
      ligado: Boolean(dados.ligado),
      interact: function interagirInterruptor(jogo) {
        interruptor.ligado = !interruptor.ligado;
        if (jogo && jogo.flags) jogo.flags['switch_' + interruptor.id] = interruptor.ligado;
        if (jogo && jogo.audio && typeof jogo.audio.tocarEfeito === 'function') {
          jogo.audio.tocarEfeito(interruptor.ligado ? 'interruptorLiga' : 'interruptorDesliga');
        }
        mensagemSegura(jogo, interruptor.ligado ? 'Algo rangeu ao longe...' : 'O mecanismo se aquietou.');
        return interruptor.ligado ? 'ligado' : 'desligado';
      }
    };
    return interruptor;
  }

  function criarPorta(dados) {
    var porta = {
      tipo: 'door',
      x: dados.x || 0,
      y: dados.y || 0,
      destinoMapa: dados.destinoMapa || null,
      pontoChegada: dados.pontoChegada || null,
      flagRequisito: dados.flagRequisito || null,
      mensagemTrancada: dados.mensagemTrancada || 'Trancado. Falta uma chave.',
      interact: function interagirPorta(jogo) {
        var liberada = !porta.flagRequisito ||
          (jogo && jogo.flags && jogo.flags[porta.flagRequisito]);
        if (!liberada) {
          mensagemSegura(jogo, porta.mensagemTrancada);
          return 'trancada';
        }
        if (porta.destinoMapa && jogo && typeof jogo.irParaMapa === 'function') {
          jogo.irParaMapa(porta.destinoMapa, porta.pontoChegada);
          return 'travessia';
        }
        return 'aberta';
      }
    };
    return porta;
  }

  var EFEITOS_COLETAVEL = {
    chave: function coletarChave(coletavel, jogo) {
      if (jogo && jogo.flags) jogo.flags.has_key_c1 = true;
      mensagemSegura(jogo, 'Chave obtida! Vá ao portão.');
      return 'chave';
    },
    coracao: function coletarCoracao(coletavel, jogo) {
      if (jogo && jogo.jogador) {
        jogo.jogador.hp = Math.min(jogo.jogador.hpMax || 8, jogo.jogador.hp + 2);
      }
      return 'cura';
    },
    pocao: function coletarPocao(coletavel, jogo) {
      if (jogo && jogo.flags) jogo.flags.pocoes = (jogo.flags.pocoes || 0) + 1;
      mensagemSegura(jogo, 'Poção guardada! (+4 de vida quando usada)');
      return 'pocao';
    }
  };

  function criarColetavel(dados) {
    var coletavel = {
      tipo: 'pickup',
      classe: dados.classe || 'coracao',
      x: dados.x || 0,
      y: dados.y || 0,
      coletado: false,
      interact: function interagirColetavel(jogo) {
        if (coletavel.coletado) return 'ja-coletado';
        var efeito = EFEITOS_COLETAVEL[coletavel.classe];
        if (typeof efeito !== 'function') return 'sem-efeito';
        coletavel.coletado = true;
        if (jogo && jogo.audio && typeof jogo.audio.tocarEfeito === 'function') {
          jogo.audio.tocarEfeito('coletar');
        }
        return efeito(coletavel, jogo);
      }
    };
    return coletavel;
  }

  // ---------------------------------------------------------------------------
  // Chefes como máquina de estados dirigida por tabela.
  // Todo golpe forte tem telegraph visível ≥ 30 frames (ver 02_GAME_DESIGN.md).
  // ---------------------------------------------------------------------------
  var BOSS_PATTERNS = {
    guardiaoRaizes: {
      nome: 'Guardião das Raízes',
      vidaMaxima: 24,
      tamanho: 28,
      estadoInicial: 'walk',
      estados: {
        walk: { duracao: 90, proximo: 'telegraph' },
        telegraph: { duracao: 40, proximo: 'active' },
        active: { duracao: 14, proximo: 'rest' },
        rest: { duracao: 50, proximo: 'walk' }
      },
      faseEnfurecida: {
        limiarHp: 12,
        duracaoWalk: 65,
        disparaRaizesRadiais: 8,
        velocidadeRaiz: 1.3
      }
    }
  };

  function criarChefe(tipo) {
    var definicao = BOSS_PATTERNS[tipo];
    if (!definicao) return null;
    return {
      kind: tipo,
      x: 106,
      y: 28,
      tamanho: definicao.tamanho,
      vida: definicao.vidaMaxima,
      vidaMaxima: definicao.vidaMaxima,
      estado: definicao.estadoInicial,
      tempoEstado: definicao.estados[definicao.estadoInicial].duracao,
      tempoFlash: 0,
      idGolpeRecebido: -1,
      finalizado: false,
      contadorMorte: 0
    };
  }

  /**
   * Avança a máquina de estados do chefe de forma genérica.
   * contexto: { xJogador, yJogador, aoTelegraph(), aoGolpeForte(raio),
   *              aoDispararRaizes(qtd, velocidade), aoDescansar() }
   */
  function atualizarChefe(chefe, contexto) {
    var definicao = BOSS_PATTERNS[chefe.kind];
    if (!definicao) return chefe.estado;
    if (chefe.tempoFlash > 0) chefe.tempoFlash -= 1;
    chefe.tempoEstado -= 1;
    var enfurecido = chefe.vida <= definicao.faseEnfurecida.limiarHp;
    var centroX = chefe.x + chefe.tamanho / 2;
    var centroY = chefe.y + chefe.tamanho / 2;
    var dx = contexto.xJogador - centroX;
    var dy = contexto.yJogador - centroY;
    var dist = Math.hypot(dx, dy) || 1;

    if (chefe.estado === 'walk') {
      var passo = enfurecido ? 0.55 : 0.4;
      chefe.x += (dx / dist) * passo;
      chefe.y += (dy / dist) * passo;
    }

    if (chefe.tempoEstado > 0) return chefe.estado;
    var atual = definicao.estados[chefe.estado];
    var proximo = atual ? atual.proximo : definicao.estadoInicial;

    if (chefe.estado === 'walk' && contexto.aoTelegraph) contexto.aoTelegraph();
    if (proximo === 'active' && contexto.aoGolpeForte) {
      contexto.aoGolpeForte(46);
      if (enfurecido && contexto.aoDispararRaizes) {
        contexto.aoDispararRaizes(
          definicao.faseEnfurecida.disparaRaizesRadiais,
          definicao.faseEnfurecida.velocidadeRaiz
        );
      }
    }
    if (proximo === 'walk' && contexto.aoDescansar) contexto.aoDescansar();

    chefe.estado = proximo;
    var duracao = definicao.estados[proximo].duracao;
    if (proximo === 'walk' && enfurecido) duracao = definicao.faseEnfurecida.duracaoWalk;
    chefe.tempoEstado = duracao;
    return chefe.estado;
  }

  var SistemaEntidades = {
    ENEMIES: ENEMIES,
    BOSS_PATTERNS: BOSS_PATTERNS,
    criarInimigo: criarInimigo,
    definirDesenhoInimigo: definirDesenhoInimigo,
    atualizarInteligencia: atualizarInteligencia,
    criarNPC: criarNPC,
    criarPlaca: criarPlaca,
    criarInterruptor: criarInterruptor,
    criarPorta: criarPorta,
    criarColetavel: criarColetavel,
    criarChefe: criarChefe,
    atualizarChefe: atualizarChefe
  };

  var raiz = (globalThis.Cristal = globalThis.Cristal || {});
  raiz.Entities = SistemaEntidades;
})();
