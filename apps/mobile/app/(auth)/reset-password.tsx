import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) return setError('Password must contain at least one capital letter');
    if (!/[0-9]/.test(password)) return setError('Password must contain at least one number');
    if (!/[^A-Za-z0-9]/.test(password)) return setError('Password must contain at least one special character');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
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
          {success ? (
            <View style={styles.successState}>
              <CheckCircle size={48} color={colors.brand.primary} style={{ marginBottom: 16 }} />
              <Text style={styles.welcomeText}>Password updated</Text>
              <Text style={[styles.subtitleText, { textAlign: 'center' }]}>
                Your password has been changed successfully. You can now sign in with your new password.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.welcomeText}>Create New Password</Text>
              <Text style={styles.subtitleText}>
                Your new password must be different from previous used passwords.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <Text style={styles.label}>New Password</Text>
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
              
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={styles.passwordInput} 
                  placeholder="••••••••" 
                  value={confirmPassword} 
                  onChangeText={setConfirmPassword} 
                  secureTextEntry={!showConfirmPassword} 
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  {showConfirmPassword ? <EyeOff size={20} color={colors.ui.textMuted} /> : <Eye size={20} color={colors.ui.textMuted} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
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
  primaryButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    width: '100%',
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
  successState: {
    alignItems: 'center',
    paddingVertical: 16,
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
