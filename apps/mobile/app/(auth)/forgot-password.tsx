import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, CheckCircle } from 'lucide-react-native';
import { colors } from '@o2plus/theme';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      return setError('Please enter a valid email address');
    }

    setLoading(true);
    setError('');

    try {
      // Create a deep link URL that will bring the user back to the reset-password screen
      const resetUrl = Linking.createURL('/(auth)/reset-password');
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: resetUrl }
      );

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
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
              <Text style={styles.welcomeText}>Check your email</Text>
              <Text style={[styles.subtitleText, { textAlign: 'center' }]}>
                We've sent a password reset link to{'\n'}
                <Text style={{ fontWeight: 'bold' }}>{email}</Text>
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.primaryButtonText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.welcomeText}>Reset Password</Text>
              <Text style={styles.subtitleText}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <Text style={styles.label}>Email Address</Text>
              <TextInput 
                style={styles.input} 
                placeholder="doctor@hospital.org" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
              />

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={onSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.linkTextCentered}>← Back to sign in</Text>
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
  primaryButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
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
  backLink: {
    marginTop: 8,
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
