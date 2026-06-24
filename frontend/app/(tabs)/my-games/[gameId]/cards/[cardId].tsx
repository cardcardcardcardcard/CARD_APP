// frontend/app/(tabs)/my-games/[gameId]/cards/[cardId].tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { BlockBuilder } from '../../../../../components/BlockBuilder';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { listCards, updateCard } from '../../../../../lib/api';
import type { CardOut, CardEffect } from '../../../../../types/api';

export default function EditCard() {
  const { gameId, cardId } = useLocalSearchParams<{ gameId: string; cardId: string }>();
  const [name, setName] = useState('');
  const [effects, setEffects] = useState<CardEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCards(gameId).then(cards => {
      const card = cards.find(c => c.id === cardId);
      if (card) { setName(card.name); setEffects(card.effects); }
    }).finally(() => setLoading(false));
  }, [gameId, cardId]);

  const save = async () => {
    if (!name.trim()) { Alert.alert('오류', '이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      await updateCard(gameId, cardId, { name: name.trim(), effects });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '카드 수정' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="카드 저장" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
});
