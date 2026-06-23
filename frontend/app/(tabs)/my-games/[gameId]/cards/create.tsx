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
    if (!name.trim()) { Alert.alert('Error', 'Card name required'); return; }
    setLoading(true);
    try {
      await createCard(gameId, { name: name.trim(), attributes: {}, effects });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to create card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Card' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Card Name" value={name} onChangeText={setName} placeholder="Lightning Bolt" />
          <BlockBuilder effects={effects} onChange={setEffects} />
          <Button title="Create Card" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
});
