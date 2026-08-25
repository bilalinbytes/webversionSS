import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

function RootLayoutNav() {
  const { session, initialized, status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      if (status === 'doctor') {
        if (segments[0] !== '(doctor)') {
          router.replace('/(doctor)');
        }
      } else if (status === 'patient') {
        if (segments[0] !== '(patient)') {
          router.replace('/(patient)');
        }
      } else if (status === 'incomplete') {
        const segList = segments as string[];
        if (segList[0] !== '(auth)' || (segList.length > 1 && segList[1] !== 'complete-profile')) {
          router.replace('/(auth)/complete-profile');
        }
      }
    }
  }, [session, initialized, segments, status]);

  // Show spinner instead of blank white screen during auth init
  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#126969" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
