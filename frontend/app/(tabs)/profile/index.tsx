import { Text, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';

export default function Profile() {
  const { user, clearAuth } = useAuthStore();

  const logout = async () => {
    await clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <>
      <Stack.Screen options={{ title: '프로필' }} />
      <ScreenContainer style={styles.container}>
        {user && (
          <>
            <Text style={styles.name}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </>
        )}
        <Button title="로그아웃" onPress={logout} variant="danger" style={{ marginTop: 24 }} />
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  name: { fontSize: 18, fontWeight: '600', color: '#374151' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});
