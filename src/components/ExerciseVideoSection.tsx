import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AddYouTubeLinkModal } from '@/components/AddYouTubeLinkModal';
import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { ExerciseVideoCard } from '@/components/ExerciseVideoCard';
import { ReorderControls } from '@/components/ReorderControls';
import { RenameVideoModal } from '@/components/RenameVideoModal';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import {
  deleteSavedVideo, getDefaultVideos, getSavedVideos, renameSavedVideo, reorderSavedVideos,
  saveVideo, toggleFavoriteVideo,
} from '@/repositories/exerciseVideoRepository';
import { openYouTubeSearchExternally, openYouTubeVideoExternally } from '@/services/youtubeLinkingService';
import { buildExerciseSearchQuery } from '@/services/youtubeService';
import type { ExerciseDefaultVideo, ExerciseSavedVideo } from '@/types/exerciseVideo';
import { getUserMessage } from '@/utils/errors';

interface Props { exerciseId: string; exerciseName: string; }

export function ExerciseVideoSection({ exerciseId, exerciseName }: Props) {
  const db = useDatabase();
  const { settings } = useSettings();
  const [defaultVideos, setDefaultVideos] = useState<ExerciseDefaultVideo[]>([]);
  const [savedVideos, setSavedVideos] = useState<ExerciseSavedVideo[]>([]);
  const [addLinkVisible, setAddLinkVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ExerciseSavedVideo | null>(null);

  const load = useCallback(async () => {
    const [defaults, saved] = await Promise.all([getDefaultVideos(db, exerciseId), getSavedVideos(db, exerciseId)]);
    setDefaultVideos(defaults); setSavedVideos(saved);
  }, [db, exerciseId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeSaved = (video: ExerciseSavedVideo) => Alert.alert('Remove this video?', undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void deleteSavedVideo(db, video.id).then(load).catch((error) => Alert.alert('Could not remove video', getUserMessage(error))) },
  ]);
  const moveSaved = (index: number, direction: 1 | -1) => {
    const target = index + direction;
    if (target < 0 || target >= savedVideos.length) return;
    const ids = savedVideos.map((video) => video.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void reorderSavedVideos(db, exerciseId, ids).then(load);
  };

  return (
    <View style={styles.container}>
      <SectionHeader>Exercise Videos</SectionHeader>

      {!settings.hideDefaultExerciseVideos && defaultVideos.length > 0 && (
        <>
          <Text style={styles.subheading}>Default Videos</Text>
          {defaultVideos.map((video) => (
            <ExerciseVideoCard key={video.id} title={video.title} channelName={video.channelName} thumbnailUrl={video.thumbnailUrl}
              onWatch={() => void openYouTubeVideoExternally(video.videoId)} />
          ))}
        </>
      )}

      <Text style={styles.subheading}>My Saved Videos</Text>
      {savedVideos.length === 0 ? (
        <EmptyState title="No saved videos yet" message="Search YouTube or paste a link to save your own technique videos for this exercise." />
      ) : savedVideos.map((video, index) => (
        <View key={video.id} style={styles.savedRow}>
          <View style={styles.savedCard}>
            <ExerciseVideoCard title={video.title} channelName={video.channelName} thumbnailUrl={video.thumbnailUrl}
              isFavorite={video.isFavorite} onToggleFavorite={() => void toggleFavoriteVideo(db, exerciseId, video.id).then(load)}
              onWatch={() => void openYouTubeVideoExternally(video.videoId)}
              onRename={() => setRenameTarget(video)} onRemove={() => removeSaved(video)} />
          </View>
          <ReorderControls canUp={index > 0} canDown={index < savedVideos.length - 1} onUp={() => moveSaved(index, -1)} onDown={() => moveSaved(index, 1)} />
        </View>
      ))}

      <View style={styles.actionsRow}>
        <AppButton label="Search YouTube" onPress={() => void openYouTubeSearchExternally(buildExerciseSearchQuery(exerciseName))} style={styles.actionButton} />
        <AppButton label="Add YouTube Link" variant="secondary" onPress={() => setAddLinkVisible(true)} style={styles.actionButton} />
      </View>

      <AddYouTubeLinkModal visible={addLinkVisible} onClose={() => setAddLinkVisible(false)}
        onSave={(result) => void saveVideo(db, { exerciseId, ...result }).then(load).catch((error) => Alert.alert('Could not save this video', getUserMessage(error)))} />

      <RenameVideoModal visible={renameTarget !== null} initialTitle={renameTarget?.title ?? ''}
        onClose={() => setRenameTarget(null)}
        onSave={(title) => { if (renameTarget) void renameSavedVideo(db, renameTarget.id, title).then(load).catch((error) => Alert.alert('Could not rename video', getUserMessage(error))); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  subheading: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.sm },
  savedRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  savedCard: { flex: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});
