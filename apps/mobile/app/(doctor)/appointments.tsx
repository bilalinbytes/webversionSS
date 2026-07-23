import { View, Text, StyleSheet } from 'react-native';

export default function AppointmentsScreen() {
  return (
    <View style={styles.container}>
      <Text>Appointments Screen (Placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
