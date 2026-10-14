// dialogs_f3.js — F3-Content (Cap. 3: As Ruínas do Norte)
// Roteiro fiel a 01_STORY_BIBLE.md §Cap. 3. Anotação do diário 3 e a fala de
// Darius são verbatim da Bíblia. Nos momentos de peso (diário 3, gravação),
// Lumi NÃO faz piada (motivo recorrente da §7). Caixas ≤ 180 chars (A03).
const DIALOGS_F3 = {
  montanha_arrival: {
    id: "montanha_arrival",
    speakers: [
      ["Narrador", "O vento corta a trilha. Lá em cima, as ruínas antigas esperam sob a neve."],
      ["Lumi", "Cheiro de pedra velha e segredo. O guardião fugitivo veio para cá, herói."],
      ["Kael", "Foi aqui que o meu pai desapareceu. Vamos com cuidado."],
    ],
    flagsSet: { chegou_montanha: 1 },
  },

  montanha_acamp: {
    id: "montanha_acamp",
    speakers: [
      ["Narrador", "Restos de um acampamento: uma tenda rasgada, uma fogueira apagada."],
      ["Kael", "Essa letra no equipamento... é a do meu pai. Ele passou por aqui."],
      ["Lumi", "Um registro deixado para trás pode estar por perto. Olhe os cantos."],
    ],
    flagsSet: {},
  },

  montanha_porta: {
    id: "montanha_porta",
    speakers: [
      ["Narrador", "As portas de pedra cedem com um gemido. O ar lá dentro é muito mais frio."],
      ["Lumi", "O maior esconderijo de segredos do reino. Tente não quebrar nada milenar."],
    ],
    flagsSet: {},
  },

  ruinas_paineis_ordem: {
    id: "ruinas_paineis_ordem",
    speakers: [
      ["Inscrição", "No fim do dia, o sol repousa. A estrela vigia o descanso. A lua fecha os olhos do céu."],
      ["Lumi", "Três painéis, uma ordem. Sol, depois estrela, depois lua. Golpeie nessa sequência!"],
    ],
    flagsSet: {},
  },

  ruinas_porta_chefe: {
    id: "ruinas_porta_chefe",
    speakers: [
      ["Inscrição", "A porta do guardião só se abre aos três mecanismos desta ala."],
      ["Lumi", "Três interruptores espalhados pelas ruínas. Dois no saguão, um além do corredor de gelo."],
    ],
    flagsSet: {},
  },

  ruinas_magica_alcance: {
    id: "ruinas_magica_alcance",
    speakers: [
      ["Lumi", "Um interruptor numa ilhota no meio do abismo... Minha magia se apaga no vazio. Por enquanto."],
      ["Kael", "Anotado. Quando sua magia melhorar, a gente volta aqui."],
    ],
    flagsSet: {},
  },

  f3_diario1: {
    id: "f3_diario1",
    speakers: [
      ["Diário", "Dia 2 — O gelo engoliu o acampamento de base. Seguimos a pé. O teto destas ruínas zune como se respirasse."],
      ["Kael", "É a letra dele. Eu reconheceria em qualquer lugar."],
    ],
    flagsSet: {},
  },

  f3_diario2: {
    id: "f3_diario2",
    speakers: [
      ["Diário", "Dia 9 — Encontramos o mecanismo central. O cristal não anula as trevas: ele as prende. E o preço é pago por todos nós."],
      ["Lumi", "Então é verdade... a paz de mil anos tem um cofre escondido."],
    ],
    flagsSet: {},
  },

  f3_diario3: {
    id: "f3_diario3",
    speakers: [
      ["Diário", "Dia 14 — Eu fico. Se este lugar acordar, alguém precisa segurar a comporta de dentro."],
      ["Diário", "Se meu filho algum dia encontrar estas palavras, espero que tenha herdado a coragem de sua mãe, e não minha teimosia."],
      ["Kael", "..."],
      ["Lumi", "Sem piada dessa vez, herói. Só... eu sinto muito."],
    ],
    flagsSet: {},
  },

  chefe3_intro: {
    id: "chefe3_intro",
    speakers: [
      ["Narrador", "Engrenagens milenares despertam. O guardião de ferro das ruínas se levanta."],
      ["Lumi", "O Sentinela de Ferro! Desvie da investida e bata quando ele travar na parede!"],
    ],
    flagsSet: {},
  },

  vitoria3: {
    id: "vitoria3",
    speakers: [
      ["Narrador", "O Sentinela desaba numa pilha de placas e engrenagens. Entre os restos, um fragmento azul brilha."],
      ["Lumi", "Azul... eu me lembro dessa cor. Senti minha magia mudar, herói!"],
      ["Lumi", "Agora meus disparos perfuram inimigos e cruzam abismos. Interruptores distantes viraram alvo fácil!"],
      ["Kael", "Mais um fragmento. O que o rei tentava impedir está ficando claro demais."],
    ],
    flagsSet: { frag_blue: 1 },
  },

  gravacao_pai: {
    id: "gravacao_pai",
    speakers: [
      ["Narrador", "Atrás do Sentinela, uma pedra-memória acende. Uma figura cansada se forma na luz."],
      ["Gravação", "Se esta mensagem despertou, é porque alguém chegou ao mecanismo. Eu fui o guardião desta ala."],
      ["Gravação", "Restam dois caminhos. Restaurar o cristal: a entidade segue presa, e o medo continua alimentando-a."],
      ["Gravação", "Ou destruí-lo: a entidade se liberta e o ciclo de preço silencioso termina — com o reino em risco."],
      ["Gravação", "Passei anos atrás da terceira via. Quando achei que finalmente a tinha encontrado, o mecanismo—"],
      ["Narrador", "A gravação termina abruptamente."],
      ["Kael", "Pai... você ficou esse tempo todo procurando uma saída para todo mundo."],
      ["Lumi", "Ele não desistiu de ninguém, Kael. Nem de você."],
    ],
    flagsSet: { gravacao_vista: 1 },
  },

  darius_armadura: {
    id: "darius_armadura",
    speakers: [
      ["Narrador", "Um estrondo sacode as ruínas. Entre as colunas, surge uma armadura negra de espada vermelha."],
      ["Darius", "Desculpa, Kael. Mas alguém precisa fazer o que deve ser feito."],
      ["Lumi", "Darius?! O que fizeram com você?!"],
      ["Darius", "Os fragmentos ficam comigo. Eu vou salvar o reino — do jeito que ele precisa."],
      ["Narrador", "Ele toma os fragmentos e desaparece na escuridão antes que Kael possa reagir."],
      ["Kael", "Darius! ...Ele nem me deixou tentar de novo."],
    ],
    flagsSet: { fragmentos_roubados: 1 },
  },

  retorno_cap3: {
    id: "retorno_cap3",
    speakers: [
      ["Narrador", "Valdora respira sob a mesma luz fria. A lembrança da armadura negra não larga Kael."],
      ["Lumi", "Ele vai pagar por isso. Mas primeiro a gente precisa de um plano, herói."],
    ],
    flagsSet: {},
  },
};

globalThis.DIALOGS_F3 = DIALOGS_F3;
