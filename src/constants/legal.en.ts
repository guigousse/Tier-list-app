import { PUBLISHER, type LegalSection } from './publisher';

export const PRIVACY_EN: LegalSection[] = [
  {
    title: 'In short',
    paragraphs: [
      'Tiercraft works without an email account and collects as little data as possible. This page explains what stays on your phone, what is sent online, and why.',
    ],
  },
  {
    title: 'What stays on your phone',
    paragraphs: [
      'Your tier lists, their cards, their photos and your settings are saved only on your device. A random ID and your profile’s secret key are also kept in your phone’s secure keychain, so you can get your profile back if you reinstall the app.',
    ],
  },
  {
    title: 'What is sent online',
    bullets: [
      'When you share a tier list: its title, the names and colors of its tiers and cards, and the ranking (never the photos), to create the share code. If you have a profile, your username comes with the list, so your friend knows who’s challenging them. The code is also tied to the app’s anonymous wallet: if a new player ranks the list, you get free energy. When you rank a list opened from a code, your anonymous wallet and the app’s random ID are sent to check that you’re a new player; the person who shared it never sees them. An Apple DeviceCheck token is also sent to Apple, through our server, to check that this device hasn’t already been referred; it contains no personal data, and Apple keeps only two bits per device for our app.',
      'When you submit the daily tier list or a public list: your ranking and the app’s random ID, to calculate the average ranking and prevent duplicate votes.',
      'When you open a public list or add it to your favorites: the list in question and the random ID, for view and favorite counts and trends.',
      'If you create a player profile: your username, its number, your avatar and badges, your friends and friend requests, the players you block, and the reports you make or receive. The profile is linked to the app’s random ID. Your friends see your username, your avatar and your submitted rankings (daily tier lists and public lists, never your personal lists).',
      'When you send a tier list to friends: its title, its tiers and the names of its cards (never the photos), your ranking and your friends’ rankings, to compare them. Only you and the friends you sent it to can see it; it is kept for 90 days.',
      'If you turn on notifications with a profile: the device’s notification token, to let you know when a friend sends you a tier list or ranks yours.',
      'If you have a profile: the app’s language, so notifications sent by the server are written to you in that language.',
      'When you vote on a list restricted to players from one country (an election, for example): the country inferred from your IP address is checked at that moment; it is not stored. The region you choose in the app stays on your phone.',
      'When you create with AI: the theme you enter, the names of the cards and tiers (never the photos) and the random ID, to generate the result and limit usage per device. Generated images are kept, with no link to you, so they can be reused.',
      'When you use or buy energy: an anonymous wallet (a random key kept in the keychain), its balance and its transactions; for a purchase, the transaction signed by Apple; for free energy, an App Attest attestation proving that the app is genuine. If you request a refund, Apple may ask us how much of the pack was used: we tell them that percentage, nothing else.',
      'Every time the app talks to the server: your IP address, kept for less than 24 hours, to prevent abuse.',
      'Usage statistics, only if you agree: the screens you open, how long and how often you use the app, the lists you submit and share (their type, never their content), your device model and app version, linked to an installation ID specific to Google Analytics for Firebase. Without your consent, nothing is measured. You can change your mind in Settings → Usage statistics.',
    ],
  },
  {
    title: 'Services we use',
    bullets: [
      'Supabase (data hosted in Europe, in Paris): shared tier lists, votes, favorites, profiles and friends.',
      'Anthropic (text) and Google Gemini (images): the theme and the names of the cards and tiers are sent to them when you create with AI. No personal data is shared.',
      'Apple: payment for energy packs through the App Store and App Attest verification. We never receive your payment details.',
      'Vercel: the app’s website and the share link pages.',
      'Wikimedia and App Store: when you search for an image, the card’s name is sent to them; templates with app icons query the App Store. No personal data is shared.',
      'Expo: downloading app updates.',
      'Google Analytics for Firebase: usage statistics, only if you agree, with no advertising ID and no sharing with Google’s advertising. The data may be processed outside the European Union, under the safeguards provided by the GDPR, and is kept for 2 months. Google AdMob: only if you choose to watch an ad for energy, a non-personalized ad; Google then receives technical information about the device (IP address, model, language) to show it and fight fraud, and confirms to us that it was watched using a random code, without learning anything about you.',
    ],
  },
  {
    title: 'What we don’t do',
    bullets: [
      'No email account, no forced ads (only the ones you choose to watch for energy), no ad tracking.',
      'No selling or sharing of data with third parties.',
      'No access to your photos other than the ones you choose for a card.',
    ],
  },
  {
    title: 'Notifications',
    paragraphs: [
      'The daily tier list reminder is a notification scheduled on your phone: no data is sent for it. You can turn it off in the app’s Settings.',
    ],
  },
  {
    title: 'How long we keep data',
    paragraphs: [
      'Shared tier lists are deleted if nobody has opened them in 6 months. Tier lists sent to friends are no longer shown after 90 days. Votes are kept for statistics. Wallet and purchase history is kept for accounting and for handling refunds. IP addresses are deleted after 24 hours. A profile is kept until you ask for it to be deleted.',
    ],
  },
  {
    title: 'Your rights',
    paragraphs: [
      `You can erase your local data from Settings → Erase all data, or by deleting the app. Settings → Delete my profile immediately erases your profile, your friends, your blocks, your reports and your votes online. To access or correct your online data, write to ${PUBLISHER.email}. Your energy wallet is not erased with your profile, so you keep the energy you bought: write to us to have it deleted. You can also file a complaint with the CNIL (France’s data protection authority, cnil.fr).`,
    ],
  },
];

export const LEGAL_NOTICE_EN: LegalSection[] = [
  {
    title: 'Publisher',
    paragraphs: [`Tiercraft is published by ${PUBLISHER.name}.`, `Contact: ${PUBLISHER.email}`, `Publication director: ${PUBLISHER.name}.`],
  },
  {
    title: 'Hosting',
    bullets: [
      'App data: Supabase Inc. (supabase.com), servers located in Paris (European Union).',
      'Website and share links: Vercel Inc. (vercel.com), 440 N Barranca Ave #4133, Covina, CA 91723, United States.',
      'App updates: Expo, 650 Industries Inc. (expo.dev).',
    ],
  },
  {
    title: 'Intellectual property',
    paragraphs: [
      'The app, its name, its logo and its content are protected. App icons belong to their respective publishers. Wikimedia images are used under their licenses, shown on each card.',
    ],
  },
  {
    title: 'AI-generated content',
    paragraphs: [
      'Cards, images and tier names created with AI are produced automatically by Anthropic and Google Gemini from the theme you enter: they may contain errors. Public figures are shown as caricatures, for humorous purposes, or through an object that evokes them. An image already drawn for another list may be reused from the Tiercraft library, with no link to the original list. Inappropriate content can be reported to the contact address.',
    ],
  },
  {
    title: 'Energy and purchases',
    paragraphs: [
      'Energy is used only to run AI generations in Tiercraft: it has no monetary value and cannot be exchanged or converted into money. A failed generation costs nothing. Packs are sold and refunded by Apple, under the App Store’s terms.',
      'If Apple refunds a pack, its energy is removed from your balance; any part already used is deducted from your next purchases, and AI generation may be suspended after repeated refunds of energy already used.',
    ],
  },
  {
    title: 'Player content',
    paragraphs: [
      'Usernames and shared tier lists are published under their authors’ responsibility. Usernames are filtered and avatars are chosen from a fixed list. A player can be reported or blocked from their profile, their friend request or a list they send you: they can then no longer contact you, and after several reports their profile is hidden.',
    ],
  },
  {
    title: 'Personal data',
    paragraphs: ['See the privacy policy, available from Settings.'],
  },
];
