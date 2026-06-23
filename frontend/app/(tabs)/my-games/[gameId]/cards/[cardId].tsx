// frontend/app/(tabs)/my-games/[gameId]/cards/[cardId].tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { BlockBuilder } from '../../../../../components/BlockBuilder';
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
    if (!name.trim()) { Alert.alert('Error', 'Name required'); return; }
    setSaving(true);
    try {
      await updateCard(gameId, cardId, { name: name.trim(), effects });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Card' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Card Name" value={name} onChangeText={setName} />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="Save Card" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
});
