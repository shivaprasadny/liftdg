import type { PropsWithChildren } from 'react'; import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
export function SettingsSection({title,children}:PropsWithChildren<{title:string}>){return <View style={styles.wrap}><Text style={styles.title}>{title}</Text><View style={styles.card}>{children}</View></View>;}const styles=StyleSheet.create({wrap:{gap:spacing.sm},title:{...typography.label,color:colors.accent,textTransform:'uppercase'},card:{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:14,overflow:'hidden'}});

