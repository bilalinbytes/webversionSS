import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DiseaseAlertBanner from '../DiseaseAlertBanner';

interface Props {
  data: any;
  onLogToday: () => void;
}

export default function ILDDashboard({ data, onLogToday }: Props) {
  const { riskScore, diseaseSpecificData } = data;
  
  const showWarning = riskScore >= 8;
  const showTips = riskScore >= 4 && riskScore < 7;
  
  const kbildScore = diseaseSpecificData?.kbild_score || 0;
  const kbildResponses = diseaseSpecificData?.kbild_responses || {};

  let scoreColor = '#dc2626';
  let scoreLabel = 'Poor';
  if (kbildScore >= 70) {
    scoreColor = '#0f6e56';
    scoreLabel = 'Good';
  } else if (kbildScore >= 40) {
    scoreColor = '#d97706';
    scoreLabel = 'Fair';
  }

  return (
    <View style={styles.container}>
      {showWarning && (
        <DiseaseAlertBanner
          type="warning"
          title="High Risk Score"
          message={`High Risk Score (${riskScore}/10). Your metrics show signs of progression. Please monitor closely.`}
        />
      )}
      {!showWarning && showTips && (
        <DiseaseAlertBanner
          type="tips"
          title="ILD Tips"
          message="Moderate risk detected. Remember to pace your activities and use oxygen therapy if prescribed."
        />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>KBILD Quality of Life</Text>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{kbildScore}</Text>
          </View>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
        </View>
      </View>

      {Object.keys(kbildResponses).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>KBILD Responses</Text>
          <View style={styles.grid}>
            {Object.keys(kbildResponses).map((q) => (
              <View key={q} style={styles.gridItem}>
                <Text style={styles.qText}>{q.toUpperCase()}</Text>
                <Text style={styles.aText}>{kbildResponses[q]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31%',
    backgroundColor: '#f3e5f5',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  qText: {
    fontSize: 12,
    color: '#4527a0',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aText: {
    fontSize: 14,
    color: '#132d36',
  },
});
