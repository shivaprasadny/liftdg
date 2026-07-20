import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
export function SectionHeader({ children }: { children: string }) { return <Text style={styles.text}>{children}</Text>; }
const styles = StyleSheet.create({ text: { ...typography.heading, color: colors.text } });
