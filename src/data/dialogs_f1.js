// dialogs_f1.js — F1-Content (Prólogo + Cap. 1)
// Roteiro fiel a 01_STORY_BIBLE.md §Prólogo e §Cap. 1.
// Tom: aventura GBA clássica, humor leve da Lumi, pt-BR.
// Regra de caixa: cada texto <= 180 chars (<= 4 linhas de ~45 chars).
//
// Formato de cada entrada:
//   { id, speakers: [[nome, texto], ...], flagsSet: {...}, choices?: [...] }
//   choices: [{ text, reply: [[nome, texto], ...], flagsSet }] — reply é
//   opcional; flagsSet da escolha soma com o flagsSet da entrada.
// Convenção de NPC: dialogs: { first, repeat } — o motor toca `repeat`
// quando as flags de `first` já foram aplicadas.
//
// Propostas D-0X: nenhuma. Nenhuma mudança de lore nesta frente.

const DIALOGS_F1 = {
  wake_up: {
    id: "wake_up",
    speakers: [
      ["Mãe", "Levanta! Você vai perder o festival!"],
      ["Kael", "Só mais cinco minutinhos..."],
      ["Mãe", "O festival é hoje! E ajeite o pingente do seu pai antes de sair."],
    ],
    flagsSet: { woke_up: 1 },
  },

  mother_repeat: {
    id: "mother_repeat",
    speakers: [
      ["Mãe", "Vai logo ao festival! E não se meta em encrenca, ouviu?"],
    ],
    flagsSet: {},
  },

  festival_square: {
    id: "festival_square",
    speakers: [
      ["Narrador", "A praça de Brisamar está cheia. Música, barracas e cheiro de pão doce."],
      ["Morador", "Dizem que hoje uma estrela vai cair! Não esqueça de fazer um pedido!"],
      ["Kael", "Um pedido... Quero conhecer o mundo além da vila."],
    ],
    flagsSet: { festival_seen: 1 },
  },

  darius_farewell: {
    id: "darius_farewell",
    speakers: [
      ["Darius", "Vou para a capital. Lá eles sabem reconhecer talento de verdade."],
      ["Kael", "Espera! Vamos juntos? Uma estrela caiu na floresta..."],
      ["Darius", "Não precisa vir atrás de mim. Quando eu voltar, já vou ter resolvido tudo."],
    ],
    flagsSet: { darius_left: 1 },
    choices: [
      {
        text: "Boa sorte, Darius!",
        reply: [["Darius", "Hmph. Não preciso de sorte. Mas... obrigado."]],
        flagsSet: {},
      },
      {
        text: "Vou provar que está errado!",
        reply: [["Darius", "Ha! Quero ver. Tente acompanhar, Kael."]],
        flagsSet: { kael_defiant: 1 },
      },
    ],
  },

  darius_repeat: {
    id: "darius_repeat",
    speakers: [
      ["Darius", "A capital me espera. Nos vemos quando eu for famoso, Kael."],
    ],
    flagsSet: {},
  },

  orin_meet: {
    id: "orin_meet",
    speakers: [
      ["Orin", "Pesca exige paciência. Coisa que jovem nenhum tem."],
      ["Kael", "Mestre Orin! Me ensina a usar espada? A floresta está perigosa!"],
      ["Orin", "Esse símbolo no seu pingente... Onde conseguiu isso?"],
      ["Kael", "Era do meu pai. Ele sumiu nas ruínas do norte."],
      ["Orin", "Se vai sair por aí tentando salvar o mundo, pelo menos aprenda a não cortar o próprio pé."],
    ],
    flagsSet: { met_orin: 1, got_sword: 1 },
  },

  orin_tutorial: {
    id: "orin_tutorial",
    speakers: [
      ["Orin", "Pegue esta espada velha. Acerte com A. Sem medo, garoto."],
      ["Kael", "Acertei! Até que é leve..."],
      ["Orin", "Bom. Quando eu gritar JÁ, esquive com B. Lâmina se desvia, não se abraça."],
    ],
    flagsSet: { tutorial_done: 1 },
  },

  orin_repeat: {
    id: "orin_repeat",
    speakers: [
      ["Orin", "Espada afiada e pé inteiro. Lembre do que ensinei e volte vivo."],
    ],
    flagsSet: {},
  },

  starfall: {
    id: "starfall",
    speakers: [
      ["Narrador", "O céu escurece. As estrelas somem, uma a uma."],
      ["Narrador", "Uma luz vermelha risca o horizonte. A terra treme."],
      ["Narrador", "Uma estrela cai atrás da Floresta dos Sussurros."],
    ],
    flagsSet: { star_seen: 1 },
  },

  lumi_meet: {
    id: "lumi_meet",
    speakers: [
      ["Narrador", "Entre as raízes, uma pedra azul pulsa. O pingente de Kael brilha em resposta."],
      ["Kael", "Que luz é essa? Tem algo falando dentro da minha cabeça?"],
      ["Lumi", "Finalmente... alguém que ainda consegue ouvir."],
      ["Lumi", "Sou Lumi. Você deve ser o herói. Tem cara de quem se perde no quintal."],
      ["Kael", "Eu não sou herói! E você é... uma raposa que brilha?"],
      ["Lumi", "Fada-raposa, obrigada. Anotado e ignorado. Vamos, herói."],
    ],
    flagsSet: { met_lumi: 1 },
  },

  // Compatível com o MVP (cristal-cap1.html :: read()).
  forest_sign: {
    id: "forest_sign",
    speakers: [
      ["Inscrição", "Primeiro o céu, depois a folha, por fim o sangue da terra."],
      ["Lumi", "Céu, folha, sangue... azul, verde, vermelho? Procure runas por aí!"],
    ],
    flagsSet: { sign_read: 1 },
  },

  // Compatível com o MVP (cristal-cap1.html :: toBoss()).
  boss_intro: {
    id: "boss_intro",
    speakers: [
      ["Lumi", "Cuidado, Kael! Essa coisa está viva! Esquive com B e use a minha magia com C!"],
    ],
    flagsSet: { boss_started: 1 },
  },

  // Compatível com o MVP (diálogo de vitória) + gancho da Bíblia (encapuzado).
  boss_defeated: {
    id: "boss_defeated",
    speakers: [
      ["Narrador", "O Guardião das Raízes desmorona. Entre as raízes surge uma inscrição antiga."],
      ["Inscrição", "Quando a primeira estrela cair, aquele que carrega a lembrança abrirá o caminho."],
      ["Lumi", "Kael... esse símbolo é idêntico ao do seu pingente."],
      ["Kael", "Do meu pai...? Então ele sabia de tudo isso."],
      ["Narrador", "Do alto de uma colina, uma figura encapuzada observa a ruína... e desaparece quando Kael se vira."],
    ],
    flagsSet: { boss1_defeated: 1 },
  },

  ruin_enter: {
    id: "ruin_enter",
    speakers: [
      ["Lumi", "Sente isso? O ar aqui pesa. Fique perto de mim, herói."],
      ["Kael", "Desde quando você se preocupa comigo?"],
      ["Lumi", "Desde que você virou meu único meio de transporte."],
    ],
    flagsSet: { entered_ruin: 1 },
  },

  ruin_sign: {
    id: "ruin_sign",
    speakers: [
      ["Inscrição", "Só o corajoso desce. O Guardião espera em silêncio."],
      ["Lumi", "Corajoso ou teimoso. No seu caso, dá no mesmo."],
    ],
    flagsSet: {},
  },

  village_sign: {
    id: "village_sign",
    speakers: [
      ["Placa", "Brisamar — Festival das Estrelas hoje! Saída da floresta a leste."],
    ],
    flagsSet: {},
  },

  key_bush_found: {
    id: "key_bush_found",
    speakers: [
      ["Narrador", "Num arbusto denso, algo metálico brilha entre as folhas."],
      ["Lumi", "Uma chave! Viu? Bisbilhotar arbustos dá resultado. Sou um gênio."],
    ],
    flagsSet: { has_key_c1: 1 },
  },
};

// Registro global para o build de arquivo único (concat de src/).
// Não usar `module.exports` aqui: o entregável final é 1 HTML sem bundler.
globalThis.DIALOGS_F1 = DIALOGS_F1;
