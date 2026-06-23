import { View, Text, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth';
import { Button } from '../../../components/ui/Button';

export default function Profile() {
  const { user, clearAuth } = useAuthStore();

  const logout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Profile</Text>
      {user && (
        <>
          <Text style={styles.name}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </>
      )}
      <Button title="Logout" onPress={logout} variant="danger" style={{ marginTop: 24 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 16 },
  name: { fontSize: 18, fontWeight: '600', color: '#374151' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
