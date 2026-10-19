import type { ImageSourcePropType } from 'react-native';

// Written by scripts/bake-theme-previews.cjs: the baked circle of each grand theme.
export const THEME_PREVIEWS: Record<string, ImageSourcePropType> = {
  cuisine: require('../../assets/themes/cuisine.png'),
  culture: require('../../assets/themes/culture.png'),
  fetes: require('../../assets/themes/fetes.png'),
  imaginaire: require('../../assets/themes/imaginaire.png'),
  jeux: require('../../assets/themes/jeux.png'),
  loisirs: require('../../assets/themes/loisirs.png'),
  nature: require('../../assets/themes/nature.png'),
  voyages: require('../../assets/themes/voyages.png'),
};
