import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCards, getGame, createDeck } from '../../../../../lib/api';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { EmptyState } from '../../../../../components/ui/EmptyState';
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
    if (!name.trim()) { Alert.alert('오류', '덱 이름을 입력해주세요'); return; }
    if (selected.length !== deckSize) {
      Alert.alert('오류', `정확히 ${deckSize}장을 선택해주세요 (현재 ${selected.length}장)`);
      return;
    }
    setSaving(true);
    try {
      await createDeck(gameId, { name: name.trim(), card_ids: selected });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '덱 생성 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;
  const deckSize = game?.ruleset.deck_size ?? 20;

  return (
    <>
      <Stack.Screen options={{ title: '덱 빌드' }} />
      <ScreenContainer>
        <View style={styles.header}>
          <Input label="덱 이름" value={name} onChangeText={setName} style={{ flex: 1, marginBottom: 0 }} />
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
                <Text style={styles.meta}>{item.effects.length} 효과</Text>
                {active && <Ionicons name="checkmark-circle" size={20} color="#6366f1" style={styles.check} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<EmptyState message="이 게임에 카드가 없습니다." />}
        />
        <View style={styles.footer}>
          <Button title={`덱 저장 (${selected.length}/${deckSize})`} onPress={save} loading={saving} />
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  count: { fontSize: 16, fontWeight: '700', color: '#6366f1', paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardActive: { backgroundColor: '#eef2ff' },
  name: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  nameActive: { color: '#6366f1' },
  meta: { fontSize: 12, color: '#9ca3af', marginRight: 8 },
  check: {},
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
