// dialogs_f2.js — F2-Content (Cap. 2: Valdora)
// Roteiro fiel a 01_STORY_BIBLE.md §Cap. 2. Tom GBA, humor leve da Lumi, pt-BR.
// Formato igual a dialogs_f1.js: { id, speakers: [[nome, texto], ...], flagsSet }
// (todas as caixas <= 180 chars). Registro global p/ build de arquivo único.
const DIALOGS_F2 = {
  valdora_arrival: {
    id: "valdora_arrival",
    speakers: [
      ["Narrador", "Valdora, a capital do reino. Ruas cheias de refugiados e de boatos."],
      ["Lumi", "Tanta gente... e tanto medo junto. Sinto o cheiro daqui."],
      ["Kael", "Darius deve estar por aí. E aquele fragmento..."],
    ],
    flagsSet: { chegou_valdora: 1 },
  },

  darius_prov: {
    id: "darius_prov",
    speakers: [
      ["Darius", "Você atravessou uma floresta? Impressionante. Eu enfrentei três monstros antes do café."],
      ["Kael", "Darius! A guarda te aceitou mesmo?"],
      ["Darius", "A guarda sabe reconhecer talento. Tente não se perder, Kael."],
    ],
    flagsSet: { darius_prov: 1 },
  },

  capitao_antes: {
    id: "capitao_antes",
    speakers: [
      ["Capitão", "O templo está fechado. Volte quando tiver algo útil, garoto."],
    ],
    flagsSet: {},
  },

  capitao_pista: {
    id: "capitao_pista",
    speakers: [
      ["Capitão", "Darius falou de você. Um guardião fugiu com um fragmento para o norte."],
      ["Capitão", "E o nosso melhor cavaleiro... mudou. Se entrar no templo, vá armado."],
    ],
    flagsSet: { fragmento_pista: 1 },
  },

  refugiado1: {
    id: "refugiado1",
    speakers: [
      ["Refugiado", "Viemos das montanhas. As criaturas desceram antes do cristal partir."],
    ],
    flagsSet: {},
  },

  refugiado2: {
    id: "refugiado2",
    speakers: [
      ["Refugiado", "Minha filha chora pelo gato dela. Sumiu nas vielas do oeste."],
    ],
    flagsSet: {},
  },

  refugiado3: {
    id: "refugiado3",
    speakers: [
      ["Refugiado", "O templo trancou as portas. O cavaleiro lá dentro não é mais ele."],
    ],
    flagsSet: {},
  },

  menina_inicio: {
    id: "menina_inicio",
    speakers: [
      ["Menina", "Você viu o Miau? Fugiu para as vielas do oeste! Por favor, ache ele!"],
      ["Lumi", "Gatos. Sempre gatos. Vamos logo, herói."],
    ],
    flagsSet: { gato_quest: 1 },
  },

  menina_meio: {
    id: "menina_meio",
    speakers: [
      ["Menina", "Nada do Miau? Ele adora becos escuros no oeste..."],
    ],
    flagsSet: {},
  },

  menina_fim: {
    id: "menina_fim",
    speakers: [
      ["Menina", "Miau! Você achou ele! Muito obrigada!"],
      ["Menina", "Vi um brilho atrás da grade do esgoto, no leste. Leve minha lanterna!"],
    ],
    flagsSet: { cat_found: 1 },
  },

  menina_obrigada: {
    id: "menina_obrigada",
    speakers: [
      ["Menina", "O Miau está dormindo. Obrigada de novo, herói!"],
    ],
    flagsSet: {},
  },

  gato_hint: {
    id: "gato_hint",
    speakers: [
      ["Narrador", "Um miado ecoa pelo beco. Melhor perguntar por aí primeiro."],
    ],
    flagsSet: {},
  },

  gato_achado_dlg: {
    id: "gato_achado_dlg",
    speakers: [
      ["Lumi", "Achei o fugitivo! Segura ele com carinho, herói."],
      ["Kael", "Vem cá, Miau. Sua dona está preocupada."],
    ],
    flagsSet: { gato_achado: 1 },
  },

  chefe2_intro: {
    id: "chefe2_intro",
    speakers: [
      ["Lumi", "Esse cavaleiro... a corrupção mora dentro dele. Desvie da investida!"],
    ],
    flagsSet: {},
  },

  vitoria2: {
    id: "vitoria2",
    speakers: [
      ["Cavaleiro", "O rei... não foi sequestrado... ele tenta impedir... que abram a porta..."],
      ["Lumi", "Kael... olhe! Um fragmento verde!"],
      ["Kael", "A praça respirou de novo. Mas o norte ainda chama..."],
    ],
    flagsSet: {},
  },

  proposta: {
    id: "proposta",
    speakers: [
      ["Estranho", "Seu amigo tem potencial. O reino precisa de quem age."],
      ["Darius", "Kael... desculpa. Alguém precisa fazer o que deve ser feito."],
      ["Lumi", "(baixinho) Não gostei desse homem, herói. Nem um pouco."],
    ],
    flagsSet: { proposta_vista: 1 },
  },

  bau: {
    id: "bau",
    speakers: [
      ["Narrador", "No baú: uma lâmina da guarda, ainda afiada. Sua espada nova canta."],
      ["Lumi", "Agora sim. Quase um herói de verdade."],
    ],
    flagsSet: { bau_esgoto: 1, espada_guarda: 1 },
  },
};

globalThis.DIALOGS_F2 = DIALOGS_F2;
