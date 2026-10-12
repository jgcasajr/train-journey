// Spanish versions of the strings built at runtime (see EN_PATTERNS in en.js for the same list).
// Each entry: [regex over the Portuguese text, (tr, ...groups) => Spanish]; `tr` translates a sub-part.

const GREETING = '(Bom dia|Boa tarde|Boa noite)';
const GREETINGS = { 'Bom dia': 'Buenos días', 'Boa tarde': 'Buenas tardes', 'Boa noite': 'Buenas noches' };
const nextName = (tr, name) => (name === 'a próxima' ? tr(name) : name);
const HOURS = { 'meia-noite': 'Es medianoche', 'meio-dia': 'Es mediodía', 'uma hora': 'Es la una' };

// "Lembranças <from>" on the postcard photo, by the FROM values in postcard.js.
const POSTCARD_FROM = {
  'dos Campos': 'de los Campos',
  'da Fazenda': 'de la Hacienda',
  'da Floresta': 'del Bosque',
  'das Montanhas': 'de las Montañas',
  'do Bosque de Outono': 'del Bosque de Otoño',
  'do Subúrbio': 'del Barrio',
  'da Cidade': 'de la Ciudad',
  'do Litoral': 'de la Costa',
  'da viagem': 'del viaje',
};

export const ES_PATTERNS = [
  [/^Hora real: (\S+)\.$/, (tr, clock) => `Hora real: ${clock}.`],
  [/^Só a hora real \((\S+)\): sem localização para o clima\.$/, (tr, clock) => `Solo la hora real (${clock}): sin ubicación para el clima.`],
  [/^Hora real: (\S+) · lá fora: (.+?)( \(neve\))? · atualizado às (\S+)$/, (tr, clock, w, snow, at) => `Hora real: ${clock} · afuera: ${tr(w)}${snow ? ' (nieve)' : ''} · actualizado a las ${at}`],
  [/^(\d+) dias seguidos$/, (tr, n) => `${n} días seguidos`],
  [/^(\d+) de (\d+) carimbos$/, (tr, n, total) => `${n} de ${total} sellos`],
  [/^Primeiro carimbo em (.+)$/, (tr, date) => `Primer sello el ${date}`],
  [/^Passaporte da (.+)$/, (tr, line) => `Pasaporte de la ${tr(line)}`],
  [/^Responder a (.+)$/, (tr, name) => `Responder a ${name}`],
  [/^Te escrevi uma carta do trem \((.+)\)\. Abra para ler e ver a mesma vista:$/, (tr, where) => `Te escribí una carta desde el tren (${where}). Ábrela para leerla y ver la misma vista:`],
  [/^— (.+), (\S+)(?: · enviada de (.+))?$/, (tr, who, date, where) => `— ${who === 'um viajante' ? 'un viajero' : who}, ${date}${where ? ` · enviada desde ${where}` : ''}`],
  [/^Parado na estação (.+)\.$/, (tr, name) => `Detenido en la estación ${name}.`],
  [/^Próxima estação: (.+), a ([\d.]+) km\.$/, (tr, name, km) => `Próxima estación: ${name}, a ${km} km.`],
  [/^Fala: “(.+)”$/s, (tr, text) => `Alguien dice: “${tr(text)}”`],
  [/^Estação (.+)\. Desembarque com cuidado e boa viagem a quem segue\.$/, (tr, name) => `Estación ${name}. Bajen con cuidado, y buen viaje a quienes siguen.`],
  [/^Próxima estação: (.+)\.$/, (tr, name) => `Próxima estación: ${name}.`],
  [/^São (meia-noite|meio-dia|uma hora|\d+ horas)\. (Bom dia|Boa tarde|Boa noite) a todos os passageiros\.$/, (tr, h, g) => `${HOURS[h] ?? `Son las ${h.replace(' horas', '')}`}. ${GREETINGS[g]} a todos los pasajeros.`],
  [/^Foco · rumo a (.+) · (\S+) · #(\d+)$/, (tr, dest, left, n) => `Enfoque · rumbo a ${dest} · ${left} · #${n}`],
  [/^Pausa em (.+) · (\S+)$/, (tr, dest, left) => `Pausa en ${dest} · ${left}`],
  [/^(\d+) blocos? · (\d+) min de foco · (\d+) esta(?:ção|ções) · ([\d.]+) km$/, (tr, b, m, s, km) => `${b} ${b === '1' ? 'bloque' : 'bloques'} · ${m} min de foco · ${s} ${s === '1' ? 'estación' : 'estaciones'} · ${km} km`],
  [/^Destino: (.+) às (\S+) · atrasado, a toda velocidade$/, (tr, name, at) => `Destino: ${name} a las ${at} · con retraso, a toda velocidad`],
  [/^Destino: (.+) às (\S+) · ([\d.]+) km · (\d+) km\/h$/, (tr, name, at, km, kmh) => `Destino: ${name} a las ${at} · ${km} km · ${kmh} km/h`],
  [/^(\d+) min de atraso$/, (tr, n) => `${n} min de retraso`],
  [/^(\d+) min adiantado$/, (tr, n) => `${n} min adelantado`],
  [/^Estou viajando de trem \((.+)\)\. Vem ver a mesma vista:$/, (tr, where) => `Estoy viajando en tren (${where}). Ven a ver la misma vista:`],
  [/^Atenção: trem da (.+) na plataforma 2\. Boa viagem!$/, (tr, line) => `Atención: tren de la ${tr(line)} en el andén 2. ¡Buen viaje!`],
  [/^Fazer baldeação: (.+)$/, (tr, line) => `Hacer transbordo: ${tr(line)}`],
  [/^Destino: (.+) · baldeação em (.+) · ([\d.]+) km$/, (tr, dest, via, km) => `Destino: ${dest} · transbordo en ${via} · ${km} km`],
  [/^Minha intenção: “(.+)”$/s, (tr, text) => `Mi intención: “${text}”`],
  [/^Escrita em (.+) · voltou em (.+)$/, (tr, date, place) => `Escrita el ${date} · volvió en ${place}`],
  // Waiter, snack cart and conductor (aisle.js)
  [new RegExp(`^${GREETING}! O prato do dia é (.+)\\. Aceita\\?$`), (tr, g, dish) => `¡${GREETINGS[g]}! El plato del día es ${tr(dish)}. ¿Le apetece?`],
  [new RegExp(`^${GREETING}! Café\\? Pão de queijo\\?$`), (tr, g) => `¡${GREETINGS[g]}! ¿Café? ¿Pão de queijo?`],
  [new RegExp(`^${GREETING}! Bilhete, por favor\\.$`), (tr, g) => `¡${GREETINGS[g]}! Boleto, por favor.`],
  [/^Próxima parada: (.+)\.$/, (tr, name) => `Próxima parada: ${name}.`],
  // Companion lines with {next} filled in (companion.js, personas.js)
  [/^Desço em (.+)\.$/, (tr, name) => `Me bajo en ${nextName(tr, name)}.`],
  [/^Moro perto de (.+)\.$/, (tr, name) => `Vivo cerca de ${nextName(tr, name)}.`],
  [/^Este trem vai para\.\.\. (.+)\?$/, (tr, name) => `¿Este tren va a... ${nextName(tr, name)}?`],
  // Destination board, arrival card and her cheer (arrival.js, destination.js)
  [/^Chegamos: (.+)$/, (tr, name) => `Llegamos: ${name}`],
  [/^Destino: (.+) · ([\d.]+) km · ~(\d+) min$/, (tr, name, km, min) => `Destino: ${name} · ${km} km · ~${min} min`],
  [/^Você chegou a (.+)!$/, (tr, name) => `¡Llegaste a ${name}!`],
  [/^([\d.]+) km em (\d+) min · (\d+) (?:descoberta nova|descobertas novas) no diário$/,
    (tr, km, min, n) => `${km} km en ${min} min · ${n} ${n === '1' ? 'descubrimiento nuevo' : 'descubrimientos nuevos'} en el diario`],
  [/^Chegamos a (.+)!$/, (tr, name) => `¡Llegamos a ${name}!`],
  // Station board (journey.js)
  [/^Próx\.: (.+) ([\d.]+) km$/, (tr, name, km) => `Próx.: ${name} ${km} km`],
  [/^Próx\.: (.+)$/, (tr, name) => `Próx.: ${name}`],
  // Journal (journal.js)
  [/^Diário (\d+)\/(\d+)$/, (tr, done, total) => `Diario ${done}/${total}`],
  [/^(\d+) de (\d+) descobertas · ([\d.]+) km viajados · (.+) a bordo$/,
    (tr, done, total, km, time) => `${done} de ${total} descubrimientos · ${km} km recorridos · ${time} a bordo`],
  [/^([\s\S]*?)  Nova descoberta: (.+)!$/, (tr, icon, title) => `${icon}  ¡Nuevo descubrimiento: ${tr(title)}!`],
  // Line map and pomodoro (lineMap.js, pomodoro.js)
  [/^Volta (\d+) · (\d+) km$/, (tr, lap, km) => `Vuelta ${lap} · ${km} km`],
  [/^Foco (\d+:\d+ · #\d+)$/, (tr, rest) => `Enfoque ${rest}`],
  [/^Pausa (\d+:\d+ · #\d+)$/, (tr, rest) => `Pausa ${rest}`],
  // Postcard (postcard.js)
  [/^Lembranças de (.+)$/, (tr, station) => `Recuerdos de ${station}`],
  [/^Lembranças (.+)$/, (tr, from) => `Recuerdos ${POSTCARD_FROM[from] ?? from}`],
  [/^— da janela do trem, às (\d+:\d+)$/, (tr, clock) => `— desde la ventana del tren, a las ${clock}`],
  // Station name prefix on the board (journey.js); proper names stay as they are
  [/^Estação (?!Central$)([A-ZÀ-Ú].*)$/, (tr, name) => `Estación ${name}`],
];
