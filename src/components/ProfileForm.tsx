import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { decodeAvatar, encodeAvatar, isAvatarCode, randomAvatar } from '../lib/avatar';
import { saveProfile, socialError } from '../lib/social';
import { useTierStore } from '../store/useTierStore';
import { Avatar } from './Avatar';
import { AvatarEditor } from './AvatarEditor';
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
  // Profiles made before drawn avatars start from a random look.
  const [avatar, setAvatar] = useState(() => (profile && isAvatarCode(profile.avatar) ? profile.avatar : encodeAvatar(randomAvatar())));
  const [editing, setEditing] = useState(false);
  // A new editor at each opening, starting from the current look.
  const [session, setSession] = useState(0);
  const edit = () => {
    setSession((n) => n + 1);
    setEditing(true);
  };
  const config = useMemo(() => decodeAvatar(avatar), [avatar]);
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
        <Clickable
          accessibilityRole="button"
          accessibilityLabel="Personnaliser mon avatar"
          onPress={edit}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <Avatar avatar={avatar} seed={pseudo.trim() || '?'} size={112} />
          <View style={styles.editBadge}>
            <Ionicons name="color-palette" size={16} color={colors.primaryText} />
          </View>
        </Clickable>
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
      <Button variant="secondary" icon="color-palette-outline" label="Personnaliser mon avatar" onPress={edit} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={busy ? 'Enregistrement…' : (submitLabel ?? (profile ? 'Enregistrer' : 'Créer mon profil'))}
        icon="checkmark"
        disabled={!valid || busy}
        onPress={submit}
      />
      <AvatarEditor
        key={session}
        visible={editing}
        initial={config}
        onClose={() => setEditing(false)}
        onDone={(c) => {
          setAvatar(encodeAvatar(c));
          setEditing(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', maxWidth: '100%' },
  tag: { color: colors.textMuted, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  editBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
