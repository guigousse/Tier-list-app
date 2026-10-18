import type { Catalog, Language } from '../index';
import { el } from '../el';
import { en } from '../en';
import { es } from '../es';
import { fr } from '../fr';
import { play } from './play';
import { social } from './social';

/** The texts of one part of the app, in the four languages, each under its own key prefix. */
export type Strings = Record<Language, Catalog>;

// One module per part of the app (keys prefixed by its name), merged here.
const MODULES: Strings[] = [{ fr, en, es, el }, play, social];

export const CATALOGS: Record<Language, Catalog> = {
  fr: Object.assign({}, ...MODULES.map((m) => m.fr)),
  en: Object.assign({}, ...MODULES.map((m) => m.en)),
  es: Object.assign({}, ...MODULES.map((m) => m.es)),
  el: Object.assign({}, ...MODULES.map((m) => m.el)),
};
