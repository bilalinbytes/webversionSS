import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import { startPatientImportOTP, verifyPatientOTP, setPatientPin, patientPinLogin } from '@o2plus/api-client/patient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'doctor' | 'patient'>('doctor');
  
  // Doctor Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState('');

  // Patient Auth State
  const [patientMode, setPatientMode] = useState<'returning' | 'new' | 'forgot'>('returning');
  const [patientStep, setPatientStep] = useState<'phone' | 'otp' | 'pin'>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState('');
  const [patientInfo, setPatientInfo] = useState('');

  const resetPatientFlow = (newMode: 'returning' | 'new' | 'forgot') => {
    setPatientMode(newMode);
    setPatientStep('phone');
    setOtp('');
    setOtpToken('');
    setPin('');
    setConfirmPin('');
    setPatientError('');
    setPatientInfo('');
  };

  const handleDoctorLogin = async () => {
    if (!email || !password) return;
    setDoctorLoading(true);
    setDoctorError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setDoctorError(error.message);
    setDoctorLoading(false);
  };

  const handleSendOtp = async () => {
    if (!mobile || mobile.length < 10) return;
    setPatientLoading(true);
    setPatientError('');
    setPatientInfo('');
    try {
      const apiConfig = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const response = await startPatientImportOTP(apiConfig, mobile);
      if (response?.success) {
        setPatientStep('otp');
        setPatientInfo('OTP sent successfully.');
      } else {
        setPatientError(response?.error || 'Failed to send OTP');
      }
    } catch (err) {
      setPatientError('An unexpected error occurred');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return;
    setPatientLoading(true);
    setPatientError('');
    setPatientInfo('');
    try {
      const apiConfig = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const response = await verifyPatientOTP(apiConfig, mobile, otp, 'mobile');
      if (response?.success && response.otp_token) {
        setOtpToken(response.otp_token);
        setPatientStep('pin');
      } else {
        setPatientError(response?.error || 'Invalid OTP');
      }
    } catch (err: any) {
      setPatientError(err.message || 'Invalid OTP');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!pin || pin.length !== 4) return;
    if (pin !== confirmPin) {
      setPatientError('PINs do not match');
      return;
    }
    setPatientLoading(true);
    setPatientError('');
    setPatientInfo('');
    try {
      const apiConfig = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const response = await setPatientPin(apiConfig, otpToken, pin, confirmPin);
      if (response?.success) {
        setPatientInfo('PIN set successfully. Please log in.');
        setTimeout(() => resetPatientFlow('returning'), 1500);
      } else {
        setPatientError(response?.error || 'Failed to set PIN');
      }
    } catch (err: any) {
      setPatientError(err.message || 'Error setting PIN');
    } finally {
      setPatientLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (!mobile || !pin || pin.length !== 4) return;
    setPatientLoading(true);
    setPatientError('');
    setPatientInfo('');
    try {
      const apiConfig = { supabase: supabase as any, baseUrl: process.env.EXPO_PUBLIC_API_URL || '' };
      const response = await patientPinLogin(apiConfig, mobile, pin);
      if (response?.success && response.session) {
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
      } else {
        setPatientError(response?.error || 'Login failed');
      }
    } catch (err: any) {
      setPatientError(err.message || 'Login error');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setDoctorLoading(true);
    setDoctorError('');
    try {
      const redirectUri = Linking.createURL('/auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        
        if (result.type === 'success' && result.url) {
          // Parse hash fragment for implicit flow
          const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      }
    } catch (err: any) {
      setDoctorError(err.message || 'Google Auth Failed');
    } finally {
      setDoctorLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header Background */}
        <View style={styles.headerBg}>
          <LinearGradient
            colors={['rgba(2, 48, 71, 0.8)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          {/* Faded logo in background */}
          <View style={styles.fadedLogoContainer}>
            <Text style={styles.fadedLogoText}>O₂⁺</Text>
          </View>
        </View>

        {/* Main Content Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome Back 👋</Text>
          <Text style={styles.subtitleText}>Sign in to access your clinical dashboard</Text>

          {/* Segmented Control */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity 
              style={[styles.segmentButton, activeTab === 'doctor' && styles.segmentActive]}
              onPress={() => setActiveTab('doctor')}
            >
              <Text style={[styles.segmentText, activeTab === 'doctor' && styles.segmentTextActive]}>Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentButton, activeTab === 'patient' && styles.segmentActive]}
              onPress={() => setActiveTab('patient')}
            >
              <Text style={[styles.segmentText, activeTab === 'patient' && styles.segmentTextActive]}>Patient</Text>
            </TouchableOpacity>
          </View>

          {/* DOCTOR FORM */}
          {activeTab === 'doctor' && (
            <View style={styles.formContainer}>
              {doctorError ? <Text style={styles.errorText}>{doctorError}</Text> : null}
              
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="dr.smith@hospital.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? <EyeOff size={20} color={colors.ui.textMuted} /> : <Eye size={20} color={colors.ui.textMuted} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleDoctorLogin}
                disabled={doctorLoading}
              >
                {doctorLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign in to Dashboard →</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                {/* Simplified Google text without icon for now */}
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
                <Text style={{ color: '#64748b' }}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.linkText}>Register here</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PATIENT FORM */}
          {activeTab === 'patient' && (
            <View style={styles.formContainer}>
              {patientError ? <Text style={styles.errorText}>{patientError}</Text> : null}
              {patientInfo ? <Text style={styles.infoText}>{patientInfo}</Text> : null}

              {patientMode === 'returning' && (
                <>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 00000 00000"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.label}>4-digit PIN</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••"
                    value={pin}
                    onChangeText={setPin}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handlePinLogin} disabled={patientLoading}>
                    {patientLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Log in →</Text>}
                  </TouchableOpacity>
                  
                  <View style={styles.helpLinks}>
                    <TouchableOpacity onPress={() => resetPatientFlow('forgot')}><Text style={styles.linkText}>Forgot PIN?</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => resetPatientFlow('new')}><Text style={styles.linkText}>First time setup?</Text></TouchableOpacity>
                  </View>
                </>
              )}

              {(patientMode === 'new' || patientMode === 'forgot') && (
                <>
                  <Text style={styles.flowTitle}>{patientMode === 'new' ? 'First-time setup' : 'Reset PIN'}</Text>
                  <Text style={styles.flowCopy}>
                    {patientMode === 'new' ? 'Verify once with OTP, then set a 4-digit PIN for future logins.' : 'Verify with OTP, then create a new 4-digit PIN.'}
                  </Text>
                  
                  {patientStep === 'phone' && (
                    <>
                      <Text style={styles.label}>Mobile Number</Text>
                      <TextInput style={styles.input} placeholder="+91 00000 00000" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
                      <TouchableOpacity style={styles.primaryButton} onPress={handleSendOtp} disabled={patientLoading}>
                        {patientLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send OTP →</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  {patientStep === 'otp' && (
                    <>
                      <Text style={styles.label}>Enter OTP</Text>
                      <TextInput style={styles.input} placeholder="123456" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                      <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} disabled={patientLoading}>
                        {patientLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify OTP →</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.forgotPassword} onPress={() => setPatientStep('phone')}>
                        <Text style={styles.linkText}>Change mobile number</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {patientStep === 'pin' && (
                    <>
                      <Text style={styles.label}>{patientMode === 'new' ? 'Create 4-digit PIN' : 'New 4-digit PIN'}</Text>
                      <TextInput style={styles.input} placeholder="••••" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
                      <Text style={styles.label}>Confirm PIN</Text>
                      <TextInput style={styles.input} placeholder="••••" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
                      <TouchableOpacity style={styles.primaryButton} onPress={handleSetPin} disabled={patientLoading}>
                        {patientLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Set PIN & Continue →</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity style={styles.backLink} onPress={() => resetPatientFlow('returning')}>
                    <Text style={styles.linkTextCentered}>← Back to PIN Login</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

        </View>

        {/* Footer Trust Badge */}
        <View style={styles.footer}>
          <ShieldCheck size={16} color={colors.ui.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>
            Your data is secure and protected{'\n'}HIPAA compliant • End-to-end encrypted
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Slate 100
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerBg: {
    height: 250,
    backgroundColor: '#023047',
    position: 'relative',
    overflow: 'hidden',
  },
  fadedLogoContainer: {
    position: 'absolute',
    top: 40,
    right: -40,
    opacity: 0.05,
    transform: [{ scale: 2 }],
  },
  fadedLogoText: {
    fontSize: 150,
    color: '#ffffff',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    marginTop: -80,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a', // Slate 900
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    color: '#64748b', // Slate 500
    marginBottom: 24,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
  },
  formContainer: {
    // Form styles
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeIcon: {
    padding: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  linkText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0284c7', // Sky 600
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.risk.red.solid,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  infoText: {
    color: colors.brand.primary,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  helpLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  flowCopy: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkTextCentered: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    color: colors.ui.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
