import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, LogOut, Phone, Activity, Calendar, ChevronRight,
  Heart, Bell, ShieldCheck, Clock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';

export default function PatientProfileScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [logCount, setLogCount] = useState<number>(0);
  const [lastLogDate, setLastLogDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [patientRes, diagRes, logsRes] = await Promise.all([
        supabase.from('patients').select('name, mobile_number, date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone').eq('id', user.id).single(),
        supabase.from('patient_diagnoses').select('primary_diagnosis, effective_dashboard, comorbidities').eq('patient_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('daily_logs').select('logged_at').eq('patient_id', user.id).order('logged_at', { ascending: false }).limit(30),
      ]);

      if (patientRes.data) setProfile(patientRes.data);
      if (diagRes.data) setDiagnosis(diagRes.data);
      if (logsRes.data) {
        setLogCount(logsRes.data.length);
        if (logsRes.data.length > 0) {
          setLastLogDate(new Date(logsRes.data[0].logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of O2Plus?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#126969" />
      </View>
    );
  }

  const name = profile?.name || user?.user_metadata?.name || 'Patient';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const age = profile?.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;
  const diagnosisLabel = diagnosis?.primary_diagnosis || 'No diagnosis recorded';
  const dashboardLabel = (() => {
    switch (diagnosis?.effective_dashboard) {
      case 'asthma': return 'Asthma';
      case 'copd': return 'COPD';
      case 'ild': return 'ILD';
      case 'bronchiectasis': return 'Bronchiectasis';
      case 'post_icu': return 'Post ICU';
      default: return '';
    }
  })();

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#126969', '#0d4a4a', '#082b2b']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Profile</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor="#fff"
            colors={['#126969']}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['#1a9393', '#126969']} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.verifiedBadge}>
              <Heart size={12} color="#fff" />
            </View>
          </View>

          <Text style={styles.nameText}>{name}</Text>
          {age && (
            <Text style={styles.subText}>{age} years • {profile?.gender || 'Unknown'}</Text>
          )}
          {diagnosisLabel !== 'No diagnosis recorded' && (
            <View style={styles.diagBadge}>
              <Text style={styles.diagBadgeText}>{dashboardLabel || diagnosisLabel}</Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{logCount}</Text>
              <Text style={styles.statLabel}>Logs (30d)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{lastLogDate ? lastLogDate.split(' ')[0] + ' ' + lastLogDate.split(' ')[1] : '—'}</Text>
              <Text style={styles.statLabel}>Last Log</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#0f6e56', fontSize: 13 }]}>Active</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Patient Details */}
        <Text style={styles.sectionHeading}>Patient Details</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#f0fdfa' }]}>
              <Phone size={20} color="#0d9488" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Phone Number</Text>
              <Text style={styles.listSub}>{profile?.mobile_number ? `+91 ${profile.mobile_number}` : 'Not provided'}</Text>
            </View>
          </View>
          <View style={styles.listDivider} />
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#eff6ff' }]}>
              <Activity size={20} color="#3b82f6" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Diagnosis</Text>
              <Text style={styles.listSub}>{diagnosisLabel}</Text>
            </View>
          </View>
          <View style={styles.listDivider} />
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#fef2f2' }]}>
              <ShieldCheck size={20} color="#ef4444" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Emergency Contact</Text>
              <Text style={styles.listSub}>
                {profile?.emergency_contact_name
                  ? `${profile.emergency_contact_name}${profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ''}`
                  : 'Not registered — contact your doctor to set'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => router.push('/(patient)/log' as any)}>
            <View style={[styles.listIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Clock size={20} color="#22c55e" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Log Today's Health</Text>
              <Text style={styles.listSub}>Record your daily vitals and symptoms</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <View style={styles.listDivider} />
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={() => router.push('/(patient)/records' as any)}>
            <View style={[styles.listIconBox, { backgroundColor: '#fdf4ff' }]}>
              <Activity size={20} color="#c026d3" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Medical Records</Text>
              <Text style={styles.listSub}>View your log history and trends</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
          <View style={styles.listDivider} />
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Daily Reminders', 'Daily logging reminder notifications are scheduled for 9:00 AM every morning.')}
          >
            <View style={[styles.listIconBox, { backgroundColor: '#fff7ed' }]}>
              <Bell size={20} color="#f97316" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Daily Reminders</Text>
              <Text style={styles.listSub}>Daily log reminders • 9:00 AM</Text>
            </View>
            <ChevronRight size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out Securely</Text>
        </TouchableOpacity>

        <Text style={styles.versionInfo}>O2Plus • Saans Health Platform</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  headerGradient: { height: 220, width: '100%', position: 'absolute', top: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  scrollContent: { paddingTop: 90, paddingHorizontal: 20, paddingBottom: 60 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 10, marginBottom: 32,
  },
  avatarWrap: { position: 'relative', marginBottom: 16, marginTop: -50 },
  avatarGradient: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff', shadowColor: '#126969', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 1 },
  verifiedBadge: {
    position: 'absolute', bottom: 4, right: 4, backgroundColor: '#0f6e56',
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
  },
  nameText: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subText: { fontSize: 14, color: '#64748b', marginBottom: 10 },
  diagBadge: { backgroundColor: '#f0fdfa', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5, marginBottom: 20 },
  diagBadgeText: { color: '#0d9488', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#64748b' },
  statDivider: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  sectionHeading: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 6 },
  listGroup: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 3 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  listIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  listTextContent: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  listSub: { fontSize: 13, color: '#64748b' },
  listDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16,
    borderWidth: 1, borderColor: '#fef2f2', gap: 10, marginBottom: 24,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
  versionInfo: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 8 },
});
