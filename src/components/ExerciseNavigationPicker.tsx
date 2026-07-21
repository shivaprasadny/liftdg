import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { ExerciseNavigationItem } from '@/types/exerciseNavigation';

interface Props { visible: boolean; items: ExerciseNavigationItem[]; selectedId: string | null; onSelect: (id: string) => void; onClose: () => void }
export function ExerciseNavigationPicker({ visible, items, selectedId, onSelect, onClose }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={styles.sheet} accessibilityViewIsModal>
      <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>Jump to exercise</Text><Pressable accessibilityRole="button" accessibilityLabel="Close exercise picker" hitSlop={10} onPress={onClose}><Text style={styles.close}>Close</Text></Pressable></View>
      <FlatList data={items} keyExtractor={(item) => item.id} renderItem={({ item, index }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === selectedId }} onPress={() => onSelect(item.id)} style={[styles.item, item.id === selectedId && styles.selected]}>
        <Text style={styles.name}>{item.completionStatus === 'complete' ? '✓ ' : ''}{index + 1}. {item.name}</Text>
        <Text style={styles.meta}>{item.group?.label ?? item.category} · {item.completedSets}/{item.totalSets} sets</Text>
      </Pressable>} />
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }, sheet: { maxHeight: '75%', padding: spacing.lg, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }, title: { ...typography.heading, color: colors.text }, close: { ...typography.label, color: colors.accent }, item: { minHeight: 58, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }, selected: { backgroundColor: colors.surfaceElevated }, name: { ...typography.label, color: colors.text }, meta: { ...typography.caption, color: colors.textMuted } });
