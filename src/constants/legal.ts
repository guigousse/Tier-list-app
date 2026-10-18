/** Publisher details shown in the legal notice and privacy policy. */
export const PUBLISHER = {
  name: 'Guillaume Fenard',
  email: 'broc.le.jeu@gmail.com',
};

/** Broc, the other app by the same publisher (App Store id). */
export const BROC_APP_STORE_URL = 'https://apps.apple.com/app/id6784023113';

export type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] };

export const PRIVACY: LegalSection[] = [
  {
    title: 'En bref',
    paragraphs: [
      'Tiercraft fonctionne sans compte e-mail et collecte le moins de données possible. Cette page explique ce qui reste sur votre téléphone, ce qui est envoyé en ligne, et pourquoi.',
    ],
  },
  {
    title: 'Ce qui reste sur votre téléphone',
    paragraphs: [
      'Vos tier lists, leurs cartes, leurs photos et vos réglages sont enregistrés uniquement sur votre appareil. Un identifiant aléatoire et la clé secrète de votre profil sont aussi gardés dans le trousseau sécurisé du téléphone, pour retrouver votre profil si vous réinstallez l’app.',
    ],
  },
  {
    title: 'Ce qui est envoyé en ligne',
    bullets: [
      'Quand vous partagez une tier list : son titre, les noms et couleurs des rangs et des cartes, et le classement (jamais les photos), pour créer le code de partage.',
      'Quand vous validez la tier list du jour ou une liste publique : votre classement et l’identifiant aléatoire de l’app, pour calculer le classement moyen et éviter les votes en double.',
      'Quand vous ouvrez une liste publique ou l’ajoutez en favori : la liste concernée et l’identifiant aléatoire, pour les compteurs de vues et de favoris et les tendances.',
      'Si vous créez un profil de joueur : votre pseudo, son numéro, votre avatar et vos badges, vos amis et demandes d’amis, les joueurs que vous bloquez, et les signalements que vous faites ou recevez. Le profil est relié à l’identifiant aléatoire de l’app. Vos amis voient votre pseudo, votre avatar et vos classements validés (tier lists du jour et listes publiques, jamais vos listes personnelles).',
      'Quand vous envoyez une tier list à des amis : son titre, ses rangs et le nom de ses cartes (jamais les photos), votre classement et celui de vos amis, pour les comparer. Seuls vous et les amis destinataires la voient ; elle est conservée 90 jours.',
      'Si vous activez les notifications avec un profil : le jeton de notification de l’appareil, pour vous prévenir quand un ami vous envoie une tier list ou classe la vôtre.',
      'Quand vous créez avec l’IA : le thème saisi, les noms des cartes et des rangs (jamais les photos) et l’identifiant aléatoire, pour générer le résultat et limiter l’usage par appareil. Les images générées sont conservées, sans lien avec vous, pour être réutilisées.',
      'Quand vous utilisez ou achetez de l’énergie : un porte-monnaie anonyme (clé aléatoire gardée dans le trousseau), son solde et ses mouvements ; pour un achat, la transaction signée par Apple ; pour l’énergie offerte, une attestation App Attest qui prouve que l’app est authentique. En cas de demande de remboursement, Apple peut nous demander quelle part du pack a été utilisée : nous lui indiquons ce pourcentage, rien d’autre.',
      'À chaque échange avec le serveur : votre adresse IP, conservée moins de 24 heures, pour limiter les abus.',
      'Statistiques d’usage, seulement si vous l’acceptez : les écrans ouverts, la durée et la fréquence d’utilisation, les listes validées et partagées (leur type, jamais leur contenu), le modèle de l’appareil et la version de l’app, reliés à un identifiant d’installation propre à Google Analytics pour Firebase. Sans votre accord, rien n’est mesuré. Vous changez d’avis dans Réglages → Statistiques d’usage.',
    ],
  },
  {
    title: 'Services utilisés',
    bullets: [
      'Supabase (données hébergées en Europe, à Paris) : tier lists partagées, votes, favoris, profils et amis.',
      'Anthropic (textes) et Google Gemini (images) : le thème et les noms des cartes et des rangs leur sont envoyés quand vous créez avec l’IA. Aucune donnée personnelle n’est transmise.',
      'Apple : paiement des packs d’énergie par l’App Store et vérification App Attest. Nous ne recevons jamais vos coordonnées de paiement.',
      'Vercel : site de l’app et pages des liens de partage.',
      'Wikimedia et App Store : quand vous cherchez une image, le nom de la carte leur est envoyé ; les modèles avec des icônes d’apps interrogent l’App Store. Aucune donnée personnelle n’est transmise.',
      'Expo : téléchargement des mises à jour de l’app.',
      'Google Analytics pour Firebase : statistiques d’usage, seulement si vous l’acceptez, sans identifiant publicitaire ni partage avec la publicité de Google. Les données peuvent être traitées hors de l’Union européenne, sous les garanties prévues par le RGPD, et sont conservées 2 mois.',
    ],
  },
  {
    title: 'Ce que nous ne faisons pas',
    bullets: [
      'Pas de compte e-mail, pas de publicité, pas de pistage publicitaire.',
      'Pas de revente ni de partage de données à des tiers.',
      'Pas d’accès à vos photos en dehors de celles que vous choisissez pour une carte.',
    ],
  },
  {
    title: 'Notifications',
    paragraphs: [
      'Le rappel de la tier list du jour est une notification programmée sur votre téléphone : aucune donnée n’est envoyée pour cela. Vous pouvez le couper dans les Réglages de l’app.',
    ],
  },
  {
    title: 'Durée de conservation',
    paragraphs: [
      'Les tier lists partagées sont supprimées si personne ne les a ouvertes depuis 6 mois. Les tier lists envoyées à des amis ne sont plus affichées après 90 jours. Les votes sont conservés pour les statistiques. L’historique du porte-monnaie et des achats est conservé pour la comptabilité et la gestion des remboursements. Les adresses IP sont supprimées après 24 heures. Un profil est conservé tant que vous ne demandez pas sa suppression.',
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      `Vous pouvez effacer vos données locales depuis Réglages → Effacer toutes les données, ou en supprimant l’app. Réglages → Supprimer mon profil efface immédiatement en ligne votre profil, vos amis, vos blocages, vos signalements et vos votes. Pour accéder à vos données en ligne ou les corriger, écrivez à ${PUBLISHER.email}. Le porte-monnaie d’énergie n’est pas effacé avec le profil, pour que vous gardiez l’énergie achetée : écrivez-nous pour le supprimer. Vous pouvez aussi saisir la CNIL (cnil.fr).`,
    ],
  },
];

export const LEGAL_NOTICE: LegalSection[] = [
  {
    title: 'Éditeur',
    paragraphs: [`Tiercraft est éditée par ${PUBLISHER.name}.`, `Contact : ${PUBLISHER.email}`, `Directeur de la publication : ${PUBLISHER.name}.`],
  },
  {
    title: 'Hébergement',
    bullets: [
      'Données de l’app : Supabase Inc. (supabase.com), serveurs situés à Paris (Union européenne).',
      'Site et liens de partage : Vercel Inc. (vercel.com), 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
      'Mises à jour de l’app : Expo, 650 Industries Inc. (expo.dev).',
    ],
  },
  {
    title: 'Propriété intellectuelle',
    paragraphs: [
      'L’app, son nom, son logo et ses contenus sont protégés. Les icônes d’applications appartiennent à leurs éditeurs respectifs. Les images Wikimedia sont utilisées selon leurs licences, indiquées sur chaque carte.',
    ],
  },
  {
    title: 'Contenus générés par l’IA',
    paragraphs: [
      'Les cartes, images et noms de rangs créés avec l’IA sont produits automatiquement par Anthropic et Google Gemini à partir du thème saisi : ils peuvent contenir des erreurs. Les personnalités sont représentées en caricature, dans un but humoristique, ou par un objet qui les évoque. Une image déjà dessinée pour une autre liste peut être reprise de la bibliothèque Tiercraft, sans lien avec la liste d’origine. Un contenu inapproprié peut être signalé à l’adresse de contact.',
    ],
  },
  {
    title: 'Énergie et achats',
    paragraphs: [
      'L’énergie sert uniquement à lancer des générations IA dans Tiercraft : elle n’a pas de valeur monétaire et ne peut être ni échangée ni convertie en argent. Une génération ratée ne coûte rien. Les packs sont vendus et remboursés par Apple, selon les conditions de l’App Store.',
      'Si Apple rembourse un pack, son énergie est retirée du solde ; la part déjà utilisée est déduite des achats suivants, et la génération IA peut être suspendue après des remboursements répétés d’énergie déjà utilisée.',
    ],
  },
  {
    title: 'Contenus des joueurs',
    paragraphs: [
      'Les pseudos et tier lists partagées sont publiés sous la responsabilité de leurs auteurs. Les pseudos sont filtrés et les avatars choisis dans une liste fixe. Un joueur peut être signalé ou bloqué depuis son profil, sa demande d’ami ou une liste qu’il vous envoie : il ne peut alors plus vous contacter, et après plusieurs signalements son profil est masqué.',
    ],
  },
  {
    title: 'Données personnelles',
    paragraphs: ['Voir la politique de confidentialité, accessible depuis les Réglages.'],
  },
];
