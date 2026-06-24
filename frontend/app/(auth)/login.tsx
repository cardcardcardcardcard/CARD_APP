// frontend/app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { login, getMe } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  const submit = async () => {
    if (!email || !password) { Alert.alert('오류', '모든 항목을 입력해주세요'); return; }
    setLoading(true);
    try {
      const { access_token } = await login({ email, password });
      // Write token to storage so the api interceptor can use it for getMe
      const { setToken } = await import('../../lib/storage');
      await setToken(access_token);
      const user = await getMe();
      await setAuth(access_token, user);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      Alert.alert('로그인 실패', e?.response?.data?.detail ?? '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CardCard</Text>
        <Text style={styles.subtitle}>계정에 로그인하세요</Text>
        <Input label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="로그인" onPress={submit} loading={loading} />
        <Link href="/(auth)/register" style={styles.link}>
          계정이 없으신가요? 회원가입
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#6366f1', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 32, textAlign: 'center' },
  link: { marginTop: 16, textAlign: 'center', color: '#6366f1', fontSize: 14 },
});
