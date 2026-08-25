import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { UserPlus, X, Shield, CheckCircle2, Phone } from 'lucide-react-native';
import { startPatientImportOTP, importPatientWithOTP } from '@o2plus/api-client/transfer';
import { supabase } from '../../lib/supabase';

interface ImportPatientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportPatientModal({ visible, onClose, onSuccess }: ImportPatientModalProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await startPatientImportOTP(config, phone.replace(/\D/g, '').slice(-10), session?.access_token);
      
      if (res.success) {
        setStep('otp');
      } else {
        setError(res.error || 'Failed to send OTP to patient.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndImport = async () => {
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const config = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const { data: { session } } = await supabase.auth.getSession();
      const res = await importPatientWithOTP(config, phone.replace(/\D/g, '').slice(-10), otp.trim(), session?.access_token);

      if (res.success) {
        setStep('success');
        onSuccess();
      } else {
        setError(res.error || 'Invalid OTP or transfer failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <UserPlus size={18} color="#126969" />
              </View>
              <View>
                <Text style={styles.title}>Import Patient</Text>
                <Text style={styles.subtitle}>Transfer access via secure patient OTP</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {step === 'phone' && (
            <View style={styles.body}>
              <Text style={styles.label}>Patient's Registered Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={v => { setPhone(v.replace(/\D/g, '')); setError(''); }}
              />

              <View style={styles.infoBox}>
                <Shield size={16} color="#0d9488" style={{ marginTop: 2 }} />
                <Text style={styles.infoText}>
                  An OTP will be sent to the patient. Once verified, you will have access to their complete medical history, previous daily logs, and PFT reports.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (phone.length < 10 || loading) && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={phone.length < 10 || loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP to Patient →</Text>}
              </TouchableOpacity>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.body}>
              <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={v => { setOtp(v.replace(/\D/g, '')); setError(''); }}
              />

              <Text style={styles.otpHint}>OTP sent to +91 {phone}</Text>

              <TouchableOpacity
                style={[styles.primaryBtn, (otp.length !== 6 || loading) && styles.btnDisabled]}
                onPress={handleVerifyAndImport}
                disabled={otp.length !== 6 || loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Import Patient</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('phone')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Change mobile number</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'success' && (
            <View style={[styles.body, { alignItems: 'center', paddingVertical: 20 }]}>
              <CheckCircle2 size={48} color="#0f6e56" style={{ marginBottom: 12 }} />
              <Text style={styles.successTitle}>Patient Imported Successfully!</Text>
              <Text style={styles.successSub}>You now have access to their medical records and dashboard.</Text>
              <TouchableOpacity style={[styles.primaryBtn, { width: '100%', marginTop: 20 }]} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdfa', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 11, color: '#64748b' },
  closeBtn: { padding: 4 },
  body: { gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  otpHint: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  infoBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#f0fdfa',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccfbf1',
  },
  infoText: { flex: 1, fontSize: 12, color: '#0f766e', lineHeight: 17 },
  primaryBtn: {
    backgroundColor: '#126969', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText: { color: '#dc2626', fontSize: 12, backgroundColor: '#fef2f2', padding: 8, borderRadius: 6, marginBottom: 8 },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { fontSize: 13, color: '#126969', fontWeight: '500' },
  successTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  successSub: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});
