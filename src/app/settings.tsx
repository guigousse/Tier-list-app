import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { Button, Chip } from '../components/ui';
import { BROC_APP_STORE_URL } from '../constants/legal';
import { colors, radius, spacing, type CardSize } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { setDailyReminder } from '../lib/reminders';
import { deleteMyProfile, friendCode, socialError } from '../lib/social';
import { SHARE_HOST } from '../lib/share';
import { useTierStore } from '../store/useTierStore';

const REMINDER_HOURS = [9, 12, 18, 21];

const SIZES: { key: CardSize; label: string }[] = [
  { key: 'small', label: 'Petite' },
  { key: 'medium', label: 'Moyenne' },
  { key: 'large', label: 'Grande' },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const settings = useTierStore((s) => s.settings);
  const count = useTierStore((s) => Object.keys(s.lists).length);
  const profile = useTierStore((s) => s.profile);
  const { updateSettings, clearAll } = useTierStore.getState();

  const confirmClear = () =>
    Alert.alert('Tout effacer ?', 'Toutes vos tier lists et leurs images seront supprimées. Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Tout effacer', style: 'destructive', onPress: clearAll },
    ]);

  const confirmDeleteProfile = () =>
    Alert.alert(
      'Supprimer votre profil ?',
      `${profile ? friendCode(profile) : 'Votre profil'}, vos amis, vos joueurs bloqués et vos votes seront supprimés en ligne. Vos tier lists restent sur cet appareil. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            deleteMyProfile().then(
              () => Alert.alert('Profil supprimé', 'Votre profil et les données liées ont été supprimés.'),
              (e) => Alert.alert('Oups', socialError(e)),
            ),
        },
      ],
    );

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Éditeur</Text>
        <Row label="Retour haptique" hint="Vibration légère lors du glisser-déposer">
          <Switch
            value={settings.haptics}
            onValueChange={(haptics) => updateSettings({ haptics })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label="Sons des boutons" hint="Petit clic quand vous touchez un bouton (coupé en mode silencieux)">
          <Switch
            value={settings.sounds}
            onValueChange={(sounds) => updateSettings({ sounds })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label="Afficher le nom des cartes">
          <Switch
            value={settings.showCardLabels}
            onValueChange={(showCardLabels) => updateSettings({ showCardLabels })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <View style={styles.block}>
          <Text style={styles.rowLabel}>Taille des cartes</Text>
          <View style={styles.chips}>
            {SIZES.map((s) => (
              <Chip key={s.key} label={s.label} selected={settings.cardSize === s.key} onPress={() => updateSettings({ cardSize: s.key })} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Tier list du jour</Text>
        <Row label="Rappel quotidien" hint="Une notification quand la nouvelle tier list du jour vous attend">
          <Switch
            value={settings.dailyReminder}
            onValueChange={async (on) => {
              const ok = await setDailyReminder(on, settings.reminderHour);
              if (!ok) {
                Alert.alert('Notifications désactivées', 'Autorisez les notifications de Tiercraft dans les Réglages de l’iPhone.');
                return;
              }
              updateSettings({ dailyReminder: on, reminderAsked: true });
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        {settings.dailyReminder ? (
          <View style={styles.block}>
            <Text style={styles.rowLabel}>Heure du rappel</Text>
            <View style={styles.chips}>
              {REMINDER_HOURS.map((h) => (
                <Chip
                  key={h}
                  label={`${h} h`}
                  selected={settings.reminderHour === h}
                  onPress={() => {
                    updateSettings({ reminderHour: h });
                    setDailyReminder(true, h);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>À propos</Text>
        <Button variant="secondary" icon="play-circle-outline" label="Revoir la présentation" onPress={() => router.push('/welcome')} />
        <Button
          variant="secondary"
          icon="shield-checkmark-outline"
          label="Politique de confidentialité"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'confidentialite' } })}
        />
        <Button
          variant="secondary"
          icon="document-text-outline"
          label="Mentions légales"
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'mentions' } })}
        />
        <Button variant="secondary" icon="help-circle-outline" label="Assistance" onPress={() => Linking.openURL(`https://${SHARE_HOST}/support`)} />
        <Row label="Version">
          <Text style={styles.rowHint}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </Row>
      </View>

      {/* A discreet word about the publisher's other app. */}
      <Clickable
        accessibilityRole="link"
        accessibilityLabel="Du même créateur : Broc, jeu de brocante cosy. Ouvrir dans l’App Store"
        onPress={() => Linking.openURL(BROC_APP_STORE_URL)}
        style={({ pressed }) => [styles.promo, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.promoEmoji}>🏺</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowHint}>Du même créateur</Text>
          <Text style={styles.rowLabel}>Broc, jeu de brocante cosy</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      </Clickable>

      <View style={[styles.group, styles.danger]}>
        <Text style={[styles.groupTitle, { color: colors.danger }]}>Zone de danger</Text>
        <Text style={styles.rowHint}>
          {count} tier list{count > 1 ? 's' : ''} enregistrée{count > 1 ? 's' : ''} sur cet appareil. Elles restent sur votre téléphone : seules les tier lists que vous partagez par code sont envoyées en ligne, sans les photos.
        </Text>
        <Button label="Effacer toutes les données" icon="trash-outline" variant="danger" onPress={confirmClear} disabled={count === 0} />
        {profile ? (
          <>
            <Text style={styles.rowHint}>
              Votre profil de joueur {friendCode(profile)} est enregistré en ligne avec vos amis et vos votes.
            </Text>
            <Button label="Supprimer mon profil" icon="person-remove-outline" variant="danger" onPress={confirmDeleteProfile} />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  groupTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  block: { gap: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 16 },
  rowHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  danger: { borderColor: colors.danger, backgroundColor: 'rgba(255, 92, 108, 0.1)' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  promoEmoji: { fontSize: 28 },
});
