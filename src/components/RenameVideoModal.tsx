import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

interface Props { visible: boolean; initialTitle: string; onClose: () => void; onSave: (title: string) => void; }

export function RenameVideoModal({ visible, initialTitle, onClose, onSave }: Props) {
  const colors = useAppColors();
  const [title, setTitle] = useState(initialTitle);
  const [error, setError] = useState<string>();

  useEffect(() => { if (visible) { setTitle(initialTitle); setError(undefined); } }, [visible, initialTitle]);

  const commit = () => {
    if (!title.trim()) { setError('Enter a title.'); return; }
    onSave(title.trim()); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.title, { color: colors.text }]}>Rename Video</Text>
            <AppInput label="Title" value={title} onChangeText={setTitle} error={error} autoFocus placeholder="My Favorite Bench Tutorial" />
            <AppButton label="Save" onPress={commit} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  title: { ...typography.heading },
});
