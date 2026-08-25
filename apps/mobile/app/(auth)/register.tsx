import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ShieldCheck, Check } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'email' | 'phone' | 'google'>('email');
  
  // Shared State
  const [fullName, setFullName] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  const [hospital, setHospital] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Email State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);
  
  // Phone State
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const formatPhone = (p: string) => p.startsWith('+') ? p : `+91${p}`;
  const phoneDoctorEmail = (p: string) => `${formatPhone(p).replace(/^\+/, '')}@phone.saans.local`;

  const validateCommon = () => {
    if (fullName.trim().length < 2) return 'Full name is required';
    if (!specialisation.trim()) return 'Specialisation is required';
    if (!hospital.trim()) return 'Hospital / Institution is required';
    if (!terms) return 'You must accept the terms & conditions';
    return null;
  };

  const onEmailSubmit = async () => {
    const commonErr = validateCommon();
    if (commonErr) return setError(commonErr);
    if (!email.trim() || !email.includes('@')) return setError('Invalid email address');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) return setError('Password must contain at least one capital letter');
    if (!/[0-9]/.test(password)) return setError('Password must contain at least one number');
    if (!/[^A-Za-z0-9]/.test(password)) return setError('Password must contain at least one special character');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !authData.user) {
        throw signUpError || new Error('Registration failed');
      }

      if (!authData.session) {
        // Email confirmation required
        await AsyncStorage.setItem('saans_pending_registration', JSON.stringify({
          name: fullName,
          email,
          specialisation,
          hospital
        }));
        setEmailConfirmSent(true);
      } else {
        // Automatically confirmed
        const { error: insertError } = await supabase.from('doctors').upsert({
          id: authData.user.id,
          name: fullName,
          email,
          specialisation,
          hospital,
        }, { onConflict: 'id' });
        if (insertError) throw insertError;
        router.replace('/(doctor)');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onPhoneSubmit = async () => {
    const commonErr = validateCommon();
    if (commonErr) return setError(commonErr);
    if (phone.length < 10) return setError('Please enter a valid mobile number');

    setLoading(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formatPhone(phone),
      });

      if (otpError) throw otpError;
      setPhoneStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) return setError('Please enter the full 6-digit OTP');
    
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formatPhone(phone),
        token: otp,
        type: 'sms',
      });

      if (verifyError || !authData.user) {
        throw verifyError || new Error('Verification failed');
      }

      const { error: insertError } = await supabase.from('doctors').upsert({
        id: authData.user.id,
        name: fullName,
        email: phoneDoctorEmail(phone),
        specialisation,
        hospital,
      }, { onConflict: 'id' });

      if (insertError) throw insertError;
      router.replace('/(doctor)');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSubmit = async () => {
    if (!terms) return setError('You must accept the terms & conditions');
    
    setLoading(true);
    setError('');

    try {
      const redirectUri = Linking.createURL('/auth/callback');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      });

      if (oauthError) throw oauthError;
      
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success' && result.url) {
          const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            // Since we don't have fields for Google users, they'll need to complete profile later.
            // On web, this is handled by complete-profile page.
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Google Auth Failed');
    } finally {
      setLoading(false);
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
          <LinearGradient colors={['rgba(2, 48, 71, 0.8)', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={styles.fadedLogoContainer}>
            <Text style={styles.fadedLogoText}>O₂⁺</Text>
          </View>
        </View>

        {/* Main Content Card */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Create your account.</Text>
          <Text style={styles.subtitleText}>Start monitoring your patients today.</Text>

          {/* Segmented Control */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity 
              style={[styles.segmentButton, authMode === 'email' && styles.segmentActive]}
              onPress={() => { setAuthMode('email'); setPhoneStep('phone'); setError(''); }}
            >
              <Text style={[styles.segmentText, authMode === 'email' && styles.segmentTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentButton, authMode === 'phone' && styles.segmentActive]}
              onPress={() => { setAuthMode('phone'); setError(''); }}
            >
              <Text style={[styles.segmentText, authMode === 'phone' && styles.segmentTextActive]}>Phone</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.segmentButton, authMode === 'google' && styles.segmentActive]}
              onPress={() => { setAuthMode('google'); setPhoneStep('phone'); setError(''); }}
            >
              <Text style={[styles.segmentText, authMode === 'google' && styles.segmentTextActive]}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            {emailConfirmSent && authMode === 'email' ? (
              <View style={styles.confirmState}>
                <Text style={styles.confirmTitle}>Check your inbox</Text>
                <Text style={styles.confirmDesc}>
                  We sent a confirmation link to {email}. Click the link to activate your account.
                </Text>
                <TouchableOpacity onPress={() => setEmailConfirmSent(false)} style={styles.backButton}>
                  <Text style={styles.linkTextCentered}>Back to registration</Text>
                </TouchableOpacity>
              </View>
            ) : authMode === 'google' ? (
              <View>
                <View style={styles.googleInfoBox}>
                  <Text style={styles.googleInfoText}>
                    Register with Google. Fast, secure, and no password required. 
                    You can complete your clinical profile after sign-in.
                  </Text>
                </View>
                
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setTerms(!terms)}>
                  <View style={[styles.checkbox, terms && styles.checkboxChecked]}>
                    {terms && <Check size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>I agree to the Terms of Service and Privacy Policy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryButton} onPress={onGoogleSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue with Google</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Common Fields (Name, Specialisation, Hospital) */}
                {phoneStep === 'phone' && (
                  <>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput style={styles.input} placeholder="Dr. Jane Doe" value={fullName} onChangeText={setFullName} />
                    
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Specialisation</Text>
                        <TextInput style={styles.input} placeholder="e.g. Pulmonologist" value={specialisation} onChangeText={setSpecialisation} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.label}>Hospital</Text>
                        <TextInput style={styles.input} placeholder="e.g. AIIMS" value={hospital} onChangeText={setHospital} />
                      </View>
                    </View>
                  </>
                )}

                {/* Email Specific */}
                {authMode === 'email' && (
                  <>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput style={styles.input} placeholder="doctor@hospital.org" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput style={styles.passwordInput} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        {showPassword ? <EyeOff size={20} color={colors.ui.textMuted} /> : <Eye size={20} color={colors.ui.textMuted} />}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput style={styles.passwordInput} placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                        {showConfirmPassword ? <EyeOff size={20} color={colors.ui.textMuted} /> : <Eye size={20} color={colors.ui.textMuted} />}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Phone Specific */}
                {authMode === 'phone' && (
                  <>
                    {phoneStep === 'phone' ? (
                      <>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput style={styles.input} placeholder="9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                      </>
                    ) : (
                      <>
                        <Text style={styles.label}>Enter 6-digit OTP sent to +91 {phone}</Text>
                        <TextInput style={styles.input} placeholder="123456" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                        <TouchableOpacity style={{ alignSelf: 'flex-end', marginBottom: 16 }} onPress={() => setPhoneStep('phone')}>
                          <Text style={styles.linkText}>Change number</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}

                {/* Terms & Submit for Email/Phone */}
                {phoneStep === 'phone' && (
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => setTerms(!terms)}>
                    <View style={[styles.checkbox, terms && styles.checkboxChecked]}>
                      {terms && <Check size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I agree to the Terms of Service and Privacy Policy</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={authMode === 'email' ? onEmailSubmit : (phoneStep === 'phone' ? onPhoneSubmit : verifyOtp)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {authMode === 'email' ? 'Create Account' : (phoneStep === 'phone' ? 'Send OTP' : 'Verify & Create')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
            
            {/* Nav Links */}
            <View style={styles.navLinks}>
              <Text style={styles.navText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.linkText}>Sign in</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Footer */}
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
    backgroundColor: '#f1f5f9', 
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
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 15,
    color: '#64748b',
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
  formContainer: {},
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  linkText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkTextCentered: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.risk.red.solid,
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  confirmState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  confirmDesc: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  backButton: {
    paddingVertical: 12,
  },
  googleInfoBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  googleInfoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  navLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  navText: {
    fontSize: 14,
    color: '#64748b',
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
