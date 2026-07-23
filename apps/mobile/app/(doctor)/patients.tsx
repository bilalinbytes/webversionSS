import { View, Text, StyleSheet } from 'react-native';

export default function PatientsScreen() {
  return (
    <View style={styles.container}>
      <Text>Patients Screen (Placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
