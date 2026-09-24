# Train Journey

Uma pessoa sentada num vagão antigo olhando a paisagem passar pela janela. JavaScript puro + Canvas 2D, sem dependências.

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
- **Corredor**: a cada ~2 min passa o **condutor** ("Bilhete, por favor!") — ela levanta o bilhete — ou o **carrinho de lanches** ("Café? Pão de queijo?"), que reabastece o café. À noite o carrinho não passa.
- **Trem no sentido oposto**: de tempos em tempos (a cada 1–2 min) um trem passa colado à janela, com tranco da onda de ar, "vuuush" no áudio e janelas acesas à noite.
- **Olhar ao redor**: mover o mouse desloca a cabeça do observador; a paisagem se move em relação à moldura com paralaxe por profundidade e a passageira se move no sentido contrário.
- **Vidro embaçado**: com chuva (ou no frio das montanhas) o vidro embaça; arraste o mouse/dedo para desenhar. O desenho vai sumindo conforme o vidro embaça de novo.
- **Ciclo dia/noite** (5 min por dia): nascer e pôr do sol, lua, estrelas, casas com janelas acesas à noite.
- **Chuva**: gotas escorrendo no vidro na diagonal (empurradas pelo vento da velocidade) e chuva lá fora.
- **Túneis**: a cabine escurece, a lâmpada acende e as luzes do túnel passam.
- **Som** (opcional): ronco do trem e o "tá-dum tá-dum" das juntas dos trilhos a cada 25 m, sincronizado com a velocidade.
- Balanço do vagão, cafezinho com vapor, cortinas e a passageira respirando.

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
  aisle.js      condutor e carrinho de lanches
  audio.js      som gerado com Web Audio (sem arquivos)
  controls.js   painel e letreiro
```

Todo o cenário é procedural e determinístico (hash por posição), então o mesmo quilômetro sempre tem a mesma paisagem.
