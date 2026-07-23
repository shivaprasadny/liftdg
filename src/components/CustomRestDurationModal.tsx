import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props { visible: boolean; initialSeconds: number; onClose: () => void; onSave: (seconds: number) => void }

export function CustomRestDurationModal({ visible, initialSeconds, onClose, onSave }: Props) {
  const [minutes, setMinutes] = useState(String(Math.floor(initialSeconds / 60)));
  const [seconds, setSeconds] = useState(String(initialSeconds % 60));
  const total = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  const valid = Number.isInteger(total) && total >= 5 && total <= 3600 && Number(seconds) >= 0 && Number(seconds) <= 59;

  useEffect(() => {
    if (!visible) return;
    setMinutes(String(Math.floor(initialSeconds / 60)));
    setSeconds(String(initialSeconds % 60));
  }, [initialSeconds, visible]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
    <View style={styles.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close custom rest duration" style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.handle} />
        <Text accessibilityRole="header" style={styles.title}>Custom rest duration</Text>
        <Text style={styles.copy}>Choose a default between 5 seconds and 60 minutes. Individual exercises can still use their own rest time.</Text>
        <View style={styles.inputs}>
          <AppInput containerStyle={styles.flex} accessibilityLabel="Rest duration minutes" label="Minutes" placeholder="1" keyboardType="number-pad" value={minutes} onChangeText={setMinutes} />
          <AppInput containerStyle={styles.flex} accessibilityLabel="Rest duration seconds" label="Seconds" placeholder="30" keyboardType="number-pad" value={seconds} onChangeText={setSeconds} error={Number(seconds) > 59 ? 'Use 0–59' : undefined} />
        </View>
        <View style={styles.actions}><AppButton label="Cancel" variant="secondary" onPress={onClose} style={styles.flex} /><AppButton label="Save Duration" disabled={!valid} onPress={() => { onSave(total); onClose(); }} style={styles.flex} /></View>
      </View>
    </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.surface },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: colors.border },
  title: { ...typography.heading, color: colors.text }, copy: { ...typography.body, color: colors.textMuted },
  inputs: { flexDirection: 'row', gap: spacing.md }, actions: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 },
});
