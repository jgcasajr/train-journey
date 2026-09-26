// Personalities for the traveller who sits in the facing seat. Lines are [who, text, action?]:
// 'c' companion, 'p' passenger, 'b' the baby. `{next}` becomes the companion's stop.
// `activity` drives what they do between conversations (see companionView).

export const PERSONAS = [
  {
    id: 'grandma', name: 'Avó contadora de histórias', icon: '👵', activity: 'knit',
    look: { coat: '#7a4a6e', hair: '#d9d4cc', style: 'bun', glasses: true, shawl: '#b5838d' },
    greet: [['c', 'Posso sentar aqui, minha filha?'], ['p', 'Claro, senhora, fique à vontade!']],
    bye: [['c', 'Vai com Deus, querida. Juízo!'], ['p', 'Obrigada! Foi ótimo conversar.']],
    chats: [
      [['c', 'Quando eu era menina, esse trem era a vapor.'], ['p', 'Sério? Devia ser lindo!'], ['c', 'Soltava uma fumaça branquinha...']],
      [['c', 'Meu marido me pediu em casamento num trem.'], ['p', 'Que romântico!'], ['c', 'Cinquenta anos juntos, acredita?']],
      [['c', 'Tô tricotando um casaquinho pro meu neto.'], ['p', 'Que cor linda!']],
      [['c', 'Nunca é tarde pra começar de novo, sabia?'], ['p', 'Tô aprendendo isso agora.'], ['c', 'Então já está no caminho certo.']],
      [['c', 'Come alguma coisa, você tá magrinha.'], ['p', 'Haha, a senhora parece minha avó!']],
    ],
    clicks: ['Hm? Perdi um ponto do tricô...', 'Quer uma balinha de coco?', 'No meu tempo...'],
  },
  {
    id: 'student', name: 'Estudante', icon: '📚', activity: 'study',
    look: { coat: '#4a6fa5', hair: '#2a1c14', style: 'short', glasses: true },
    greet: [['c', 'Oi! Posso? Prometo não atrapalhar.'], ['p', 'Imagina, senta aí!']],
    bye: [['c', 'Minha parada! Deseja sorte na prova!'], ['p', 'Boa sorte! Vai dar certo!']],
    chats: [
      [['c', 'Tenho prova amanhã e não sei nada...'], ['p', 'Calma, você vai bem!'], ['c', 'Tomara! Cálculo é cruel.']],
      [['p', 'O que você estuda?'], ['c', 'Engenharia. Quero projetar trens!'], ['p', 'Que demais!']],
      [['c', 'Dormi três horas essa noite.'], ['p', 'Aproveita e cochila um pouco!']],
      [['c', 'Você sabe quanto é a integral de...'], ['p', 'Ih, disso eu não lembro mais!']],
    ],
    clicks: ['Hã? Tava resolvendo uma equação.', 'Mais um capítulo...', 'Zzz... ah, oi!'],
  },
  {
    id: 'mother', name: 'Mãe com bebê', icon: '👶', activity: 'rock',
    look: { coat: '#3f7a6a', hair: '#6b3a1e', style: 'long', blanket: '#a9cbe8' },
    greet: [['c', 'Com licença, cabe nós dois aqui?'], ['p', 'Claro! Que bebê lindo!']],
    bye: [['c', 'Dá tchau pra moça, filho!'], ['p', 'Tchau, pequeno! Boa viagem!']],
    chats: [
      [['b', 'Uáááá!'], ['c', 'Shhh... calma, meu amor.'], ['p', 'Ownn, tadinho.']],
      [['p', 'Quantos meses ele tem?'], ['c', 'Oito! E já quer andar.'], ['p', 'Que fofura!']],
      [['c', 'É a primeira viagem de trem dele.'], ['p', 'Que momento especial!']],
      [['b', 'Gugu dadá!'], ['p', 'Ele tá rindo pra mim!'], ['c', 'Ele gostou de você!']],
      [['b', 'Uáá!'], ['c', 'Tá com soninho...'], ['p', 'O balanço do trem ajuda a dormir.']],
    ],
    clicks: ['Shhh, ele quase dormiu!', 'Quer segurar? Brincadeira!', 'Ele adora trem!'],
  },
  {
    id: 'fisherman', name: 'Pescador', icon: '🎣', activity: 'tales',
    look: { coat: '#6b7f4a', hair: '#b8b2a8', style: 'hat', beard: '#cfc8bc' },
    greet: [['c', 'Dá licença, moça. Vou pro litoral pescar!'], ['p', 'Que delícia! Boa pescaria!']],
    bye: [['c', 'Se eu pegar um grandão, te mando foto!'], ['p', 'Combinado! Boa sorte!']],
    chats: [
      [['c', 'Uma vez peguei um peixe DESSE tamanho!', 'wide'], ['p', 'Mentira!'], ['c', 'Juro! Quase me puxou pro mar.']],
      [['c', 'O segredo é paciência. E minhoca boa.'], ['p', 'Paciência serve pra tudo, né?']],
      [['p', 'Já pescou no litoral daqui?'], ['c', 'Em Porto Azul! Lá é o paraíso.']],
      [['c', 'Peixe grande não morde isca pequena.'], ['p', 'Isso vale pra vida também!'], ['c', 'Hehe, vale mesmo.']],
    ],
    clicks: ['Já te contei do peixe gigante?', 'O mar tá pra peixe hoje!', 'Cuidado com o anzol!'],
  },
  {
    id: 'artist', name: 'Artista', icon: '🎨', activity: 'sketch',
    look: { coat: '#b85c2a', hair: '#111111', style: 'beret', beret: '#a8322d' },
    greet: [['c', 'Posso? Dessa janela a luz é perfeita.'], ['p', 'Fica à vontade!']],
    bye: [['c', 'Toma, esse desenho é seu. Da nossa viagem.', 'show'], ['p', 'Que presente lindo! Obrigada!']],
    chats: [
      [['c', 'Olha o que eu desenhei.', 'show'], ['p', 'Nossa, que talento!'], ['c', 'É a vista da sua janela.']],
      [['c', 'Essa luz do fim de tarde é mágica.'], ['p', 'Parece que tudo fica dourado.']],
      [['p', 'Você desenha sempre no trem?'], ['c', 'Sempre. A paisagem nunca se repete.']],
      [['c', 'Toda mudança começa com um rabisco.'], ['p', 'Adorei isso.']],
    ],
    clicks: ['Fica paradinha, tô te desenhando!', 'Hmm, falta um azul aqui...', 'Quer ver meu caderno?'],
  },
  {
    id: 'backpacker', name: 'Mochileiro estrangeiro', icon: '🎒', activity: 'map',
    look: { coat: '#d9a441', hair: '#d9b36a', style: 'cap', backpack: '#3a6b4a' },
    greet: [['c', 'Hello! Com licença... é aqui o lugar?'], ['p', 'É sim! Welcome!']],
    bye: [['c', 'Obrigado, amiga! Muito bonito o Brasil!'], ['p', 'Volte sempre! Bye!']],
    chats: [
      [['c', 'Como fala... "delicious"?'], ['p', 'Delicioso!'], ['c', 'Pão de queijo é delicioso!']],
      [['c', 'Eu vim de muito longe. Mundo grande!'], ['p', 'De onde você é?'], ['c', 'Da Noruega! Muito frio lá.']],
      [['c', 'Este trem vai para... {next}?'], ['p', 'Vai sim, é a sua parada?'], ['c', 'Yes! Obrigado!']],
      [['p', 'Tá gostando do Brasil?'], ['c', 'Amo! Pessoas muito simpáticas.']],
    ],
    clicks: ['Hello! Tudo bem? Tudo bom?', 'Onde fica a praia?', 'Saudade... bonita palavra!'],
  },
];

export const personaOf = (seedHash) => PERSONAS[Math.floor(seedHash * PERSONAS.length)];
