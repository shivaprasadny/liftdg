import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import { fetchYouTubeOEmbed } from '@/services/youtubeApiService';
import { buildYouTubeThumbnailUrl, buildYouTubeWatchUrl, extractYouTubeVideoId } from '@/services/youtubeService';

export interface AddYouTubeLinkResult { videoId: string; title: string; channelName: string | null; thumbnailUrl: string | null; youtubeUrl: string }

interface Props { visible: boolean; onClose: () => void; onSave: (result: AddYouTubeLinkResult) => void; }

/** Validates the URL, then tries a keyless oEmbed lookup for title/thumbnail (best-effort — saving still works if it fails). */
export function AddYouTubeLinkModal({ visible, onClose, onSave }: Props) {
  const colors = useAppColors();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ videoId: string; title: string; channelName: string | null; thumbnailUrl: string | null } | null>(null);

  const reset = () => { setUrl(''); setError(undefined); setPreview(null); setLoading(false); };
  const close = () => { reset(); onClose(); };

  const lookup = async () => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) { setError('Enter a valid YouTube URL.'); setPreview(null); return; }
    setError(undefined); setLoading(true);
    const oEmbed = await fetchYouTubeOEmbed(videoId);
    setLoading(false);
    setPreview({ videoId, title: oEmbed?.title ?? 'Untitled video', channelName: oEmbed?.authorName ?? null, thumbnailUrl: oEmbed?.thumbnailUrl ?? buildYouTubeThumbnailUrl(videoId) });
  };

  const save = () => {
    if (!preview) return;
    onSave({ videoId: preview.videoId, title: preview.title, channelName: preview.channelName, thumbnailUrl: preview.thumbnailUrl, youtubeUrl: buildYouTubeWatchUrl(preview.videoId) });
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.title, { color: colors.text }]}>Add YouTube Link</Text>
            <AppInput label="YouTube URL" placeholder="https://www.youtube.com/watch?v=..." value={url}
              onChangeText={(value) => { setUrl(value); setPreview(null); setError(undefined); }} error={error} autoCapitalize="none" autoCorrect={false} />
            {loading && <ActivityIndicator color={colors.accent} />}
            {preview && (
              <View style={styles.previewRow}>
                {preview.thumbnailUrl && <Image source={{ uri: preview.thumbnailUrl }} style={styles.thumbnail} />}
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>{preview.title}</Text>
                  {preview.channelName && <Text style={[styles.previewChannel, { color: colors.textMuted }]}>{preview.channelName}</Text>}
                </View>
              </View>
            )}
            {!preview ? <AppButton label="Look Up Video" onPress={() => void lookup()} disabled={!url.trim() || loading} />
              : <AppButton label="Save Video" onPress={save} />}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.heading },
  previewRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumbnail: { width: 100, height: 56, borderRadius: radius.sm },
  previewInfo: { flex: 1, gap: 2 },
  previewTitle: { ...typography.body, fontWeight: '700' },
  previewChannel: { ...typography.caption },
});
