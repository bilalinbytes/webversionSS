import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Activity, FileText, Clock, Settings, User, CheckCircle } from 'lucide-react-native';
import { Svg, Polyline } from 'react-native-svg';
import { supabase } from '../../../lib/supabase';
import { colors } from '@o2plus/theme';

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Overview');

  const [instructionText, setInstructionText] = useState('');
  const [sendingInstruction, setSendingInstruction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    if (id) fetchPatientDetails();
  }, [id]);

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, name, mobile_number, date_of_birth, gender,
          patient_diagnoses(primary_diagnosis, effective_dashboard, comorbidities),
          disease_alerts(id, alert_type, reason_text, created_at, acknowledged_by_doctor),
          red_flag_scores(global_score, computed_at),
          daily_logs(id, logged_at, spo2_rest, mmrc_today, aqi_value),
          medications(id, drug_name, dose, dose_unit, frequency, route, start_date, end_date, serial_number),
          doctor_instructions(id, instruction_text, created_at)
        `)
        .eq('id', id)
        .order('logged_at', { ascending: false, foreignTable: 'daily_logs' })
        .order('start_date', { ascending: false, foreignTable: 'medications' })
        .order('created_at', { ascending: false, foreignTable: 'doctor_instructions' })
        .single();
        
      if (error) throw error;
      setPatient(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#126969" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.center}>
        <Text>Patient not found.</Text>
      </View>
    );
  }

  const diagnosis = patient.patient_diagnoses?.[0]?.primary_diagnosis || 'Unknown';
  const score = patient.red_flag_scores?.[0]?.global_score ?? '--';
  const age = patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : '--';

  // Sort logs newest-first (already ordered from DB, but sort client-side as safety)
  const logs = [...(patient.daily_logs || [])].sort((a: any, b: any) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

  // Build history timeline events from logs + instructions
  const historyEvents = [
    ...logs.map((l: any) => ({ type: 'log', date: l.logged_at, title: 'Daily Log Submitted', detail: `SpO₂: ${l.spo2_rest ?? '—'}%  ·  mMRC: ${l.mmrc_today ?? '—'}  ·  AQI: ${l.aqi_value ?? '—'}` })),
    ...(patient.doctor_instructions || []).map((i: any) => ({ type: 'instruction', date: i.created_at, title: 'Doctor Instruction', detail: i.instruction_text }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSendInstruction = async () => {
    if (!instructionText.trim()) return;
    const words = instructionText.trim().split(/\s+/).filter(Boolean).length;
    if (words > 150) return;

    setSendingInstruction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('doctor_instructions')
        .insert({
          patient_id: id,
          doctor_id: user?.id,
          instruction_text: instructionText.trim(),
        })
        .select('id, instruction_text, created_at')
        .single();
      
      if (error) throw error;
      
      setPatient((prev: any) => ({
        ...prev,
        doctor_instructions: [data, ...(prev.doctor_instructions || [])]
      }));
      setInstructionText('');
      setToastMessage('Sent!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingInstruction(false);
    }
  };

  const renderSparkline = (dataPoints: number[], color: string, minLimit: number, maxLimit: number) => {
    if (dataPoints.length === 0) return null;
    const height = 80;
    const width = 300;
    const max = Math.max(...dataPoints, maxLimit);
    const min = Math.min(...dataPoints, minLimit);
    const range = max - min || 1;
    
    const stepX = width / Math.max(dataPoints.length - 1, 1);
    
    const points = dataPoints.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <View style={{ height, marginVertical: 8 }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <Polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        </Svg>
      </View>
    );
  };

  // Render a sparkline chart
  const renderAnalytics = () => {
    if (logs.length === 0) return <Text style={styles.emptyText}>No logs available yet.</Text>;
    
    // Take last 30 logs and reverse so oldest is left, newest right
    const chartLogs = logs.slice(0, 30).reverse();
    const spo2Data = chartLogs.map((l: any) => l.spo2_rest).filter((v: any) => v != null);
    const mmrcData = chartLogs.map((l: any) => l.mmrc_today).filter((v: any) => v != null);
    
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SpO2 Trend (Last 30 days)</Text>
          {renderSparkline(spo2Data, '#e24b4a', 70, 100)}
          <View style={styles.dateLabels}>
            {chartLogs.length > 0 && <Text style={styles.dateLabelText}>{new Date(chartLogs[0].created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>}
            {chartLogs.length > 1 && <Text style={styles.dateLabelText}>{new Date(chartLogs[chartLogs.length - 1].created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>mMRC Breathlessness (Last 30 days)</Text>
          {renderSparkline(mmrcData, '#f5a623', 0, 4)}
          <View style={styles.dateLabels}>
            {chartLogs.length > 0 && <Text style={styles.dateLabelText}>{new Date(chartLogs[0].created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>}
            {chartLogs.length > 1 && <Text style={styles.dateLabelText}>{new Date(chartLogs[chartLogs.length - 1].created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</Text>}
          </View>
        </View>
      </>
    );
  };

  const phoneNumber = patient.mobile_number ? `tel:+91${patient.mobile_number.replace(/\D/g, '')}` : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#132d36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{patient.name}</Text>
        {/* Call patient directly */}
        <TouchableOpacity style={styles.settingsBtn} onPress={() => phoneNumber && Linking.openURL(phoneNumber)}>
          <Settings size={20} color="#132d36" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Overview', 'Analytics', 'Treatment', 'History'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchPatientDetails}
            tintColor="#126969"
            colors={['#126969']}
          />
        }
      >
        {activeTab === 'Overview' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <User size={18} color="#126969" />
                <Text style={styles.cardTitle}>Basic Information</Text>
              </View>
              <View style={styles.infoRow}><Text style={styles.infoLbl}>Age</Text><Text style={styles.infoVal}>{age} yrs</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLbl}>Gender</Text><Text style={styles.infoVal}>{patient.gender || 'Unknown'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLbl}>Phone</Text><Text style={styles.infoVal}>+91 {patient.mobile_number}</Text></View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Activity size={18} color="#126969" />
                <Text style={styles.cardTitle}>Diagnosis & Risk</Text>
              </View>
              <View style={styles.infoRow}><Text style={styles.infoLbl}>Diagnosis</Text><Text style={styles.infoVal}>{diagnosis}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLbl}>Risk Score</Text><Text style={styles.infoVal}>{score} / 10</Text></View>
            </View>

            {patient.disease_alerts && patient.disease_alerts.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.risk.red.solid }]}>Recent Alerts</Text>
                </View>
                {patient.disease_alerts.map((a: any, i: number) => (
                  <View key={i} style={styles.alertRow}>
                    <Text style={styles.alertType}>{a.alert_type}</Text>
                    <Text style={styles.alertDesc}>{a.reason_text}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Doctor Instructions</Text>
              </View>
              {toastMessage && (
                <View style={styles.toast}>
                  <CheckCircle size={16} color="#059669" />
                  <Text style={styles.toastText}>{toastMessage}</Text>
                </View>
              )}
              <TextInput
                style={styles.instructionInput}
                multiline
                placeholder="Write a clear instruction for the patient..."
                value={instructionText}
                onChangeText={setInstructionText}
                textAlignVertical="top"
              />
              <View style={styles.composerFooter}>
                <Text style={[styles.wordCount, (instructionText.trim().split(/\s+/).filter(Boolean).length > 150) && styles.wordCountOver]}>
                  {instructionText.trim().split(/\s+/).filter(Boolean).length}/150 words
                </Text>
                <TouchableOpacity
                  style={[styles.sendBtn, (!instructionText.trim() || sendingInstruction || instructionText.trim().split(/\s+/).filter(Boolean).length > 150) && styles.sendBtnDisabled]}
                  onPress={handleSendInstruction}
                  disabled={!instructionText.trim() || sendingInstruction || instructionText.trim().split(/\s+/).filter(Boolean).length > 150}
                >
                  <Text style={styles.sendBtnText}>{sendingInstruction ? 'Sending...' : 'Send Instruction'}</Text>
                </TouchableOpacity>
              </View>
              
              {patient.doctor_instructions && patient.doctor_instructions.length > 0 && (
                <View style={styles.instructionsList}>
                  {!instructionsOpen ? (
                    <View style={styles.instructionItem}>
                      <Text style={styles.instructionBadge}>Latest</Text>
                      <Text style={styles.instructionText}>{patient.doctor_instructions[0].instruction_text}</Text>
                      <Text style={styles.instructionTime}>{new Date(patient.doctor_instructions[0].created_at).toLocaleString('en-IN')}</Text>
                    </View>
                  ) : (
                    patient.doctor_instructions.map((ins: any, i: number) => (
                      <View key={i} style={styles.instructionItem}>
                        {i === 0 && <Text style={styles.instructionBadge}>Latest</Text>}
                        <Text style={styles.instructionText}>{ins.instruction_text}</Text>
                        <Text style={styles.instructionTime}>{new Date(ins.created_at).toLocaleString('en-IN')}</Text>
                      </View>
                    ))
                  )}
                  {patient.doctor_instructions.length > 1 && (
                    <TouchableOpacity onPress={() => setInstructionsOpen(!instructionsOpen)} style={styles.viewAllBtn}>
                      <Text style={styles.viewAllBtnText}>{instructionsOpen ? 'Hide' : `View all (${patient.doctor_instructions.length})`}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}
        
        {activeTab === 'Analytics' && (
          <View style={styles.tabContent}>
            {renderAnalytics()}
          </View>
        )}

        {activeTab === 'Treatment' && (
          <View style={styles.tabContent}>
            {(() => {
              const meds = patient.medications || [];
              if (meds.length === 0) {
                return (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <FileText size={18} color="#126969" />
                      <Text style={styles.cardTitle}>Active Medications</Text>
                    </View>
                    <Text style={styles.emptyText}>No active medications.</Text>
                  </View>
                );
              }
              const grouped = meds.reduce((acc: any, med: any) => {
                const date = med.start_date;
                if (!acc[date]) acc[date] = [];
                acc[date].push(med);
                return acc;
              }, {});
              const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              const today = new Date().toISOString().split('T')[0];

              return sortedDates.map((date, i) => (
                <View key={date} style={styles.card}>
                  <View style={styles.cardHeaderSpaced}>
                    <View style={styles.row}>
                      {i === 0 && <Text style={styles.latestBadge}>Latest</Text>}
                      <Text style={styles.dateHeader}>{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                    </View>
                    <Text style={styles.medCount}>{grouped[date].length} medication{grouped[date].length !== 1 ? 's' : ''}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, { width: 50 }]}>S. No.</Text>
                        <Text style={[styles.tableCell, { width: 120 }]}>Drug Name</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Dose</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>Frequency</Text>
                        <Text style={[styles.tableCell, { width: 100 }]}>End Date</Text>
                        <Text style={[styles.tableCell, { width: 90 }]}>Status</Text>
                      </View>
                      {grouped[date].map((med: any, j: number) => {
                        const isActive = !med.end_date || med.end_date >= today;
                        return (
                          <View key={med.id || j} style={[styles.tableRow, !isActive && styles.rowInactive]}>
                            <Text style={[styles.tableCell, { width: 50 }]}>{med.serial_number || j + 1}</Text>
                            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={2}>{med.drug_name}</Text>
                            <Text style={[styles.tableCell, { width: 100 }]}>{med.dose != null ? `${med.dose} ${med.dose_unit || ''}` : '--'}</Text>
                            <Text style={[styles.tableCell, { width: 100 }]}>{med.frequency || '--'}</Text>
                            <Text style={[styles.tableCell, { width: 100 }]}>{med.end_date ? new Date(med.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Ongoing'}</Text>
                            <Text style={[styles.tableCell, { width: 90, color: isActive ? '#059669' : '#94a3b8' }]}>{isActive ? 'Continue' : 'Discontinued'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ));
            })()}
          </View>
        )}

        {activeTab === 'History' && (
          <View style={styles.tabContent}>
            {historyEvents.length > 0 ? (
              historyEvents.map((evt, i) => (
                <View key={i} style={styles.historyRow}>
                  <View style={styles.historyTimeline}>
                    <View style={styles.historyDot} />
                    {i !== historyEvents.length - 1 && <View style={styles.historyLine} />}
                  </View>
                  <View style={styles.historyCard}>
                    <Text style={styles.historyDate}>{new Date(evt.date).toLocaleString('en-IN')}</Text>
                    <Text style={styles.historyTitle}>{evt.title}</Text>
                    <Text style={styles.historyDetail}>{evt.detail}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No history available.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  settingsBtn: { padding: 8, marginRight: -8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#132d36' },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#126969' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#126969' },
  
  content: { padding: 16, gap: 16 },
  tabContent: { gap: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  cardHeaderSpaced: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLbl: { fontSize: 14, color: '#64748b' },
  infoVal: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  
  alertRow: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 8 },
  alertType: { fontSize: 12, fontWeight: 'bold', color: colors.risk.red.solid, marginBottom: 4 },
  alertDesc: { fontSize: 13, color: colors.risk.red.solid },

  emptyText: { color: '#94a3b8', fontSize: 14 },
  
  // Analytics Chart Styles
  dateLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dateLabelText: { fontSize: 11, color: '#94a3b8' },
  
  // Meds Styles
  latestBadge: { backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  dateHeader: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  medCount: { fontSize: 13, color: '#64748b' },
  tableScroll: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowInactive: { opacity: 0.6 },
  tableCell: { fontSize: 13, color: '#475569', paddingRight: 8 },
  
  // Instructions Composer Styles
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', padding: 12, borderRadius: 8, marginBottom: 12 },
  toastText: { color: '#059669', fontSize: 14, fontWeight: '500' },
  instructionInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, minHeight: 80, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  composerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  wordCount: { fontSize: 12, color: '#64748b' },
  wordCountOver: { color: colors.risk.red.solid },
  sendBtn: { backgroundColor: '#126969', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  instructionsList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  instructionItem: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8 },
  instructionBadge: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', color: '#475569', fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 6, overflow: 'hidden' },
  instructionText: { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  instructionTime: { fontSize: 11, color: '#94a3b8' },
  viewAllBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  viewAllBtnText: { fontSize: 13, color: '#126969', fontWeight: '500' },
  
  // History Timeline Styles
  historyRow: { flexDirection: 'row', marginBottom: 0 },
  historyTimeline: { width: 30, alignItems: 'center' },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#126969', zIndex: 1 },
  historyLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: -2, marginBottom: -4 },
  historyCard: { flex: 1, paddingBottom: 24, paddingTop: -4 },
  historyDate: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  historyTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  historyDetail: { fontSize: 14, color: '#475569' },
});
