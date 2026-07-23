import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { colors } from '@o2plus/theme';
import { useAuth } from '../../contexts/AuthContext';
import { submitDailyLog } from '@o2plus/api-client/patient';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// In a full implementation we would use react-hook-form + zod resolver with DailyLogSchema from @o2plus/validation

export default function DailyLogScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [spo2, setSpo2] = useState('');
  const [mmrc, setMmrc] = useState('');

  const handleSubmit = async () => {
    if (!spo2 || !mmrc) {
      Alert.alert('Missing fields', 'Please enter your SpO2 and mMRC score.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        patient_id: user?.id,
        spo2_rest: parseInt(spo2),
        mmrc_today: parseInt(mmrc),
        vas_symptoms: 0,
        medication_compliance: true
      };

      // Extract the current session token to pass to the backend
      const { data: { session } } = await supabase.auth.getSession();
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      
      const res = await submitDailyLog(config, payload, session?.access_token);
      
      if (res.success) {
        Alert.alert('Success', 'Your daily log has been recorded successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', res.error || 'Failed to submit log');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Daily Check-in</Text>
        <Text style={styles.subtitle}>Please log your vitals for today.</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Resting SpO2 (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 96"
            keyboardType="number-pad"
            value={spo2}
            onChangeText={setSpo2}
            maxLength={3}
          />
          <Text style={styles.helper}>Measure while sitting quietly for 5 minutes.</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Breathlessness (mMRC Score)</Text>
          <Text style={styles.helper}>0 (Not troubled) to 4 (Too breathless to leave house)</Text>
          <View style={styles.segmented}>
            {[0, 1, 2, 3, 4].map(num => (
              <TouchableOpacity 
                key={num} 
                style={[styles.segmentBtn, mmrc === num.toString() && styles.segmentBtnActive]}
                onPress={() => setMmrc(num.toString())}
              >
                <Text style={[styles.segmentText, mmrc === num.toString() && styles.segmentTextActive]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Daily Log</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ui.surface },
  scrollContent: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.ui.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.ui.textMuted, marginBottom: 32 },
  
  formGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: colors.ui.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ui.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  helper: { fontSize: 13, color: colors.ui.textMuted, marginTop: 6, marginBottom: 8 },
  
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: { fontSize: 16, fontWeight: 'bold', color: colors.ui.textMuted },
  segmentTextActive: { color: colors.ui.textPrimary },

  submitBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
