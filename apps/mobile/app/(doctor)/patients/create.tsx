import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { CreatePatientForm } from '../../../components/doctor/CreatePatientForm';

export default function CreatePatientScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#132d36" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Patient</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <CreatePatientForm onComplete={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#132d36' },
  content: { flex: 1 },
});
