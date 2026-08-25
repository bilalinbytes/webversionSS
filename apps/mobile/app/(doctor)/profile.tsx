import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, LogOut, Mail, Building, Stethoscope, Settings, Bell, ChevronRight, ShieldCheck, HeartPulse } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '@o2plus/theme';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [patientCount, setPatientCount] = useState<number>(0);
  const [openAlertCount, setOpenAlertCount] = useState<number>(0);
  const [memberSince, setMemberSince] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const [doctorRes, patientsRes, alertsRes] = await Promise.all([
        supabase.from('doctors').select('*').eq('id', user.id).single(),
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('doctor_id', user.id),
        supabase.from('disease_alerts').select('id', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('acknowledged_by_doctor', false).eq('is_suppressed', false),
      ]);
      if (doctorRes.data) {
        setProfile(doctorRes.data);
        if (doctorRes.data.created_at) {
          setMemberSince(new Date(doctorRes.data.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
        }
      }
      setPatientCount(patientsRes.count ?? 0);
      setOpenAlertCount(alertsRes.count ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of O2Plus?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#126969" />
      </View>
    );
  }

  const initials = profile?.name ? profile.name.split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "DR";

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#126969', '#0d4a4a', '#082b2b']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Alert.alert('Doctor Profile', `Clinical Decision Center\n${profile?.name || 'Doctor'}\n${profile?.hospital || 'Hospital'}`)}
            >
              <Settings size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Floating Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={['#1a9393', '#126969']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.nameText}>{profile?.name || 'Dr. Name Pending'}</Text>
          <Text style={styles.specText}>{profile?.specialisation || 'Specialisation Pending'}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{patientCount}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: openAlertCount > 0 ? '#dc2626' : '#0f6e56' }]}>{openAlertCount}</Text>
              <Text style={styles.statLabel}>Open Alerts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{memberSince || '—'}</Text>
              <Text style={styles.statLabel}>Member Since</Text>
            </View>
          </View>
        </View>

        {/* Info Section */}
        <Text style={styles.sectionHeading}>Professional Details</Text>
        <View style={styles.listGroup}>
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#f0fdfa' }]}>
              <Mail size={20} color="#0d9488" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Email Address</Text>
              <Text style={styles.listSub}>{profile?.email || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.listDivider} />
          
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#eff6ff' }]}>
              <Building size={20} color="#3b82f6" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Hospital / Institution</Text>
              <Text style={styles.listSub}>{profile?.hospital || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.listDivider} />
          
          <View style={styles.listItem}>
            <View style={[styles.listIconBox, { backgroundColor: '#fdf4ff' }]}>
              <Stethoscope size={20} color="#c026d3" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Accepts Appointments</Text>
              <Text style={styles.listSub}>{profile?.accepts_appointments ? 'Yes, available for bookings' : 'Currently unavailable'}</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionHeading}>Preferences</Text>
        <View style={styles.listGroup}>
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Push Notifications', 'Real-time push alerts for RED/YELLOW flags and patient daily submissions are enabled for this device.')}
          >
            <View style={[styles.listIconBox, { backgroundColor: '#fef2f2' }]}>
              <Bell size={20} color="#ef4444" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Push Notifications</Text>
              <Text style={styles.listSub}>Alerts, daily logs • Enabled</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <View style={styles.listDivider} />
          <TouchableOpacity
            style={styles.listItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Security & Password', `Logged in as ${profile?.email || 'Doctor'}.\nTo reset your password, use the Forgot Password link at login.`)}
          >
            <View style={[styles.listIconBox, { backgroundColor: '#f8fafc' }]}>
              <Settings size={20} color="#64748b" />
            </View>
            <View style={styles.listTextContent}>
              <Text style={styles.listTitle}>Account & Security</Text>
              <Text style={styles.listSub}>Password, security details</Text>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out Securely</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionInfo}>O2Plus v1.0.0 • Clinical Decision Center</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9'
  },
  
  // Header Gradient
  headerGradient: {
    height: 240,
    width: '100%',
    position: 'absolute',
    top: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  scrollContent: {
    paddingTop: 100, // pushes content down over the gradient
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  
  // Floating Profile Card
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 32,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
    marginTop: -50, // pop out of the top of the card
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#126969',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#10b981',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  specText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 24,
  },
  
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },

  // Info Groups
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  listGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  listSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  listDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 80, // aligns with the text, skipping icon
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#fef2f2',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  versionInfo: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  }
});
