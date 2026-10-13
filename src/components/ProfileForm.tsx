import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { AVATARS, saveProfile, socialError } from '../lib/social';
import { useTierStore } from '../store/useTierStore';
import { Avatar } from './Avatar';
import { Clickable } from './Clickable';
import { Button, Field } from './ui';

type Props = {
  /** Called once the profile is saved online. */
  onSaved: () => void;
  submitLabel?: string;
};

/** Pseudo and avatar of the player's profile: creates it, or edits it. */
export function ProfileForm({ onSaved, submitLabel }: Props) {
  const profile = useTierStore((s) => s.profile);
  const [pseudo, setPseudo] = useState(profile?.pseudo ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? AVATARS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = pseudo.trim().length >= 2;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProfile(pseudo, avatar);
      onSaved();
    } catch (e) {
      setError(socialError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.preview}>
        <Avatar emoji={avatar} seed={pseudo.trim() || '?'} size={84} />
        <Text style={styles.name} numberOfLines={1}>
          {pseudo.trim() || 'Votre pseudo'}
          <Text style={styles.tag}>{profile ? ` #${profile.tag}` : ' #····'}</Text>
        </Text>
        {profile ? null : <Text style={styles.hint}>Un numéro est ajouté à votre pseudo pour que vos amis vous trouvent.</Text>}
      </View>
      <Field
        label="Pseudo"
        value={pseudo}
        onChangeText={setPseudo}
        placeholder="Ex. Guigou"
        maxLength={20}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />
      <View style={{ gap: spacing.xs }}>
        <Text style={styles.label}>Avatar</Text>
        <View style={styles.grid}>
          {AVATARS.map((a) => (
            <Clickable
              key={a}
              accessibilityRole="button"
              accessibilityLabel={`Avatar ${a}`}
              accessibilityState={{ selected: a === avatar }}
              onPress={() => setAvatar(a)}
              style={[styles.choice, a === avatar && styles.choiceSelected]}
            >
              <Text style={styles.choiceEmoji}>{a}</Text>
            </Clickable>
          ))}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={busy ? 'Enregistrement…' : (submitLabel ?? (profile ? 'Enregistrer' : 'Créer mon profil'))}
        icon="checkmark"
        disabled={!valid || busy}
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', maxWidth: '100%' },
  tag: { color: colors.textMuted, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  choiceEmoji: { fontSize: 26 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
