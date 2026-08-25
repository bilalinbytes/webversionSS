import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal, Linking,
} from 'react-native';
import {
  Bell, UserPlus, Search, Download, Trash2, Activity,
  Wrench, FolderOpen, X, ChevronDown, UserCheck,
} from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getDoctorPatients, acknowledgePatientAlerts as acknowledgePatientAlertsApi } from '@o2plus/api-client/doctor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ImportPatientModal } from '../../components/doctor/ImportPatientModal';

type RiskLevel = 'critical' | 'high' | 'moderate' | 'stable' | 'none';
type DiagnosisFilter = 'All' | 'ILD' | 'COPD' | 'Asthma' | 'Bronchiectasis' | 'Post ICU';
type PatientSort = 'alert_desc' | 'alert_asc' | 'name_asc';

const FILTERS: DiagnosisFilter[] = ['All', 'ILD', 'COPD', 'Asthma', 'Bronchiectasis', 'Post ICU'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreToRisk(score: number): RiskLevel {
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'moderate';
  return 'stable';
}

function formatComorbidities(comorbidities: unknown, otherText?: string | null): string {
  const parseString = (value: string): string[] => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === 'string' && i.trim().length > 0);
    } catch { /* legacy comma-separated */ }
    return trimmed.split(',').map(i => i.trim()).filter(Boolean);
  };
  const list = Array.isArray(comorbidities)
    ? comorbidities.filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
    : typeof comorbidities === 'string' ? parseString(comorbidities) : [];
  const normalized = list.map(i => i === 'Others' && otherText ? otherText : i).filter(Boolean);
  return normalized.length > 0 ? normalized.join(', ') : '';
}

function formatDashboardLabel(value: string | null | undefined): string {
  switch (value) {
    case 'asthma': return 'Asthma';
    case 'copd': return 'COPD';
    case 'ild': return 'ILD';
    case 'bronchiectasis': return 'Bronchiectasis';
    case 'post_icu': return 'Post ICU';
    default: return '';
  }
}

function formatDiagnosisLine(patient: any): string {
  const row = patient.patient_diagnoses?.[0];
  const diagnosis = row?.primary_diagnosis?.trim() ?? '';
  const dashboard = formatDashboardLabel(row?.effective_dashboard);
  const dashboardPart = diagnosis && diagnosis.toLowerCase().includes(dashboard.toLowerCase()) ? '' : dashboard;
  const parts = [diagnosis, dashboardPart].filter(p => p.trim().length > 0);
  return parts.length > 0 ? parts.join(' / ') : 'No diagnosis recorded';
}

function formatComorbidityLine(patient: any): string {
  const row = patient.patient_diagnoses?.[0];
  const c = formatComorbidities(row?.comorbidities, row?.comorbidities_other_text);
  return c ? `Co-morbidities: ${c}` : 'Co-morbidities: None recorded';
}

function countOpenAlerts(patient: any): number {
  return (patient.disease_alerts ?? []).filter(
    (a: any) => !a.is_suppressed && !a.acknowledged_by_doctor &&
      (a.alert_type === 'RED' || a.alert_type === 'YELLOW'),
  ).length;
}

function openAlerts(patient: any) {
  return (patient.disease_alerts ?? [])
    .filter((a: any) => !a.is_suppressed && !a.acknowledged_by_doctor &&
      (a.alert_type === 'RED' || a.alert_type === 'YELLOW'))
    .sort((a: any, b: any) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());
}

function latestOpenAlert(patient: any) {
  return openAlerts(patient)[0] ?? null;
}

function getRiskColors(risk: RiskLevel) {
  switch (risk) {
    case 'critical': return { border: '#dc2626', avatar: '#dc2626', badge: '#dc2626', score: '#dc2626', label: 'RED' };
    case 'high':     return { border: '#f97316', avatar: '#f97316', badge: '#f97316', score: '#f97316', label: 'ORANGE' };
    case 'moderate': return { border: '#eab308', avatar: '#b7791f', badge: '#eab308', score: '#b7791f', label: 'YELLOW' };
    case 'stable':   return { border: '#22c55e', avatar: '#0f6e56', badge: '#22c55e', score: '#0f6e56', label: 'GREEN' };
    default:         return { border: '#e2e8f0', avatar: '#94a3b8', badge: '#94a3b8', score: '#64748b', label: 'No data' };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DiagnosisFilter>('All');
  const [sortBy, setSortBy] = useState<PatientSort>('alert_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [fixingLogins, setFixingLogins] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadPatients = useCallback(async (showLoad = false) => {
    if (showLoad) setLoading(true);
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await getDoctorPatients(config, session?.access_token);
      if (res.success && res.data) {
        const sorted = (res.data as any[]).map((p: any) => ({
          ...p,
          red_flag_scores: p.red_flag_scores
            ? [...p.red_flag_scores].sort((a: any, b: any) => new Date(b.computed_at ?? '').getTime() - new Date(a.computed_at ?? '').getTime())
            : null,
          disease_alerts: p.disease_alerts
            ? [...p.disease_alerts].sort((a: any, b: any) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime())
            : null,
        }));
        setPatients(sorted);
        setUnacknowledgedAlerts(sorted.reduce((acc: number, p: any) => acc + countOpenAlerts(p), 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Focus refresh + 30s poll (same as web)
  useFocusEffect(useCallback(() => {
    loadPatients(true);
    pollRef.current = setInterval(() => loadPatients(false), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadPatients]));

  // ── Alert Acknowledge (same as web) ───────────────────────────────────────
  const acknowledgeAlerts = useCallback(async (patient: any) => {
    const openCount = countOpenAlerts(patient);
    if (openCount === 0) return;
    setUnacknowledgedAlerts(c => Math.max(0, c - openCount));
    setPatients(current => current.map(entry =>
      entry.id === patient.id
        ? {
          ...entry,
          disease_alerts: entry.disease_alerts?.map((a: any) =>
            !a.is_suppressed && !a.acknowledged_by_doctor && (a.alert_type === 'RED' || a.alert_type === 'YELLOW')
              ? { ...a, acknowledged_by_doctor: true }
              : a
          ) ?? null,
        }
        : entry
    ));
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const { data: { session } } = await supabase.auth.getSession();
      await acknowledgePatientAlertsApi(config, patient.id, session?.access_token);
    } catch { /* non-fatal */ }
  }, []);

  const openPatient = useCallback((patient: any, tab = 'Overview') => {
    acknowledgeAlerts(patient);
    router.push(`/(doctor)/patients/${patient.id}`);
  }, [acknowledgeAlerts, router]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDeletePatient = (patient: any) => {
    Alert.alert(
      'Delete Patient',
      `Permanently delete ${patient.name}? This removes all logs, scores, and records. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, delete', style: 'destructive',
          onPress: async () => {
            try {
              const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
              const res = await fetch(`${baseUrl}/api/patients?id=${patient.id}`, { method: 'DELETE' });
              if (res.ok) {
                setPatients(prev => prev.filter(p => p.id !== patient.id));
              } else {
                Alert.alert('Error', 'Could not delete patient.');
              }
            } catch { Alert.alert('Error', 'Network error.'); }
          },
        },
      ]
    );
  };

  const handleFixLogins = async () => {
    setFixingLogins(true);
    setFixResult(null);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const res = await fetch(`${baseUrl}/api/patients/provision-auth-bulk`, { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        const parts: string[] = [];
        if ((body.created ?? 0) > 0) parts.push(`${body.created} patients can now log in`);
        if ((body.fixed ?? 0) > 0) parts.push(`${body.fixed} fixed`);
        if ((body.relinked ?? 0) > 0) parts.push(`${body.relinked} re-linked`);
        if ((body.already_existed ?? 0) > 0) parts.push(`${body.already_existed} already had access`);
        if ((body.skipped ?? 0) > 0) parts.push(`${body.skipped} skipped`);
        if ((body.errors ?? 0) > 0) parts.push(`${body.errors} failed`);
        setFixResult(parts.length > 0 ? parts.join(' · ') : 'All patients already have login access.');
      } else {
        setFixResult(`Failed: ${body.error ?? 'unknown error'}`);
      }
    } catch { setFixResult('Network error — please try again.'); }
    finally { setFixingLogins(false); }
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const total = patients.length;
  const criticalCount = patients.filter(p => (p.red_flag_scores?.[0]?.global_score ?? 0) >= 9).length;
  const highCount = patients.filter(p => { const s = p.red_flag_scores?.[0]?.global_score ?? 0; return s >= 7 && s < 9; }).length;
  const moderateCount = patients.filter(p => { const s = p.red_flag_scores?.[0]?.global_score ?? 0; return s >= 4 && s < 7; }).length;
  const stableCount = patients.filter(p => (p.red_flag_scores?.[0]?.global_score ?? 0) < 4).length;

  const criticalPatients = patients.filter(p => {
    const alert = latestOpenAlert(p);
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return alert?.alert_type === 'RED' || s >= 9;
  });
  const highPatients = patients.filter(p => {
    if (criticalPatients.some((c: any) => c.id === p.id)) return false;
    const alert = latestOpenAlert(p);
    const s = p.red_flag_scores?.[0]?.global_score ?? 0;
    return alert?.alert_type === 'YELLOW' || (s >= 7 && s < 9);
  });

  const filteredPatients = patients.filter(p => {
    const searchTerm = search.trim().toLowerCase();
    const searchDigits = search.replace(/\D/g, '');
    const patientPhone = (p.mobile_number ?? '').replace(/\D/g, '');
    const matchSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.id.toLowerCase().includes(searchTerm) ||
      (searchDigits.length > 0 && patientPhone.includes(searchDigits));
    const row = p.patient_diagnoses?.[0];
    const diagLabel = row?.primary_diagnosis ?? '';
    const effectiveDashboard = (row?.effective_dashboard ?? '').toLowerCase();
    const matchFilter =
      filter === 'All' ||
      (filter === 'Post ICU' && (effectiveDashboard === 'post_icu' || diagLabel.toLowerCase().includes('post icu'))) ||
      (filter === 'Asthma' && effectiveDashboard === 'asthma') ||
      (filter === 'COPD' && effectiveDashboard === 'copd') ||
      (filter === 'ILD' && effectiveDashboard === 'ild') ||
      (filter === 'Bronchiectasis' && effectiveDashboard === 'bronchiectasis');
    return matchSearch && matchFilter;
  }).sort((l, r) => {
    if (sortBy === 'name_asc') return l.name.localeCompare(r.name);
    const ls = l.red_flag_scores?.[0]?.global_score ?? -1;
    const rs = r.red_flag_scores?.[0]?.global_score ?? -1;
    const delta = sortBy === 'alert_asc' ? ls - rs : rs - ls;
    if (delta !== 0) return delta;
    return l.name.localeCompare(r.name);
  });

  // All alerts across all patients for the bell panel
  const allOpenAlerts = patients
    .filter(p => countOpenAlerts(p) > 0)
    .flatMap(p => openAlerts(p).map((alert: any) => ({ patient: p, alert })))
    .sort((a, b) => new Date(b.alert.created_at ?? '').getTime() - new Date(a.alert.created_at ?? '').getTime());

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const sortLabels: Record<PatientSort, string> = {
    alert_desc: 'High alert to low',
    alert_asc: 'Low alert to high',
    name_asc: 'Name A–Z',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.commandTitle}>Clinical Decision Center</Text>
          <Text style={styles.commandSub}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {/* Bell with badge */}
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowAlertsPanel(true)}>
            <Bell size={20} color="#126969" />
            {unacknowledgedAlerts > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unacknowledgedAlerts}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Fix Logins */}
          <TouchableOpacity style={styles.iconButton} onPress={handleFixLogins} disabled={fixingLogins}>
            {fixingLogins ? <ActivityIndicator size="small" color="#126969" /> : <Wrench size={20} color="#126969" />}
          </TouchableOpacity>
          {/* Export */}
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(doctor)/export' as any)}>
            <Download size={20} color="#126969" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fix Logins Result Toast */}
      {fixResult && (
        <View style={[styles.fixToast, { backgroundColor: fixResult.startsWith('Failed') || fixResult.startsWith('Network') ? '#fdecea' : '#e8f5f1', borderColor: fixResult.startsWith('Failed') || fixResult.startsWith('Network') ? '#fca5a5' : '#a7d7c5' }]}>
          <Text style={[styles.fixToastText, { color: fixResult.startsWith('Failed') || fixResult.startsWith('Network') ? '#c94d49' : '#0f6e56' }]} numberOfLines={2}>{fixResult}</Text>
          <TouchableOpacity onPress={() => setFixResult(null)}>
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{total}</Text>
          <Text style={styles.statLbl}>Patients</Text>
        </View>
        <View style={[styles.statBox, styles.statDivider]}>
          <Text style={[styles.statVal, { color: '#dc2626' }]}>{criticalCount}</Text>
          <Text style={styles.statLbl}>Critical</Text>
        </View>
        <View style={[styles.statBox, styles.statDivider]}>
          <Text style={[styles.statVal, { color: '#f97316' }]}>{highCount}</Text>
          <Text style={styles.statLbl}>High risk</Text>
        </View>
        <View style={[styles.statBox, styles.statDivider]}>
          <Text style={[styles.statVal, { color: '#b7791f' }]}>{moderateCount}</Text>
          <Text style={styles.statLbl}>Moderate</Text>
        </View>
        <View style={[styles.statBox, styles.statDivider]}>
          <Text style={[styles.statVal, { color: '#0f6e56' }]}>{stableCount}</Text>
          <Text style={styles.statLbl}>Stable</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Critical Alert Zone ── */}
        {criticalPatients.length > 0 && (
          <View style={styles.alertZone}>
            <View style={styles.alertZoneHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.alertZoneTitle}>{criticalPatients.length} Critical Patient{criticalPatients.length > 1 ? 's' : ''}</Text>
            </View>
            {criticalPatients.map((p: any) => {
              const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
              const alert = latestOpenAlert(p);
              const alertText = alert?.reason_text ?? p.patient_diagnoses?.[0]?.primary_diagnosis ?? 'Needs review';
              const score = p.red_flag_scores?.[0]?.global_score ?? '—';
              return (
                <View key={p.id} style={styles.criticalBlock}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.criticalAvatar]}>
                      <Text style={styles.criticalAvatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.criticalName}>{p.name.split(' ')[0]}</Text>
                        <View style={styles.criticalBadge}><Text style={styles.criticalBadgeText}>{alert?.alert_type ?? 'CRITICAL'}</Text></View>
                      </View>
                      <Text style={styles.criticalAlertText} numberOfLines={2}>{alertText}</Text>
                    </View>
                    <Text style={styles.criticalScore}>{score}</Text>
                  </View>
                  <TouchableOpacity style={styles.emergencyRxBtn} onPress={() => openPatient(p, 'Treatment Folder')}>
                    <Text style={styles.emergencyRxText}>Emergency Rx</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Watch Closely Panel ── */}
        {highPatients.length > 0 && (
          <View style={styles.watchPanel}>
            <Text style={styles.watchTitle}>Watch Closely</Text>
            {highPatients.map((p: any) => {
              const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
              const alert = latestOpenAlert(p);
              const score = p.red_flag_scores?.[0]?.global_score ?? '—';
              const alertText = alert?.reason_text ?? p.patient_diagnoses?.[0]?.primary_diagnosis ?? '';
              return (
                <TouchableOpacity key={p.id} style={styles.watchRow} onPress={() => openPatient(p, 'Treatment Folder')}>
                  <View style={styles.watchAvatar}><Text style={styles.watchAvatarText}>{initials}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.watchName}>{p.name.split(' ')[0]}</Text>
                    <Text style={styles.watchAlert} numberOfLines={1}>{alert?.alert_type ? `${alert.alert_type}: ${alertText}` : alertText}</Text>
                  </View>
                  <Text style={styles.watchScore}>{score}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Search & Actions ── */}
        <View style={styles.actionRow}>
          <View style={styles.searchBar}>
            <Search size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={() => setShowImportModal(true)}>
            <UserCheck size={15} color="#126969" />
            <Text style={styles.importBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(doctor)/patients/create' as any)}>
            <UserPlus size={15} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* ── Filters + Sort ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Sort dropdown */}
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(true)}>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Sort label */}
        <Text style={styles.sortLabel}>Sort: {sortLabels[sortBy]}</Text>

        {/* ── Patient List ── */}
        <View style={styles.listContent}>
          {filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No patients found.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => router.push('/(doctor)/patients/create' as any)}>
                <Text style={styles.emptyAddText}>+ Add Patient</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPatients.map((p: any) => {
              const score = p.red_flag_scores?.[0]?.global_score ?? null;
              const risk = score !== null ? scoreToRisk(score) : 'none';
              const rc = getRiskColors(risk);
              const alert = latestOpenAlert(p);
              const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
              const diagLine = formatDiagnosisLine(p);
              const comorbLine = formatComorbidityLine(p);
              const lastLog = p.red_flag_scores?.[0]?.computed_at
                ? new Date(p.red_flag_scores[0].computed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                : 'No data';

              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientCard, { borderLeftColor: rc.border }]}
                  onPress={() => openPatient(p)}
                  activeOpacity={0.85}
                >
                  {/* Card Top */}
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: rc.avatar }]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.patientInfo}>
                      <Text style={styles.patientName}>{p.name}</Text>
                    </View>
                    <View style={[styles.scoreBox, { borderColor: rc.score }]}>
                      <Text style={[styles.scoreText, { color: rc.score }]}>{score !== null ? score : '—'}</Text>
                    </View>
                  </View>

                  {/* Risk Badge + Diagnosis */}
                  <View style={styles.cardRiskRow}>
                    <View style={[styles.riskBadge, { backgroundColor: rc.badge }]}>
                      <Text style={styles.riskBadgeText}>{rc.label}</Text>
                    </View>
                    <Text style={styles.diagLine} numberOfLines={1}>{diagLine}</Text>
                  </View>

                  {/* Comorbidities */}
                  <Text style={styles.comorbLine} numberOfLines={1}>{comorbLine}</Text>

                  {/* Alert reason */}
                  {alert?.reason_text && (
                    <View style={styles.alertBox}>
                      <Text style={styles.alertType}>{alert.alert_type}: </Text>
                      <Text style={styles.alertReason} numberOfLines={2}>{alert.reason_text}</Text>
                    </View>
                  )}

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.lastLog}>Last: {lastLog}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TouchableOpacity style={styles.iconActionBtn} onPress={() => handleDeletePatient(p)}>
                        <Trash2 size={14} color="#c94d49" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.footerBtn} onPress={() => openPatient(p, 'Analytics')}>
                        <Activity size={12} color="#126969" />
                        <Text style={styles.footerBtnText}>Analytics</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.footerBtn} onPress={() => openPatient(p, 'Treatment Folder')}>
                        <FolderOpen size={12} color="#126969" />
                        <Text style={styles.footerBtnText}>Folder</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#132d36' }]} onPress={() => openPatient(p)}>
                        <Text style={[styles.footerBtnText, { color: '#fff', marginLeft: 0 }]}>View</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── Sort Modal ── */}
      <Modal visible={showSortMenu} transparent animationType="fade" onRequestClose={() => setShowSortMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortMenu(false)}>
          <View style={styles.sortModal}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            {([['alert_desc', 'High alert to low'], ['alert_asc', 'Low alert to high'], ['name_asc', 'Name A–Z']] as [PatientSort, string][]).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[styles.sortOption, sortBy === val && styles.sortOptionActive]}
                onPress={() => { setSortBy(val); setShowSortMenu(false); }}
              >
                <Text style={[styles.sortOptionText, sortBy === val && styles.sortOptionTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Alerts Panel Modal ── */}
      <Modal visible={showAlertsPanel} transparent animationType="slide" onRequestClose={() => setShowAlertsPanel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAlertsPanel(false)}>
          <View style={styles.alertsPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.alertsPanelHeader}>
              <Text style={styles.alertsPanelTitle}>Alerts ({unacknowledgedAlerts})</Text>
              <TouchableOpacity onPress={() => setShowAlertsPanel(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {allOpenAlerts.length === 0 ? (
                <Text style={styles.noAlertsText}>No active alerts</Text>
              ) : (
                allOpenAlerts.map(({ patient: p, alert }: any, i: number) => (
                  <TouchableOpacity
                    key={`${p.id}-${i}`}
                    style={[styles.alertPanelRow, { backgroundColor: alert.alert_type === 'RED' ? 'rgba(220,38,38,0.04)' : 'rgba(234,179,8,0.04)' }]}
                    onPress={() => { setShowAlertsPanel(false); openPatient(p); }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <View style={[styles.alertTypeBadge, { backgroundColor: alert.alert_type === 'RED' ? '#dc2626' : '#f59e0b' }]}>
                        <Text style={styles.alertTypeBadgeText}>{alert.alert_type}</Text>
                      </View>
                      <Text style={styles.alertPatientName}>{p.name}</Text>
                    </View>
                    <Text style={styles.alertPanelReason}>{alert.reason_text ?? 'Alert triggered'}</Text>
                    {alert.created_at && (
                      <Text style={styles.alertPanelTime}>
                        {new Date(alert.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Import Patient Modal ── */}
      <ImportPatientModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => loadPatients(false)}
      />

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  commandTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  commandSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  iconButton: { padding: 8, backgroundColor: '#f0fdfa', borderRadius: 8 },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#dc2626', borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  fixToast: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 8, padding: '10px 14px' as any,
    borderRadius: 8, borderWidth: 1, gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  fixToastText: { flex: 1, fontSize: 12 },

  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  statLbl: { fontSize: 10, color: '#64748b', marginTop: 1 },

  // Critical Alert Zone
  alertZone: {
    margin: 16, marginBottom: 8,
    backgroundColor: '#fff5f5', borderRadius: 12,
    borderWidth: 1, borderColor: '#fecaca', padding: 14,
  },
  alertZoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#dc2626' },
  alertZoneTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  criticalBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, gap: 8,
  },
  criticalAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center',
  },
  criticalAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  criticalName: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  criticalBadge: { backgroundColor: '#dc2626', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  criticalBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  criticalAlertText: { fontSize: 11, color: '#991b1b', marginTop: 2 },
  criticalScore: { fontSize: 18, fontWeight: 'bold', color: '#dc2626' },
  emergencyRxBtn: {
    backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginTop: 4, alignSelf: 'flex-end',
  },
  emergencyRxText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Watch Panel
  watchPanel: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fffbeb',
    borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', padding: 14,
  },
  watchTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 10 },
  watchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fef3c7',
  },
  watchAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center',
  },
  watchAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  watchName: { fontSize: 13, fontWeight: '600', color: '#92400e' },
  watchAlert: { fontSize: 11, color: '#b45309', marginTop: 1 },
  watchScore: { fontSize: 16, fontWeight: 'bold', color: '#f97316' },

  // Search & Actions
  actionRow: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 },
  importBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdfa', paddingHorizontal: 12, borderRadius: 8, gap: 5,
    borderWidth: 1, borderColor: '#ccfbf1',
  },
  importBtnText: { color: '#126969', fontWeight: 'bold', fontSize: 13 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#126969', paddingHorizontal: 14, borderRadius: 8, gap: 5,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Filters
  filterScroll: { maxHeight: 44, flex: 1 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#126969', borderColor: '#126969' },
  filterChipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  sortLabel: { fontSize: 11, color: '#94a3b8', marginLeft: 16, marginBottom: 4 },

  // Patient List
  listContent: { padding: 16, gap: 12 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15, marginBottom: 16 },
  emptyAddBtn: { backgroundColor: '#126969', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyAddText: { color: '#fff', fontWeight: 'bold' },

  // Patient Card
  patientCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  scoreBox: {
    borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    minWidth: 40, alignItems: 'center',
  },
  scoreText: { fontSize: 18, fontWeight: 'bold' },
  cardRiskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  riskBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  riskBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  diagLine: { fontSize: 12, color: '#475569', flex: 1 },
  comorbLine: { fontSize: 11, color: '#94a3b8', marginBottom: 6 },
  alertBox: {
    flexDirection: 'row', backgroundColor: '#fef2f2',
    padding: 8, borderRadius: 6, marginBottom: 8,
  },
  alertType: { fontSize: 11, fontWeight: 'bold', color: '#dc2626' },
  alertReason: { fontSize: 11, color: '#dc2626', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  lastLog: { fontSize: 11, color: '#94a3b8' },
  iconActionBtn: {
    padding: 6, borderRadius: 6,
    backgroundColor: 'rgba(201,77,73,0.06)', borderWidth: 1, borderColor: 'rgba(201,77,73,0.25)',
  },
  footerBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, backgroundColor: '#f1f5f9', gap: 4,
  },
  footerBtnText: { fontSize: 11, fontWeight: '600', color: '#126969' },

  // Sort Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sortModal: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 36 },
  sortModalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 14 },
  sortOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sortOptionActive: { backgroundColor: '#f0fdfa', borderRadius: 8, paddingHorizontal: 10 },
  sortOptionText: { fontSize: 14, color: '#475569' },
  sortOptionTextActive: { color: '#126969', fontWeight: '700' },

  // Alerts Panel Modal
  alertsPanel: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '80%', paddingBottom: 24,
  },
  alertsPanelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  alertsPanelTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  noAlertsText: { padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 },
  alertPanelRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  alertTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  alertTypeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  alertPatientName: { fontSize: 13, fontWeight: '600', color: '#132d36' },
  alertPanelReason: { fontSize: 12, color: '#475569', lineHeight: 18 },
  alertPanelTime: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
});
