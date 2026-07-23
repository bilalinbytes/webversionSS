import { View, Text, StyleSheet } from 'react-native';

export default function RecordsScreen() {
  return (
    <View style={styles.container}>
      <Text>Medical Records (Placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
