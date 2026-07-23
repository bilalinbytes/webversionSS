import { Tabs } from 'expo-router';
import { Home, Activity, FileText, User } from 'lucide-react-native';
import { colors } from '@o2plus/theme';

export default function PatientLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.ui.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.ui.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Daily Log',
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
