import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, isValidHex, PALETTE, readableTextColor, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { Field } from './ui';
import { Clickable } from './Clickable';

type Props = {
  value: string;
  onChange: (color: string) => void;
  palette?: string[];
};

export function ColorPicker({ value, onChange, palette = PALETTE }: Props) {
  /** Text being typed in the hex field; null shows the current value. */
  const [draft, setDraft] = useState<string | null>(null);
  const { t } = useT();
  const hex = draft ?? value;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.grid}>
        {palette.map((c) => {
          const selected = c.toLowerCase() === value.toLowerCase();
          return (
            <Clickable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={t('editor.colorA11y', { color: c })}
              accessibilityState={{ selected }}
              onPress={() => {
                setDraft(null);
                onChange(c);
              }}
              style={[styles.swatch, { backgroundColor: c }, selected && styles.selected]}
            >
              {selected ? <Ionicons name="checkmark" size={18} color={readableTextColor(c)} /> : null}
            </Clickable>
          );
        })}
      </View>
      <View style={styles.hexRow}>
        <View style={[styles.preview, { backgroundColor: isValidHex(hex) ? hex : value }]} />
        <View style={{ flex: 1 }}>
          <Field
            value={hex}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            placeholder="#FF7F7F"
            onChangeText={(text) => {
              const next = text.startsWith('#') ? text : `#${text}`;
              setDraft(next);
              if (isValidHex(next)) onChange(next.toUpperCase());
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  selected: { borderWidth: 3, borderColor: colors.text },
  hexRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  preview: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
});
