/**
 * Publisher details shown in the legal notice and privacy policy.
 * TODO before publishing: the publisher's name and contact e-mail.
 */
export const PUBLISHER = {
  name: 'À compléter',
  email: 'À compléter',
};

/** Broc, the other app by the same publisher (App Store id). */
export const BROC_APP_STORE_URL = 'https://apps.apple.com/app/id6784023113';

export type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] };

export const PRIVACY: LegalSection[] = [
  {
    title: 'En bref',
    paragraphs: [
      'Tiercraft fonctionne sans compte et collecte le moins de données possible. Cette page explique ce qui reste sur votre téléphone, ce qui est envoyé en ligne, et pourquoi.',
    ],
  },
  {
    title: 'Ce qui reste sur votre téléphone',
    paragraphs: [
      'Vos tier lists, leurs cartes, leurs photos et vos réglages sont enregistrés uniquement sur votre appareil. Un identifiant aléatoire et la clé secrète de votre profil sont aussi gardés dans le trousseau de l’iPhone, pour retrouver votre profil si vous réinstallez l’app.',
    ],
  },
  {
    title: 'Ce qui est envoyé en ligne',
    bullets: [
      'Quand vous partagez une tier list : son titre, les noms et couleurs des rangs et des cartes, et le classement (jamais les photos), pour créer le code de partage.',
      'Quand vous validez la tier list du jour ou une liste populaire : votre classement et l’identifiant aléatoire de l’app, pour calculer le classement moyen et éviter les votes en double.',
      'Quand vous ajoutez une liste populaire en favori : la liste concernée et l’identifiant aléatoire, pour le compteur de favoris.',
      'Si vous créez un profil de joueur : votre pseudo, son numéro et votre avatar, vos amis et demandes d’amis, et les signalements que vous faites ou recevez. Vos amis voient votre pseudo, votre avatar et vos classements validés (tier lists du jour et listes populaires, jamais vos listes personnelles).',
      'À chaque échange avec le serveur : votre adresse IP, conservée moins de 24 heures, pour limiter les abus.',
    ],
  },
  {
    title: 'Services utilisés',
    bullets: [
      'Supabase (données hébergées en Europe, à Paris) : tier lists partagées, votes, favoris, profils et amis.',
      'Vercel : site de l’app et pages des liens de partage.',
      'Wikimedia et App Store : quand vous cherchez une image, le nom de la carte leur est envoyé ; les modèles avec des icônes d’apps interrogent l’App Store. Aucune donnée personnelle n’est transmise.',
      'Expo : téléchargement des mises à jour de l’app.',
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
      'Les tier lists partagées sont supprimées si personne ne les a ouvertes depuis 6 mois. Les votes sont conservés pour les statistiques. Les adresses IP sont supprimées après 24 heures. Un profil est conservé tant que vous ne demandez pas sa suppression.',
    ],
  },
  {
    title: 'Vos droits',
    paragraphs: [
      'Vous pouvez effacer vos données locales depuis Réglages → Effacer toutes les données, ou en supprimant l’app. Pour accéder à vos données en ligne, les corriger ou les supprimer (profil compris), écrivez à l’adresse indiquée dans les mentions légales. Vous pouvez aussi saisir la CNIL (cnil.fr).',
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
    title: 'Contenus des joueurs',
    paragraphs: [
      'Les pseudos et tier lists partagées sont publiés sous la responsabilité de leurs auteurs. Un pseudo inapproprié peut être signalé depuis le profil du joueur ; après plusieurs signalements, le profil est masqué.',
    ],
  },
  {
    title: 'Données personnelles',
    paragraphs: ['Voir la politique de confidentialité, accessible depuis les Réglages.'],
  },
];
