import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import DiseaseAlertBanner from '../DiseaseAlertBanner';

interface Props {
  data: any;
  onLogToday: () => void;
}

export default function BronchiectasisDashboard({ data, onLogToday }: Props) {
  const { riskScore, diseaseSpecificData } = data;
  
  const sputumColor = diseaseSpecificData?.sputum_color || 'clear';
  const isInfectionRisk = 
    diseaseSpecificData?.fever === true || 
    diseaseSpecificData?.flu_like === true || 
    diseaseSpecificData?.sputum_change === true || 
    diseaseSpecificData?.chest_clearance === false ||
    sputumColor === 'dark_green' || sputumColor === 'brown' || sputumColor === 'red';

  const showTips = !isInfectionRisk && riskScore >= 4 && riskScore < 7;

  const infectionItems = [
    { key: 'fever', label: 'Fever/Temp >38°C', isWarning: diseaseSpecificData?.fever === true },
    { key: 'flu_like', label: 'Flu-like/Malaise', isWarning: diseaseSpecificData?.flu_like === true },
    { key: 'sputum_change', label: 'Sputum change', isWarning: diseaseSpecificData?.sputum_change === true },
    { key: 'chest_clearance', label: 'Chest clearance issue', isWarning: diseaseSpecificData?.chest_clearance === false },
  ];

  return (
    <View style={styles.container}>
      {isInfectionRisk && (
        <DiseaseAlertBanner
          type="emergency"
          title="Possible Infection Detected"
          message="Your symptoms suggest a possible exacerbation or infection. Please contact your doctor for advice on starting standby antibiotics."
        />
      )}
      {showTips && (
        <DiseaseAlertBanner
          type="tips"
          title="Airway Clearance"
          message="Moderate risk detected. Please ensure you are doing your airway clearance exercises."
        />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today's Sputum Status</Text>
        <Text style={styles.sputumText}>
          Reported color: <Text style={styles.sputumValue}>{sputumColor}</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Infection Screen</Text>
        <View style={styles.list}>
          {infectionItems.map(item => (
            <View key={item.key} style={styles.listItem}>
              {item.isWarning ? (
                <AlertTriangle size={20} color="#dc2626" />
              ) : (
                <CheckCircle2 size={20} color="#0f6e56" />
              )}
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
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
  sputumText: {
    fontSize: 14,
    color: '#6d8794',
  },
  sputumValue: {
    fontWeight: 'bold',
    color: '#e65100',
    textTransform: 'capitalize',
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 14,
    marginLeft: 12,
    color: '#132d36',
  },
});
