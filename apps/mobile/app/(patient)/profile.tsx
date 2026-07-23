import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '@o2plus/theme';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <Text style={styles.text}>{user?.phone}</Text>
      <TouchableOpacity style={styles.btn} onPress={signOut}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18, marginBottom: 12 },
  btn: { backgroundColor: colors.risk.red.solid, padding: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
