import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { createShareCode } from '../lib/api';
import { codeLink, copyText, offlineLink, shareUrl } from '../lib/share';
import type { TierList } from '../store/types';
import { Button, Sheet } from './ui';

/** Codes already created this session, per list version, so reopening the sheet doesn't create new ones. */
const codes = new Map<string, string>();

type Props = {
  list: TierList | null;
  visible: boolean;
  onClose: () => void;
  onShareImage?: () => void;
};

/** Shares a tier list with a short code (stored online), or an offline link as a fallback. */
export function ShareSheet({ list, visible, onClose, onShareImage }: Props) {
  const key = list ? `${list.id}:${list.updatedAt}` : '';
  const [state, setState] = useState<{ key: string; code?: string; error?: boolean }>({ key: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible || !list || codes.has(key)) return;
    let cancelled = false;
    createShareCode(list)
      .then((code) => {
        codes.set(key, code);
        if (!cancelled) setState({ key, code });
      })
      .catch(() => !cancelled && setState({ key, error: true }));
    return () => {
      cancelled = true;
    };
  }, [visible, key, list, attempt]);

  if (!list) return null;
  const code = codes.get(key) ?? (state.key === key ? state.code : undefined);
  const error = state.key === key && state.error;
  const intro = (c: string) => `Voici ma tier list « ${list.title} » sur Tiercraft. Code : ${c}`;

  const later = (fn: () => void) => () => {
    onClose();
    // iOS cannot present the share sheet while this modal animates out.
    setTimeout(fn, 350);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Partager">
      {code ? (
        <>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Code de la tier list</Text>
            <Text selectable accessibilityLabel={`Code ${code.split('').join(' ')}`} style={styles.code}>
              {code.slice(0, 3)} {code.slice(3)}
            </Text>
            <Text style={styles.hint}>À saisir dans Tiercraft : Mes listes → Importer.</Text>
          </View>
          <View style={styles.row}>
            <Button style={styles.flex} variant="secondary" icon="copy-outline" label="Copier le code" onPress={() => copyText(code, `Le code ${code} est copié.`)} />
            <Button style={styles.flex} icon="paper-plane-outline" label="Envoyer…" onPress={later(() => shareUrl(list.title, intro(code), codeLink(code)))} />
          </View>
        </>
      ) : error ? (
        <View style={styles.codeBox}>
          <Text style={styles.errorTitle}>Pas de connexion</Text>
          <Text style={styles.hint}>Le code n’a pas pu être créé. Vous pouvez réessayer, ou envoyer un lien qui fonctionne sans connexion.</Text>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Button
              style={styles.flex}
              variant="secondary"
              icon="refresh"
              label="Réessayer"
              onPress={() => {
                setState({ key: '' });
                setAttempt((n) => n + 1);
              }}
            />
            <Button
              style={styles.flex}
              icon="link-outline"
              label="Envoyer un lien"
              onPress={later(() => shareUrl(list.title, `Voici ma tier list « ${list.title} » sur Tiercraft`, offlineLink(list)))}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.codeBox, { paddingVertical: spacing.xl }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.hint}>Création du code…</Text>
        </View>
      )}
      {onShareImage ? <Button variant="ghost" icon="image-outline" label="Partager en image" onPress={later(onShareImage)} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  codeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  code: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  errorTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
});
