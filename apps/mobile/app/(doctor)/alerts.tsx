import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Bell, CheckCircle2, Clock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';

interface AlertRow {
  id: string;
  alert_type: string;
  reason_text: string | null;
  created_at: string | null;
  acknowledged_by_doctor: boolean | null;
  is_suppressed: boolean | null;
  patient_id: string;
  patients: { name: string } | null;
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Correct query: join through patients to filter by doctor
      const { data } = await supabase
        .from('disease_alerts')
        .select(`
          id, alert_type, reason_text, created_at,
          acknowledged_by_doctor, is_suppressed, patient_id,
          patients!inner(name, doctor_id)
        `)
        .eq('patients.doctor_id', user.id)
        .eq('is_suppressed', false)
        .order('created_at', { ascending: false })
        .limit(60);

      setAlerts((data as unknown as AlertRow[]) ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  const handleAcknowledge = async (alert: AlertRow) => {
    if (alert.acknowledged_by_doctor) return;
    setAcknowledging(alert.id);
    try {
      await supabase
        .from('disease_alerts')
        .update({ acknowledged_by_doctor: true })
        .eq('id', alert.id);
      setAlerts(prev =>
        prev.map(a => a.id === alert.id ? { ...a, acknowledged_by_doctor: true } : a)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAcknowledging(null);
    }
  };

  const openPatient = (alert: AlertRow) => {
    if (alert.patient_id) {
      router.push(`/(doctor)/patients/${alert.patient_id}` as any);
    }
  };

  const openAlerts = alerts.filter(a => !a.acknowledged_by_doctor);
  const resolvedAlerts = alerts.filter(a => a.acknowledged_by_doctor);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={22} color="#126969" />
          <Text style={styles.headerTitle}>Alerts</Text>
          {openAlerts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{openAlerts.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadAlerts(true)}>
          <Clock size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#126969" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAlerts(true)}
              tintColor="#126969"
              colors={['#126969']}
            />
          }
        >
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle2 size={48} color="#22c55e" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Active Alerts</Text>
              <Text style={styles.emptySub}>
                All patients are stable. New alerts will appear here automatically.
              </Text>
            </View>
          ) : (
            <>
              {/* Open alerts */}
              {openAlerts.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    OPEN — REQUIRES ACTION ({openAlerts.length})
                  </Text>
                  {openAlerts.map(alert => (
                    <View
                      key={alert.id}
                      style={[
                        styles.alertCard,
                        alert.alert_type === 'RED' ? styles.alertRed : styles.alertYellow,
                      ]}
                    >
                      <View style={styles.alertHeader}>
                        <View
                          style={[
                            styles.alertTypeBadge,
                            { backgroundColor: alert.alert_type === 'RED' ? '#dc2626' : '#f59e0b' },
                          ]}
                        >
                          <AlertTriangle size={11} color="#fff" />
                          <Text style={styles.alertTypeBadgeText}>{alert.alert_type}</Text>
                        </View>
                        <Text style={styles.alertPatientName} numberOfLines={1}>
                          {(alert.patients as any)?.name ?? 'Unknown patient'}
                        </Text>
                        <Text style={styles.alertTime}>{fmtDateTime(alert.created_at)}</Text>
                      </View>
                      <Text style={styles.alertReason}>
                        {alert.reason_text ?? 'Alert triggered — review patient status'}
                      </Text>
                      <View style={styles.alertActions}>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => openPatient(alert)}
                        >
                          <Text style={styles.viewBtnText}>View Patient →</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.ackBtn}
                          onPress={() => handleAcknowledge(alert)}
                          disabled={acknowledging === alert.id}
                        >
                          {acknowledging === alert.id ? (
                            <ActivityIndicator size="small" color="#0f6e56" />
                          ) : (
                            <Text style={styles.ackBtnText}>Mark Reviewed ✓</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Resolved alerts */}
              {resolvedAlerts.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                    REVIEWED ({resolvedAlerts.length})
                  </Text>
                  {resolvedAlerts.map(alert => (
                    <TouchableOpacity
                      key={alert.id}
                      style={styles.alertCardResolved}
                      onPress={() => openPatient(alert)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.alertHeader}>
                        <View style={[styles.alertTypeBadge, { backgroundColor: '#94a3b8' }]}>
                          <Text style={styles.alertTypeBadgeText}>{alert.alert_type}</Text>
                        </View>
                        <Text style={[styles.alertPatientName, { color: '#94a3b8' }]} numberOfLines={1}>
                          {(alert.patients as any)?.name ?? 'Unknown'}
                        </Text>
                        <Text style={styles.alertTime}>{fmtDateTime(alert.created_at)}</Text>
                      </View>
                      <Text style={[styles.alertReason, { color: '#94a3b8' }]}>
                        {alert.reason_text ?? 'Alert triggered'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <CheckCircle2 size={14} color="#22c55e" />
                        <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>
                          Reviewed
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  badge: {
    backgroundColor: '#dc2626', borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  refreshBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.8, marginBottom: 10,
  },
  alertCard: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  alertRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  alertYellow: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  alertCardResolved: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alertTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  alertTypeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  alertPatientName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  alertTime: { fontSize: 11, color: '#94a3b8' },
  alertReason: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 10 },
  alertActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1, backgroundColor: '#132d36', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  ackBtn: {
    flex: 1, backgroundColor: '#f0fdf4', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0',
  },
  ackBtnText: { fontSize: 13, fontWeight: '600', color: '#0f6e56' },
});
