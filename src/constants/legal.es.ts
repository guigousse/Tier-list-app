import { PUBLISHER, type LegalSection } from './publisher';

export const PRIVACY_ES: LegalSection[] = [
  {
    title: 'En resumen',
    paragraphs: [
      'Tiercraft funciona sin cuenta de correo y recoge los menos datos posibles. Esta página explica qué se queda en tu teléfono, qué se envía en línea y por qué.',
    ],
  },
  {
    title: 'Lo que se queda en tu teléfono',
    paragraphs: [
      'Tus tier lists, sus cartas, sus fotos y tus ajustes se guardan solo en tu dispositivo. Un identificador aleatorio y la clave secreta de tu perfil también se guardan en el llavero seguro del teléfono, para recuperar tu perfil si reinstalas la app.',
    ],
  },
  {
    title: 'Lo que se envía en línea',
    bullets: [
      'Cuando compartes una tier list: su título, los nombres y colores de los niveles y de las cartas, y la clasificación (nunca las fotos), para crear el código para compartir. Si tienes un perfil, tu nombre de usuario va con la lista, para que tu amigo sepa quién lo reta. El código también queda vinculado al monedero anónimo de la app: si un jugador nuevo clasifica la lista, recibes energía gratis. Cuando clasificas una lista abierta desde un código, se envían tu monedero anónimo y el identificador aleatorio de la app para comprobar que eres un jugador nuevo; quien la compartió nunca los ve. También se envía a Apple, a través de nuestro servidor, un token DeviceCheck de Apple para comprobar que este dispositivo no ha sido ya referido; no contiene ningún dato personal, y Apple solo guarda dos bits por dispositivo para nuestra app.',
      'Cuando envías la tier list del día o una lista pública: tu clasificación y el identificador aleatorio de la app, para calcular la clasificación media y evitar votos duplicados.',
      'Cuando abres una lista pública o la añades a favoritos: la lista en cuestión y el identificador aleatorio, para los contadores de visitas y de favoritos y las tendencias.',
      'Si creas un perfil de jugador: tu nombre de usuario, su número, tu avatar y tus insignias, tus amigos y solicitudes de amistad, los jugadores que bloqueas y las denuncias que haces o recibes. El perfil está vinculado al identificador aleatorio de la app. Tus amigos ven tu nombre de usuario, tu avatar y tus clasificaciones enviadas (tier lists del día y listas públicas, nunca tus listas personales).',
      'Cuando envías una tier list a amigos: su título, sus niveles y el nombre de sus cartas (nunca las fotos), tu clasificación y la de tus amigos, para compararlas. Solo tú y los amigos destinatarios la ven; se elimina después de 7 días si no se ha clasificado, y se conserva en tus archivos en caso contrario.',
      'Si activas las notificaciones con un perfil: el token de notificación del dispositivo, para avisarte cuando un amigo te envía una tier list o clasifica la tuya.',
      'Si tienes un perfil: el idioma de la app, para escribirte en ese idioma las notificaciones que envía el servidor.',
      'Cuando votas en una lista reservada a los jugadores de un país (unas elecciones, por ejemplo): el país deducido de tu dirección IP se comprueba en ese momento; no se conserva. La región que eliges en la app se queda en tu teléfono.',
      'Cuando creas con la IA: la temática que escribes, los nombres de las cartas y de los niveles (nunca las fotos) y el identificador aleatorio, para generar el resultado y limitar el uso por dispositivo. Las imágenes generadas se conservan, sin vínculo contigo, para reutilizarlas.',
      'Cuando usas o compras energía: un monedero anónimo (clave aleatoria guardada en el llavero), su saldo y sus movimientos; en una compra, la transacción firmada por Apple; para la energía regalada, una certificación App Attest que demuestra que la app es auténtica. Si pides un reembolso, Apple puede preguntarnos qué parte del pack se ha usado: le indicamos ese porcentaje, nada más.',
      'En cada intercambio con el servidor: tu dirección IP, conservada menos de 24 horas, para limitar los abusos.',
      'Estadísticas de uso, solo si lo aceptas: las pantallas abiertas, la duración y la frecuencia de uso, las listas enviadas y compartidas (su tipo, nunca su contenido), el modelo del dispositivo y la versión de la app, vinculados a un identificador de instalación propio de Google Analytics para Firebase. Sin tu consentimiento, no se mide nada. Puedes cambiar de opinión en Ajustes → Estadísticas de uso.',
    ],
  },
  {
    title: 'Servicios utilizados',
    bullets: [
      'Supabase (datos alojados en Europa, en París): tier lists compartidas, votos, favoritos, perfiles y amigos.',
      'Anthropic (textos) y Google Gemini (imágenes): se les envían la temática y los nombres de las cartas y de los niveles cuando creas con la IA. No se transmite ningún dato personal.',
      'Apple: pago de los packs de energía a través de la App Store y verificación App Attest. Nunca recibimos tus datos de pago.',
      'Vercel: sitio web de la app y páginas de los enlaces para compartir.',
      'Wikimedia y App Store: cuando buscas una imagen, se les envía el nombre de la carta; las plantillas con iconos de apps consultan la App Store. No se transmite ningún dato personal.',
      'Expo: descarga de las actualizaciones de la app.',
      'Google Analytics para Firebase: estadísticas de uso, solo si lo aceptas, sin identificador publicitario ni intercambio con la publicidad de Google. Los datos pueden tratarse fuera de la Unión Europea, con las garantías previstas por el RGPD, y se conservan 2 meses. Google AdMob: solo si eliges ver un anuncio a cambio de energía, un anuncio no personalizado; Google recibe entonces información técnica del dispositivo (dirección IP, modelo, idioma) para mostrarlo y luchar contra el fraude, y nos confirma que se ha visto con un código aleatorio, sin saber nada de ti.',
    ],
  },
  {
    title: 'Lo que no hacemos',
    bullets: [
      'Sin cuenta de correo, sin publicidad impuesta (solo la que eliges ver a cambio de energía), sin rastreo publicitario.',
      'No vendemos ni compartimos datos con terceros.',
      'Sin acceso a tus fotos, salvo las que eliges para una carta.',
    ],
  },
  {
    title: 'Notificaciones',
    paragraphs: [
      'El recordatorio de la tier list del día es una notificación programada en tu teléfono: para ello no se envía ningún dato. Puedes desactivarlo en los Ajustes de la app.',
    ],
  },
  {
    title: 'Plazo de conservación',
    paragraphs: [
      'Las tier lists compartidas se eliminan si nadie las ha abierto en 6 meses. Las tier lists enviadas a amigos se eliminan después de 7 días si no se han clasificado; una vez clasificadas, permanecen en los archivos de ambos amigos hasta que se elimine uno de los perfiles. Los votos se conservan para las estadísticas. El historial del monedero y de las compras se conserva para la contabilidad y la gestión de los reembolsos. Las direcciones IP se eliminan después de 24 horas. Un perfil se conserva mientras no pidas su eliminación.',
    ],
  },
  {
    title: 'Tus derechos',
    paragraphs: [
      `Puedes borrar tus datos locales desde Ajustes → Borrar todos los datos, o desinstalando la app. Ajustes → Eliminar mi perfil borra de inmediato en línea tu perfil, tus amigos, tus bloqueos, tus denuncias y tus votos. Para acceder a tus datos en línea o corregirlos, escribe a ${PUBLISHER.email}. El monedero de energía no se borra con el perfil, para que conserves la energía comprada: escríbenos para eliminarlo. También puedes acudir a la CNIL (la autoridad francesa de protección de datos, cnil.fr).`,
    ],
  },
];

export const LEGAL_NOTICE_ES: LegalSection[] = [
  {
    title: 'Editor',
    paragraphs: [`Tiercraft es una app editada por ${PUBLISHER.name}.`, `Contacto: ${PUBLISHER.email}`, `Director de la publicación: ${PUBLISHER.name}.`],
  },
  {
    title: 'Alojamiento',
    bullets: [
      'Datos de la app: Supabase Inc. (supabase.com), servidores ubicados en París (Unión Europea).',
      'Sitio web y enlaces para compartir: Vercel Inc. (vercel.com), 440 N Barranca Ave #4133, Covina, CA 91723, Estados Unidos.',
      'Actualizaciones de la app: Expo, 650 Industries Inc. (expo.dev).',
    ],
  },
  {
    title: 'Propiedad intelectual',
    paragraphs: [
      'La app, su nombre, su logotipo y sus contenidos están protegidos. Los iconos de aplicaciones pertenecen a sus respectivos editores. Las imágenes de Wikimedia se usan según sus licencias, indicadas en cada carta.',
    ],
  },
  {
    title: 'Contenidos generados por la IA',
    paragraphs: [
      'Las cartas, imágenes y nombres de niveles creados con la IA los producen automáticamente Anthropic y Google Gemini a partir de la temática escrita: pueden contener errores. Las personalidades se representan en caricatura, con fines humorísticos, o mediante un objeto que las evoca. Una imagen ya dibujada para otra lista puede reutilizarse desde la biblioteca de Tiercraft, sin vínculo con la lista de origen. Un contenido inapropiado puede denunciarse en la dirección de contacto.',
    ],
  },
  {
    title: 'Energía y compras',
    paragraphs: [
      'La energía sirve únicamente para lanzar generaciones con IA en Tiercraft: no tiene valor monetario y no puede intercambiarse ni convertirse en dinero. Una generación fallida no cuesta nada. Los packs los vende y reembolsa Apple, según las condiciones de la App Store.',
      'Si Apple reembolsa un pack, su energía se retira del saldo; la parte ya usada se descuenta de las compras siguientes, y la generación con IA puede suspenderse tras reembolsos repetidos de energía ya usada.',
    ],
  },
  {
    title: 'Contenidos de los jugadores',
    paragraphs: [
      'Los nombres de usuario y las tier lists compartidas se publican bajo la responsabilidad de sus autores. Los nombres de usuario se filtran y los avatares se eligen de una lista fija. Un jugador puede ser denunciado o bloqueado desde su perfil, su solicitud de amistad o una lista que te envíe: a partir de entonces ya no puede contactarte, y tras varias denuncias su perfil se oculta.',
    ],
  },
  {
    title: 'Datos personales',
    paragraphs: ['Consulta la política de privacidad, accesible desde los Ajustes.'],
  },
];
