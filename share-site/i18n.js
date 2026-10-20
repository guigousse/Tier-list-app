// The site's language: the one forced by ?lang=xx, else the browser's first language if it is
// one of the app's four, else English (same rule as pickLanguage, src/lib/i18n/index.ts).
// The HTML stays written in French, readable without JavaScript: this script replaces it before
// the animations split the headings into words, hence its synchronous load at the end of <body>.
//   data-i18n="key"                   → the element's content (HTML allowed: <b>, <br>, <span>)
//   data-i18n-attr="alt:key;href:key" → attributes
// Texts written by scripts go through TC_I18N.t(key, { name: value }).
(function () {
  var LANGS = ['fr', 'en', 'es', 'el'];

  // French is only written here for texts produced by JavaScript (the others are in the HTML).
  // Wording: docs/i18n-glossaire.md and the app's own labels.
  var D = {
    // Shared: header, footer.
    'nav.download': { en: 'Download', es: 'Descargar', el: 'Λήψη' },
    'nav.home': { en: 'Home', es: 'Inicio', el: 'Αρχική' },
    'nav.support': { en: 'Support', es: 'Soporte', el: 'Υποστήριξη' },
    'nav.privacy': { en: 'Privacy', es: 'Privacidad', el: 'Απόρρητο' },
    'nav.contact': { en: 'Contact', es: 'Contacto', el: 'Επικοινωνία' },
    // One static privacy policy per language (scripts/build-site-legal.ts).
    'link.privacy': { fr: '/confidentialite', en: '/privacy', es: '/privacidad', el: '/aporrito' },

    // Home page (index.html).
    'index.title': { en: 'Tiercraft · Rank everything, from S to D', es: 'Tiercraft · Clasifícalo todo, de S a D', el: 'Tiercraft · Κατατάξτε τα πάντα, από S έως D' },
    'index.description': {
      en: 'Tiercraft: a tier list to fill in every day, lists created by AI from a single theme, and your friends to compare rankings with. Free on iPhone.',
      es: 'Tiercraft: una tier list para completar cada día, listas creadas por la IA a partir de un tema y tus amigos para comparar clasificaciones. Gratis en iPhone.',
      el: 'Tiercraft: μια tier list να συμπληρώνετε κάθε μέρα, λίστες που δημιουργεί η ΤΝ από ένα θέμα και οι φίλοι σας για να συγκρίνετε κατατάξεις. Δωρεάν στο iPhone.',
    },
    'index.ogDescription': {
      en: 'A tier list every day, lists created by AI, and your friends to compare tastes with.',
      es: 'Una tier list cada día, listas creadas por la IA y tus amigos para comparar gustos.',
      el: 'Μια tier list κάθε μέρα, λίστες από την ΤΝ και οι φίλοι σας για να συγκρίνετε γούστα.',
    },
    'index.free': { en: 'Free on iPhone', es: 'Gratis en iPhone', el: 'Δωρεάν στο iPhone' },
    'index.h1': {
      en: 'Rank everything,<br><span class="rainbow">from S to D.</span>',
      es: 'Clasifícalo todo,<br><span class="rainbow">de S a D.</span>',
      el: 'Κατατάξτε τα πάντα,<br><span class="rainbow">από S έως D.</span>',
    },
    'index.lead': {
      en: 'Pizza or fondue? Paris or Biarritz? A tier list to fill in every day, AI to create your own, and your friends to compare tastes with.',
      es: '¿Pizza o fondue? ¿París o Biarritz? Una tier list para completar cada día, la IA para crear las tuyas y tus amigos para comparar gustos.',
      el: 'Πίτσα ή φοντί; Παρίσι ή Μπιαρίτς; Μια tier list να συμπληρώνετε κάθε μέρα, η ΤΝ για να δημιουργείτε τις δικές σας και οι φίλοι σας για να συγκρίνετε γούστα.',
    },
    'index.cta': { en: 'Download on the App Store', es: 'Descargar en la App Store', el: 'Λήψη από το App Store' },
    'index.badge.daily': { en: '🎯 One list a day', es: '🎯 Una lista al día', el: '🎯 Μία λίστα τη μέρα' },
    'index.badge.ai': { en: '✨ Made by AI', es: '✨ Creada por IA', el: '✨ Από την ΤΝ' },
    'index.badge.friends': { en: '👥 With friends', es: '👥 Entre amigos', el: '👥 Με φίλους' },
    'demo.head': {
      en: 'French dishes <span id="count">0 / 6</span>',
      es: 'Platos franceses <span id="count">0 / 6</span>',
      el: 'Γαλλικά πιάτα <span id="count">0 / 6</span>',
    },
    'demo.tray': {
      en: 'To rank <span>Drag or tap a card</span>',
      es: 'Por clasificar <span>Arrastra o toca una carta</span>',
      el: 'Προς κατάταξη <span>Σύρετε ή πατήστε μια κάρτα</span>',
    },
    'demo.done': {
      en: 'Ranking complete!<span>In the app, find out whether other players agree.</span>',
      es: '¡Clasificación terminada!<span>En la app, descubre si los demás jugadores están de acuerdo.</span>',
      el: 'Η κατάταξη ολοκληρώθηκε!<span>Στην εφαρμογή, μάθετε αν συμφωνούν οι άλλοι παίκτες.</span>',
    },
    'demo.try': { en: 'Your turn: it’s a real tier list, try it.', es: 'Te toca: es una tier list de verdad, pruébala.', el: 'Σειρά σας: είναι αληθινή tier list, δοκιμάστε την.' },
    'card.fondue': { fr: 'Fondue', en: 'Fondue', es: 'Fondue', el: 'Φοντί' },
    'card.pizza': { fr: 'Pizza', en: 'Pizza', es: 'Pizza', el: 'Πίτσα' },
    'card.croque': { fr: 'Croque', en: 'Croque', es: 'Croque', el: 'Κροκ' },
    'card.ratatouille': { fr: 'Ratatouille', en: 'Ratatouille', es: 'Ratatouille', el: 'Ρατατούι' },
    'card.escargots': { fr: 'Escargots', en: 'Snails', es: 'Caracoles', el: 'Σαλιγκάρια' },
    'card.moules': { fr: 'Moules-frites', en: 'Mussels', es: 'Mejillones', el: 'Μύδια' },

    'index.daily.eyebrow': { en: 'Tier lists to fill in', es: 'Tier lists para completar', el: 'Tier lists για συμπλήρωση' },
    'index.daily.h2': {
      en: 'A new challenge <span class="rainbow">every day.</span>',
      es: 'Un nuevo reto <span class="rainbow">cada día.</span>',
      el: 'Μια νέα πρόκληση <span class="rainbow">κάθε μέρα.</span>',
    },
    'index.daily.lead': {
      en: 'Every morning, a new tier list is waiting for you. Rank, submit, and see the average ranking of all players.',
      es: 'Cada mañana te espera una nueva tier list. Clasifica, envía y descubre la clasificación media de todos los jugadores.',
      el: 'Κάθε πρωί σας περιμένει μια νέα tier list. Κατατάξτε, υποβάλετε και δείτε τη μέση κατάταξη όλων των παικτών.',
    },
    'index.daily.p1': {
      en: '<b>The daily tier list</b>: how close you are to other players, and your most original picks.',
      es: '<b>La tier list del día</b>: tu puntuación de cercanía con los demás jugadores y tus elecciones más originales.',
      el: '<b>Η tier list της ημέρας</b>: πόσο κοντά είστε στους άλλους παίκτες και οι πιο πρωτότυπες επιλογές σας.',
    },
    'index.daily.p2': {
      en: '<b>Over twenty public lists</b>: fruits, movies, mobile games, destinations, cheeses…',
      es: '<b>Más de veinte listas públicas</b>: frutas, películas, juegos móviles, destinos, quesos…',
      el: '<b>Πάνω από είκοσι δημόσιες λίστες</b>: φρούτα, ταινίες, παιχνίδια για κινητά, προορισμοί, τυριά…',
    },
    'index.daily.p3': {
      en: '<b>Change your mind anytime</b>: re-rank and submit again.',
      es: '<b>Cambia de opinión cuando quieras</b>: vuelve a clasificar y a enviar.',
      el: '<b>Αλλάξτε γνώμη όποτε θέλετε</b>: κατατάξτε ξανά, υποβάλετε ξανά.',
    },
    // In capitals: Greek drops its accents there.
    'index.daily.tag': { en: 'DAILY TIER LIST', es: 'TIER LIST DEL DÍA', el: 'TIER LIST ΤΗΣ ΗΜΕΡΑΣ' },
    'index.daily.theme': { en: 'Superheroes', es: 'Superhéroes', el: 'Υπερήρωες' },
    'index.daily.streak': {
      en: '<span class="flame">🔥</span> 12-day streak',
      es: '<span class="flame">🔥</span> Racha de 12 días',
      el: '<span class="flame">🔥</span> Σερί 12 ημερών',
    },
    'index.list.pizza': { en: 'Pizza toppings', es: 'Ingredientes de pizza', el: 'Υλικά πίτσας' },
    'index.list.movies': { en: 'Movie genres', es: 'Géneros de cine', el: 'Είδη ταινιών' },
    'index.list.fruits': { en: 'Fruits', es: 'Frutas', el: 'Φρούτα' },
    'index.list.destinations': { en: 'Destinations', es: 'Destinos', el: 'Προορισμοί' },
    'index.list.games': { en: 'Mobile games', es: 'Juegos móviles', el: 'Παιχνίδια για κινητά' },
    'index.list.cheeses': { en: 'Cheeses', es: 'Quesos', el: 'Τυριά' },
    'index.list.cards12': { en: '12 cards', es: '12 cartas', el: '12 κάρτες' },
    'index.list.cards15': { en: '15 cards', es: '15 cartas', el: '15 κάρτες' },

    'index.ai.eyebrow': { en: 'Create with AI', es: 'Crea con IA', el: 'Δημιουργήστε με ΤΝ' },
    'index.ai.h2': {
      en: 'One theme is enough.<br><span class="ai-text">AI does the rest.</span>',
      es: 'Basta con un tema.<br><span class="ai-text">La IA hace el resto.</span>',
      el: 'Αρκεί ένα θέμα.<br><span class="ai-text">Η ΤΝ κάνει τα υπόλοιπα.</span>',
    },
    'index.ai.lead': {
      en: 'Type an idea: the AI dreams up the cards, draws them in the game’s style and names your tiers. All that’s left is to rank.',
      es: 'Escribe una idea: la IA imagina las cartas, las dibuja con el estilo del juego y bautiza tus niveles. Solo te queda clasificar.',
      el: 'Πληκτρολογήστε μια ιδέα: η ΤΝ φαντάζεται τις κάρτες, τις σχεδιάζει στο στυλ του παιχνιδιού και ονομάζει τα επίπεδά σας. Το μόνο που μένει είναι να κατατάξετε.',
    },
    'index.ai.p1': {
      en: '<b>The cards</b>, found for your theme and checked before they’re added.',
      es: '<b>Las cartas</b>, encontradas para tu tema y revisadas antes de añadirse.',
      el: '<b>Οι κάρτες</b>, που βρίσκονται για το θέμα σας και ελέγχονται πριν προστεθούν.',
    },
    'index.ai.p2': {
      en: '<b>The illustrations</b>, all drawn in the same style.',
      es: '<b>Las ilustraciones</b>, todas dibujadas con el mismo estilo.',
      el: '<b>Οι εικονογραφήσεις</b>, όλες σχεδιασμένες στο ίδιο στυλ.',
    },
    'index.ai.p3': {
      en: '<b>The tier names</b>, in the tone you choose.',
      es: '<b>Los nombres de los niveles</b>, con el tono que elijas.',
      el: '<b>Τα ονόματα των επιπέδων</b>, με τον τόνο που επιλέγετε.',
    },
    'index.ai.energy': { en: 'Free energy to get started', es: 'Energía gratis para empezar', el: 'Δωρεάν ενέργεια για να ξεκινήσετε' },
    'index.ai.thinking': {
      en: 'The AI is dreaming up your cards<i></i><i></i><i></i>',
      es: 'La IA está imaginando tus cartas<i></i><i></i><i></i>',
      el: 'Η ΤΝ φαντάζεται τις κάρτες σας<i></i><i></i><i></i>',
    },
    'index.ai.rankS': { en: 'I’d move there tomorrow', es: 'Me mudo mañana', el: 'Μετακομίζω αύριο' },
    'index.ai.rankA': { en: 'Love it', es: 'Me encanta', el: 'Αγαπημένη' },
    'index.ai.rankB': { en: 'For a weekend', es: 'Para un finde', el: 'Για Σαββατοκύριακο' },
    'index.ai.rankC': { en: 'Why not', es: 'Por qué no', el: 'Γιατί όχι' },
    'index.ai.rankD': { en: 'Meh', es: 'Psé', el: 'Μέτρια' },
    'demo.aiTheme': { fr: 'Villes de France', en: 'Cities in France', es: 'Ciudades de Francia', el: 'Πόλεις της Γαλλίας' },
    'city.paris': { fr: 'Paris', en: 'Paris', es: 'París', el: 'Παρίσι' },
    'city.lyon': { fr: 'Lyon', en: 'Lyon', es: 'Lyon', el: 'Λυών' },
    'city.nice': { fr: 'Nice', en: 'Nice', es: 'Niza', el: 'Νίκαια' },
    'city.brest': { fr: 'Brest', en: 'Brest', es: 'Brest', el: 'Βρέστη' },
    'city.dijon': { fr: 'Dijon', en: 'Dijon', es: 'Dijon', el: 'Ντιζόν' },
    'city.lille': { fr: 'Lille', en: 'Lille', es: 'Lille', el: 'Λιλ' },
    'city.annecy': { fr: 'Annecy', en: 'Annecy', es: 'Annecy', el: 'Ανεσί' },
    'city.biarritz': { fr: 'Biarritz', en: 'Biarritz', es: 'Biarritz', el: 'Μπιαρίτς' },

    'index.friends.eyebrow': { en: 'With friends', es: 'Entre amigos', el: 'Με φίλους' },
    'index.friends.h2': {
      en: 'Share.<br><span class="rainbow">Compare.</span> <span class="rainbow">Debate.</span>',
      es: 'Comparte.<br><span class="rainbow">Compara.</span> <span class="rainbow">Debate.</span>',
      el: 'Κοινοποιήστε.<br><span class="rainbow">Συγκρίνετε.</span> <span class="rainbow">Συζητήστε.</span>',
    },
    'index.friends.lead': {
      en: 'Send a tier list to your friends, everyone ranks it on their own, then compare your answers card by card. Who has the best taste?',
      es: 'Envía una tier list a tus amigos, cada uno la clasifica por su cuenta y luego compara tus respuestas con las suyas carta por carta. ¿Quién tiene mejor gusto?',
      el: 'Στείλτε μια tier list στους φίλους σας, ο καθένας την κατατάσσει μόνος του και μετά συγκρίνετε τις απαντήσεις σας κάρτα προς κάρτα. Ποιος έχει το καλύτερο γούστο;',
    },
    'index.friends.p1': {
      en: '<b>A code or a link</b>: your friends open the list in Tiercraft and make their ranking.',
      es: '<b>Un código o un enlace</b>: tus amigos abren la lista en Tiercraft y hacen su clasificación.',
      el: '<b>Ένας κωδικός ή ένας σύνδεσμος</b>: οι φίλοι σας ανοίγουν τη λίστα στο Tiercraft και κάνουν την κατάταξή τους.',
    },
    'index.friends.p2': {
      en: '<b>Your agreement percentage</b> with each friend and with all players.',
      es: '<b>Tu porcentaje de acuerdo</b> con cada amigo y con todos los jugadores.',
      el: '<b>Το ποσοστό συμφωνίας σας</b> με κάθε φίλο και με όλους τους παίκτες.',
    },
    'index.friends.p3': {
      en: '<b>A profile without email</b>: a username, an avatar, and you’re set.',
      es: '<b>Un perfil sin correo electrónico</b>: un nombre de usuario, un avatar y listo.',
      el: '<b>Ένα προφίλ χωρίς email</b>: ένα ψευδώνυμο, ένα άβαταρ, και ξεκινάτε.',
    },
    'index.friends.duel': {
      en: '<span class="avatar">🦊</span>You &amp; Léa<span class="avatar">🐼</span>',
      es: '<span class="avatar">🦊</span>Tú y Léa<span class="avatar">🐼</span>',
      el: '<span class="avatar">🦊</span>Εσείς &amp; Léa<span class="avatar">🐼</span>',
    },
    // French and Greek put a space before %, the app's English and Spanish don't.
    'index.friends.pct': { en: '<span id="pct">0</span>%', es: '<span id="pct">0</span>%', el: '<span id="pct">0</span> %' },
    'index.friends.agree': { en: 'agree on “French dishes”', es: 'de acuerdo en «Platos franceses»', el: 'συμφωνία στα «Γαλλικά πιάτα»' },
    'index.friends.code': { en: 'TIER LIST CODE', es: 'CÓDIGO DE LA TIER LIST', el: 'ΚΩΔΙΚΟΣ TIER LIST' },
    'demo.who': { fr: 'Vous : {me} · Léa : {her}', en: 'You: {me} · Léa: {her}', es: 'Tú: {me} · Léa: {her}', el: 'Εσείς: {me} · Léa: {her}' },

    'index.final.alt': {
      en: 'Tiercraft’s Home screen: the daily tier list and public lists',
      es: 'La pantalla de inicio de Tiercraft: la tier list del día y las listas públicas',
      el: 'Η Αρχική του Tiercraft: η tier list της ημέρας και οι δημόσιες λίστες',
    },
    'index.final.h2': {
      en: 'Your first tier list<br><span class="rainbow">is waiting.</span>',
      es: 'Tu primera tier list<br><span class="rainbow">te espera.</span>',
      el: 'Η πρώτη σας tier list<br><span class="rainbow">σας περιμένει.</span>',
    },
    'index.final.lead': { en: 'Free, no forced ads, no email account.', es: 'Gratis, sin publicidad impuesta, sin cuenta de correo.', el: 'Δωρεάν, χωρίς υποχρεωτικές διαφημίσεις, χωρίς λογαριασμό email.' },

    // Support (support.html).
    'support.title': { en: 'Support · Tiercraft', es: 'Soporte · Tiercraft', el: 'Υποστήριξη · Tiercraft' },
    'support.h1': { en: 'Support', es: 'Soporte', el: 'Υποστήριξη' },
    'support.intro': {
      en: 'A question, a bug, an idea for a daily tier list? Write to us: we answer every message.',
      es: '¿Una pregunta, un fallo, una idea para la tier list del día? Escríbenos: respondemos a todos los mensajes.',
      el: 'Μια ερώτηση, ένα σφάλμα, μια ιδέα για tier list της ημέρας; Γράψτε μας: απαντάμε σε κάθε μήνυμα.',
    },
    'support.faq': { en: 'Frequently asked questions', es: 'Preguntas frecuentes', el: 'Συχνές ερωτήσεις' },
    'support.q1': { en: 'How do I place a card without dragging it?', es: '¿Cómo coloco una carta sin arrastrarla?', el: 'Πώς τοποθετώ μια κάρτα χωρίς να τη σύρω;' },
    'support.a1': {
      en: 'Tap the card: its sheet opens with “Place in” and the list of tiers.',
      es: 'Toca la carta: se abre su ficha con «Colocar en» y la lista de niveles.',
      el: 'Πατήστε την κάρτα: ανοίγει η καρτέλα της με το «Τοποθέτηση σε» και τη λίστα των επιπέδων.',
    },
    'support.q2': { en: 'Can I change my ranking after submitting it?', es: '¿Puedo cambiar mi clasificación después de enviarla?', el: 'Μπορώ να αλλάξω την κατάταξή μου αφού την υποβάλω;' },
    'support.a2': {
      en: 'Yes, for the daily tier list as well as public lists: move the cards, then tap “Submit my changes”. Your new ranking replaces the old one in the results.',
      es: 'Sí, tanto en la tier list del día como en las listas públicas: mueve las cartas y toca «Enviar mis cambios». Tu nueva clasificación sustituye a la anterior en los resultados.',
      el: 'Ναι, τόσο για την tier list της ημέρας όσο και για τις δημόσιες λίστες: μετακινήστε τις κάρτες και πατήστε «Υποβολή των αλλαγών μου». Η νέα σας κατάταξη αντικαθιστά την παλιά στα αποτελέσματα.',
    },
    'support.q3': { en: 'How do I create a tier list with AI?', es: '¿Cómo creo una tier list con IA?', el: 'Πώς δημιουργώ μια tier list με ΤΝ;' },
    'support.a3': {
      en: 'Open one of your lists (My lists), tap the magic wand at the bottom right and enter a theme. The AI suggests the cards, which you check, then their images are prepared: reused from the Tiercraft library when they’re already there, drawn by the AI otherwise, all in the same style. It can also name your tiers.',
      es: 'Abre una de tus listas (Mis listas), toca la varita mágica abajo a la derecha y escribe un tema. La IA propone las cartas, que tú revisas, y luego se preparan sus imágenes: tomadas de la biblioteca de Tiercraft si ya están allí y, si no, dibujadas por la IA, todas con el mismo estilo. También puede bautizar tus niveles.',
      el: 'Ανοίξτε μία από τις λίστες σας (Οι λίστες μου), πατήστε το μαγικό ραβδί κάτω δεξιά και δώστε ένα θέμα. Η ΤΝ προτείνει τις κάρτες, τις οποίες ελέγχετε, και έπειτα ετοιμάζονται οι εικόνες τους: από τη βιβλιοθήκη του Tiercraft όταν υπάρχουν ήδη εκεί, αλλιώς σχεδιασμένες από την ΤΝ, όλες στο ίδιο στυλ. Μπορεί επίσης να ονομάσει τα επίπεδά σας.',
    },
    'support.q4': { en: 'What is energy for?', es: '¿Para qué sirve la energía?', el: 'Σε τι χρησιμεύει η ενέργεια;' },
    'support.a4': {
      en: 'Each AI generation uses energy: only what is delivered counts, and a failed generation costs nothing. Some energy is free to get you started; more packs are available in the shop (the “+” next to your balance).',
      es: 'Cada generación con IA usa energía: solo se descuenta lo que se entrega, y una generación fallida no cuesta nada. Te regalamos energía para empezar; en la tienda hay más packs (el «+» junto a tu saldo).',
      el: 'Κάθε δημιουργία με ΤΝ χρησιμοποιεί ενέργεια: χρεώνεται μόνο ό,τι παραδίδεται, και μια αποτυχημένη δημιουργία δεν κοστίζει τίποτα. Σας προσφέρεται ενέργεια για να ξεκινήσετε· περισσότερα πακέτα υπάρχουν στο κατάστημα (το «+» δίπλα στο υπόλοιπό σας).',
    },
    'support.q5': { en: 'A purchase doesn’t show up in my balance?', es: '¿Una compra no aparece en mi saldo?', el: 'Μια αγορά δεν εμφανίζεται στο υπόλοιπό μου;' },
    'support.a5': {
      en: 'Reopen the shop (the “+” next to your balance) while connected: a purchase that was paid for but not yet credited is then credited automatically, only once. If the energy is still missing, email us with the date of the purchase. Refunds are requested from Apple (reportaproblem.apple.com).',
      es: 'Vuelve a abrir la tienda (el «+» junto a tu saldo) con conexión: una compra pagada y aún no acreditada se acredita entonces automáticamente, una sola vez. Si sigue faltando energía, escríbenos con la fecha de la compra. Los reembolsos se piden a Apple (reportaproblem.apple.com).',
      el: 'Ανοίξτε ξανά το κατάστημα (το «+» δίπλα στο υπόλοιπό σας) με σύνδεση στο διαδίκτυο: μια αγορά που πληρώθηκε αλλά δεν έχει πιστωθεί ακόμα πιστώνεται τότε αυτόματα, μία μόνο φορά. Αν η ενέργεια εξακολουθεί να λείπει, γράψτε μας με την ημερομηνία της αγοράς. Η επιστροφή χρημάτων ζητείται από την Apple (reportaproblem.apple.com).',
    },
    'support.q6': { en: 'How do I add a friend?', es: '¿Cómo añado a un amigo?', el: 'Πώς προσθέτω έναν φίλο;' },
    'support.a6': {
      en: 'Tap your avatar on Home to create your profile (a username and an avatar, no email), then share your friend code or enter theirs in “Add a friend”.',
      es: 'Toca tu avatar en Inicio para crear tu perfil (un nombre de usuario y un avatar, sin correo electrónico) y luego comparte tu código de amigo o escribe el suyo en «Añadir un amigo».',
      el: 'Πατήστε το άβαταρ σας στην Αρχική για να δημιουργήσετε το προφίλ σας (ένα ψευδώνυμο και ένα άβαταρ, χωρίς email) και μετά κοινοποιήστε τον κωδικό φίλου σας ή πληκτρολογήστε τον δικό του στο «Προσθήκη φίλου».',
    },
    'support.q7': { en: 'Why aren’t photos shared?', es: '¿Por qué no se comparten las fotos?', el: 'Γιατί δεν κοινοποιούνται οι φωτογραφίες;' },
    'support.a7': {
      en: 'Your photos stay on your phone. Sharing sends the title, the names and colors of the cards, and your ranking.',
      es: 'Tus fotos se quedan en tu teléfono. Al compartir se envían el título, los nombres y colores de las cartas y tu clasificación.',
      el: 'Οι φωτογραφίες σας μένουν στο τηλέφωνό σας. Η κοινοποίηση στέλνει τον τίτλο, τα ονόματα και τα χρώματα των καρτών και την κατάταξή σας.',
    },
    'support.q8': { en: 'How do I get a daily reminder?', es: '¿Cómo recibo un recordatorio cada día?', el: 'Πώς λαμβάνω υπενθύμιση κάθε μέρα;' },
    'support.a8': {
      en: 'Settings → Daily tier list → Daily reminder, then choose the time.',
      es: 'Ajustes → Tier list del día → Recordatorio diario y luego elige la hora.',
      el: 'Ρυθμίσεις → Tier list της ημέρας → Καθημερινή υπενθύμιση και μετά επιλέξτε την ώρα.',
    },
    'support.q9': { en: 'A player is bothering me. What can I do?', es: 'Un jugador me molesta, ¿qué hago?', el: 'Ένας παίκτης με ενοχλεί. Τι να κάνω;' },
    'support.a9': {
      en: 'From their profile, their friend request or a list they sent you, you can block or report them: they can then no longer contact you.',
      es: 'Desde su perfil, su solicitud de amistad o una lista que te haya enviado, puedes bloquearlo o denunciarlo: así ya no podrá contactarte.',
      el: 'Από το προφίλ του, το αίτημα φιλίας του ή μια λίστα που σας έστειλε, μπορείτε να τον αποκλείσετε ή να τον αναφέρετε: τότε δεν μπορεί πια να επικοινωνήσει μαζί σας.',
    },
    'support.q10': { en: 'How do I delete my data?', es: '¿Cómo elimino mis datos?', el: 'Πώς διαγράφω τα δεδομένα μου;' },
    'support.a10': {
      en: 'Settings → Danger zone → Delete my profile immediately erases your online profile; “Erase all data” empties the app on your phone.',
      es: 'Ajustes → Zona de peligro → Eliminar mi perfil borra al instante tu perfil en línea; «Borrar todos los datos» vacía la app en tu teléfono.',
      el: 'Ρυθμίσεις → Ζώνη κινδύνου → Διαγραφή του προφίλ μου: διαγράφει αμέσως το διαδικτυακό σας προφίλ· η «Διαγραφή δεδομένων» αδειάζει την εφαρμογή στο τηλέφωνό σας.',
    },

    // Share link (import.html): the page strangers see.
    'import.title': { en: 'Shared tier list · Tiercraft', es: 'Tier list compartida · Tiercraft', el: 'Κοινοποιημένη tier list · Tiercraft' },
    'import.description': { en: 'Open this tier list in the Tiercraft app.', es: 'Abre esta tier list en la app Tiercraft.', el: 'Ανοίξτε αυτή την tier list στην εφαρμογή Tiercraft.' },
    'import.ogTitle': { en: 'A tier list is waiting for you on Tiercraft', es: 'Te espera una tier list en Tiercraft', el: 'Μια tier list σας περιμένει στο Tiercraft' },
    'import.ogDescription': { en: 'Tap the link to open it in the Tiercraft app.', es: 'Toca el enlace para abrirla en la app Tiercraft.', el: 'Πατήστε τον σύνδεσμο για να την ανοίξετε στην εφαρμογή Tiercraft.' },
    'import.h1': { en: 'A tier list is waiting for you', es: 'Te espera una tier list', el: 'Μια tier list σας περιμένει' },
    'import.sub': { en: 'Open it in the Tiercraft app.', es: 'Ábrela en la app Tiercraft.', el: 'Ανοίξτε την στην εφαρμογή Tiercraft.' },
    'import.store': { en: 'Download Tiercraft on the App Store', es: 'Descarga Tiercraft en la App Store', el: 'Λήψη του Tiercraft από το App Store' },
    'import.open': { en: 'I have the app: open the tier list', es: 'Ya tengo la app: abrir la tier list', el: 'Άνοιγμα στην εφαρμογή' },
    'import.hint': {
      en: 'The App Store button copies the code: when you first open the app, tap “Paste” to get this tier list. You can also tap the link you received again.',
      es: 'El botón de la App Store copia el código: la primera vez que abras la app, toca «Pegar» para recuperar esta tier list. También puedes volver a tocar el enlace que recibiste.',
      el: 'Το κουμπί του App Store αντιγράφει τον κωδικό: την πρώτη φορά που θα ανοίξετε την εφαρμογή, πατήστε «Επικόλληση» για να βρείτε αυτή την tier list. Μπορείτε επίσης να πατήσετε ξανά τον σύνδεσμο που λάβατε.',
    },
    'import.code': { fr: 'Code : {code}', en: 'Code: {code}', es: 'Código: {code}', el: 'Κωδικός: {code}' },
    'import.quoted': { fr: '« {title} »', en: '“{title}”', es: '«{title}»', el: '«{title}»' },
  };

  var params = null;
  try { params = new URLSearchParams(location.search); } catch (e) {}
  var forced = params && (params.get('lang') || '').toLowerCase();
  if (LANGS.indexOf(forced) < 0) forced = null;

  function browserLanguage() {
    var locale = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    var language = String(locale).split(/[-_]/)[0].toLowerCase();
    return LANGS.indexOf(language) >= 0 ? language : 'en';
  }

  var lang = forced || browserLanguage();

  // Missing in the language: English, then French, like translate() in the app.
  function lookup(key) {
    var entry = D[key];
    if (!entry) return undefined;
    return entry[lang] !== undefined ? entry[lang] : entry.en !== undefined ? entry.en : entry.fr;
  }

  function t(key, values) {
    var text = lookup(key);
    if (text === undefined) return key;
    return values ? text.replace(/\{(\w+)\}/g, function (m, name) { return name in values ? String(values[name]) : m; }) : text;
  }

  window.TC_I18N = { lang: lang, t: t, keys: D };
  document.documentElement.lang = lang;

  // French is already in the HTML: nothing to replace.
  if (lang !== 'fr') {
    [].forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var text = lookup(el.getAttribute('data-i18n'));
      if (text === undefined) return;
      if (el.tagName === 'TITLE') el.textContent = text;
      else el.innerHTML = text;
    });
  }
  [].forEach.call(document.querySelectorAll('[data-i18n-attr]'), function (el) {
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var parts = pair.split(':');
      var text = parts.length === 2 ? lookup(parts[1].trim()) : undefined;
      if (text !== undefined && (lang !== 'fr' || parts[0].trim() === 'href')) el.setAttribute(parts[0].trim(), text);
    });
  });

  // A language chosen with ?lang= follows the visitor from page to page.
  if (forced) {
    [].forEach.call(document.querySelectorAll('a[href^="/"]'), function (a) {
      var href = a.getAttribute('href');
      if (/^\/(confidentialite|privacy|privacidad|aporrito)$/.test(href) || href.indexOf('?') >= 0) return;
      a.setAttribute('href', href + '?lang=' + forced);
    });
  }
})();
