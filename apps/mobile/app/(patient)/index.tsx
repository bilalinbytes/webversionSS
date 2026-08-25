import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Activity, Wind, Heart, CalendarClock, CheckCircle2, CircleDashed, AlertCircle } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { usePatientHomeData } from '../../hooks/usePatientHomeData';
import { getPatientDiagnosis } from '@o2plus/api-client/patient';
import { supabase } from '../../lib/supabase';
import AsthmaDashboard from '../../components/patient/asthma/AsthmaDashboard';
import COPDDashboard from '../../components/patient/copd/COPDDashboard';
import ILDDashboard from '../../components/patient/ild/ILDDashboard';
import BronchiectasisDashboard from '../../components/patient/bronchiectasis/BronchiectasisDashboard';
import PostICUDashboard from '../../components/patient/posticu/PostICUDashboard';
// SparkLine Component using react-native-svg
function SparkLine({ values, color = "#126969" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={{ width: w, height: h, marginTop: 4 }}>
      <Svg width={w} height={h}>
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function riskLabel(score: number): { label: string; color: string; bg: string } {
  if (score <= 3) return { label: "Stable", color: "#0f6e56", bg: "rgba(15,110,86,0.1)" };
  if (score <= 6) return { label: "Moderate", color: "#b7791f", bg: "rgba(183,121,31,0.1)" };
  return { label: "High Risk", color: "#c94d49", bg: "rgba(201,77,73,0.1)" };
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#0f6e56" };
  if (aqi <= 100) return { label: "Moderate", color: "#b7791f" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive", color: "#d85a30" };
  return { label: "Unhealthy", color: "#c94d49" };
}

function spo2Label(spo2: number): { label: string; color: string } {
  if (spo2 >= 95) return { label: "Normal", color: "#0f6e56" };
  if (spo2 >= 90) return { label: "Borderline", color: "#b7791f" };
  return { label: "Low — Alert", color: "#c94d49" };
}

const MMRC_LABELS = ["No breathlessness", "On hills/hurrying", "Slower than peers", "Stops after ~100m", "Too breathless to leave home"];

export default function PatientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [effectiveDashboard, setEffectiveDashboard] = useState<string | null>(null);
  const [diseaseSpecificData, setDiseaseSpecificData] = useState<any>(null);  
  const data = usePatientHomeData(user?.id || null, doctorId, null, refreshKey);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  useEffect(() => {
    if (user?.id) {
      // Find doctor ID for the patient
      supabase.from('patients').select('assigned_doctor_id').eq('id', user.id).single()
        .then(({ data: p }) => {
          if (p?.assigned_doctor_id) setDoctorId(p.assigned_doctor_id);
        });

      // Fetch effective dashboard
      supabase.from('patient_diagnoses').select('effective_dashboard').eq('patient_id', user.id).single()
        .then(({ data: d }) => {
          if (d?.effective_dashboard) setEffectiveDashboard(d.effective_dashboard);
        });

      // Fetch latest disease specific data
      supabase.from('daily_logs').select('disease_specific_data').eq('patient_id', user.id).order('log_date', { ascending: false }).limit(1)
        .then(({ data: d }) => {
          if (d && d.length > 0 && d[0].disease_specific_data) {
            setDiseaseSpecificData(d[0].disease_specific_data);
          }
        });
    }
  }, [user?.id, refreshKey]);

  if (data.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const firstName = user?.user_metadata?.name?.split(" ")[0] || 'Patient';
  const risk = riskLabel(data.riskScore);
  const aqi = aqiLabel(data.aqiToday);
  const spo2 = spo2Label(data.spo2Today);
  const mmrcText = MMRC_LABELS[Math.min(data.mmrcToday, 4)] ?? MMRC_LABELS[0];

  const fullData = {
    ...data,
    diseaseSpecificData
  };

  const renderDiseaseDashboard = () => {
    if (!effectiveDashboard) return null;
    switch (effectiveDashboard) {
      case 'asthma': return <AsthmaDashboard data={fullData} onLogToday={() => router.push('/(patient)/log')} />;
      case 'copd': return <COPDDashboard data={fullData} onLogToday={() => router.push('/(patient)/log')} />;
      case 'ild': return <ILDDashboard data={fullData} onLogToday={() => router.push('/(patient)/log')} />;
      case 'bronchiectasis': return <BronchiectasisDashboard data={fullData} onLogToday={() => router.push('/(patient)/log')} />;
      case 'post_icu': return <PostICUDashboard data={fullData} onLogToday={() => router.push('/(patient)/log')} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => setRefreshKey(prev => prev + 1)}
            tintColor="#126969"
            colors={['#126969']}
          />
        }
      >
        
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Welcome, {firstName} <Text style={{ color: '#6d8794' }}>· स्वागत है</Text></Text>
            {data.diagnosis && (
              <Text style={styles.diagnosisText}>{data.diagnosis}</Text>
            )}
          </View>
          <View style={{ marginTop: 12 }}>
            {data.hasTodayLog ? (
              <View style={styles.loggedBadge}>
                <CheckCircle2 size={14} color="#0f6e56" />
                <Text style={styles.loggedBadgeText}>Today logged</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.logButton} onPress={() => router.push('/(patient)/log')}>
                <Text style={styles.logButtonText}>Log Today · आज लॉग करें</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Vitals row ── */}
        <View style={styles.vitalsGrid}>
          {/* SpO2 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Heart size={16} color={spo2.color} strokeWidth={2} />
              <Text style={styles.cardLabel}>SpO₂ <Text style={{ color: '#888680' }}>ऑक्सीजन</Text></Text>
            </View>
            <Text style={[styles.cardValue, { color: spo2.color }]}>{data.spo2Today > 0 ? `${data.spo2Today}%` : "—"}</Text>
            <Text style={[styles.cardSubLabel, { color: spo2.color }]}>{data.spo2Today > 0 ? spo2.label : "No entry today"}</Text>
            {data.spo2Trend && data.spo2Trend.length > 1 && <SparkLine values={data.spo2Trend} color={spo2.color} />}
          </View>

          {/* mMRC */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Wind size={16} color="#126969" strokeWidth={2} />
              <Text style={styles.cardLabel}>Breathlessness <Text style={{ color: '#888680' }}>सांस फूलना</Text></Text>
            </View>
            <Text style={[styles.cardValue, { color: '#132d36' }]}>{data.mmrcToday}</Text>
            <Text style={styles.cardSubLabel}>Grade {data.mmrcToday} — {mmrcText}</Text>
          </View>

          {/* AQI */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Activity size={16} color={aqi.color} strokeWidth={2} />
              <Text style={styles.cardLabel}>Air Quality <Text style={{ color: '#888680' }}>वायु गुणवत्ता</Text></Text>
            </View>
            <Text style={[styles.cardValue, { color: aqi.color }]}>{data.aqiToday > 0 ? data.aqiToday : "—"}</Text>
            <Text style={[styles.cardSubLabel, { color: aqi.color }]}>{data.aqiToday > 0 ? aqi.label : "No data"}</Text>
          </View>

          {/* Risk Score */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AlertCircle size={16} color={risk.color} strokeWidth={2} />
              <Text style={styles.cardLabel}>Risk Score <Text style={{ color: '#888680' }}>जोखिम स्कोर</Text></Text>
            </View>
            <Text style={[styles.cardValue, { color: risk.color }]}>{data.riskScore > 0 ? data.riskScore : "—"}</Text>
            <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
              <Text style={[styles.riskBadgeText, { color: risk.color }]}>{risk.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Today's Medications ── */}
        <View style={styles.fullCard}>
          <Text style={styles.sectionTitle}>
            Today's Medications · आज की दवाएं{'\n'}
            <Text style={styles.sectionSubTitle}>— Tap to mark taken / not taken</Text>
          </Text>
          {(!data.todayMedications || data.todayMedications.length === 0) ? (
            <Text style={styles.emptyText}>No medications assigned. Log today to record adherence.</Text>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              {data.todayMedications.map((med: any) => (
                <View key={med.id} style={[styles.medItem, { 
                  backgroundColor: med.taken === true ? 'rgba(15,110,86,0.05)' : med.taken === false ? 'rgba(201,77,73,0.05)' : '#fafaf9',
                  borderColor: med.taken === true ? 'rgba(15,110,86,0.3)' : med.taken === false ? 'rgba(201,77,73,0.25)' : 'rgba(0,0,0,0.1)'
                }]}>
                  <View style={[styles.medCheck, { 
                    backgroundColor: med.taken === true ? '#0f6e56' : '#fff',
                    borderColor: med.taken === true ? '#0f6e56' : med.taken === false ? '#c94d49' : 'rgba(0,0,0,0.18)' 
                  }]}>
                    {med.taken === true ? <CheckCircle2 size={14} color="#fff" /> : med.taken === false ? <Text style={{color: '#c94d49', fontSize: 10}}>✕</Text> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}{med.dose ? ` — ${med.dose}` : ""}</Text>
                    <Text style={[styles.medStatus, { 
                      color: med.taken === true ? '#0f6e56' : med.taken === false ? '#c94d49' : '#888680' 
                    }]}>
                      {med.taken === true ? "Taken ✓" : med.taken === false ? "Not taken" : "Not marked yet"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={[styles.medBtn, { 
                      backgroundColor: med.taken === true ? '#0f6e56' : 'rgba(15,110,86,0.1)' 
                    }]}>
                      <Text style={[styles.medBtnText, { color: med.taken === true ? '#fff' : '#0f6e56' }]}>Taken</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.medBtn, { 
                      backgroundColor: med.taken === false ? '#c94d49' : 'rgba(201,77,73,0.1)' 
                    }]}>
                      <Text style={[styles.medBtnText, { color: med.taken === false ? '#fff' : '#c94d49' }]}>Not Taken</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── PFT Summary (if available) ── */}
        {data.latestPft && (data.latestPft.fev1_fvc_ratio !== null || data.latestPft.fev1 !== null) && (
          <View style={styles.fullCard}>
            <Text style={styles.sectionTitle}>
              Latest PFT Results · PFT परिणाम
            </Text>
            {data.latestPft.test_date && (
              <Text style={styles.sectionSubTitle}>{new Date(data.latestPft.test_date).toLocaleDateString()}</Text>
            )}
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {[
                { label: "FEV₁/FVC", value: data.latestPft.fev1_fvc_ratio !== null ? `${data.latestPft.fev1_fvc_ratio}%` : null },
                { label: "FEV₁", value: data.latestPft.fev1 !== null ? `${data.latestPft.fev1} L` : null },
                { label: "FVC", value: data.latestPft.fvc !== null ? `${data.latestPft.fvc} L` : null },
                { label: "DLCO", value: data.latestPft.dlco !== null ? `${data.latestPft.dlco}%` : null },
              ].filter((item) => item.value !== null).map((item) => (
                <View key={item.label} style={styles.pftBox}>
                  <Text style={styles.pftLabel}>{item.label}</Text>
                  <Text style={styles.pftValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Doctor & Appointment ── */}
        <View style={styles.fullCard}>
          <Text style={styles.sectionTitle}>My Care Team · मेरी देखभाल टीम</Text>
          <View style={styles.doctorRow}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorAvatarText}>
                {data.doctor ? data.doctor.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "Dr"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{data.doctor || "Your Doctor"}</Text>
              {data.doctorHospital ? <Text style={styles.doctorHospital}>{data.doctorHospital}</Text> : null}
            </View>
          </View>
        </View>

        {/* ── Log Today CTA if not logged ── */}
        {!data.hasTodayLog && (
          <View style={styles.ctaCard}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.ctaTitle}>You haven't logged today</Text>
              <Text style={styles.ctaSub}>आज का लॉग अभी नहीं किया गया है</Text>
            </View>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(patient)/log')}>
              <CircleDashed size={16} color="#126969" style={{ marginRight: 6 }} />
              <Text style={styles.ctaBtnText}>Log Today</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Disease Specific Dashboard ── */}
        {renderDiseaseDashboard()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ui.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 16 },
  
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#132d36' },
  diagnosisText: { fontSize: 14, color: '#132d36', fontWeight: 'bold', marginTop: 4 },
  
  loggedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,110,86,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6
  },
  loggedBadgeText: { color: '#0f6e56', fontSize: 13, fontWeight: '700' },
  
  logButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7', // From web styles
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  logButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    width: '48%', // roughly half minus gap
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: '#132d36' },
  cardValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  cardSubLabel: { fontSize: 11, fontWeight: '600' },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  riskBadgeText: { fontSize: 11, fontWeight: 'bold' },

  fullCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#132d36', marginBottom: 4 },
  sectionSubTitle: { fontSize: 13, color: '#888680', fontWeight: 'normal' },
  emptyText: { fontSize: 13, color: '#888680', marginTop: 8 },
  
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 12,
  },
  medCheck: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center'
  },
  medName: { fontSize: 14, fontWeight: '600', color: '#132d36' },
  medStatus: { fontSize: 11, marginTop: 2 },
  medBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
  },
  medBtnText: { fontSize: 12, fontWeight: 'bold' },

  pftBox: {
    padding: 10,
    backgroundColor: '#f8f7f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(19,45,54,0.07)',
    minWidth: '45%',
    flex: 1,
  },
  pftLabel: { fontSize: 10, fontWeight: '700', color: '#6d8794', textTransform: 'uppercase' },
  pftValue: { fontSize: 18, fontWeight: 'bold', color: '#132d36', marginTop: 4 },

  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  doctorAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#126969',
    alignItems: 'center', justifyContent: 'center'
  },
  doctorAvatarText: { color: '#89d3d3', fontSize: 16, fontWeight: '700' },
  doctorName: { fontSize: 16, fontWeight: '600', color: '#132d36' },
  doctorHospital: { fontSize: 12, color: '#6d8794', marginTop: 2 },

  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f6e56', // Teal 700ish
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaBtnText: { color: '#126969', fontWeight: 'bold', fontSize: 14 },
});
