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
  Campos → Fazenda → Floresta → Montanhas (com neve) → Outono → Subúrbio → Cidade → Litoral → **Deserto** (dunas e cactos saguaro) → **Vinhedos** (fileiras de parreiras, com uvas do verão ao outono, e um **viaduto** de pedra sobre um vale — o chão some e aparece o rio lá embaixo) → **Lago** (água parada espelhando as montanhas nevadas) (ciclo de 38,5 km).
  - **Fazenda**: lavouras em retalhos com sulcos, celeiros com silo, fardos de feno, vacas, cata-vento girando e cerca de madeira.
  - **Subúrbio/Cidade**: skyline no horizonte que cresce conforme o trem se aproxima, prédios com janelas que acendem à noite, antenas piscando, fábricas soltando fumaça, muro e postes de luz.
- **Estações** (Campo Belo, Três Porteiras, Pedra Alta, **Nexus**, Vila Serena, Estação Central, Porto Azul): o trem freia suavemente, para ~14 s e parte de novo. Plataforma, cobertura com colunas de ferro, placas com o nome, prédio com relógio que marca a hora do jogo, bancos, passageiros esperando e luminárias acesas à noite. Sino na chegada e apito na partida (com som ligado).
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

## Fractal Nexus · NexionAI Systems

Este trem é o emblema da nova fase do **Fractal Nexus**, da **NexionAI Systems**. Ao abrir, uma tela de abertura curta com o emblema fractal ("Fractal Nexus · NexionAI Systems apresenta") — uma vez por sessão; toque ou tecla pula, `?nosplash` desliga. No bosque de outono fica a **estação Nexus**: fachada lilás, placa violeta com o emblema e um brilho próprio. Parada ali, a passageira sempre pensa algo sobre recomeço, e o cartão-postal ganha um recado especial. Todo cartão-postal leva o selo Fractal Nexus · NexionAI Systems.

## Duas linhas e a baldeação

São duas linhas que se cruzam na **estação Nexus**:

| Linha | Estações |
| --- | --- |
| **Aurora** | Campo Belo, Três Porteiras, Pedra Alta, Nexus, Vila Serena, Estação Central, Porto Azul, Oásis, Vila Videira, Lago Sereno |
| **Estelar** ✨ | Sirius, Polaris, Antares, Nexus, Vega, Altair, Rigel, Canopus |
| **Horizonte** | Maré Mansa, Bosque Velho, Serra Clara, Nexus, Vale Novo, Espelho d'Água, Horizonte, Jardim do Sol, Dunas Douradas |

A Horizonte tem outra ordem de paisagens (começa no litoral) e cenário próprio: casas, árvores, rios, túneis e passagens de nível são outros. Parado na Nexus, aparece o botão **Fazer baldeação**: a tela escurece e a câmera vai para a plataforma da Nexus, sob a cobertura em arco de ferro e vidro — o trem vinho da Aurora de um lado, o azul-petróleo da Horizonte do outro. Ela desce com a mala de rodinhas, atravessa sob a placa da Nexus enquanto o alto-falante anuncia "Atenção: trem da Linha Horizonte na plataforma 2. Boa viagem!", embarca, as portas fecham e a vista volta para a cabine do trem novo. À noite as luminárias da plataforma acendem. Escolhendo um destino da outra linha, o letreiro avisa "baldeação em Nexus", o trem para lá (mesmo com as paradas desligadas) e ela troca de trem sozinha; o resumo da chegada soma os km das duas linhas. Cada linha tem o seu vagão: a **Aurora** é o clássico (madeira, latão e veludo vinho) e a **Horizonte** é o moderno (painéis claros, metal escovado e tecido azul-petróleo) — cortinas, moldura da janela, parapeito e bancos mudam junto. O mapa e o km do letreiro são sempre da linha atual. Diário: 6 estações novas, "Baldeação na Nexus" e "Linha Horizonte".

## Respirar no ritmo dos trilhos

Botão **Respirar**: um círculo suave cresce enquanto você inspira e diminui enquanto solta — **4 tempos para dentro, 4 para fora**, com a contagem na tela. O tempo segue o "tum" das juntas dos trilhos (uma a cada 25 m): a 90 km/h, um tempo por segundo; mais devagar, a respiração fica mais lenta (e parado na estação, um por segundo). São 6 ciclos; no fim, "Que bom. Siga viagem com calma." e uma figurinha no diário. **Parar** ou Esc interrompe.

## Estações vivas

As pessoas da plataforma têm corpo de verdade: pernas com coxa e canela que dobram no joelho, sapatos, braços que balançam ao contrário das pernas e o corpo subindo e descendo a cada passo; viram para o lado em que andam, e quem espera parado balança levemente o peso. Em algumas estações há um **vendedor de pão de queijo** com carrinho e tabuleiro fumegando, **pombos** ciscando, um **reencontro** (alguém desce do trem, vai ao encontro de quem esperava e os dois se abraçam, com um coração em cima) e um **atrasado correndo** de braços bombeando para alcançar a porta antes da partida. Figurinhas: "Abraço na plataforma", "Correu e conseguiu!" e "Pão de queijo quentinho".

## A passageira tem vida própria

Além de ler, tomar café e dormir à noite, ela vai trocando de atividade a cada ~45 s: **tricota** (as agulhas batendo e um cachecol listrado que cresce ao longo da viagem, com o novelo no colo — cerca de 1 h de viagem rende a figurinha "Cachecol de tricô"), **desenha** a paisagem num bloquinho (o lápis vai traçando o morro, e cada desenho vira uma linha no caderno), **cochila** de dia com a cabeça tombando para o vidro e **come um sanduíche**.

## Caderno da passageira

Botão **Caderno**: ela vai escrevendo a viagem num caderno de papel pautado, com letra de mão — uma linha para cada descoberta do diário ("Parei em Nexus. Gente chegando, gente partindo.", "Vi algo raro: Aurora boreal! Nem acredito."), com data, hora e km, e metade dos pensamentos que passam pela cabeça dela ("Pensei: …"). A primeira página: "Comecei este caderno hoje. Nova fase, página em branco." Fica salvo no navegador, aparece no idioma escolhido e pode ser baixado em **.txt**.

## Viajantes que voltam

Quem passa pelo corredor lembra de você. A cada nova visita ao trem, cada personagem que você já conheceu conta o **próximo capítulo** da história dele: o violinista ensaia, fica nervoso e toca com o teatro lotado; o executivo desliga o celular e acaba abrindo uma padaria; o casal fica noivo, marca a data e casa; o Rex aprende a sentar e ganha uma irmã gatinha... (3 capítulos para cada um dos 10). Se alguém passar de novo na mesma visita: "De novo por aqui? Que coincidência!". Figurinha: "Velho conhecido".

## Linha Estelar

A terceira linha só anda **à noite**: seja qual for o horário, o céu dela fica entre 22h e 1h. É a linha do céu — a **Via Láctea** atravessa a janela, **Vênus, Marte e Júpiter** brilham com seus nomes e as constelações aparecem ligadas e nomeadas (**Cruzeiro do Sul, Órion, Escorpião**). O vagão é azul-noite com detalhes dourados, e as estações têm nomes de estrelas. Chega-se a ela pela **baldeação na Nexus**: a baldeação agora leva à linha do seu destino (ou, em viagem livre, vai alternando Aurora → Horizonte → Estelar). Nas outras linhas, em noites limpas, o mesmo céu aparece mais discreto e sem nomes. Figurinhas: "Linha Estelar" e "Constelações".

## Diário de intenções

Botão **Intenção** no painel (e um convite gentil na primeira visita): escreva uma frase para a viagem — "Começar esta fase com leveza". Ela viaja **lacrada** com você: de vez em quando a passageira se lembra dela num pensamento. Quando o trem para na **estação Nexus** ou chega ao seu **destino** (depois de pelo menos 1 km), a intenção volta num cartão — com a data em que foi escrita e onde voltou — e pode ser guardada como **cartão-postal** com as suas palavras, ou renovada. Fica salva no navegador; as suas palavras nunca são traduzidas.

## Clima mais rico

- **Vento**: sopra mais no litoral e nas montanhas, em rajadas, e forte nas tempestades — as árvores se curvam e balançam (figurinha "Vendaval"). No outono, as folhas voam em maior número e mais rápido quando venta.
- **Granizo**: algumas tempestades trazem pedrinhas de gelo caindo inclinadas pelo vento, com estalinhos no teto do vagão (som ligado).
- **Nevasca**: neve com tempestade ou vento forte nas montanhas e no inverno vira flocos de lado e um branco que engole a paisagem.
- **Miragem**: no deserto, perto do meio-dia, o horizonte tremula como se fosse água.

Figurinhas: "Chuva de granizo", "Nevasca", "Miragem no deserto" e "Vendaval".

## Eventos raros

- **Festa junina**: em alguns dias, estações do interior (não a Central nem a Nexus) aparecem enfeitadas com bandeirinhas coloridas balançando sob a cobertura e uma fogueira crepitando na plataforma — mais bonita à noite.
- **O circo chegou**: de vez em quando, uma lona listrada de vermelho e branco, com bandeirinha no mastro, montada nos campos ou na fazenda (a primeira fica por volta do km 41, na segunda volta).
- **Arco-íris duplo**: em alguns dias de arco-íris forte, surge um segundo arco por fora, mais fraco e com as cores invertidas.
- **Coração no céu**: em dias limpos, um aviãozinho desenha um coração de fumaça, que fica um tempo no céu e vai se desmanchando.

Cada um tem a sua figurinha em Raridades.

## Noite

À noite, **luzes de vilas distantes** piscam ao pé das montanhas do fundo. Nas noites limpas das montanhas nevadas aparece a **aurora boreal** — cortinas verdes com barra violeta ondulando no céu — e, em algumas noites especiais, ela aparece em qualquer paisagem (figurinha "Aurora boreal").

## Lua e meteoros

A lua muda de fase a cada noite (um ciclo completo a cada 8 dias de viagem): nova, crescente, quarto, gibosa, cheia e de volta. A lua cheia ilumina a paisagem; na lua nova a noite fica bem escura. Algumas noites limpas trazem uma **chuva de meteoros** — riscos no céu a cada instante, e a passageira faz pedidos.

## Vagão-restaurante

No painel, **Vagão** escolhe onde ela está. O **Restaurante** leva a passageira (com uma transição escura) a um vagão com lambris de madeira, arandelas de latão, mesa com toalha branca, taça de vinho, vaso com rosa e vela acesa à noite. Ali o carrinho de lanches vira um **garçom** de paletó branco e gravata-borboleta que anuncia o prato do dia (feijoada, moqueca, risoto, salada tropical, macarrão ao sugo ou pudim), serve o prato na mão dela, e ela come em garfadas até o prato esvaziar. **Passageiros** retorna ao assento de sempre.

## Outros vagões

- **Panorâmico**: a janela sobe até o teto de vidro, com nervuras de aço — muito mais céu para ver a lua, as estrelas e a chuva de meteoros.
- **Vagão-leito**: beliche com escada, luz de leitura e a cortina meio fechada. Ela está deitada na cama de baixo, sob uma colcha de retalhos que sobe e desce com a respiração — dormindo ("z") à noite, de olhos abertos de dia. Clique nela: "Zzz... só mais cinco minutinhos."
- **Bagagem**: vagão de tábuas escuras com caixotes, malas coloridas e uma lâmpada balançando; a paisagem passa pela porta de correr entreaberta. Em cima do baú dorme um **gato laranja clandestino** — de vez em quando ele senta e olha em volta; clicando nele, ele mia, ronrona e solta corações.
- **Cabine do maquinista**: a vista **para a frente** — os trilhos correndo em perspectiva até o horizonte, dormentes vindo na sua direção, postes, árvores e casas passando dos lados, plataformas das estações chegando, túneis surgindo como uma boca escura no morro (e lá dentro, só a saída brilhando longe), farol aceso à noite e limpadores de para-brisa na chuva. No painel: velocímetro, visor com km, próxima estação e distância, e o botão vermelho de **APITO**.

Diário: "Noite no vagão-leito", "Vagão panorâmico", "Gato clandestino", "Cabine do maquinista" e "Apito do maquinista".

## Destino

No painel, **Destino** escolhe uma das 7 estações (ou viagem livre). O letreiro passa a mostrar a distância e o tempo estimado ("Destino: Porto Azul · 12.3 km · ~8 min") e o mapa destaca a estação. O trem para no destino mesmo com "Parar nas estações" desligado: a passageira acena ("Chegamos a Porto Azul!"), o trem espera e aparece o resumo da viagem — km, tempo e descobertas novas no diário — com as opções **Continuar viajando** ou **Escolher outro destino**.

## Modo foco

O botão **Foco** (que substitui o antigo Pomodoro) transforma o trabalho em viagem: cada **bloco de foco** de 25 min é o trajeto até uma estação, escolhida para que o trem chegue lá exatamente quando o bloco termina (usando o mesmo planejador do "Chegar às"); a **pausa** de 5 min é a parada nessa plataforma; terminada a pausa, ele escolhe a próxima estação e parte. A pílula no canto mostra "Foco · rumo a Pedra Alta · 18:32 · #2" ou "Pausa em Pedra Alta · 04:10", com sino a cada troca. Ao encerrar, um relatório: "3 blocos · 75 min de foco · 3 estações · 92 km". As durações podem mudar pela URL: `?foco=50&pausa=10`. Figurinhas: "Um bloco de foco" e "Quatro blocos seguidos".

## Chegar na hora marcada

Com um **Destino** escolhido, preencha **Chegar às** (horário do seu relógio, ex.: 18:00) e o trem passa a dirigir sozinho: escolhe em qual passagem pela estação vai chegar para manter uma velocidade confortável (perto de 80 km/h — uma meta de 2 horas não vira um trem a 5 km/h, ele dá mais voltas), desconta o tempo das paradas no caminho e recalcula a cada segundo, compensando atrasos. O letreiro mostra "Destino: Porto Azul às 18:00 · 12.3 km · 74 km/h" e a velocidade aparece como "agenda". Se não houver tempo, vai a toda velocidade e avisa. Na chegada, o resumo diz se foi na hora, adiantado ou atrasado — e chegar com até 1 min de diferença vale a figurinha "Pontualidade britânica". Bom para marcar o fim de uma sessão de trabalho.

## Rádio do vagão

Um radinho antigo no parapeito da janela: clique nele para trocar de estação (ou use o seletor **Rádio** e o **Volume** no painel). As músicas são geradas na hora, sem arquivos:

- **Ambiente**: acordes longos e notas soltas (é a trilha do modo Relaxar)
- **Lo-fi**: piano elétrico jazzy, baixo, batida lenta com swing e chiado de vinil
- **Clássica**: arpejos de piano em 3/4 sobre a progressão de Pachelbel, com cordas ao fundo
- **Bossa nova**: violão com a batida da bossa, baixo, chocalho, aro de caixa e uma flauta de vez em quando

Ao trocar de estação ouve-se o chiado de sintonia; com o rádio ligado o mostrador acende e as notinhas sobem.

## Locutor

Em **Som**, ligue **Locutor (voz do rádio)**: com a voz sintetizada do próprio navegador, ele anuncia a próxima estação e a chegada ("Estação Nexus. Desembarque com cuidado..."), os marcos do dia (6h, meio-dia, 18h, meia-noite), mudanças de clima, noites de chuva de meteoros e, a cada ~6 minutos, lê uma **crônica da viagem** sobre a paisagem do momento ("no outono as árvores ensinam a soltar..."). A música do rádio baixa sozinha enquanto ele fala. Fala em português ou inglês, conforme o idioma escolhido. A voz depende das vozes instaladas no sistema.

## Modos de uso

- **Relaxar**: tela cheia, sem painel nem letreiro, com música ambiente gerada na hora (acordes lentos e notas soltas). Esc ou o botão de novo para sair.
- **Foco**: blocos de foco até uma estação e pausas na plataforma (veja "Modo foco").
- **Mapa**: a linha inteira da volta atual (38,5 km) com estações, túneis, pontes, passagens de nível, biomas e a posição do trem.
- **Foto**: salva o quadro atual como PNG (`train-journey-km12.3.png`).
- **Cartão-postal**: transforma a vista num cartão — foto com "Lembranças do Litoral" (ou da estação), selo, carimbo com km e data e um recado escrito à mão sobre a paisagem (`cartao-postal-km12.3.png`).

## Diário de viagem

Botão **Diário** no painel: um caderno com 126 figurinhas para completar — as 18 estações das duas linhas, as 11 paisagens, as 4 estações do ano, fenômenos do céu (arco-íris, relâmpago, neve, neblina, estrelas, pôr do sol, lua cheia, lua nova), coisas do caminho (túnel, ponte, passagem de nível, trem cruzando, farol, viaduto), momentos (bilhete, café, freio de emergência, bichos, revoada, balão, companhia de viagem, acordar a passageira), os 10 personagens do corredor e as 6 personalidades do banco da frente, raridades (estrela cadente, chuva de meteoros, arco-íris duplo, coração no céu, festa junina, circo, cervo, fogos de artifício, baleia) e marcos (chegada ao destino, 10 e 50 km) e conquistas (10 min, 30 min, 1 h e 3 h a bordo, um dia inteiro no trem, um ciclo da lua, 100 km, primeiro cartão-postal, intenção lacrada, intenção que voltou). O diário também conta o tempo total a bordo. Cada descoberta aparece com um aviso na tela e fica salva no navegador (dá para recomeçar pelo próprio diário).

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

## Compartilhar a vista

Botão **Compartilhar**: gera um link que abre **exatamente a mesma vista** — mesmo ponto do trajeto e linha, dia (fase da lua), hora, clima, estação do ano e vagão — com uma frase pronta ("Estou viajando de trem (Linha Aurora, km 12.3, Montanhas). Vem ver a mesma vista:"). No celular abre o compartilhamento do sistema; no computador, copia para a área de transferência. O link usa os parâmetros `km`, `dia`, `hora` (HH:MM), `clima` (clear/rain/storm/auto), `estacao` (spring/summer/autumn/winter/auto) e `vagao` (passenger/dining/panorama/sleeper/baggage/cab). Nada pessoal vai no link. Figurinha: "Vista compartilhada".

## Instalar e usar offline

O Train Journey é um app instalável (PWA): no Chrome/Edge aparece o botão **Instalar app** no painel (ou o ícone de instalar na barra de endereço); no iPhone, Compartilhar → **Adicionar à Tela de Início**. Instalado, abre em tela cheia com ícone próprio (uma janela de trem ao pôr do sol). Depois de uma visita com internet, **funciona offline**: o service worker busca sempre a versão mais nova quando há conexão e usa a cópia guardada quando não há. Figurinha: "Trem no bolso". Os ícones são gerados por `node tools/make-icons.mjs` (sem dependências).

## No celular

No celular a vista vem primeiro: o painel fica guardado atrás do botão ☰ e abre como uma gaveta (de lado, com o aparelho deitado). Para olhar ao redor, arraste o dedo ou incline o aparelho (no iPhone, o navegador pede permissão no primeiro toque). Botões maiores para o dedo, respeito ao notch e às bordas da tela, e o diário abre em tela cheia.

## Painel e configurações

O painel tem no topo os botões de momento (Relaxar, Foco, Respirar, Intenção, Mapa, Foto, Cartão-postal, Compartilhar) e, abaixo, seções que abrem e fecham: **Viagem** (vagão, destino, chegar às, paradas, velocidade), **Céu e clima**, **Som** (som, fones, rádio, volume), **Diário e caderno** e **Ajustes** (idioma, instalar o app, restaurar configurações). Ele **lembra tudo da última vez** — velocidade, hora, clima, estação do ano, paradas, vagão, rádio, volume, fones e quais seções estavam abertas. Um link compartilhado tem prioridade sobre o que estava salvo. O rádio lembrado volta a tocar no primeiro toque na tela (os navegadores só liberam áudio depois de um gesto).

## Controles

| Controle | Efeito |
| --- | --- |
| Velocidade | 0–220 km/h (acelera/freia de forma gradual) |
| Hora do dia | Fixa um horário (desliga o ciclo automático) |
| Clima | Automático, limpo, chuva ou tempestade |
| Estação do ano | Automática, primavera, verão, outono ou inverno |
| Parar nas estações | Liga/desliga as paradas (desligado, o trem passa direto) |
| Idioma | Português ou English — troca na hora, sem reiniciar a viagem (lembrado no navegador; `?lang=en` na URL também funciona) |
| Som | Ativa o áudio (navegadores exigem um clique) |
| Fones de ouvido | Som espacial: o "tum-tum" dos trilhos vem do truque da frente (direita) e depois do de trás (esquerda), o trem que cruza passa da direita para a esquerda, o sino da passagem de nível vem da frente, o trovão cai de um lado, os sons do corredor acompanham o personagem, cada clique soa do lado em que você clicou e a chuva bate no vidro de um lado. Sem fones, a separação fica suave para caixas de som |
| Mover o mouse | Olhar ao redor |
| Arrastar na janela | Desenhar no vidro embaçado |
| `H` ou clique/toque na cena | Oculta o painel |
| Celular: arrastar o dedo ou inclinar o aparelho | Olhar ao redor |
| Celular: botão ☰ | Abre/fecha o painel (começa fechado para a vista vir primeiro) |
| `?pass` na URL | Faz um trem passar em 2 s (para testar) |
| `?dia=N` na URL | Começa no dia N (muda a fase da lua; ex.: `?dia=3` lua cheia, `?dia=7` lua nova) |
| `?km=22` na URL | Começa em outro ponto do trajeto (fazenda ≈ 5, cidade ≈ 22, litoral ≈ 26, ponte ≈ 3.07, estação ≈ 1.44, passagem de nível ≈ 3.94, farol ≈ 26.75) |

## Estrutura

```
src/
  main.js       loop principal, cliques e sons
  render.js     ordem de desenho de cada vagão
  cars.js       vagões e a janela de cada um
  panoramaView.js teto de vidro do vagão panorâmico
  baggageView.js vagão de bagagem e o gato
  cabView.js    vista da cabine do maquinista (perspectiva)
  viaduct.js    viaduto sobre o vale (vinhedos)
  weatherFx.js  vento, granizo, nevasca e miragem
  stationPeople.js pessoas da plataforma (andar, abraço, corredor, vendedor, pombos)
  rareEvents.js festa junina, circo e avião escrevendo no céu
  sleeperView.js vagão-leito (beliche, colcha, ela dormindo)
  nightView.js  aurora boreal e luzes distantes
  cabDash.js    painel da cabine (velocímetro, visor, apito)
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
  modes.js      modos relaxar, mapa, foto e cartão-postal
  brand.js      marca: emblema fractal, tela de abertura
  lineChange.js baldeação na Nexus (regra pura)
  transfer.js   botão de baldeação e transição
  platformScene.js cena da plataforma (ela troca de trem)
  cabinThemes.js estilo do vagão de cada linha
  breathing.js  modo respiração no ritmo dos trilhos
  notebook.js   caderno da passageira
  travelers.js  viajantes que voltam (capítulos das histórias)
  install.js    service worker e botão de instalar o app
  share.js      link para compartilhar a vista atual
  settings.js   configurações salvas e seções do painel
  starSky.js    céu da Linha Estelar (Via Láctea, planetas, constelações)
  announcer.js  locutor do rádio (voz sintetizada, crônicas)
  focus.js      modo foco (blocos até estações, pausas nas plataformas)
  schedule.js   chegar na hora marcada (escolhe a volta e a velocidade)
  intention.js  diário de intenções (escrever, lacrar, receber de volta)
  postcard.js   composição do cartão-postal (foto, selo, carimbo, recado)
  i18n.js       idioma: t() traduz textos na exibição, troca ao vivo PT/EN
  lang/en.js    dicionário português → inglês (frases e padrões)
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
  pomodoro.js   durações do foco (lidas da URL)
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
  rareSky.js    estrela cadente, chuva de meteoros e fogos de artifício
  moon.js       fases da lua e noites de meteoros
  wildlife.js   cervos e baleia
  audio.js      som gerado com Web Audio (sem arquivos)
  controls.js   painel e letreiro
```

Todo o cenário é procedural e determinístico (hash por posição), então o mesmo quilômetro sempre tem a mesma paisagem.
