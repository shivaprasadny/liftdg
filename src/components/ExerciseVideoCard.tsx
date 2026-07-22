import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  title: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  isFavorite?: boolean;
  onWatch: () => void;
  onToggleFavorite?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
}

/** Shared card for default (curated) and saved (user) videos; each optional action only renders when its handler is passed. */
export function ExerciseVideoCard({ title, channelName, thumbnailUrl, isFavorite, onWatch, onToggleFavorite, onRename, onRemove }: Props) {
  const colors = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        {thumbnailUrl ? <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { backgroundColor: colors.surfaceElevated }]}><Ionicons name="play-circle-outline" size={28} color={colors.textMuted} /></View>}
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          {channelName && <Text style={[styles.channel, { color: colors.textMuted }]} numberOfLines={1}>{channelName}</Text>}
        </View>
        {onToggleFavorite && (
          <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? 'Remove favorite' : 'Mark as favorite'} onPress={onToggleFavorite} hitSlop={8}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={22} color={isFavorite ? colors.warning : colors.textMuted} />
          </Pressable>
        )}
      </View>
      <AppButton label="Watch on YouTube" onPress={onWatch} />
      {(onRename || onRemove) && (
        <View style={styles.footerRow}>
          {onRename && <Pressable accessibilityRole="button" accessibilityLabel="Rename this video" onPress={onRename} style={styles.footerButton}><Ionicons name="create-outline" size={16} color={colors.textMuted} /><Text style={[styles.footerText, { color: colors.textMuted }]}>Rename</Text></Pressable>}
          {onRemove && <Pressable accessibilityRole="button" accessibilityLabel="Remove this video" onPress={onRemove} style={styles.footerButton}><Ionicons name="trash-outline" size={16} color={colors.danger} /><Text style={[styles.footerText, { color: colors.danger }]}>Remove</Text></Pressable>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumbnail: { width: 80, height: 45, borderRadius: radius.sm },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  title: { ...typography.body, fontWeight: '700' },
  channel: { ...typography.caption },
  footerRow: { flexDirection: 'row', gap: spacing.lg },
  footerButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { ...typography.caption, fontWeight: '600' },
});
