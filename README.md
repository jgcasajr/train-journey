# Train Journey

Uma pessoa sentada num vagão antigo olhando a paisagem passar pela janela. JavaScript puro + Canvas 2D, sem dependências.

**Online:** https://jgcasajr.github.io/train-journey/

## Rodar

```bash
npm start
```

Abre em http://localhost:5173 (a porta pode ser trocada com `PORT=8080 npm start`).
Precisa de servidor HTTP porque o código usa ES modules; o `server.js` é um servidor estático mínimo em Node.

## O que tem

- **Parallax em 8 camadas**: montanhas distantes, montanhas médias, mar, colinas, campos, arbustos, postes com fios e o chão passando rente ao trilho.
- **8 biomas** que se alternam a cada 3,5 km com transição suave:
  Campos → Fazenda → Floresta → Montanhas (com neve) → Outono → Subúrbio → Cidade → Litoral (ciclo de 28 km).
  - **Fazenda**: lavouras em retalhos com sulcos, celeiros com silo, fardos de feno, vacas, cata-vento girando e cerca de madeira.
  - **Subúrbio/Cidade**: skyline no horizonte que cresce conforme o trem se aproxima, prédios com janelas que acendem à noite, antenas piscando, fábricas soltando fumaça, muro e postes de luz.
- **Estações** (Campo Belo, Três Porteiras, Pedra Alta, Vila Serena, Estação Central, Porto Azul): o trem freia suavemente, para ~14 s e parte de novo. Plataforma, cobertura com colunas de ferro, placas com o nome, prédio com relógio que marca a hora do jogo, bancos, passageiros esperando e luminárias acesas à noite. Sino na chegada e apito na partida (com som ligado).
- **Rios e pontes**: ~8 rios por volta cortando a paisagem em todas as camadas; na travessia, uma ponte treliçada de aço passa rente à janela com a água correndo embaixo.
- **Clima**: limpo, chuva ou tempestade (ou automático, mudando a cada 2 min). Na tempestade o céu fecha, caem raios com clarão que ilumina até a cabine e o trovão chega depois, com atraso conforme a distância. Quando a chuva para com sol, aparece um **arco-íris**.
- **Neblina da manhã** nos vales ao amanhecer, que se dissipa até o meio da manhã (mais densa depois de chuva e no outono/inverno).
- **Estações do ano** (ou automático, 2 dias por estação): primavera com árvores floridas e flores no campo; verão; outono com folhas alaranjadas caindo; inverno com neve no chão, nos telhados e nas lavouras, árvores sem folhas e neve caindo no lugar da chuva (também nas montanhas).
- **Passagens de nível** (~9 por volta): estrada cruzando o trilho, cancela listrada abaixada, luzes vermelhas alternando, cruz de Santo André, carros esperando (faróis acesos à noite) e sino tocando quando o trem se aproxima (com som ligado).
- **Estrada paralela** ao trilho com carros e caminhões nos dois sentidos: uns ficam para trás, outros ultrapassam o trem; faróis e lanternas à noite.
- **Céu vivo**: bandos de pássaros em V, aviões com rastro (luz piscando à noite) e balões de ar quente sobre as fazendas em dias claros.
- **Litoral**: veleiros e barcos de pesca balançando no mar, e um farol listrado cujo facho gira à noite (com clarão quando aponta para você).
- **Animais**: vacas, ovelhas e cavalos nas fazendas.
- **A passageira vive a viagem**: alterna entre olhar a paisagem, ler um livro e tomar goles de café (a xícara vai esvaziando e o vapor some quando esfria). À noite cochila com a cabeça no encosto ("z z z"), e com o escuro lá fora o rosto dela aparece refletido no vidro.
- **Raridades**: estrelas cadentes em noites limpas, cervos pastando no meio da floresta, fogos de artifício sobre a cidade à noite (com estouros no áudio) e uma baleia que surge no mar do litoral, solta o jato de água e mergulha mostrando a cauda.
- **Passantes no corredor** (um a cada ~1 min): criança com balão, violinista que para e toca, senhora que oferece maçã (e a maçã fica no parapeito), executivo gritando ao celular, turista que tira foto (com flash), cachorro fugido com o dono atrás, casal apaixonado, vendedor de balas, estudante de fones e — raramente — um mágico. Cada um tem suas falas, ela responde, e clicar neles arranca uma frase.
- **Pensamentos**: de vez em quando, quando nada está acontecendo, ela pensa alto num balão de pensamento ("Nova fase, nova vida.", "Cada estação é um recomeço."...), conforme a paisagem, o clima e a hora.
- **Companhia de viagem**: nas estações às vezes alguém embarca com a mala, pede licença e senta no banco da frente. Cada um tem personalidade, atividade e conversas próprias: a **avó** que tricota e conta do tempo do trem a vapor, o **estudante** que estuda (e cochila em cima dos livros), a **mãe com bebê** (que chora, balbucia e é acalmado), o **pescador** de histórias de pescador ("um peixe DESSE tamanho!"), a **artista** que desenha a paisagem e mostra o desenho, e o **mochileiro estrangeiro** com mapa e português engraçado. Os dois conversam de tempos em tempos (de onde vêm, para onde vão, o tempo, o livro...), cochilam à noite e, algumas estações depois, a pessoa se despede e desce. Cada companheiro tem aparência própria; clique nele para ouvir algo. Na plataforma, parte das pessoas embarca e outras desembarcam rumo ao prédio da estação.
- **Corredor**: a cada ~2 min passa o **condutor** ("Bilhete, por favor!") — ela levanta o bilhete — ou o **carrinho de lanches** ("Café? Pão de queijo?"), que reabastece o café. À noite o carrinho não passa.
- **Trem no sentido oposto**: de tempos em tempos (a cada 1–2 min) um trem passa colado à janela, com tranco da onda de ar, "vuuush" no áudio e janelas acesas à noite.
- **Olhar ao redor**: mover o mouse desloca a cabeça do observador; a paisagem se move em relação à moldura com paralaxe por profundidade e a passageira se move no sentido contrário.
- **Vidro embaçado**: com chuva (ou no frio das montanhas) o vidro embaça; arraste o mouse/dedo para desenhar. O desenho vai sumindo conforme o vidro embaça de novo.
- **Ciclo dia/noite** (5 min por dia): nascer e pôr do sol, lua, estrelas, casas com janelas acesas à noite.
- **Chuva**: gotas escorrendo no vidro na diagonal (empurradas pelo vento da velocidade) e chuva lá fora.
- **Túneis**: a cabine escurece, a lâmpada acende e as luzes do túnel passam.
- **Som** (opcional): ronco do trem e o "tá-dum tá-dum" das juntas dos trilhos a cada 25 m, sincronizado com a velocidade.
- Balanço do vagão, cafezinho com vapor, cortinas e a passageira respirando.

## Vagão-restaurante

O botão **Ir ao vagão-restaurante** leva a passageira (com uma transição escura) a um vagão com lambris de madeira, arandelas de latão, mesa com toalha branca, taça de vinho, vaso com rosa e vela acesa à noite. Ali o carrinho de lanches vira um **garçom** de paletó branco e gravata-borboleta que anuncia o prato do dia (feijoada, moqueca, risoto, salada tropical, macarrão ao sugo ou pudim), serve o prato na mão dela, e ela come em garfadas até o prato esvaziar. **Voltar ao vagão** retorna ao assento de sempre.

## Destino

No painel, **Destino** escolhe uma das 6 estações (ou viagem livre). O letreiro passa a mostrar a distância e o tempo estimado ("Destino: Porto Azul · 12.3 km · ~8 min") e o mapa destaca a estação. O trem para no destino mesmo com "Parar nas estações" desligado: a passageira acena ("Chegamos a Porto Azul!"), o trem espera e aparece o resumo da viagem — km, tempo e descobertas novas no diário — com as opções **Continuar viajando** ou **Escolher outro destino**.

## Rádio do vagão

Um radinho antigo no parapeito da janela: clique nele para trocar de estação (ou use o seletor **Rádio** e o **Volume** no painel). As músicas são geradas na hora, sem arquivos:

- **Ambiente**: acordes longos e notas soltas (é a trilha do modo Relaxar)
- **Lo-fi**: piano elétrico jazzy, baixo, batida lenta com swing e chiado de vinil
- **Clássica**: arpejos de piano em 3/4 sobre a progressão de Pachelbel, com cordas ao fundo
- **Bossa nova**: violão com a batida da bossa, baixo, chocalho, aro de caixa e uma flauta de vez em quando

Ao trocar de estação ouve-se o chiado de sintonia; com o rádio ligado o mostrador acende e as notinhas sobem.

## Modos de uso

- **Relaxar**: tela cheia, sem painel nem letreiro, com música ambiente gerada na hora (acordes lentos e notas soltas). Esc ou o botão de novo para sair.
- **Pomodoro**: timer de foco 25 min / pausa 5 min no canto inferior esquerdo, com sino na troca. Durações personalizáveis pela URL: `?foco=50&pausa=10`.
- **Mapa**: a linha inteira da volta atual (28 km) com estações, túneis, pontes, passagens de nível, biomas e a posição do trem.
- **Foto**: salva o quadro atual como PNG (`train-journey-km12.3.png`).

## Diário de viagem

Botão **Diário** no painel: um caderno com 61 figurinhas para completar — as 6 estações, as 8 paisagens, as 4 estações do ano, fenômenos do céu (arco-íris, relâmpago, neve, neblina, estrelas, pôr do sol), coisas do caminho (túnel, ponte, passagem de nível, trem cruzando, farol), momentos (bilhete, café, freio de emergência, bichos, revoada, balão, companhia de viagem, acordar a passageira), os 10 personagens do corredor e as 6 personalidades do banco da frente, raridades (estrela cadente, cervo, fogos de artifício, baleia) e marcos (chegada ao destino, 10 e 50 km). Cada descoberta aparece com um aviso na tela e fica salva no navegador (dá para recomeçar pelo próprio diário).

## Cliques na cena

O cursor vira mãozinha sobre o que é clicável.

| Onde clicar | O que acontece |
| --- | --- |
| Quem passa pelo corredor | Fala algo próprio do personagem |
| O companheiro da frente | Fala alguma coisa simpática |
| A passageira | Ela vira e comenta algo do momento (paisagem, chuva, noite, estação...). Dormindo, acorda assustada. |
| A xícara | Ela toma um gole (ou reclama que o café acabou) |
| O rádio | Troca de estação |
| A lâmpada | Alterna automático / ligada / desligada |
| As cortinas | Fecham ou abrem (a cabine escurece) |
| A corda SOS | Freio de emergência: o trem freia bruscamente e depois segue |
| Vacas, ovelhas, cavalos | "Muuu!", "Béééé!", "Hiiiin!" (com som) |
| Pássaros | O bando se espalha |
| Balão | O pessoal acena: "Olá!" |
| Farol | Dá um clarão |
| Barra de espaço | Apito do trem |
| Espaço vazio | Mostra/oculta o painel |

## Controles

| Controle | Efeito |
| --- | --- |
| Velocidade | 0–220 km/h (acelera/freia de forma gradual) |
| Hora do dia | Fixa um horário (desliga o ciclo automático) |
| Clima | Automático, limpo, chuva ou tempestade |
| Estação do ano | Automática, primavera, verão, outono ou inverno |
| Parar nas estações | Liga/desliga as paradas (desligado, o trem passa direto) |
| Som | Ativa o áudio (navegadores exigem um clique) |
| Mover o mouse | Olhar ao redor |
| Arrastar na janela | Desenhar no vidro embaçado |
| `H` ou clique/toque na cena | Oculta o painel |
| `?pass` na URL | Faz um trem passar em 2 s (para testar) |
| `?km=22` na URL | Começa em outro ponto do trajeto (fazenda ≈ 5, cidade ≈ 22, litoral ≈ 26, ponte ≈ 3.07, estação ≈ 1.44, passagem de nível ≈ 3.94, farol ≈ 26.75) |

## Estrutura

```
src/
  main.js       loop principal e ordem de desenho
  journey.js    simulação (estado imutável: distância, velocidade, hora, chuva)
  sky.js        céu, sol, lua, estrelas, nuvens e iluminação ambiente
  biomes.js     paletas e parâmetros dos biomas
  landscape.js  camadas de parallax
  layers.js     helpers das camadas (relevo, slots de objetos)
  props.js      árvores, casas, arbustos
  farm.js       lavouras, celeiros, silos, feno, vacas, cata-vento, cerca
  city.js       skyline, prédios, fábricas, muro e postes
  tunnel.js     túneis
  stations.js   posição das estações e parada (dados)
  stationView.js desenho das estações
  rivers.js     posição dos rios (dados)
  bridge.js     rios nas camadas e pontes
  interior.js   parede, moldura, cortinas, lâmpada, xícara
  glass.js      reflexo no vidro e gotas de chuva
  fog.js        vidro embaçado desenhável
  pointer.js    mouse/toque: olhar ao redor, desenhar, tocar
  frame.js      paralaxe por camada (inclui o deslocamento da cabeça)
  passingTrain.js trem no sentido oposto
  roads.js      passagens de nível, estrada paralela e tráfego (dados)
  roadView.js   desenho das estradas, carros e cancelas
  skylife.js    pássaros, aviões e balões
  weather.js    clima: chuva, tempestade, raios, umidade (simulação)
  weatherView.js arco-íris, raios, neblina, chuva/neve/folhas
  seasons.js    estações do ano e cores sazonais
  coast.js      barcos e farol
  passenger.js  a passageira (poses e reflexo no vidro)
  cabin.js      atividades dela, café e visitas do corredor (simulação)
  modes.js      modos relaxar, Pomodoro, mapa e foto
  interactions.js o que foi clicado (hit-test)
  events.js     efeito de cada clique no estado (falas, gole, freio...)
  interactionsView.js textos flutuantes e falas da passageira
  journalData.js as descobertas do diário e quando cada uma acontece
  journal.js    diário: progresso salvo, avisos e o caderno
  destination.js destino, previsão de chegada e chegada (simulação)
  arrival.js    seletor de destino, letreiro e cartão de chegada
  dining.js     vagão-restaurante: cardápio, prato servido e garfadas (simulação)
  diningView.js cenário do vagão-restaurante e a mesa posta
  radio.js      rádio: estações, sintonia e volume
  radioStyles.js instrumentos e arranjos (lo-fi, clássica, bossa)
  pomodoro.js   lógica do timer
  lineMap.js    mapa da linha (SVG)
  aisle.js      condutor e carrinho de lanches
  companion.js  quem embarca, conversas e despedidas (simulação)
  companionView.js banco da frente e o companheiro de viagem
  personas.js   personalidades do banco da frente (falas e jeito)
  personaProps.js adereços e poses de cada personalidade
  aisleSchedule.js horários do condutor e do carrinho
  passersby.js  elenco do corredor, cenas e falas (simulação)
  passersbyView.js desenho dos passantes e seus adereços
  thoughts.js   pensamentos espontâneos da passageira
  rareSky.js    estrela cadente e fogos de artifício
  wildlife.js   cervos e baleia
  audio.js      som gerado com Web Audio (sem arquivos)
  controls.js   painel e letreiro
```

Todo o cenário é procedural e determinístico (hash por posição), então o mesmo quilômetro sempre tem a mesma paisagem.
