import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientDiagnosis } from '@o2plus/api-client/patient';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@o2plus/theme';

import { AsthmaLogView } from '../../components/patient/log-views/AsthmaLogView';
import { COPDLogView } from '../../components/patient/log-views/COPDLogView';
import { ILDLogView } from '../../components/patient/log-views/ILDLogView';
import { BronchLogView } from '../../components/patient/log-views/BronchLogView';
import { PostICULogView } from '../../components/patient/log-views/PostICULogView';

export default function DailyLogScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<string>('copd');

  useEffect(() => {
    fetchDiagnosis();
  }, [user]);

  const fetchDiagnosis = async () => {
    if (!user?.id) return;
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const diagRes = await getPatientDiagnosis(config, user.id);
      if (diagRes?.data?.effective_dashboard) {
        setDashboard(diagRes.data.effective_dashboard);
        return;
      }

      // Fallback directly to Supabase if API endpoint didn't respond
      const { data } = await supabase
        .from('patient_diagnoses')
        .select('effective_dashboard')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (data?.effective_dashboard) {
        setDashboard(data.effective_dashboard);
      }
    } catch (err) {
      console.error("Failed to load diagnosis for log screen", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user?.id) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const renderDashboard = () => {
    switch (dashboard) {
      case 'asthma':
        return <AsthmaLogView patientId={user.id} />;
      case 'ild':
        return <ILDLogView patientId={user.id} />;
      case 'bronchiectasis':
        return <BronchLogView patientId={user.id} />;
      case 'post_icu':
        return <PostICULogView patientId={user.id} />;
      case 'copd':
      default:
        return <COPDLogView patientId={user.id} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {renderDashboard()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
