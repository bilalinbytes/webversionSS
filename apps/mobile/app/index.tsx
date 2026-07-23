import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Users, Bell, Shield } from 'lucide-react-native';
import { colors } from '@o2plus/theme';

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={['#ffffff', '#065f74', '#023047']}
      locations={[0, 0.7, 1]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Top Section */}
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>O₂⁺</Text>
            </View>
          </View>
          <Text style={styles.title}>O2Plus</Text>
          <Text style={styles.subtitle}>Connecting missing dots{'\n'}with your doctor</Text>
        </View>

        {/* Center Artwork (Placeholder for Lungs SVG) */}
        <View style={styles.artworkContainer}>
          {/* Lungs artwork would go here */}
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.featuresRow}>
            <FeatureIcon icon={Heart} label="Monitor\nHealth" />
            <FeatureIcon icon={Users} label="Manage\nPatients" />
            <FeatureIcon icon={Bell} label="Get\nAlerts" />
            <FeatureIcon icon={Shield} label="Protect\nLives" />
          </View>
          
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#66d9e8" style={{ marginBottom: 12 }} />
            <Text style={styles.loaderText}>Loading your dashboard...</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function FeatureIcon({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.iconCircle}>
        <Icon size={24} color="#a5f3fc" />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0f4c5c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#22d3ee',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0f4c5c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#0f4c5c',
    textAlign: 'center',
    fontWeight: '500',
  },
  artworkContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  featureLabel: {
    color: '#e0f2fe',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loaderText: {
    color: '#66d9e8',
    fontSize: 14,
  },
});
