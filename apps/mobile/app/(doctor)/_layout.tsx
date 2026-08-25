import { Tabs } from 'expo-router';
import { Home, Calendar, Bell, User } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DoctorLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.ui.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.ui.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {/* patients tab hidden — accessed only via router.push from dashboard */}
      <Tabs.Screen name="patients" options={{ href: null }} />
    </Tabs>
  );
}
