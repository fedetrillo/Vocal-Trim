// Vocal Trim: reads the selected track's waveform overview, works out a level envelope, and
// writes the gain rides that keep the voice near a target level as automation (Trim by default,
// so the fader stays free; or Volume). The analysis lives in analysis.js.

(() => {
  const $ = (id) => document.getElementById(id);
  const R = window.Rider;
  const VERSION = '1.0.1';
  const KEY = 'com.fedetrillo.vocaltrim.';
  const store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* not fatal */ } },
  };

  const I18N = {
    en: {
      _name: 'English', noTrack: 'Select an audio track in LUNA', noTrackSub: 'The vocal track whose level you want to ride.',
      spanLbl: 'Where', spanSel: 'Selection', spanAll: 'Whole track', laneLbl: 'Write to', trim: 'Trim', volume: 'Volume',
      rangeSel: 'Bars {a} to {b} · {n} clips', rangeAll: 'Whole track · bars {a} to {b} · {n} clips', noClips: 'No audio clips in this range',
      target: 'Target', threshold: 'Threshold', range: 'Range', amount: 'Amount', peaks: "Consonants", tailsLbl: "Phrase ends", tailsKeep: "Keep", tailsRide: "Level", shifted: "{n} points written to {lane}, {db} dB lower so they fit the fader", speed: 'Speed', slow: 'Slow', medium: 'Medium', fast: 'Fast', auto: 'Auto',
      tHint: 'Auto: the median level of the voice. The threshold separates the voice from the noise between phrases; below it, nothing is ridden.',
      active: 'Voice', rides: 'Rides', spread: 'Level spread', points: 'Points',
      preview: 'Level and rides', before: 'Before', after: 'After', gain: 'Ride',
      write: 'Write automation', clear: 'Clear in range', undo: 'Undo',
      analysing: 'Reading the waveform…', noOverview: 'LUNA has not analysed this audio yet: wait a moment and try again', failed: 'Error: {e}',
      written: '{n} points written to {lane} on {track}', cleared: 'Automation cleared in the range', undone: 'Undone', working: 'Writing…', modeRead: 'The track’s automation is set to read so you hear it.',
      waiting: 'Waiting for LUNA…', noSession: 'Open a session in LUNA.', report: 'Report copied',
      dark: 'Dark', grey: 'Grey', color: 'Colour', cYellow: 'Yellow', cOrange: 'Orange', cRed: 'Red', cGreen: 'Green', cBlue: 'Blue', cPink: 'Pink', cPurple: 'Purple',
    },
    es: {
      _name: 'Español', noTrack: 'Selecciona una pista de audio en LUNA', noTrackSub: 'La pista de voz cuyo nivel quieres llevar.',
      spanLbl: 'Dónde', spanSel: 'Selección', spanAll: 'Toda la pista', laneLbl: 'Escribir en', trim: 'Trim', volume: 'Volumen',
      rangeSel: 'Compases {a} a {b} · {n} clips', rangeAll: 'Toda la pista · compases {a} a {b} · {n} clips', noClips: 'No hay clips de audio en este rango',
      target: 'Objetivo', threshold: 'Umbral', range: 'Rango', amount: 'Cantidad', peaks: "Consonantes", tailsLbl: "Finales de frase", tailsKeep: "Respetar", tailsRide: "Nivelar", shifted: "{n} puntos escritos en {lane}, {db} dB más bajos para que quepan en el fader", speed: 'Velocidad', slow: 'Lenta', medium: 'Media', fast: 'Rápida', auto: 'Auto',
      tHint: 'Auto: el nivel medio de la voz. El umbral separa la voz del ruido entre frases; por debajo no se toca nada.',
      active: 'Voz', rides: 'Correcciones', spread: 'Diferencia de nivel', points: 'Puntos',
      preview: 'Nivel y correcciones', before: 'Antes', after: 'Después', gain: 'Corrección',
      write: 'Escribir automatización', clear: 'Borrar en el rango', undo: 'Deshacer',
      analysing: 'Leyendo la forma de onda…', noOverview: 'LUNA aún no ha analizado este audio: espera un momento y vuelve a probar', failed: 'Error: {e}',
      written: '{n} puntos escritos en {lane} de {track}', cleared: 'Automatización borrada en el rango', undone: 'Deshecho', working: 'Escribiendo…', modeRead: 'He puesto la automatización de la pista en lectura para que se oiga.',
      waiting: 'Esperando a LUNA…', noSession: 'Abre una sesión en LUNA.', report: 'Informe copiado',
      dark: 'Oscuro', grey: 'Gris', color: 'Color', cYellow: 'Amarillo', cOrange: 'Naranja', cRed: 'Rojo', cGreen: 'Verde', cBlue: 'Azul', cPink: 'Rosa', cPurple: 'Morado',
    },
  };
  Object.assign(I18N, {"ca": {"_name": "Català", "peaks": "Consonants", "tailsLbl": "Finals de frase", "tailsKeep": "Respectar", "tailsRide": "Anivellar", "shifted": "{n} punts escrits a {lane}, {db} dB més baixos perquè hi càpiguen al fader", "noTrack": "Selecciona una pista d’àudio a LUNA", "noTrackSub": "La pista de veu de la qual vols portar el nivell.", "spanLbl": "On", "spanSel": "Selecció", "spanAll": "Tota la pista", "laneLbl": "Escriure a", "trim": "Trim", "volume": "Volum", "rangeSel": "Compassos {a} a {b} · {n} clips", "rangeAll": "Tota la pista · compassos {a} a {b} · {n} clips", "noClips": "No hi ha clips d’àudio en aquest rang", "target": "Objectiu", "threshold": "Llindar", "range": "Rang", "amount": "Quantitat", "speed": "Velocitat", "slow": "Lenta", "medium": "Mitjana", "fast": "Ràpida", "auto": "Auto", "tHint": "Auto: el nivell mitjà de la veu. El llindar separa la veu del soroll entre frases; per sota no es toca res.", "active": "Veu", "rides": "Correccions", "spread": "Diferència de nivell", "points": "Punts", "preview": "Nivell i correccions", "before": "Abans", "after": "Després", "gain": "Correcció", "write": "Escriure automatització", "clear": "Esborrar al rang", "undo": "Desfer", "analysing": "Llegint la forma d’ona…", "noOverview": "LUNA encara no ha analitzat aquest àudio: espera un moment i torna-ho a provar", "failed": "Error: {e}", "written": "{n} punts escrits a {lane} de {track}", "cleared": "Automatització esborrada al rang", "undone": "Desfet", "working": "Escrivint…", "modeRead": "He posat l’automatització de la pista en lectura perquè se senti.", "waiting": "Esperant LUNA…", "noSession": "Obre una sessió a LUNA.", "report": "Informe copiat", "dark": "Fosc", "grey": "Gris", "color": "Color", "cYellow": "Groc", "cOrange": "Taronja", "cRed": "Vermell", "cGreen": "Verd", "cBlue": "Blau", "cPink": "Rosa", "cPurple": "Lila"},
    "fr": {"_name": "Français", "peaks": "Consonnes", "tailsLbl": "Fins de phrase", "tailsKeep": "Respecter", "tailsRide": "Niveler", "shifted": "{n} points écrits dans {lane}, {db} dB plus bas pour tenir dans le fader", "noTrack": "Sélectionnez une piste audio dans LUNA", "noTrackSub": "La piste de voix dont vous voulez suivre le niveau.", "spanLbl": "Où", "spanSel": "Sélection", "spanAll": "Toute la piste", "laneLbl": "Écrire dans", "trim": "Trim", "volume": "Volume", "rangeSel": "Mesures {a} à {b} · {n} clips", "rangeAll": "Toute la piste · mesures {a} à {b} · {n} clips", "noClips": "Aucun clip audio dans cette zone", "target": "Cible", "threshold": "Seuil", "range": "Plage", "amount": "Quantité", "speed": "Vitesse", "slow": "Lente", "medium": "Moyenne", "fast": "Rapide", "auto": "Auto", "tHint": "Auto : le niveau médian de la voix. Le seuil sépare la voix du bruit entre les phrases ; en dessous, rien n’est corrigé.", "active": "Voix", "rides": "Corrections", "spread": "Écart de niveau", "points": "Points", "preview": "Niveau et corrections", "before": "Avant", "after": "Après", "gain": "Correction", "write": "Écrire l’automation", "clear": "Effacer dans la zone", "undo": "Annuler", "analysing": "Lecture de la forme d’onde…", "noOverview": "LUNA n’a pas encore analysé cet audio : attendez un instant et réessayez", "failed": "Erreur : {e}", "written": "{n} points écrits dans {lane} de {track}", "cleared": "Automation effacée dans la zone", "undone": "Annulé", "working": "Écriture…", "modeRead": "J’ai mis l’automation de la piste en lecture pour l’entendre.", "waiting": "En attente de LUNA…", "noSession": "Ouvrez une session dans LUNA.", "report": "Rapport copié", "dark": "Sombre", "grey": "Gris", "color": "Couleur", "cYellow": "Jaune", "cOrange": "Orange", "cRed": "Rouge", "cGreen": "Vert", "cBlue": "Bleu", "cPink": "Rose", "cPurple": "Violet"},
    "de": {"_name": "Deutsch", "peaks": "Konsonanten", "tailsLbl": "Phrasenenden", "tailsKeep": "Belassen", "tailsRide": "Angleichen", "shifted": "{n} Punkte in {lane} geschrieben, {db} dB tiefer, damit sie in den Fader passen", "noTrack": "Wähle eine Audiospur in LUNA", "noTrackSub": "Die Gesangsspur, deren Pegel du fahren willst.", "spanLbl": "Wo", "spanSel": "Auswahl", "spanAll": "Ganze Spur", "laneLbl": "Schreiben in", "trim": "Trim", "volume": "Lautstärke", "rangeSel": "Takte {a} bis {b} · {n} Clips", "rangeAll": "Ganze Spur · Takte {a} bis {b} · {n} Clips", "noClips": "Keine Audioclips in diesem Bereich", "target": "Ziel", "threshold": "Schwelle", "range": "Bereich", "amount": "Stärke", "speed": "Tempo", "slow": "Langsam", "medium": "Mittel", "fast": "Schnell", "auto": "Auto", "tHint": "Auto: der mittlere Pegel der Stimme. Die Schwelle trennt die Stimme vom Rauschen zwischen den Phrasen; darunter wird nichts gefahren.", "active": "Stimme", "rides": "Korrekturen", "spread": "Pegelspanne", "points": "Punkte", "preview": "Pegel und Korrekturen", "before": "Vorher", "after": "Nachher", "gain": "Korrektur", "write": "Automation schreiben", "clear": "Im Bereich löschen", "undo": "Rückgängig", "analysing": "Wellenform wird gelesen…", "noOverview": "LUNA hat dieses Audio noch nicht analysiert: kurz warten und erneut versuchen", "failed": "Fehler: {e}", "written": "{n} Punkte in {lane} von {track} geschrieben", "cleared": "Automation im Bereich gelöscht", "undone": "Rückgängig gemacht", "working": "Schreibe…", "modeRead": "Die Automation der Spur steht jetzt auf Lesen, damit du sie hörst.", "waiting": "Warte auf LUNA…", "noSession": "Öffne eine Session in LUNA.", "report": "Bericht kopiert", "dark": "Dunkel", "grey": "Grau", "color": "Farbe", "cYellow": "Gelb", "cOrange": "Orange", "cRed": "Rot", "cGreen": "Grün", "cBlue": "Blau", "cPink": "Pink", "cPurple": "Lila"},
    "it": {"_name": "Italiano", "peaks": "Consonanti", "tailsLbl": "Fine frase", "tailsKeep": "Rispetta", "tailsRide": "Livella", "shifted": "{n} punti scritti su {lane}, {db} dB più bassi per rientrare nel fader", "noTrack": "Seleziona una traccia audio in LUNA", "noTrackSub": "La traccia della voce di cui vuoi guidare il livello.", "spanLbl": "Dove", "spanSel": "Selezione", "spanAll": "Tutta la traccia", "laneLbl": "Scrivi su", "trim": "Trim", "volume": "Volume", "rangeSel": "Battute da {a} a {b} · {n} clip", "rangeAll": "Tutta la traccia · battute da {a} a {b} · {n} clip", "noClips": "Nessuna clip audio in questo intervallo", "target": "Obiettivo", "threshold": "Soglia", "range": "Escursione", "amount": "Quantità", "speed": "Velocità", "slow": "Lenta", "medium": "Media", "fast": "Veloce", "auto": "Auto", "tHint": "Auto: il livello medio della voce. La soglia separa la voce dal rumore tra le frasi; sotto, niente viene corretto.", "active": "Voce", "rides": "Correzioni", "spread": "Differenza di livello", "points": "Punti", "preview": "Livello e correzioni", "before": "Prima", "after": "Dopo", "gain": "Correzione", "write": "Scrivi automazione", "clear": "Cancella nell’intervallo", "undo": "Annulla", "analysing": "Lettura della forma d’onda…", "noOverview": "LUNA non ha ancora analizzato questo audio: aspetta un momento e riprova", "failed": "Errore: {e}", "written": "{n} punti scritti su {lane} di {track}", "cleared": "Automazione cancellata nell’intervallo", "undone": "Annullato", "working": "Scrittura…", "modeRead": "Ho messo l’automazione della traccia in lettura perché si senta.", "waiting": "In attesa di LUNA…", "noSession": "Apri una sessione in LUNA.", "report": "Rapporto copiato", "dark": "Scuro", "grey": "Grigio", "color": "Colore", "cYellow": "Giallo", "cOrange": "Arancione", "cRed": "Rosso", "cGreen": "Verde", "cBlue": "Blu", "cPink": "Rosa", "cPurple": "Viola"},
    "pt": {"_name": "Português", "peaks": "Consoantes", "tailsLbl": "Fins de frase", "tailsKeep": "Respeitar", "tailsRide": "Nivelar", "shifted": "{n} pontos escritos em {lane}, {db} dB mais baixos para caberem no fader", "noTrack": "Seleciona uma faixa de áudio no LUNA", "noTrackSub": "A faixa de voz cujo nível queres acompanhar.", "spanLbl": "Onde", "spanSel": "Seleção", "spanAll": "Faixa inteira", "laneLbl": "Escrever em", "trim": "Trim", "volume": "Volume", "rangeSel": "Compassos {a} a {b} · {n} clips", "rangeAll": "Faixa inteira · compassos {a} a {b} · {n} clips", "noClips": "Não há clips de áudio neste intervalo", "target": "Objetivo", "threshold": "Limiar", "range": "Alcance", "amount": "Quantidade", "speed": "Velocidade", "slow": "Lenta", "medium": "Média", "fast": "Rápida", "auto": "Auto", "tHint": "Auto: o nível médio da voz. O limiar separa a voz do ruído entre frases; abaixo dele nada é corrigido.", "active": "Voz", "rides": "Correções", "spread": "Diferença de nível", "points": "Pontos", "preview": "Nível e correções", "before": "Antes", "after": "Depois", "gain": "Correção", "write": "Escrever automação", "clear": "Apagar no intervalo", "undo": "Desfazer", "analysing": "A ler a forma de onda…", "noOverview": "O LUNA ainda não analisou este áudio: espera um momento e tenta outra vez", "failed": "Erro: {e}", "written": "{n} pontos escritos em {lane} de {track}", "cleared": "Automação apagada no intervalo", "undone": "Desfeito", "working": "A escrever…", "modeRead": "Pus a automação da faixa em leitura para se ouvir.", "waiting": "À espera do LUNA…", "noSession": "Abre uma sessão no LUNA.", "report": "Relatório copiado", "dark": "Escuro", "grey": "Cinzento", "color": "Cor", "cYellow": "Amarelo", "cOrange": "Laranja", "cRed": "Vermelho", "cGreen": "Verde", "cBlue": "Azul", "cPink": "Rosa", "cPurple": "Roxo"}});

  let lang = store.get('lang') ?? (() => { for (const l of navigator.languages ?? [navigator.language]) { const c = String(l || '').slice(0, 2).toLowerCase(); if (I18N[c]) return c; } return 'en'; })();
  if (!I18N[lang]) lang = 'en';
  const t = (k, v = {}) => String(I18N[lang][k] ?? I18N.en[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m));
  const COLORS = ['yellow', 'orange', 'red', 'green', 'blue', 'pink', 'purple'];

  // The guide: its texts, in every language.
  for (const [c, v] of Object.entries({"en": {"help": "Quick guide", "helpBtn": "Guide", "tNext": "Next", "tBack": "Back", "tSkip": "Skip", "tDone": "Got it", "langT": "Choose your language", "langX": "The guide and the whole window will use it. You can change it later here, at the top right.", "zt": "Always at hand", "z": "Open this guide again whenever you need it with the Guide button.", "q1t": "Your vocal track", "q1": "Select the vocal track in LUNA. Choose where it works (the whole track or a selection) and the lane it writes to.", "q2t": "How it rides", "q2": "Target and threshold by hand or Auto, how far it may move, how much and how fast. It keeps natural phrase ends and tames loud consonants.", "q3t": "Before and after", "q3": "The level as it is, as it will be, and the Trim curve it is going to write.", "q4t": "Write it", "q4": "Write automation puts the curve on the track’s input Trim, so your fader stays free. Clear in range removes it; Undo takes it back."}, "es": {"help": "Guía rápida", "helpBtn": "Guía", "tNext": "Siguiente", "tBack": "Atrás", "tSkip": "Saltar", "tDone": "Entendido", "langT": "Elige tu idioma", "langX": "La guía y toda la ventana lo usarán. Puedes cambiarlo luego aquí, arriba a la derecha.", "zt": "Siempre a mano", "z": "Vuelve a esta guía cuando la necesites con el botón Guía.", "q1t": "Tu pista de voz", "q1": "Selecciona la pista de voz en LUNA. Elige dónde trabaja (la pista entera o una selección) y en qué carril escribe.", "q2t": "Cómo la nivela", "q2": "Objetivo y umbral a mano o en Auto, cuánto puede moverse, cuánto y a qué velocidad. Respeta los finales de frase y suaviza las consonantes fuertes.", "q3t": "Antes y después", "q3": "El nivel como está, como quedará y la curva de Trim que va a escribir.", "q4t": "Escríbela", "q4": "Escribir automatización pone la curva en el Trim de entrada de la pista, así tu fader queda libre. Borrar en el rango la quita; Deshacer la revierte."}, "ca": {"help": "Guia ràpida", "helpBtn": "Guia", "tNext": "Següent", "tBack": "Enrere", "tSkip": "Saltar", "tDone": "Entesos", "langT": "Tria el teu idioma", "langX": "La guia i tota la finestra el faran servir. El pots canviar després aquí, a dalt a la dreta.", "zt": "Sempre a mà", "z": "Torna a aquesta guia quan la necessitis amb el botó Guia.", "q1t": "La teva pista de veu", "q1": "Selecciona la pista de veu a LUNA. Tria on treballa (la pista sencera o una selecció) i en quin carril escriu.", "q2t": "Com l’anivella", "q2": "Objectiu i llindar a mà o en Auto, quant es pot moure, quant i a quina velocitat. Respecta els finals de frase i suavitza les consonants fortes.", "q3t": "Abans i després", "q3": "El nivell com és, com quedarà i la corba de Trim que escriurà.", "q4t": "Escriu-la", "q4": "Escriure l’automatització posa la corba al Trim d’entrada de la pista, així el fader queda lliure. Esborrar al rang la treu; Desfer la reverteix."}, "fr": {"help": "Guide rapide", "helpBtn": "Guide", "tNext": "Suivant", "tBack": "Retour", "tSkip": "Passer", "tDone": "Compris", "langT": "Choisissez votre langue", "langX": "Le guide et toute la fenêtre l’utiliseront. Vous pourrez la changer ici, en haut à droite.", "zt": "Toujours à portée", "z": "Rouvrez ce guide quand vous voulez avec le bouton Guide.", "q1t": "Votre piste de voix", "q1": "Sélectionnez la piste de voix dans LUNA. Choisissez où il agit (toute la piste ou une sélection) et la ligne où il écrit.", "q2t": "Comment il la nivelle", "q2": "Cible et seuil à la main ou en Auto, jusqu’où il peut bouger, combien et à quelle vitesse. Il respecte les fins de phrase et adoucit les consonnes fortes.", "q3t": "Avant et après", "q3": "Le niveau tel qu’il est, tel qu’il sera, et la courbe de Trim qu’il va écrire.", "q4t": "Écrivez-la", "q4": "Écrire l’automation pose la courbe sur le Trim d’entrée de la piste, votre fader reste libre. Effacer dans la zone la retire ; Annuler revient en arrière."}, "de": {"help": "Kurzanleitung", "helpBtn": "Anleitung", "tNext": "Weiter", "tBack": "Zurück", "tSkip": "Überspringen", "tDone": "Verstanden", "langT": "Wähle deine Sprache", "langX": "Die Anleitung und das ganze Fenster verwenden sie. Du kannst sie später hier oben rechts ändern.", "zt": "Immer zur Hand", "z": "Öffne diese Anleitung jederzeit wieder mit dem Button Anleitung.", "q1t": "Deine Gesangsspur", "q1": "Wähle in LUNA die Gesangsspur. Leg fest, wo es arbeitet (ganze Spur oder Auswahl) und in welche Lane es schreibt.", "q2t": "Wie es ausgleicht", "q2": "Ziel und Schwelle von Hand oder Auto, wie weit es sich bewegen darf, wie stark und wie schnell. Phrasenenden bleiben natürlich, laute Konsonanten werden gezähmt.", "q3t": "Vorher und nachher", "q3": "Der Pegel, wie er ist, wie er wird, und die Trim-Kurve, die geschrieben wird.", "q4t": "Schreiben", "q4": "Automation schreiben legt die Kurve auf den Eingangs-Trim der Spur, dein Fader bleibt frei. Im Bereich löschen entfernt sie; Rückgängig nimmt sie zurück."}, "it": {"help": "Guida rapida", "helpBtn": "Guida", "tNext": "Avanti", "tBack": "Indietro", "tSkip": "Salta", "tDone": "Capito", "langT": "Scegli la tua lingua", "langX": "La guida e tutta la finestra la useranno. Puoi cambiarla poi qui, in alto a destra.", "zt": "Sempre a portata di mano", "z": "Riapri questa guida quando ti serve con il pulsante Guida.", "q1t": "La tua traccia voce", "q1": "Seleziona la traccia voce in LUNA. Scegli dove lavora (tutta la traccia o una selezione) e su quale corsia scrive.", "q2t": "Come la livella", "q2": "Obiettivo e soglia a mano o in Auto, quanto può muoversi, quanto e con che velocità. Rispetta i finali di frase e ammorbidisce le consonanti forti.", "q3t": "Prima e dopo", "q3": "Il livello com’è, come sarà e la curva di Trim che scriverà.", "q4t": "Scrivila", "q4": "Scrivi automazione mette la curva sul Trim d’ingresso della traccia, così il fader resta libero. Cancella nell’intervallo la toglie; Annulla torna indietro."}, "pt": {"help": "Guia rápido", "helpBtn": "Guia", "tNext": "Seguinte", "tBack": "Voltar", "tSkip": "Saltar", "tDone": "Percebi", "langT": "Escolhe o teu idioma", "langX": "O guia e toda a janela vão usá-lo. Podes mudá-lo depois aqui, em cima à direita.", "zt": "Sempre à mão", "z": "Volta a este guia quando precisares com o botão Guia.", "q1t": "A tua faixa de voz", "q1": "Seleciona a faixa de voz no LUNA. Escolhe onde trabalha (a faixa toda ou uma seleção) e em que pista escreve.", "q2t": "Como a nivela", "q2": "Alvo e limiar à mão ou em Auto, quanto se pode mexer, quanto e a que velocidade. Respeita os finais de frase e suaviza as consoantes fortes.", "q3t": "Antes e depois", "q3": "O nível como está, como vai ficar e a curva de Trim que vai escrever.", "q4t": "Escreve-a", "q4": "Escrever automação põe a curva no Trim de entrada da faixa, assim o fader fica livre. Apagar no intervalo retira-a; Desfazer reverte."}})) Object.assign(I18N[c], v);
  let tour = null;
  let theme = store.get('theme') === 'grey' ? 'grey' : 'dark';
  let color = COLORS.includes(store.get('color')) ? store.get('color') : 'red';
  let statusTimer;
  const say = (key, vars = {}, kind = '', ms = 0) => { clearTimeout(statusTimer); $('status').textContent = key ? t(key, vars) : ''; $('status').className = `status ${kind}`; if (ms) statusTimer = setTimeout(() => say(null), ms); };
  const log = [];
  const note = (what, extra = {}) => { log.push({ t: new Date().toISOString().slice(11, 23), what, ...extra }); if (log.length > 200) log.shift(); };
  const errText = (e) => String(e?.message || e);
  const fmt = (v, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;

  const DEFAULTS = { span: 'sel', lane: 'trim', target: 'auto', targetDb: -18, threshold: 'auto', thresholdDb: -45, range: 6, amount: 100, speed: 'medium', peaks: 60, tails: 'keep' };
  const opts = { ...DEFAULTS, ...(store.get('opts') ?? {}) };
  const save = () => store.set('opts', opts);

  function knob(label, value, min, max, fmtv, onSet, def, step = 1) {
    const box = document.createElement('div'); box.className = 'knob';
    box.innerHTML = '<div class="kl"></div><svg viewBox="0 0 40 40"></svg><div class="kv"></div>';
    box.querySelector('.kl').textContent = label;
    const svg = box.querySelector('svg'), kv = box.querySelector('.kv');
    const pt = (deg, r) => { const rad = (deg - 90) * Math.PI / 180; return [20 + r * Math.cos(rad), 20 + r * Math.sin(rad)]; };
    const arc = (from, to) => { const [x1, y1] = pt(from, 15), [x2, y2] = pt(to, 15); return `M${x1.toFixed(2)} ${y1.toFixed(2)}A15 15 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`; };
    const paint = () => {
      const frac = (value - min) / (max - min || 1), a = -135 + frac * 270, [px, py] = pt(a, 10);
      svg.innerHTML = `<path d="${arc(-135, 135)}" class="ktrack"/>${frac > 0.003 ? `<path d="${arc(-135, a)}" class="kval"/>` : ''}<line x1="20" y1="20" x2="${px.toFixed(2)}" y2="${py.toFixed(2)}" class="kptr"/>`;
      kv.textContent = fmtv(value);
    };
    const set = (v, fin) => { v = Math.max(min, Math.min(max, Math.round(v / step) * step)); if (v === value && !fin) return; value = v; paint(); onSet(v, fin); };
    svg.onpointerdown = (ev) => {
      svg.setPointerCapture(ev.pointerId);
      const y0 = ev.clientY, v0 = value, span = max - min;
      svg.onpointermove = (e) => set(v0 + ((y0 - e.clientY) / (e.shiftKey ? 600 : 160)) * span, false);
      svg.onpointerup = () => { svg.onpointermove = null; svg.onpointerup = null; set(value, true); };
    };
    svg.onwheel = (ev) => { ev.preventDefault(); set(value + (ev.deltaY < 0 ? step : -step), true); };
    svg.ondblclick = () => set(def, true);
    paint();
    return box;
  }
  function seg(el, items, cur, onPick) {
    el.replaceChildren(...items.map(([v, label]) => {
      const b = Object.assign(document.createElement('button'), { textContent: label });
      b.classList.toggle('on', v === cur);
      b.onclick = () => { onPick(v); };
      return b;
    }));
    return el;
  }

  let recompute = () => {};
  let redraw = () => {};
  let relabel = () => {};
  let result = null;   // the last analysis

  function paintParams() {
    const box = $('params');
    const kids = [];
    const k = (label, value, min, max, f, key, def, step, autoKey) => {
      const kb = knob(label, value, min, max, f, (v, fin) => { opts[key] = v; if (autoKey) opts[autoKey] = 'manual'; if (fin) save(); recompute(); }, def, step);
      if (autoKey) {
        const auto = opts[autoKey] === 'auto';
        kb.classList.toggle('auto', auto);
        const ab = Object.assign(document.createElement('button'), { className: `ab${auto ? ' on' : ''}`, textContent: t('auto') });
        ab.onclick = () => { opts[autoKey] = auto ? 'manual' : 'auto'; save(); paintParams(); recompute(); };
        kb.append(ab);
        if (auto && result) kb.querySelector('.kv').textContent = `${fmt(autoKey === 'target' ? result.target : result.threshold)} dB`;
      }
      return kb;
    };
    const row1 = document.createElement('div'); row1.className = 'knobrow';
    row1.append(
      k(t('target'), opts.targetDb, -40, -6, (v) => `${fmt(v)} dB`, 'targetDb', -18, 0.5, 'target'),
      k(t('threshold'), opts.thresholdDb, -70, -20, (v) => `${fmt(v, 0)} dB`, 'thresholdDb', -45, 1, 'threshold'),
    );
    const row2 = row1;
    row2.append(
      k(t('range'), opts.range, 1, 18, (v) => `±${v} dB`, 'range', 6, 0.5),
      k(t('amount'), opts.amount, 0, 100, (v) => `${v}%`, 'amount', 100, 5),
      k(t('peaks'), opts.peaks, 0, 100, (v) => `${v}%`, 'peaks', 60, 5),
    );
    const sp = document.createElement('div'); sp.className = 'prow';
    sp.append(Object.assign(document.createElement('label'), { textContent: t('speed') }), seg(document.createElement('div'), [['slow', t('slow')], ['medium', t('medium')], ['fast', t('fast')]], opts.speed, (v) => { opts.speed = v; save(); paintParams(); recompute(); }));
    sp.lastChild.className = 'seg';
    const tl = document.createElement('div'); tl.className = 'prow';
    tl.append(Object.assign(document.createElement('label'), { textContent: t('tailsLbl') }), seg(document.createElement('div'), [['keep', t('tailsKeep')], ['ride', t('tailsRide')]], opts.tails, (v) => { opts.tails = v; save(); paintParams(); recompute(); }));
    tl.lastChild.className = 'seg';
    const stats = document.createElement('div'); stats.className = 'stats'; stats.id = 'stats';
    kids.push(row1, sp, tl, stats, Object.assign(document.createElement('div'), { className: 'hint', textContent: t('tHint') }));
    box.replaceChildren(...kids);
    paintStats();
  }
  function paintStats() {
    const el = $('stats');
    if (!el) return;
    if (!result) { el.innerHTML = ''; return; }
    const st = (label, val, big) => `<div class="stat${big ? ' big' : ''}"><b>${val}</b><span>${label}</span></div>`;
    el.innerHTML = st(t('spread'), `${result.spreadBefore.toFixed(1)} → ${result.spreadAfter.toFixed(1)} dB`, true)
      + st(t('rides'), `${fmt(result.minG)} / ${fmt(result.maxG)} dB`)
      + st(t('active'), `${Math.round(result.active * 100)}%`)
      + st(t('points'), String(result.points?.length ?? 0));
  }

  const closeColors = () => { $('colorMenu').hidden = true; $('colorBtn').classList.remove('open'); };
  function paintStatic() {
    document.documentElement.lang = lang;
    $('help').title = t('help'); $('help').setAttribute('aria-label', t('help')); { const q = document.createElement('b'); q.textContent = '?'; const sp = document.createElement('span'); sp.textContent = t('helpBtn'); $('help').replaceChildren(q, sp); }
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.color = color;
    $('ver').textContent = `v${VERSION}`;
    $('lang').replaceChildren(...Object.keys(I18N).map((c) => Object.assign(document.createElement('option'), { value: c, textContent: I18N[c]._name })));
    $('lang').value = lang;
    for (const [id, name] of [['tDark', 'dark'], ['tGrey', 'grey']]) { $(id).classList.toggle('on', theme === name); $(id).title = t(name); }
    $('colorBtn').title = t('color');
    $('colorMenu').replaceChildren(...COLORS.map((c) => {
      const b = document.createElement('button');
      b.className = c === color ? 'on' : '';
      b.innerHTML = `<i class="sw" data-color="${c}" data-theme="${theme}"></i><span></span><svg viewBox="0 0 12 12"><path d="M2.5 6.5L5 9L9.5 3.5"/></svg>`;
      b.querySelector('span').textContent = t(`c${c[0].toUpperCase()}${c.slice(1)}`);
      b.onclick = () => { color = c; store.set('color', c); closeColors(); paintStatic(); };
      return b;
    }));
    $('spanLbl').textContent = t('spanLbl'); $('laneLbl').textContent = t('laneLbl');
    seg($('span'), [['sel', t('spanSel')], ['all', t('spanAll')]], opts.span, (v) => { opts.span = v; save(); paintStatic(); relabel(); });
    seg($('lane'), [['trim', t('trim')], ['volume', t('volume')]], opts.lane, (v) => { opts.lane = v; save(); paintStatic(); });
    $('write').textContent = t('write'); $('clear').textContent = t('clear'); $('undo').textContent = t('undo');
    $('lBefore').textContent = t('before'); $('lAfter').textContent = t('after'); $('lGain').textContent = t('gain');
    $('pTitle').textContent = t('preview');
    paintParams(); redraw(); relabel();
  }
  $('lang').onchange = () => { lang = $('lang').value; store.set('lang', lang); paintStatic(); };
  for (const b of [$('tDark'), $('tGrey')]) b.onclick = () => { theme = b.dataset.t; store.set('theme', theme); paintStatic(); };
  $('colorBtn').onclick = (ev) => { ev.stopPropagation(); const open = $('colorMenu').hidden; $('colorMenu').hidden = !open; $('colorBtn').classList.toggle('open', open); };
  document.addEventListener('mousedown', (ev) => { if (!ev.target.closest?.('.colors')) closeColors(); });
  paintStatic();

  let luna, built;
  async function build() {
    const s = luna.sessions.current();
    if (s === built) return;
    built = s;
    if (!s) { say('noSession'); return; }
    await s.ready();
    if (s !== built) return;
    await s.musical.ready().catch(() => undefined);
    say(null);
    const ctx = s.context, tl = s.musical.timeline;
    const cache = new Luna.Waveforms({ maxPages: 1024 });
    const MS = 5;   // one analysis point every 5 ms
    let busy = false, undoSteps = 0;
    let data = null;   // { key, track, S, E, ticks: Float64Array, peaks: (number|null)[] }

    const isAudio = (x) => x && x.trackType?.value === 'audio';
    const track = () => {
      const ids = [...(ctx.selectionTracks.value ?? []), ctx.lastSelectedTrack.value].filter(Boolean);
      for (const id of ids) { const tk = s.tracks.byId(id); if (isAudio(tk)) return tk; }
      return null;
    };
    const barOf = (tick) => { try { return tl.barBeat(tick).bar; } catch { return 1; } };
    async function segmentsOf(tk) {
      const lane = s.playlistFor(tk);
      if (!lane) return { lane: null, segs: [] };
      await lane.clips.load();
      await lane.compiledClips.load?.().catch(() => undefined);
      const segs = (lane.compiledClips?.inOrder?.() ?? []).filter((g) => g.stop?.value > g.start?.value);
      return { lane, segs };
    }
    async function span(tk) {
      const { lane, segs } = await segmentsOf(tk);
      const S0 = ctx.selectionStart.value, E0 = ctx.selectionStop.value;
      const all = segs.length ? { S: Math.min(...segs.map((g) => g.start.value)), E: Math.max(...segs.map((g) => g.stop.value)) } : null;
      if (opts.span === 'sel' && typeof S0 === 'number' && typeof E0 === 'number' && E0 > S0) return { S: S0, E: E0, lane, segs, how: 'sel' };
      return all ? { ...all, lane, segs, how: 'all' } : { S: 0, E: 0, lane, segs, how: 'all' };
    }

    // ---- Reading the audio ------------------------------------------------------------------------------
    // An even grid of points in seconds over the span; each takes the loudest overview pair under it,
    // scaled by its clip's gain. Where no clip plays the point is null (silence, not quiet audio).
    async function read() {
      const tk = track();
      if (!tk) { data = null; return; }
      const sp = await span(tk);
      const key = `${tk.id}:${sp.S}:${sp.E}:${sp.segs.map((g) => `${g.clipUid?.value}@${g.start.value}-${g.stop.value}`).join(',')}`;
      if (data?.key === key) return;
      const segsIn = sp.segs.filter((g) => g.stop.value > sp.S && g.start.value < sp.E);
      if (!segsIn.length || sp.E <= sp.S) { data = { key, track: tk, S: sp.S, E: sp.E, ticks: new Float64Array(0), peaks: [], clips: 0 }; return; }
      say('analysing');
      await s.sources?.load?.().catch(() => undefined);
      const t0 = tl.seconds(sp.S), t1 = tl.seconds(sp.E);
      const n = Math.max(2, Math.min(400000, Math.round(((t1 - t0) * 1000) / MS)));
      const ticks = new Float64Array(n), peaks = new Array(n).fill(null);
      for (let i = 0; i < n; i++) ticks[i] = tl.tickAtSeconds(t0 + (i * MS) / 1000);
      let missing = 0;
      for (const g of segsIn) {
        const clip = sp.lane.clips.byId(g.clipUid.value);
        const audio = clip && Luna.compiledClipAudio(tl, g, clip, s.sources);
        if (!audio) { missing++; continue; }
        const a = Math.max(sp.S, g.start.value), b = Math.min(sp.E, g.stop.value);
        let nsA = Luna.audioNsAtTick(tl, g, audio, a), nsB = Luna.audioNsAtTick(tl, g, audio, b);
        nsA = Math.max(audio.startNs, nsA); nsB = Math.min(audio.stopNs, nsB);
        if (nsB <= nsA) continue;
        let range;
        try { range = await cache.range(audio.source, nsA, nsB, 'fine'); } catch (e) { note('overview', { e: errText(e) }); missing++; continue; }
        if (!range?.count) { missing++; continue; }
        const lin = 10 ** ((Number(clip.gain?.value) || 0) / 20);
        const per = Math.max(1, Math.round((MS * 1e6) / range.pairNs));
        for (let i = 0; i < n; i++) {
          if (ticks[i] < a || ticks[i] >= b) continue;
          const ns = Luna.audioNsAtTick(tl, g, audio, ticks[i]);
          const p0 = Math.floor(ns / range.pairNs) - range.index;
          let pk = 0;
          for (let p = p0; p < p0 + per; p++) {
            if (p < 0 || p >= range.count) continue;
            for (const ch of range.channels) pk = Math.max(pk, Math.abs(ch.min[p]), Math.abs(ch.max[p]));
          }
          peaks[i] = pk * lin;
        }
      }
      data = { key, track: tk, S: sp.S, E: sp.E, ticks, peaks, clips: segsIn.length };
      note('read', { track: tk.name.value, n, clips: segsIn.length, missing });
      if (missing && missing === segsIn.length) say('noOverview', {}, 'bad', 6000); else say(null);
    }

    recompute = () => {
      if (!data || !data.peaks.length) { result = null; paintStats(); redraw(); $('write').disabled = true; return; }
      const o = { target: opts.target === 'auto' ? 'auto' : opts.targetDb, threshold: opts.threshold === 'auto' ? 'auto' : opts.thresholdDb, range: opts.range, amount: opts.amount, speed: opts.speed, peaks: opts.peaks, tails: opts.tails !== 'ride' };
      result = R.analyse(data.peaks, MS, o);
      // Thin the ride out to the points the curve needs (0.25 dB tolerance), and always keep the ends.
      const xs = Array.from(data.ticks), ys = Array.from(result.gain);
      result.points = R.simplify(xs, ys, 0.25).map(([tick, v]) => ({ tick: Math.round(tick), db: v }));
      paintStats(); redraw();
      if (opts.target === 'auto' || opts.threshold === 'auto') for (const kb of document.querySelectorAll('.knob.auto .kv')) {
        const lbl = kb.parentElement.querySelector('.kl').textContent;
        kb.textContent = `${fmt(lbl === t('target') ? result.target : result.threshold, lbl === t('target') ? 1 : 0)} dB`;
      }
      $('write').disabled = busy || !result.points.length;
    };

    // ---- Drawing -------------------------------------------------------------------------------------------
    redraw = () => {
      const svg = $('roll');
      const W = Math.max(200, svg.clientWidth || 600), H = Math.max(160, svg.clientHeight || 300);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      if (!data || !data.peaks.length || !result) { svg.innerHTML = `<text class="empty" x="${W / 2}" y="${H / 2}">${t(track() ? 'noClips' : 'noTrack')}</text>`; return; }
      const n = data.peaks.length;
      const top = H * 0.64, gTop = top + 10, gH = H - gTop - 4;
      const X = (i) => (i / (n - 1)) * W;
      const LO = -60, HI = 0;
      const Y = (v) => 4 + (1 - (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO)) * (top - 8);
      const rg = Math.max(3, opts.range);
      const GY = (g) => gTop + gH / 2 - (g / rg) * (gH / 2);
      const parts = [];
      // Bars.
      for (let b = barOf(data.S); ; b++) {
        let tk; try { tk = tl.tickAtBar(b); } catch { break; }
        if (tk > data.E || parts.length > 400) break;
        if (tk < data.S) continue;
        const i = ((tl.seconds(tk) - tl.seconds(data.S)) * 1000) / MS;
        parts.push(`<line class="bl" x1="${X(i).toFixed(1)}" x2="${X(i).toFixed(1)}" y1="0" y2="${H}"/>`);
      }
      for (const v of [-12, -24, -36, -48]) parts.push(`<line class="gl" x1="0" x2="${W}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="lbl" x="4" y="${(Y(v) - 2).toFixed(1)}">${v}</text>`);
      // Voice regions.
      for (let i = 0; i < n;) { if (!result.on[i]) { i++; continue; } let j = i; while (j < n && result.on[j]) j++; parts.push(`<rect class="act" x="${X(i).toFixed(1)}" y="0" width="${Math.max(1, X(j) - X(i)).toFixed(1)}" height="${top}"/>`); i = j; }
      // Columns: one per pixel, the max level inside it.
      const cols = Math.min(n, Math.round(W));
      const colMax = (arr, c) => { const a = Math.floor((c * n) / cols), b = Math.max(a + 1, Math.floor(((c + 1) * n) / cols)); let m = -120; for (let i = a; i < b; i++) m = Math.max(m, arr[i]); return m; };
      let d = `M0 ${Y(LO).toFixed(1)}`;
      for (let c = 0; c < cols; c++) d += `L${((c / cols) * W).toFixed(1)} ${Y(colMax(result.lev, c)).toFixed(1)}`;
      parts.push(`<path class="before" d="${d}L${W} ${Y(LO).toFixed(1)}Z"/>`);
      let d2 = '', pen = false;
      for (let c = 0; c < cols; c++) { const v = colMax(result.after, c); if (v <= -100) { pen = false; continue; } d2 += `${pen ? 'L' : 'M'}${((c / cols) * W).toFixed(1)} ${Y(v).toFixed(1)}`; pen = true; }
      parts.push(`<path class="after" d="${d2}"/>`);
      parts.push(`<line class="tgt" x1="0" x2="${W}" y1="${Y(result.target).toFixed(1)}" y2="${Y(result.target).toFixed(1)}"/><line class="thr" x1="0" x2="${W}" y1="${Y(result.threshold).toFixed(1)}" y2="${Y(result.threshold).toFixed(1)}"/>`);
      // The ride underneath.
      parts.push(`<line class="zero" x1="0" x2="${W}" y1="${GY(0).toFixed(1)}" y2="${GY(0).toFixed(1)}"/>`);
      let g = '';
      for (let c = 0; c < cols; c++) { const i = Math.min(n - 1, Math.floor(((c + 0.5) * n) / cols)); g += `${g ? 'L' : 'M'}${((c / cols) * W).toFixed(1)} ${GY(result.gain[i]).toFixed(1)}`; }
      parts.push(`<path class="gfill" d="${g}L${W} ${GY(0).toFixed(1)}L0 ${GY(0).toFixed(1)}Z"/><path class="gain" d="${g}"/><text class="lbl" x="4" y="${(gTop + 9).toFixed(1)}">+${rg}</text><text class="lbl" x="4" y="${(gTop + gH - 2).toFixed(1)}">−${rg}</text>`);
      svg.innerHTML = parts.join('');
    };
    new ResizeObserver(() => redraw()).observe($('roll'));

    relabel = () => {
      const tk = track();
      $('target').classList.toggle('has', !!tk);
      if (!tk) { $('tMain').textContent = t('noTrack'); $('tSub').textContent = t('noTrackSub'); }
      else if (data && data.track === tk) {
        $('tMain').textContent = tk.name.value;
        $('tSub').textContent = data.clips ? t(opts.span === 'sel' && data.S !== undefined && ctx.selectionStop.value > ctx.selectionStart.value ? 'rangeSel' : 'rangeAll', { a: barOf(data.S), b: barOf(Math.max(data.S, data.E - 1)), n: data.clips }) : t('noClips');
      } else { $('tMain').textContent = tk.name.value; $('tSub').textContent = ''; }
      $('undo').disabled = busy || !undoSteps;
      $('clear').disabled = busy || !tk;
    };

    // ---- Writing ------------------------------------------------------------------------------------------
    // The lanes to write. LUNA's "Trim" lane is the track's input trim (<track>/controls/input_trim_*,
    // one for a mono track, left and right for a stereo one), not the output's gain_trim, whose
    // automation LUNA cannot play (it asserts in SetFromDB).
    const TRIM_IDS = ['input_trim_mono', 'input_trim_left', 'input_trim_right'];
    async function controlsFor(tk) {
      if (opts.lane !== 'trim') { const g = tk.main?.controls?.byId?.('gain') ?? tk.gain; return g ? [g] : []; }
      await tk.controls?.load?.().catch(() => undefined);
      const have = new Set((tk.controls?.items ?? []).map((x) => x.id));
      const ids = have.has('input_trim_left') ? ['input_trim_left', 'input_trim_right'] : ['input_trim_mono'];
      return ids.filter((id) => have.has(id) || !have.size).map((id) => tk.controls.byId?.(id) ?? tk.controls.get(id)).filter(Boolean);
    }
    // A gain-type control's automation stores dB (its native value). LUNA asserts on a value outside
    // the control's fader taper, so every point is clamped to that taper's range; when the rides would
    // pass its top they are all shifted down by the excess, so their shape is kept.
    const taperOf = (c) => c.taper?.value ?? Luna.Taper.named(opts.lane === 'trim' ? '+18' : '+12') ?? null;
    const dbPoints = (c, base) => {
      const tp = taperOf(c);
      const top = tp ? tp.maxDb - 0.05 : 12, bottom = tp ? Math.max(tp.minDb + 1, -96) : -96;
      const peak = Math.max(...result.points.map((p) => base + p.db));
      const shift = peak > top ? top - peak : 0;
      const pts = result.points.map((p) => ({ tick: Math.round(p.tick), value: Math.min(top, Math.max(bottom, +(base + p.db + shift).toFixed(3))) }));
      return { pts, shift, taper: tp?.name ?? null, top, bottom };
    };
    async function write() {
      if (busy || !result?.points?.length || !data) return;
      const tk = data.track;
      const cs = await controlsFor(tk);
      if (!cs.length) { say('failed', { e: opts.lane === 'trim' ? 'input trim not found (Alt-click v' + VERSION + ')' : 'no control' }, 'bad', 8000); return; }
      const c = cs[0];
      busy = true; relabel(); say('working');
      try {
        await tk.controls.load().catch(() => undefined);
        const base = Number.isFinite(Number(c.real.value)) ? Number(c.real.value) : 0;   // on top of the trim / fader as it is now
        const { pts, shift, taper, top } = dbPoints(c, base);
        for (const x of cs) { await x.automation.load?.(); await x.automation.insert(pts, { startTick: data.S, stopTick: data.E }); }
        undoSteps = cs.length;
        if (tk.automationMode?.value && tk.automationMode.value !== 'read') { await tk.setAutomationMode('read').catch(() => undefined); undoSteps++; }
        note('write', { lane: opts.lane, controls: cs.map((x) => x.id), points: pts.length, base, taper, top, shift, opts });
        if (shift < -0.05) say('shifted', { n: pts.length, lane: t(opts.lane), db: Math.abs(shift).toFixed(1) }, 'ok', 8000);
        else say('written', { n: pts.length, lane: t(opts.lane), track: tk.name.value }, 'ok', 5000);
      } catch (e) { note('write failed', { e: errText(e) }); say('failed', { e: errText(e) }, 'bad', 8000); }
      busy = false; relabel(); recompute();
    }
    $('write').onclick = () => void write();
    $('clear').onclick = async () => {
      const tk = track(); if (!tk || busy) return;
      const cs = await controlsFor(tk); if (!cs.length) return;
      const sp = await span(tk);
      try { for (const c of cs) { await c.automation.load?.(); await c.automation.clear(sp.S, sp.E); } undoSteps = cs.length; say('cleared', {}, 'ok', 4000); } catch (e) { say('failed', { e: errText(e) }, 'bad', 6000); }
      relabel();
    };
    $('undo').onclick = async () => {
      if (!undoSteps || busy) return;
      try { await s.undo(undoSteps); undoSteps = 0; say('undone', {}, 'ok', 3000); } catch (e) { say('failed', { e: errText(e) }, 'bad', 6000); }
      relabel();
    };
    $('ver').onclick = async (ev) => {
      if (!ev.altKey) return;
      const tk = track();
      const c = tk ? (await controlsFor(tk))[0] : null;
      // What each gain lane holds, raw, so a point drawn by hand in LUNA shows the units it stores.
      const lanes = {};
      await tk?.controls?.load?.().catch(() => undefined);
      for (const id of [...TRIM_IDS, 'gain_trim', 'gain']) {
        const x = TRIM_IDS.includes(id) ? tk?.controls?.byId?.(id) : tk?.main?.controls?.byId?.(id);
        if (!x) { lanes[id] = null; continue; }
        try { await x.automation.load?.(); } catch { /* nothing */ }
        lanes[id] = { type: x.property?.('control_type')?.value ?? null, automatable: x.automatable?.value ?? null, taper: x.taper?.value?.name ?? null, minDb: x.taper?.value?.minDb ?? null, maxDb: x.taper?.value?.maxDb ?? null,
          real: x.real?.value ?? null, value: x.value?.value ?? null, normalized: x.normalized?.value ?? null,
          points: (x.automation?.breakpoints ?? []).slice(0, 12).map((p) => [+(p.tick / Luna.TICKS_PER_BEAT).toFixed(2), p.value]) };
      }
      const trimMode = tk?.property?.('trim_mode')?.value ?? null;
      const text = JSON.stringify({ version: VERSION, lanes, trimMode, opts, track: tk?.name.value, control: c ? { id: c.id, real: c.real.value, value: c.value.value, taper: c.taper?.value?.name ?? null, maxDb: c.taper?.value?.maxDb ?? null } : null, controls: tk ? (tk.main?.controls?.items ?? []).map((x) => x.id) : [], trackControls: tk ? (tk.controls?.items ?? []).map((x) => x.id) : [], data: data && { S: data.S, E: data.E, n: data.peaks.length, clips: data.clips, nulls: data.peaks.filter((p) => p == null).length }, result: result && { target: result.target, threshold: result.threshold, active: result.active, minG: result.minG, maxG: result.maxG, points: result.points.length }, log }, null, 2);
      try { await navigator.clipboard.writeText(text); say('report', {}, 'ok', 2500); } catch { /* nothing */ }
    };

    let gen = 0;
    async function refresh() {
      const my = ++gen;
      try { await read(); } catch (e) { note('read failed', { e: errText(e) }); say('failed', { e: errText(e) }, 'bad', 6000); data = null; }
      if (my !== gen) return;
      relabel(); recompute();
    }
    let timer;
    const later = () => { clearTimeout(timer); timer = setTimeout(() => void refresh(), 250); };
    for (const p of [ctx.selectionStart, ctx.selectionStop, ctx.selectionTracks, ctx.lastSelectedTrack]) p?.onChange?.(later);
    document.getElementById('span').addEventListener('click', later);
    window.addEventListener('focus', later);
    await refresh();
  }

  (async () => {
    for (;;) {
      try { luna = await Luna.connect(); break; }
      catch { say('waiting'); await new Promise((r) => setTimeout(r, 1500)); }
    }
    Luna.bindShortcuts(luna, { onError: () => undefined });
    await luna.sessions.ready();
    luna.sessions.focused.onChange(() => void build());
    await build();
    tour ??= window.AddOnTour?.attach({
      button: $('help'), key: `${KEY}tourSeen`,
      labels: () => ({ next: t('tNext'), back: t('tBack'), skip: t('tSkip'), done: t('tDone') }),
      language: {
        sel: '#lang',
        list: () => Object.keys(I18N).map((c) => [c, I18N[c]._name]),
        current: () => lang,
        set: (c) => { $('lang').value = c; $('lang').dispatchEvent(new Event('change')); },
        title: () => t('langT'), text: () => t('langX'),
      },
      steps: () => [
        { sel: '#target', title: () => t('q1t'), text: () => t('q1') },
        { sel: '#params', title: () => t('q2t'), text: () => t('q2') },
        { sel: '#preview', title: () => t('q3t'), text: () => t('q3') },
        { sel: '.actions', title: () => t('q4t'), text: () => t('q4') },
        { sel: '#help', title: () => t('zt'), text: () => t('z') },
      ],
    });
  })();
})();
