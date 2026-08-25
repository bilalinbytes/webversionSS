import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const [specialisation, setSpecialisation] = useState('');
  const [hospital, setHospital] = useState('');
  const [accepts, setAccepts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        setUserEmail(user.email || '');
      }
    });
  }, []);

  const handleSubmit = async () => {
    if (!specialisation.trim()) return setError('Specialisation is required');
    if (!hospital.trim()) return setError('Hospital is required');

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: insertError } = await supabase.from('doctors').upsert({
        id: user.id,
        name: userName || 'Doctor',
        email: userEmail,
        specialisation,
        hospital,
        accepts_appointments: accepts,
      }, { onConflict: 'id' });

      if (insertError) throw insertError;
      
      // Refresh session to trigger AuthContext state update
      await supabase.auth.refreshSession();
      router.replace('/(doctor)');
      
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Complete your profile.</Text>
        <Text style={styles.subtitle}>Just one more step to access your clinical dashboard.</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <Text style={styles.readonly}>{userName || 'Loading...'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.readonly}>{userEmail || 'Loading...'}</Text>
        </View>

        <Text style={styles.label}>Specialisation</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Pulmonologist" 
          value={specialisation} 
          onChangeText={setSpecialisation} 
        />

        <Text style={styles.label}>Hospital / Institution</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. AIIMS Delhi" 
          value={hospital} 
          onChangeText={setHospital} 
        />

        <TouchableOpacity style={styles.checkboxRow} onPress={() => setAccepts(!accepts)}>
          <View style={[styles.checkbox, accepts && styles.checkboxChecked]}>
            {accepts && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>Accept appointment requests from patients</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save and Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  readonly: { fontSize: 16, color: '#64748b', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, fontSize: 16, color: '#0f172a', marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#126969', borderColor: '#126969' },
  checkboxLabel: { fontSize: 14, color: '#475569', flex: 1 },
  submitBtn: { backgroundColor: '#126969', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#ef4444', marginBottom: 16, textAlign: 'center' }
});
