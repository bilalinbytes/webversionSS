import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Activity, Heart, ChevronDown, ChevronUp, Pill, Stethoscope } from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SparkLine({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const W = 260, H = 52;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4;
    return `${x},${y}`;
  }).join(' ');
  return (
    <View style={{ width: '100%', height: H, marginVertical: 6 }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function RecordsScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [pfts, setPfts] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const loadRecords = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [logsRes, pftsRes, medsRes] = await Promise.all([
        supabase.from('daily_logs')
          .select('id, logged_at, spo2_rest, mmrc_today, aqi_value, vas_symptoms')
          .eq('patient_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(30),
        supabase.from('pft_records')
          .select('id, test_date, fev1, fvc, fev1_fvc_ratio, dlco')
          .eq('patient_id', user.id)
          .order('test_date', { ascending: false })
          .limit(5),
        supabase.from('medications')
          .select('id, drug_name, dose, dose_unit, frequency, route, start_date, end_date')
          .eq('patient_id', user.id)
          .order('start_date', { ascending: false }),
      ]);
      setLogs(logsRes.data ?? []);
      setPfts(pftsRes.data ?? []);
      setMedications(medsRes.data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadRecords(); }, [loadRecords]));

  const spo2Trend = logs.map(l => l.spo2_rest).filter(Boolean).reverse();
  const mmrcTrend = logs.map(l => l.mmrc_today).filter(v => v !== null && v !== undefined).reverse();
  const displayedLogs = showAllLogs ? logs : logs.slice(0, 7);
  const today = new Date().toISOString().split('T')[0]!;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#126969" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <FileText size={22} color="#126969" />
        <Text style={styles.headerTitle}>Medical Records</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRecords(true)}
            tintColor="#126969"
            colors={['#126969']}
          />
        }
      >

        {/* ── Trends Section ── */}
        {spo2Trend.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Heart size={18} color="#e24b4a" />
              <Text style={styles.cardTitle}>SpO₂ Trend — Last {spo2Trend.length} logs</Text>
            </View>
            <SparkLine values={spo2Trend} color="#e24b4a" />
            <View style={styles.trendLegend}>
              <Text style={styles.trendLegendText}>Min: {Math.min(...spo2Trend)}%</Text>
              <Text style={styles.trendLegendText}>Avg: {Math.round(spo2Trend.reduce((a, b) => a + b, 0) / spo2Trend.length)}%</Text>
              <Text style={styles.trendLegendText}>Max: {Math.max(...spo2Trend)}%</Text>
            </View>
          </View>
        )}

        {mmrcTrend.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Activity size={18} color="#f5a623" />
              <Text style={styles.cardTitle}>Breathlessness (mMRC) — Last {mmrcTrend.length} logs</Text>
            </View>
            <SparkLine values={mmrcTrend} color="#f5a623" />
            <View style={styles.trendLegend}>
              <Text style={styles.trendLegendText}>Latest: Grade {mmrcTrend[mmrcTrend.length - 1]}</Text>
              <Text style={styles.trendLegendText}>Avg: {(mmrcTrend.reduce((a, b) => a + b, 0) / mmrcTrend.length).toFixed(1)}</Text>
            </View>
          </View>
        )}

        {/* ── PFT Records ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Stethoscope size={18} color="#4527a0" />
            <Text style={styles.cardTitle}>PFT Results</Text>
          </View>
          {pfts.length > 0 ? (
            pfts.map((pft, i) => (
              <View key={pft.id} style={[styles.pftRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 12 }]}>
                <Text style={styles.pftDate}>{fmtDate(pft.test_date)}{i === 0 ? ' (Latest)' : ''}</Text>
                <View style={styles.pftGrid}>
                  {pft.fev1_fvc_ratio !== null && <View style={styles.pftBox}><Text style={styles.pftLabel}>FEV₁/FVC</Text><Text style={styles.pftValue}>{pft.fev1_fvc_ratio}%</Text></View>}
                  {pft.fev1 !== null && <View style={styles.pftBox}><Text style={styles.pftLabel}>FEV₁</Text><Text style={styles.pftValue}>{pft.fev1} L</Text></View>}
                  {pft.fvc !== null && <View style={styles.pftBox}><Text style={styles.pftLabel}>FVC</Text><Text style={styles.pftValue}>{pft.fvc} L</Text></View>}
                  {pft.dlco !== null && <View style={styles.pftBox}><Text style={styles.pftLabel}>DLCO</Text><Text style={styles.pftValue}>{pft.dlco}%</Text></View>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptySubText}>No PFT tests recorded yet. Your doctor will upload your spirometry results.</Text>
          )}
        </View>

        {/* ── Current Medications ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Pill size={18} color="#0d9488" />
            <Text style={styles.cardTitle}>Current Medications</Text>
          </View>
          {medications.length > 0 ? (
            medications.map((med, i) => {
              const isActive = !med.end_date || med.end_date >= today;
              return (
                <View key={med.id} style={[styles.medRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8, paddingTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.drug_name}</Text>
                    <Text style={styles.medDetail}>
                      {med.dose ? `${med.dose} ${med.dose_unit ?? ''} ` : ''}{med.route ? `(${med.route})` : ''}{med.frequency ? ` · ${med.frequency}` : ''}
                    </Text>
                    <Text style={styles.medDate}>
                      {fmtDate(med.start_date)} → {med.end_date ? fmtDate(med.end_date) : 'Ongoing'}
                    </Text>
                  </View>
                  <View style={[styles.medStatus, { backgroundColor: isActive ? '#f0fdf4' : '#f8fafc' }]}>
                    <Text style={[styles.medStatusText, { color: isActive ? '#0f6e56' : '#94a3b8' }]}>
                      {isActive ? 'Active' : 'Stopped'}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptySubText}>No prescriptions recorded yet. Your doctor will prescribe your medications here.</Text>
          )}
        </View>

        {/* ── Daily Log History ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={18} color="#126969" />
            <Text style={styles.cardTitle}>Log History ({logs.length} entries)</Text>
          </View>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No logs recorded yet.</Text>
          ) : (
            <>
              {displayedLogs.map((log, i) => (
                <View key={log.id} style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8, paddingTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logDate}>{fmtDate(log.logged_at)}</Text>
                    <Text style={styles.logDetails}>
                      {log.spo2_rest ? `SpO₂ ${log.spo2_rest}%` : ''}
                      {log.mmrc_today !== null ? ` · mMRC ${log.mmrc_today}` : ''}
                      {log.aqi_value ? ` · AQI ${log.aqi_value}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.spo2Badge, { backgroundColor: (log.spo2_rest ?? 0) < 90 ? '#fef2f2' : '#f0fdf4' }]}>
                    <Text style={[styles.spo2BadgeText, { color: (log.spo2_rest ?? 0) < 90 ? '#dc2626' : '#0f6e56' }]}>
                      {log.spo2_rest ? `${log.spo2_rest}%` : '—'}
                    </Text>
                  </View>
                </View>
              ))}
              {logs.length > 7 && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllLogs(!showAllLogs)}>
                  {showAllLogs ? <ChevronUp size={16} color="#126969" /> : <ChevronDown size={16} color="#126969" />}
                  <Text style={styles.showMoreText}>{showAllLogs ? 'Show less' : `Show all ${logs.length} logs`}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  trendLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  trendLegendText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  emptySubText: { color: '#94a3b8', fontSize: 13, lineHeight: 18, paddingVertical: 4 },
  pftDate: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 10 },
  pftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pftBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, minWidth: '45%', flex: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  pftLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  pftValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  pftRow: {},
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  medDetail: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  medDate: { fontSize: 11, color: '#94a3b8' },
  medStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  medStatusText: { fontSize: 12, fontWeight: '700' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logDate: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  logDetails: { fontSize: 12, color: '#64748b' },
  spo2Badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  spo2BadgeText: { fontSize: 13, fontWeight: '700' },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  showMoreText: { fontSize: 13, fontWeight: '600', color: '#126969' },
});
