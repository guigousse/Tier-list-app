import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { shouldAskConsent } from '../lib/analytics';
import { useTierStore } from '../store/useTierStore';
import { Button, Sheet } from './ui';

/**
 * Asked once, after the welcome screens: may the app measure its audience? Closing the
 * sheet counts as a no (nothing is measured without a yes); the settings change it later.
 */
export function AnalyticsConsent() {
  const ask = useTierStore((s) => shouldAskConsent(s.settings));
  const answer = (analyticsConsent: 'granted' | 'denied') => useTierStore.getState().updateSettings({ analyticsConsent });
  return (
    <Sheet
      visible={ask}
      onClose={() => answer('denied')}
      title="Aider à améliorer Tiercraft"
      footer={
        <View style={styles.buttons}>
          <Button variant="secondary" label="Non merci" onPress={() => answer('denied')} style={{ flex: 1 }} />
          <Button icon="checkmark" label="Accepter" onPress={() => answer('granted')} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.text}>
          Avec votre accord, Tiercraft mesure comment l’app est utilisée, sans votre nom ni votre e-mail : écrans ouverts, durée des parties, retour d’un jour à
          l’autre. Ça nous aide à savoir ce qui plaît et ce qui bloque.
        </Text>
        <Text style={styles.text}>
          Aucune publicité, aucun suivi entre les apps, aucun contenu de vos listes. Les mesures passent par Google Analytics pour Firebase.
        </Text>
        <Text style={styles.muted}>Vous pouvez changer d’avis à tout moment dans les Réglages.</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.textMuted, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
});
