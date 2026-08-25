import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Download, FileText, CheckCircle2, Circle, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '@o2plus/theme';

type ExportType = 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'disease_specific' | 'combined';
type ExportFormat = 'pdf' | 'excel' | 'csv';

const EXPORT_TYPES: { id: ExportType; label: string; sub: string }[] = [
  { id: 'daily', label: 'Daily', sub: '24-hour snapshot of patient metrics' },
  { id: 'weekly', label: 'Weekly', sub: '7-day trend with risk scores' },
  { id: 'bi_weekly', label: 'Bi-Weekly (15 Days)', sub: '15-day trend with worst score' },
  { id: 'monthly', label: 'Monthly', sub: '30-day comprehensive trend' },
  { id: 'combined', label: 'Combined', sub: 'All patients & metrics merged' },
];

export default function ExportScreen() {
  const router = useRouter();
  const [exportType, setExportType] = useState<ExportType>('weekly');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('patients')
        .select('id, name, patient_diagnoses(primary_diagnosis, effective_dashboard), red_flag_scores(global_score)')
        .eq('doctor_id', user.id)
        .order('name');

      if (data) {
        setPatients(data);
        setSelectedIds(new Set(data.map(p => p.id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map(p => p.id)));
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Patients Selected', 'Please select at least one patient to export.');
      return;
    }

    setExporting(true);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();

      const payload = {
        export_type: exportType,
        format: exportFormat,
        patient_ids: Array.from(selectedIds),
      };

      const res = await fetch(`${baseUrl}/api/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      Alert.alert(
        'Export Generated',
        `Your ${exportType} report in ${exportFormat.toUpperCase()} format has been generated successfully.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Export Notice', err?.message || 'Could not generate export. Please check your network connection.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#132d36" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Clinical Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Export Type Selection */}
        <Text style={styles.sectionHeading}>Report Timeframe</Text>
        <View style={styles.typeGrid}>
          {EXPORT_TYPES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeCard, exportType === t.id && styles.typeCardActive]}
              onPress={() => setExportType(t.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typeTitle, exportType === t.id && styles.typeTitleActive]}>{t.label}</Text>
              <Text style={[styles.typeSub, exportType === t.id && styles.typeSubActive]}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Format Selection */}
        <Text style={styles.sectionHeading}>File Format</Text>
        <View style={styles.formatRow}>
          {(['pdf', 'excel', 'csv'] as ExportFormat[]).map(fmt => (
            <TouchableOpacity
              key={fmt}
              style={[styles.formatBtn, exportFormat === fmt && styles.formatBtnActive]}
              onPress={() => setExportFormat(fmt)}
              activeOpacity={0.7}
            >
              <FileText size={16} color={exportFormat === fmt ? '#fff' : '#475569'} />
              <Text style={[styles.formatText, exportFormat === fmt && styles.formatTextActive]}>
                {fmt.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Patient Selection Header */}
        <View style={styles.patientHeader}>
          <Text style={styles.sectionHeading}>
            Included Patients ({selectedIds.size}/{patients.length})
          </Text>
          <TouchableOpacity onPress={toggleAll}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === patients.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patient List */}
        {loading ? (
          <ActivityIndicator size="small" color="#126969" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.patientList}>
            {patients.map(p => {
              const isChecked = selectedIds.has(p.id);
              const diagnosis = p.patient_diagnoses?.[0]?.primary_diagnosis || 'Unknown';
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientRow, isChecked && styles.patientRowChecked]}
                  onPress={() => toggleSelect(p.id)}
                  activeOpacity={0.7}
                >
                  {isChecked ? (
                    <CheckCircle2 size={20} color="#126969" />
                  ) : (
                    <Circle size={20} color="#94a3b8" />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.patientName}>{p.name}</Text>
                    <Text style={styles.patientDiag}>{diagnosis}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, (selectedIds.size === 0 || exporting) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={selectedIds.size === 0 || exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Download size={18} color="#fff" />
              <Text style={styles.exportBtnText}>Generate & Download Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#132d36' },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeading: {
    fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 10, marginTop: 12,
  },
  typeGrid: { gap: 10 },
  typeCard: {
    backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1,
    borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  typeCardActive: { borderColor: '#126969', backgroundColor: '#f0fdfa' },
  typeTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  typeTitleActive: { color: '#126969' },
  typeSub: { fontSize: 12, color: '#64748b' },
  typeSubActive: { color: '#0d9488' },
  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  formatBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  formatBtnActive: { backgroundColor: '#126969', borderColor: '#126969' },
  formatText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  formatTextActive: { color: '#fff' },
  patientHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 4,
  },
  selectAllText: { fontSize: 12, fontWeight: '600', color: '#126969' },
  patientList: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  patientRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  patientRowChecked: { backgroundColor: '#f0fdfa' },
  patientName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  patientDiag: { fontSize: 12, color: '#64748b' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#126969', paddingVertical: 16, borderRadius: 12,
    marginTop: 24, shadowColor: '#126969', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
