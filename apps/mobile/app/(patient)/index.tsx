import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Activity, Wind, FileText, ChevronRight } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getPatientProfile, getPatientDiagnosis, getPatientRedFlagScore } from '@o2plus/api-client/patient';
import { fetchAqiForCoordinates } from '@o2plus/api-client/aqi';
import { getRiskColor, getRiskLabel } from '@o2plus/core';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PatientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [aqi, setAqi] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const [profRes, diagRes, scoreRes, aqiRes] = await Promise.all([
        getPatientProfile(config, user!.id),
        getPatientDiagnosis(config, user!.id),
        getPatientRedFlagScore(config, user!.id),
        // Hardcoding New Delhi for AQI example since native GPS requires permissions
        fetchAqiForCoordinates(config, 28.6139, 77.2090)
      ]);

      if (profRes.data) setProfile(profRes.data);
      if (diagRes.data) setDiagnosis(diagRes.data);
      if (scoreRes.data) setScore(scoreRes.data.global_score);
      else setScore(0); // fallback
      
      if (aqiRes !== null) setAqi(aqiRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const riskColor = score !== null ? getRiskColor(score) : colors.risk.green;
  const riskLabel = score !== null ? getRiskLabel(score) : 'Good';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greetingText}>Hello, {profile?.name || 'Patient'} 👋</Text>
          <Text style={styles.subtitleText}>{diagnosis?.primary_diagnosis || 'O2+ Care Program'}</Text>
        </View>

        {/* Main Status Card */}
        <View style={[styles.statusCard, { backgroundColor: riskColor.bg }]}>
          <View style={styles.statusHeader}>
            <Activity size={24} color={riskColor.text} />
            <Text style={[styles.statusTitle, { color: riskColor.text }]}>Current Status</Text>
          </View>
          <Text style={[styles.statusMain, { color: riskColor.text }]}>{riskLabel}</Text>
          <Text style={[styles.statusDesc, { color: riskColor.text }]}>
            {score !== null && score >= 3 
              ? 'Your vitals indicate you might need attention. Please contact your doctor.' 
              : 'Your vitals are stable. Keep up the good work!'}
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>What would you like to do?</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(patient)/log')}
          >
            <View style={[styles.iconBg, { backgroundColor: colors.brand.primaryLight }]}>
              <Activity size={24} color={colors.brand.primaryDark} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Log Daily Vitals</Text>
              <Text style={styles.actionSub}>Record your SpO2 & symptoms</Text>
            </View>
            <ChevronRight size={20} color={colors.ui.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(patient)/records')}
          >
            <View style={[styles.iconBg, { backgroundColor: colors.risk.yellow.bg }]}>
              <FileText size={24} color={colors.risk.yellow.solid} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Medical Records</Text>
              <Text style={styles.actionSub}>View prescriptions & PFTs</Text>
            </View>
            <ChevronRight size={20} color={colors.ui.textMuted} />
          </TouchableOpacity>
        </View>

        {/* AQI Widget */}
        <Text style={styles.sectionTitle}>Environmental</Text>
        <View style={styles.aqiCard}>
          <View style={styles.aqiLeft}>
            <Wind size={32} color={colors.ui.textPrimary} />
            <View style={styles.aqiTextCont}>
              <Text style={styles.aqiTitle}>Air Quality Index</Text>
              <Text style={styles.aqiValue}>
                {aqi !== null ? `${aqi > 100 ? 'Poor' : aqi > 50 ? 'Moderate' : 'Good'} (${aqi})` : 'Fetching...'}
              </Text>
            </View>
          </View>
          <View style={[styles.aqiBadge, { 
            backgroundColor: aqi !== null && aqi > 100 ? colors.risk.red.bg : aqi !== null && aqi > 50 ? colors.risk.yellow.bg : colors.risk.green.bg 
          }]}>
            <Text style={[styles.aqiBadgeText, { 
              color: aqi !== null && aqi > 100 ? colors.risk.red.solid : aqi !== null && aqi > 50 ? colors.risk.yellow.solid : colors.risk.green.solid 
            }]}>
              {aqi !== null ? (aqi > 100 ? 'Unhealthy' : aqi > 50 ? 'Fair' : 'Good') : '...'}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ui.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 24 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: colors.ui.textPrimary, marginBottom: 4 },
  subtitleText: { fontSize: 16, color: colors.ui.textMuted },
  
  statusCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  statusMain: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  statusDesc: { fontSize: 14, opacity: 0.9, lineHeight: 20 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.ui.textPrimary, marginBottom: 16 },
  actionsGrid: { gap: 12, marginBottom: 32 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBg: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16,
  },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.ui.textPrimary, marginBottom: 2 },
  actionSub: { fontSize: 13, color: colors.ui.textMuted },

  aqiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aqiLeft: { flexDirection: 'row', alignItems: 'center' },
  aqiTextCont: { marginLeft: 16 },
  aqiTitle: { fontSize: 13, color: colors.ui.textMuted, marginBottom: 2 },
  aqiValue: { fontSize: 16, fontWeight: 'bold', color: colors.ui.textPrimary },
  aqiBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  aqiBadgeText: { fontSize: 12, fontWeight: 'bold' }
});
