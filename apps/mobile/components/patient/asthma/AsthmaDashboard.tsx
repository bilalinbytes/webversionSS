import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import DiseaseAlertBanner from '../DiseaseAlertBanner';

interface Props {
  data: any;
  onLogToday: () => void;
}

export default function AsthmaDashboard({ data, onLogToday }: Props) {
  const { diseaseSpecificData, riskScore } = data;
  
  let yesCount = 0;
  const actItems = [
    { key: 'daytime_symptoms', label: 'Daytime Symptoms' },
    { key: 'night_waking', label: 'Night Waking' },
    { key: 'reliever_use', label: 'Reliever Use' },
    { key: 'activity_limitation', label: 'Activity Limitation' },
  ];

  const items = actItems.map(item => {
    const isYes = diseaseSpecificData?.[item.key] === true;
    if (isYes) yesCount++;
    return { ...item, isYes };
  });

  const isUncontrolled = yesCount >= 3;
  const showTips = riskScore >= 4 && riskScore < 7;

  let controlStatus = 'Well Controlled';
  let controlColor = '#0f6e56';
  if (yesCount >= 1 && yesCount <= 2) {
    controlStatus = 'Partly Controlled';
    controlColor = '#d97706';
  } else if (yesCount >= 3) {
    controlStatus = 'Uncontrolled';
    controlColor = '#dc2626';
  }

  const diagLabel = data?.diagnosis || 'Respiratory';

  return (
    <View style={styles.container}>
      {isUncontrolled && (
        <DiseaseAlertBanner
          type="emergency"
          title={`${diagLabel} Uncontrolled`}
          message={`Your ${diagLabel} is uncontrolled this week. Your doctor has been notified. Please avoid triggers and use your reliever as prescribed.`}
        />
      )}
      {!isUncontrolled && showTips && (
        <DiseaseAlertBanner
          type="tips"
          title={`${diagLabel} Tips`}
          message="Moderate risk detected. Follow your action plan and avoid known triggers."
        />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{diagLabel} Control (ACT)</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, { color: controlColor }]}>{controlStatus}</Text>
        </View>

        <View style={styles.list}>
          {items.map(item => (
            <View key={item.key} style={styles.listItem}>
              {item.isYes ? (
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6d8794',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
