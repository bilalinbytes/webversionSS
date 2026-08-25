import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DiseaseAlertBanner from '../DiseaseAlertBanner';

interface Props {
  data: any;
  onLogToday: () => void;
}

export default function COPDDashboard({ data, onLogToday }: Props) {
  const { spo2Today, riskScore, diseaseSpecificData } = data;
  
  const showEmergency = spo2Today > 0 && spo2Today < 85;
  const showTips = riskScore >= 4 && riskScore < 7;
  const weeklyImpact = diseaseSpecificData?.weekly_impact;

  return (
    <View style={styles.container}>
      {showEmergency && (
        <DiseaseAlertBanner
          type="emergency"
          title="SpO₂ Critically Low"
          message={`SpO₂ critically low (${spo2Today}%). For COPD, target is 88–92%. Please use your BiPAP and contact your doctor immediately.`}
          onCallPress={() => {}}
        />
      )}
      {!showEmergency && showTips && (
        <DiseaseAlertBanner
          type="tips"
          title="COPD Tips"
          message="Moderate risk detected. Ensure you are taking your inhalers as prescribed and practice pursed-lip breathing."
        />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weekly Symptom Impact</Text>
        
        {!weeklyImpact ? (
          <Text style={styles.emptyText}>No data logged</Text>
        ) : (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.itemLabel}>Cough Frequency</Text>
              <Text style={styles.itemValue}>{weeklyImpact.cough_frequency || '-'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.itemLabel}>Phlegm Production</Text>
              <Text style={styles.itemValue}>{weeklyImpact.phlegm_production || '-'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.itemLabel}>Exercise Tolerance</Text>
              <Text style={styles.itemValue}>{weeklyImpact.exercise_tolerance || '-'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.itemLabel}>Sleep Quality</Text>
              <Text style={styles.itemValue}>{weeklyImpact.sleep_quality || '-'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#132d36',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#888680',
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemLabel: {
    fontSize: 12,
    color: '#6d8794',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#378add',
  },
});
