import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarClock, Check, X, Clock } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from 'expo-router';

export default function AppointmentsScreen() {
  const [activeTab, setActiveTab] = useState<'settings' | 'queue'>('queue');
  const [queueStatus, setQueueStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      };

      const [settRes, apptRes] = await Promise.all([
        fetch(`${baseUrl}/api/doctor/appointment-settings`, { headers }),
        fetch(`${baseUrl}/api/appointments`, { headers })
      ]);

      if (settRes.ok) {
        const body = await settRes.json();
        setSettings(body.settings);
      }
      if (apptRes.ok) {
        const body = await apptRes.json();
        setAppointments(body.appointments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const updateAppointment = async (id: string, status: string) => {
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${baseUrl}/api/appointments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        loadData();
      } else {
        const body = await res.json();
        Alert.alert('Error', body.error || 'Failed to update');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    }
  };

  const getVisibleAppointments = () => {
    return appointments.filter(a => {
      let st = a.status;
      try {
        if (a.notes) {
          const m = JSON.parse(a.notes);
          if (m.workflow_status) st = m.workflow_status;
        }
      } catch (e) {}

      if (st === 'cancelled') st = 'rejected';
      if (st === 'requested' || st === 'patient_requested_another') st = 'pending';
      if (st !== 'pending' && st !== 'rejected' && st !== 'completed') st = 'approved';

      return st === queueStatus;
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color="#126969" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'queue' && styles.tabActive]} onPress={() => setActiveTab('queue')}>
          <Text style={[styles.tabText, activeTab === 'queue' && styles.tabTextActive]}>Queue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'settings' && styles.tabActive]} onPress={() => setActiveTab('settings')}>
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#126969"
            colors={['#126969']}
          />
        }
      >
        {activeTab === 'queue' ? (
          <>
            <View style={styles.queueTabs}>
              {['pending', 'approved', 'rejected', 'completed'].map(q => (
                <TouchableOpacity key={q} style={[styles.qTab, queueStatus === q && styles.qTabActive]} onPress={() => setQueueStatus(q as any)}>
                  <Text style={[styles.qTabText, queueStatus === q && styles.qTabTextActive]}>{q.charAt(0).toUpperCase() + q.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {getVisibleAppointments().length === 0 ? (
              <View style={styles.emptyState}>
                <CalendarClock size={40} color="#94a3b8" />
                <Text style={styles.emptyText}>No {queueStatus} appointments.</Text>
              </View>
            ) : (
              getVisibleAppointments().map(app => {
                let meta: any = {};
                try { meta = JSON.parse(app.notes || '{}'); } catch(e){}
                const dateStr = new Date(app.scheduled_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                return (
                  <View key={app.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{app.patients?.name || 'Patient'}</Text>
                    <Text style={styles.cardSub}>{dateStr} • {meta.mode || 'Clinic'}</Text>
                    {meta.reason && <Text style={styles.cardMeta}>Reason: {meta.reason}</Text>}

                    <View style={styles.actionRow}>
                      {queueStatus === 'pending' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.brand.primary }]} onPress={() => updateAppointment(app.id, 'approved')}>
                          <Text style={styles.actionText}>Approve</Text>
                        </TouchableOpacity>
                      )}
                      {(queueStatus === 'pending' || queueStatus === 'approved') && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => updateAppointment(app.id, 'rejected')}>
                          <Text style={styles.actionText}>Reject</Text>
                        </TouchableOpacity>
                      )}
                      {queueStatus === 'approved' && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => updateAppointment(app.id, 'completed')}>
                          <Text style={styles.actionText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Settings</Text>
            <Text style={styles.cardSub}>Update via Web App for advanced slot mapping.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Accept Appointments</Text>
              <Text style={styles.value}>{settings?.accepts_appointments ? 'Yes' : 'No'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Consultation Type</Text>
              <Text style={styles.value}>{settings?.consultation_type || 'both'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Slot Duration</Text>
              <Text style={styles.value}>{settings?.slot_duration || 15} mins</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, padding: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#126969' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#126969' },
  content: { padding: 16 },
  queueTabs: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  qTab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#e2e8f0' },
  qTabActive: { backgroundColor: '#126969' },
  qTabText: { fontSize: 13, fontWeight: '500', color: '#475569' },
  qTabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  cardMeta: { fontSize: 13, color: '#475569', fontStyle: 'italic', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center', flex: 1 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  field: { marginTop: 16 },
  label: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  value: { fontSize: 15, color: '#0f172a', fontWeight: '500' }
});
