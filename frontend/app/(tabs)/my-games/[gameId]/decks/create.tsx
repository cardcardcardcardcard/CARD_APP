import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listCards, getGame, createDeck } from '../../../../../lib/api';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import type { CardOut, GameOut } from '../../../../../types/api';

export default function CreateDeck() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [game, setGame] = useState<GameOut | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCards(gameId), getGame(gameId)])
      .then(([c, g]) => { setCards(c); setGame(g); })
      .finally(() => setLoading(false));
  }, [gameId]);

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const save = async () => {
    const deckSize = game?.ruleset.deck_size ?? 20;
    if (!name.trim()) { Alert.alert('Error', 'Deck name required'); return; }
    if (selected.length !== deckSize) {
      Alert.alert('Error', `Select exactly ${deckSize} cards (${selected.length} selected)`);
      return;
    }
    setSaving(true);
    try {
      await createDeck(gameId, { name: name.trim(), card_ids: selected });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to create deck');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;
  const deckSize = game?.ruleset.deck_size ?? 20;

  return (
    <>
      <Stack.Screen options={{ title: 'Build Deck' }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Input label="Deck Name" value={name} onChangeText={setName} style={{ flex: 1, marginBottom: 0 }} />
          <Text style={styles.count}>{selected.length}/{deckSize}</Text>
        </View>
        <FlatList
          data={cards}
          keyExtractor={c => c.id}
          renderItem={({ item }) => {
            const active = selected.includes(item.id);
            return (
              <TouchableOpacity style={[styles.card, active && styles.cardActive]} onPress={() => toggle(item.id)}>
                <Text style={[styles.name, active && styles.nameActive]}>{item.name}</Text>
                <Text style={styles.meta}>{item.effects.length} effect(s)</Text>
                {active && <Ionicons name="checkmark-circle" size={20} color="#6366f1" style={styles.check} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No cards in this game yet.</Text>}
        />
        <View style={styles.footer}>
          <Button title={`Save Deck (${selected.length}/${deckSize})`} onPress={save} loading={saving} />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  count: { fontSize: 16, fontWeight: '700', color: '#6366f1', paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardActive: { backgroundColor: '#eef2ff' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  nameActive: { color: '#6366f1' },
  meta: { fontSize: 12, color: '#9ca3af', marginRight: 8 },
  check: {},
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
