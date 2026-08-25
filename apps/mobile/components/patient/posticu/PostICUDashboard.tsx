import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle, Circle } from 'lucide-react-native';
import DiseaseAlertBanner from '../DiseaseAlertBanner';

interface Props {
  data: any;
  onLogToday: () => void;
}

export default function PostICUDashboard({ data, onLogToday }: Props) {
  const { riskScore, diseaseSpecificData } = data;
  
  const dischargeDate = diseaseSpecificData?.icu_discharge_date;
  let daysSinceDischarge = 0;
  if (dischargeDate) {
    const diff = new Date().getTime() - new Date(dischargeDate).getTime();
    daysSinceDischarge = Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  }
  const progressPercent = Math.min(100, (daysSinceDischarge / 90) * 100);

  const sputumColor = diseaseSpecificData?.sputum_color || 'clear';
  const isInfectionRisk = 
    diseaseSpecificData?.fever === true || 
    diseaseSpecificData?.flu_like === true || 
    diseaseSpecificData?.sputum_change === true ||
    sputumColor === 'dark_green' || sputumColor === 'brown' || sputumColor === 'red';

  const showTips = !isInfectionRisk && riskScore >= 4 && riskScore < 7;

  const infectionItems = [
    { key: 'fever', label: 'Fever/Temp >38°C', isWarning: diseaseSpecificData?.fever === true },
    { key: 'flu_like', label: 'Flu-like/Malaise', isWarning: diseaseSpecificData?.flu_like === true },
    { key: 'sputum_change', label: 'Sputum change', isWarning: diseaseSpecificData?.sputum_change === true },
    { key: 'chest_clearance', label: 'Chest clearance issue', isWarning: diseaseSpecificData?.chest_clearance === false },
  ];

  const milestones = diseaseSpecificData?.milestones || [];
  const milestoneList = [
    'Weaned off oxygen',
    'Mobilising independently',
    'Nutritional goals met',
    'Normal sleep pattern',
    'Psychological stability',
    'Return to normal activities'
  ];

  return (
    <View style={styles.container}>
      {isInfectionRisk && (
        <DiseaseAlertBanner
          type="emergency"
          title="Possible Infection"
          message="Your symptoms suggest a possible infection. Please contact your care team immediately."
        />
      )}
      {showTips && (
        <DiseaseAlertBanner
          type="tips"
          title="Recovery Tips"
          message="Moderate risk detected. Please ensure you are doing your breathing exercises and resting adequately."
        />
      )}

      {dischargeDate && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Day {daysSinceDischarge} of Recovery</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>90 Day Goal</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.sectionTitle}>Sputum Status</Text>
          <Text style={styles.sputumValue}>{sputumColor}</Text>
        </View>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recovery Milestones</Text>
        <View style={styles.list}>
          {milestoneList.map((m, i) => {
            const isDone = milestones.includes(m);
            return (
              <View key={i} style={styles.listItem}>
                {isDone ? (
                  <CheckCircle2 size={20} color="#1565c0" />
                ) : (
                  <Circle size={20} color="#94a3b8" />
                )}
                <Text style={styles.itemLabel}>{m}</Text>
              </View>
            );
          })}
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#132d36',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1565c0',
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  sputumValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
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
