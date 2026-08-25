import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface DiseaseAlertBannerProps {
  type: 'emergency' | 'warning' | 'tips';
  title: string;
  message: string;
  onCallPress?: () => void;
}

export default function DiseaseAlertBanner({ type, title, message, onCallPress }: DiseaseAlertBannerProps) {
  const isEmergency = type === 'emergency';
  const isWarning = type === 'warning';
  const isTips = type === 'tips';

  return (
    <View style={[
      styles.container,
      isEmergency && styles.emergencyBg,
      isWarning && styles.warningBg,
      isTips && styles.tipsBg,
    ]}>
      <View style={styles.contentRow}>
        {!isTips && (
          <View style={styles.iconContainer}>
            <AlertTriangle size={20} color={isEmergency ? '#dc2626' : '#d97706'} />
            {isEmergency && <View style={styles.pulsingDot} />}
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            isEmergency && styles.emergencyText,
            isWarning && styles.warningText,
            isTips && styles.tipsText,
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.message,
            isEmergency && styles.emergencyText,
            isWarning && styles.warningText,
            isTips && styles.tipsText,
          ]}>
            {message}
          </Text>
        </View>
      </View>
      {isEmergency && onCallPress && (
        <TouchableOpacity style={styles.callButton} onPress={onCallPress}>
          <Text style={styles.callButtonText}>Call 112</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  emergencyBg: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  warningBg: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  tipsBg: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
    position: 'relative',
  },
  pulsingDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  emergencyText: {
    color: '#991b1b',
  },
  warningText: {
    color: '#92400e',
  },
  tipsText: {
    color: '#115e59',
  },
  callButton: {
    marginTop: 12,
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
