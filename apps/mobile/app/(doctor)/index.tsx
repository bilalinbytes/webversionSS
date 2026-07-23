import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Menu, Bell, UserPlus, Calendar as CalendarIcon, FileText, BarChart2, Download, AlertTriangle } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getRiskColor, getRiskLabel } from '@o2plus/core';
import { SafeAreaView } from 'react-native-safe-area-context';
// Optional: import { Svg, Polyline } from 'react-native-svg';

import { getDoctorAppointments } from '@o2plus/api-client/doctor';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, critical: 0, appointments: 0, highRisk: 0 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch patients from supabase directly
      const { data: patients, error: pError } = await supabase.from('patients').select('*');
      
      // Fetch real appointments via the next.js API
      const apptsRes = await getDoctorAppointments(config, session?.access_token);
      
      let total = 0;
      let critical = 0;
      let highRisk = 0;
      
      if (patients) {
        total = patients.length;
        
        // Map real data to alerts
        const realAlerts: any[] = [];

        patients.forEach((p) => {
          if (p.latest_score !== null) {
            if (p.latest_score >= 4) {
              critical++;
              realAlerts.push({
                id: p.id,
                name: p.name || 'Unknown Patient',
                issue: `Critical Score: ${p.latest_score}/10`,
                time: 'Recent'
              });
            } else if (p.latest_score >= 3) {
              highRisk++;
            }
          }
        });
        
        setAlerts(realAlerts.length > 0 ? realAlerts : [
          { id: 'mock', name: 'System', issue: 'No critical alerts at this time.', time: 'Now' }
        ]);
      }

      // Format real appointments
      const realAppts: any[] = [];
      if (apptsRes.success && apptsRes.data) {
        apptsRes.data.forEach((apt: any) => {
          if (apt.status === 'upcoming' || apt.status === 'approved') {
            const date = new Date(apt.scheduled_at);
            realAppts.push({
              id: apt.id,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              name: apt.patients?.name || 'Unknown Patient',
              disease: apt.title || 'Consultation',
              score: 0 // Ideally fetched from joining patients table
            });
          }
        });
      }
      
      setAppointments(realAppts);
      setStats({ total, critical, highRisk, appointments: realAppts.length });
      
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.iconButton}>
              <Menu size={24} color={colors.ui.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.logoText}>O₂⁺</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={24} color={colors.ui.textPrimary} />
              <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.email?.[0].toUpperCase() || 'D'}</Text>
            </View>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>Good Morning, Dr. Mohammed 👋</Text>
          <Text style={styles.subtitleText}>Here's what's happening in your clinic today.</Text>
        </View>

        {/* Metrics Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll} contentContainerStyle={styles.metricsContent}>
          <MetricCard title="Total Patients" value={stats.total.toString()} change="+12 this week" type="success" />
          <MetricCard title="Critical Alerts" value={stats.critical.toString()} change="Needs attention" type="danger" />
          <MetricCard title="Appointments" value={stats.appointments.toString()} change="Today" type="info" />
          <MetricCard title="High Risk" value={stats.highRisk.toString()} change="Monitor closely" type="warning" />
        </ScrollView>

        {/* Today's Appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          <TouchableOpacity><Text style={styles.linkText}>View all &gt;</Text></TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {appointments.map(apt => (
            <View key={apt.id} style={styles.appointmentCard}>
              <Text style={styles.aptTime}>{apt.time}</Text>
              <View style={styles.aptDetails}>
                <Text style={styles.aptName}>{apt.name}</Text>
                <Text style={styles.aptDisease}>{apt.disease}</Text>
              </View>
              <RiskBadge score={apt.score} />
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll} contentContainerStyle={styles.actionsContent}>
          <ActionCard icon={UserPlus} label="Add Patient" />
          <ActionCard icon={CalendarIcon} label="New Appt" />
          <ActionCard icon={FileText} label="Add Record" />
          <ActionCard icon={BarChart2} label="Analytics" />
          <ActionCard icon={Download} label="Export Data" />
        </ScrollView>

        {/* Recent Alerts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Alerts</Text>
        </View>
        <View style={styles.listContainer}>
          {alerts.map(alert => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertIconBg}>
                <AlertTriangle size={20} color={colors.risk.red.solid} />
              </View>
              <View style={styles.alertDetails}>
                <Text style={styles.alertName}>{alert.name}</Text>
                <Text style={styles.alertIssue}>{alert.issue}</Text>
              </View>
              <Text style={styles.alertTime}>{alert.time}</Text>
            </View>
          ))}
        </View>
        
        {/* Bottom Padding */}
        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// UI Components
// ----------------------------------------------------

function MetricCard({ title, value, change, type }: any) {
  const getColors = () => {
    switch(type) {
      case 'danger': return { bg: colors.risk.red.bg, text: colors.risk.red.solid };
      case 'warning': return { bg: colors.risk.orange.bg, text: colors.risk.orange.solid };
      case 'info': return { bg: colors.brand.primaryLight, text: colors.brand.primaryDark };
      default: return { bg: colors.risk.green.bg, text: colors.risk.green.solid };
    }
  };
  const c = getColors();
  
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.metricFooter}>
        <Text style={[styles.metricChange, { color: c.text }]}>{change}</Text>
      </View>
    </View>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);
  
  return (
    <View style={[styles.badgeContainer, { backgroundColor: color.bg }]}>
      <Text style={[styles.badgeLabel, { color: color.text }]}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon: Icon, label }: any) {
  return (
    <TouchableOpacity style={styles.actionCard}>
      <View style={styles.actionIcon}>
        <Icon size={24} color={colors.brand.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ----------------------------------------------------
// Styles
// ----------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ui.surface,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f4c5c',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.risk.red.solid,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  greetingSection: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.ui.textPrimary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.ui.textMuted,
  },
  metricsScroll: {
    marginBottom: 32,
  },
  metricsContent: {
    paddingRight: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricTitle: {
    fontSize: 13,
    color: colors.ui.textMuted,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.ui.textPrimary,
    marginBottom: 16,
  },
  metricFooter: {
    flexDirection: 'row',
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ui.textPrimary,
  },
  linkText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '600',
  },
  listContainer: {
    gap: 12,
    marginBottom: 32,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  aptTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ui.textPrimary,
    width: 70,
  },
  aptDetails: {
    flex: 1,
  },
  aptName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ui.textPrimary,
    marginBottom: 2,
  },
  aptDisease: {
    fontSize: 13,
    color: colors.ui.textMuted,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionsScroll: {
    marginBottom: 32,
    marginHorizontal: -16,
  },
  actionsContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  actionCard: {
    alignItems: 'center',
    width: 72,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.ui.textPrimary,
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.risk.red.bg,
    padding: 16,
    borderRadius: 16,
  },
  alertIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.risk.red.text,
    marginBottom: 2,
  },
  alertIssue: {
    fontSize: 13,
    color: colors.risk.red.text,
  },
  alertTime: {
    fontSize: 12,
    color: colors.risk.red.text,
    opacity: 0.8,
  },
});
