import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/colors';

const icons = {
  index: ['home', 'home-outline'], plans: ['clipboard', 'clipboard-outline'],
  start: ['add-circle', 'add-circle-outline'], history: ['time', 'time-outline'],
  progress: ['stats-chart', 'stats-chart-outline'],
} as const;

export default function TabsLayout() {
  return <Tabs screenOptions={({ route }) => ({ headerShown: false,
    tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 82, paddingTop: 8 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarIcon: ({ color, size, focused }) => {
      const pair = icons[route.name as keyof typeof icons] ?? icons.index;
      return <Ionicons name={pair[focused ? 0 : 1]} size={size} color={color} />;
    },
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="plans" options={{ title: 'Training' }} />
    <Tabs.Screen name="start" options={{ title: 'Start' }} />
    <Tabs.Screen name="history" options={{ title: 'History' }} />
    <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
  </Tabs>;
}
