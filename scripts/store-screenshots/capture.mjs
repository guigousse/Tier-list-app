// Captures the raw app screens of the App Store screenshots (store/screens/<lang>/), from the
// web build at the size of a 6.9-inch iPhone (1320 × 2868). Writes to the server are answered
// here (votes, share codes), so nothing reaches production; reads (lists, images) are real.
// Usage: npx expo start --web --port 8081, then
//   node scripts/store-screenshots/capture.mjs [fr|en|es|el] [port]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lang = process.argv[2] ?? 'fr';
const port = process.argv[3] ?? '8081';
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../store/screens', lang);
mkdirSync(out, { recursive: true });

const LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', el: 'el-GR' };
// Words of the app the script clicks, per language.
const WORDS = {
  fr: { editList: 'Modifier la liste', options: 'Options', share: 'Partager', title: 'Mon top fruits', tiers: ['Coup de cœur', 'J’adore', 'Ça passe', 'Bof', 'Jamais'], skip: 'Passer', later: 'Plus tard', noThanks: 'Non merci', confirm: 'Confirmer' },
  en: { editList: 'Edit the list', options: 'Options', share: 'Share', title: 'My top fruits', tiers: ['Iconic', 'Love it', 'It’s fine', 'Meh', 'Never'], skip: 'Skip', later: 'Later', noThanks: 'No thanks', confirm: 'Confirm' },
  es: { editList: 'Editar la lista', options: 'Opciones', share: 'Compartir', title: 'Mi top de frutas', tiers: ['Flechazo', 'Me encanta', 'Pasable', 'Meh', 'Nunca'], skip: 'Saltar', later: 'Más tarde', noThanks: 'No, gracias', confirm: 'Confirmar' },
  el: { editList: 'Επεξεργασία λίστας', options: 'Επιλογές', share: 'Μοίρασε', title: 'Τα φρούτα μου', tiers: ['Λατρεία', 'Τέλειο', 'Καλό', 'Μέτριο', 'Ποτέ'], skip: 'Παράλειψη', later: 'Αργότερα', noThanks: 'Όχι, ευχαριστώ', confirm: 'Επιβεβαίωση' },
}[lang];

// Tier of each card of a list, as a player would rank it (index in the list's items).
// The fruits' names in this language, for the player's own copy (French: the source names).
const fruitNames = lang === 'fr' ? null : JSON.parse(readFileSync(join(here, `../../content-i18n/translations-${lang}.json`), 'utf8')).builtin.fruits.items;
const FRUITS = [0, 1, 0, 2, 1, 0, 3, 1, 2, 4, 1, 2, 0, 3, 2, 1, 4, 2, 3, 1, 0, 2, 3, 4];
const CHEESES = [0, 1, 1, 0, 2, 1, 2, 3, 0, 2, 1, 3, 2, 4, 1, 2, 0, 3, 2, 1, 4, 3];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, locale: LOCALES[lang] });
const page = await context.newPage();

// Writes answered locally; the average ranking of a list shown as 1284 players' votes.
await page.route('**/rest/v1/rpc/**', async (route) => {
  const name = route.request().url().split('/rpc/')[1].split('?')[0];
  if (name === 'get_list_results') {
    const items = CHEESES.map((tier, i) => {
      const average = Math.min(4, Math.max(0, tier + ((i % 3) - 1) * 0.6));
      const counts = [0, 1, 2, 3, 4].map((t) => Math.round(1284 * Math.max(0.04, 0.45 - Math.abs(t - average) * 0.2)));
      return { average, counts };
    });
    return route.fulfill({ json: { votes: 1284, items } });
  }
  if (name === 'share_list' || name === 'share_challenge') return route.fulfill({ json: 'K7F3QX' });
  if (name.startsWith('get_') || name.startsWith('fetch_') || name === 'request_country') return route.continue();
  return route.fulfill({ json: null });
});

const click = async (text, exact = true) => {
  const el = page.getByText(text, { exact });
  if (await el.count()) {
    await el.first().click();
    await page.waitForTimeout(1200);
    return true;
  }
  return false;
};
// The dev build's warning toast, hidden on every page.
const go = async (path) => {
  await page.goto(`http://localhost:${port}${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: '#error-toast{display:none!important}' });
};
const shot = async (name) => {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, `${name}.png`) });
};

await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle', timeout: 180000 });
await page.addStyleTag({ content: '#error-toast{display:none!important}' });
await page.waitForTimeout(2000);
await click(WORDS.skip);
await click(WORDS.later);
await page.waitForTimeout(4000);
await click(WORDS.noThanks);
await click(WORDS.confirm);

// The copies the screens need: a popular list, another one ranked in full, the daily list.
const titles = await page.evaluate(() => JSON.parse(localStorage.getItem('tiercraft-catalog')).state.templates.map((t) => t.title));
console.log('templates online:', titles.length);
const open = async (text) => {
  await page.getByText(text, { exact: true }).locator('visible=true').first().click();
  await page.waitForTimeout(3000);
  await page.goBack();
  await page.waitForTimeout(2000);
};
const fruits = { fr: 'Fruits', en: 'Fruits', es: 'Frutas', el: 'Φρούτα' }[lang];
const cheeses = { fr: 'Fromages', en: 'Cheeses', es: 'Quesos', el: 'Τυριά' }[lang];
await open(fruits);
await open(cheeses);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.getByText(/TIER LIST/).locator('visible=true').first().click();
await page.waitForTimeout(3000);

// Rankings put in place in the stored lists, then the app reloaded on them.
const ids = await page.evaluate(({ FRUITS, CHEESES, words, names }) => {
  const saved = JSON.parse(localStorage.getItem('tiercraft-store'));
  const lists = Object.values(saved.state.lists);
  const place = (list, ranks, leave) => {
    const order = list.popular?.cardIds ?? list.daily.cardIds;
    const placement = Object.fromEntries(list.tiers.map((t) => [t.id, []]));
    const pool = [];
    order.forEach((id, i) => (i >= order.length - leave ? pool.push(id) : placement[list.tiers[ranks[i % ranks.length]].id].push(id)));
    Object.assign(list, { placement, pool });
  };
  const fruits = lists.find((l) => l.popular?.key === 'fruits');
  const cheeses = lists.find((l) => l.popular?.key === 'cheeses');
  const daily = lists.find((l) => l.daily);
  place(fruits, FRUITS, 4);
  place(cheeses, CHEESES, 0);
  place(daily, [1, 0, 2, 0, 3, 1, 2, 4, 1, 3, 2, 0], 4);
  // The player's own list, made from the fruits: its own title and tier names.
  const own = JSON.parse(JSON.stringify(fruits));
  own.id = 'own-list';
  own.title = words.title;
  delete own.popular;
  own.tiers.forEach((t, i) => (t.label = words.tiers[i]));
  if (names) fruits.popular.cardIds.forEach((id, i) => (own.cards[id].label = names[i]));
  own.placement = { ...own.placement };
  saved.state.lists[own.id] = own;
  // No invitation card: this player is past their first days.
  saved.state.settings.inviteAsked = true;
  localStorage.setItem('tiercraft-store', JSON.stringify(saved));
  return { fruits: fruits.id, cheeses: cheeses.id, daily: daily.id, own: own.id };
}, { FRUITS, CHEESES, words: WORDS, names: fruitNames });

await go('/');
await shot('accueil');
await go(`/editor/${ids.fruits}`);
await shot('classement');
await go(`/editor/${ids.daily}`);
await shot('du-jour');
// The own list in edit mode, its first tier open.
await go(`/editor/${ids.own}`);
await page.getByLabel(WORDS.editList).first().click();
await page.waitForTimeout(1200);
await page.getByText(WORDS.tiers[0], { exact: true }).locator('visible=true').first().click();
await shot('personnalisation');

// Then the cheeses validated (after the home screen: a first validation is celebrated there).
await page.evaluate((id) => {
  const saved = JSON.parse(localStorage.getItem('tiercraft-store'));
  const cheeses = saved.state.lists[id];
  const ranks = cheeses.popular.cardIds.map((cardId) => cheeses.tiers.findIndex((t) => cheeses.placement[t.id].includes(cardId)));
  Object.assign(cheeses.popular, { validatedAt: Date.now(), validatedRanks: ranks, voteSent: true });
  // The reward step it crosses counts as already celebrated: no full-screen card over the results.
  saved.state.celebrated = { lists: 99, flame: 99 };
  localStorage.setItem('tiercraft-store', JSON.stringify(saved));
}, ids.cheeses);
await go(`/results/${ids.cheeses}`);
await shot('comparatif');
// The share sheet of the results, with the code the server would give.
await page.getByText(WORDS.share, { exact: true }).locator('visible=true').first().click();
await shot('partage');
console.log(JSON.stringify(ids));
await browser.close();
