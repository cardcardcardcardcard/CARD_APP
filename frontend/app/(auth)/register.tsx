// frontend/app/(auth)/register.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { register, login, getMe } from '../../lib/api';
import { setToken } from '../../lib/storage';
import { useAuthStore } from '../../store/auth';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  const submit = async () => {
    if (!username || !email || !password) { Alert.alert('오류', '모든 항목을 입력해주세요'); return; }
    setLoading(true);
    try {
      await register({ username, email, password });
      const { access_token } = await login({ email, password });
      await setToken(access_token);
      const user = await getMe();
      await setAuth(access_token, user);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      Alert.alert('회원가입 실패', e?.response?.data?.detail ?? '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CardCard</Text>
        <Text style={styles.subtitle}>커스텀 카드 게임</Text>
        <Input label="사용자 이름" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Input label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="회원가입" onPress={submit} loading={loading} />
        <Link href="/(auth)/login" style={styles.link}>
          이미 계정이 있으신가요? 로그인
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
