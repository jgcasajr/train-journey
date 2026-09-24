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
| Chuva | Liga/desliga |
| Parar nas estações | Liga/desliga as paradas (desligado, o trem passa direto) |
| Som | Ativa o áudio (navegadores exigem um clique) |
| Mover o mouse | Olhar ao redor |
| Arrastar na janela | Desenhar no vidro embaçado |
| `H` ou clique/toque na cena | Oculta o painel |
| `?pass` na URL | Faz um trem passar em 2 s (para testar) |
| `?km=22` na URL | Começa em outro ponto do trajeto (fazenda ≈ 5, cidade ≈ 22, litoral ≈ 26, ponte ≈ 3.07, estação ≈ 1.44) |

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
  passenger.js  a passageira
  audio.js      som gerado com Web Audio (sem arquivos)
  controls.js   painel e letreiro
```

Todo o cenário é procedural e determinístico (hash por posição), então o mesmo quilômetro sempre tem a mesma paisagem.
