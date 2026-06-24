// frontend/app/(tabs)/my-games/[gameId]/cards/create.tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { BlockBuilder } from '../../../../../components/BlockBuilder';
import { createCard } from '../../../../../lib/api';
import type { CardEffect } from '../../../../../types/api';

export default function CreateCard() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [name, setName] = useState('');
  const [effects, setEffects] = useState<CardEffect[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('오류', '카드 이름을 입력해주세요'); return; }
    setLoading(true);
    try {
      await createCard(gameId, { name: name.trim(), attributes: {}, effects });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '카드 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '새 카드' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} placeholder="번개 화살" />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="카드 생성" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
});
